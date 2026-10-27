import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadConfig } from '../lib/config.mjs';
import { QueueTimeoutError, RateLimiter, Semaphore } from '../lib/limits.mjs';
import { countPdfPages } from '../lib/renderer.mjs';
import { LIMITS, validateRenderRequest } from '../lib/validate.mjs';

const ORIGIN = { RENDER_ORIGIN: 'http://web:8080' };

describe('config', () => {
  it('refuses to start without a render origin', () => {
    assert.throws(() => loadConfig({}), /RENDER_ORIGIN is required/);
  });

  it('keeps only the origin, and rejects anything carrying a path', () => {
    assert.equal(loadConfig(ORIGIN).renderOrigin, 'http://web:8080');
    // A path would be silently dropped by the origin comparison that guards
    // outbound requests, so it is an error rather than a surprise.
    assert.throws(() => loadConfig({ RENDER_ORIGIN: 'http://web:8080/app' }), /no path/);
  });

  it('rejects schemes Chromium should never be pointed at', () => {
    assert.throws(() => loadConfig({ RENDER_ORIGIN: 'file:///etc' }), /http or https/);
  });

  it('defaults to same-origin only when no CORS origins are given', () => {
    assert.deepEqual(loadConfig(ORIGIN).allowedOrigins, []);
  });

  it('validates numeric settings instead of passing NaN through', () => {
    assert.throws(() => loadConfig({ ...ORIGIN, PDF_CONCURRENCY: 'lots' }), /PDF_CONCURRENCY/);
    assert.throws(() => loadConfig({ ...ORIGIN, PDF_CONCURRENCY: '0' }), /PDF_CONCURRENCY/);
    assert.equal(loadConfig({ ...ORIGIN, PDF_CONCURRENCY: '3' }).concurrency, 3);
  });
});

describe('validateRenderRequest', () => {
  const ok = (resumeData = {}) => ({
    snapshot: { selectedTemplate: { id: 'modern' }, resumeData },
  });

  it('accepts a minimal document and fills in empty sections', () => {
    const r = validateRenderRequest(ok());
    assert.equal(r.ok, true);
    assert.deepEqual(r.snapshot.resumeData.experiences, []);
    assert.equal(r.snapshot.resumeData.personalInfo.fullName, '');
  });

  it('refuses a photo that is a URL — the page would fetch it', () => {
    for (const photo of [
      'http://169.254.169.254/latest/meta-data/',
      'https://example.com/me.jpg',
      'file:///etc/passwd',
      'javascript:alert(1)',
    ]) {
      const r = validateRenderRequest(ok({ personalInfo: { photo } }));
      assert.equal(r.ok, false, `accepted photo ${photo}`);
      assert.match(r.error, /inline image/);
    }
  });

  it('accepts an inline image as a photo', () => {
    const r = validateRenderRequest(ok({ personalInfo: { photo: 'data:image/jpeg;base64,/9j/4AAQ' } }));
    assert.equal(r.ok, true);
  });

  it('caps list sizes so one request cannot become an unbounded render', () => {
    const experiences = Array.from({ length: LIMITS.experiences + 1 }, () => ({}));
    const r = validateRenderRequest(ok({ experiences }));
    assert.equal(r.ok, false);
    assert.match(r.error, /more than/);
  });

  it('caps string lengths', () => {
    const r = validateRenderRequest(ok({ personalInfo: { summary: 'x'.repeat(LIMITS.longText + 1) } }));
    assert.equal(r.ok, false);
  });

  it('only accepts template ids that could be one of ours', () => {
    for (const id of ['../etc', 'Modern', '', 'a'.repeat(41), 'x y']) {
      const r = validateRenderRequest({ snapshot: { selectedTemplate: { id }, resumeData: {} } });
      assert.equal(r.ok, false, `accepted template id "${id}"`);
    }
  });

  it('keeps a skill level as the 0–100 percentage the editor uses', () => {
    // Regression: levels were once clamped to 0–5, which drew every skill bar
    // in the PDF as a sliver while the preview showed it full.
    const r = validateRenderRequest(ok({ skills: [{ name: 'a', level: 95 }, { name: 'b', level: 80 }] }));
    assert.deepEqual(r.snapshot.resumeData.skills.map((s) => s.level), [95, 80]);
  });

  it('clamps an out-of-range skill level instead of refusing the document', () => {
    const r = validateRenderRequest(
      ok({ skills: [{ name: 'x', level: 140 }, { name: 'y', level: -3 }, { name: 'z', level: 'high' }] }),
    );
    assert.deepEqual(r.snapshot.resumeData.skills.map((s) => s.level), [100, 0, 0]);
  });

  it('drops fields it does not know rather than passing them to the page', () => {
    const r = validateRenderRequest(ok({ personalInfo: { fullName: 'A', onload: 'alert(1)' } }));
    assert.equal('onload' in r.snapshot.resumeData.personalInfo, false);
  });

  it('ignores a client-supplied print URL entirely', () => {
    // The URL is configuration now. A body that still carries one — the old
    // client did — must not be able to steer the browser.
    const r = validateRenderRequest({ ...ok(), printUrl: 'http://169.254.169.254/' });
    assert.equal(r.ok, true);
    assert.equal('printUrl' in r.snapshot, false);
  });
});

describe('Semaphore', () => {
  it('admits up to its size and queues the rest in order', async () => {
    const s = new Semaphore(2);
    await s.acquire(1000);
    await s.acquire(1000);
    assert.equal(s.inFlight, 2);

    const order = [];
    const a = s.acquire(1000).then(() => order.push('a'));
    const b = s.acquire(1000).then(() => order.push('b'));
    assert.equal(s.waiting, 2);

    s.release();
    s.release();
    await Promise.all([a, b]);
    assert.deepEqual(order, ['a', 'b']);
  });

  it('removes a timed-out waiter so capacity never leaks', async () => {
    const s = new Semaphore(1);
    await s.acquire(1000);
    await assert.rejects(s.acquire(20), QueueTimeoutError);
    assert.equal(s.waiting, 0);

    // Had the dead waiter stayed queued, this release would have been handed
    // to it and the slot lost for good.
    s.release();
    assert.equal(s.inFlight, 0);
    await s.acquire(1000);
    assert.equal(s.inFlight, 1);
  });

  it('refuses a release that was never acquired', () => {
    assert.throws(() => new Semaphore(1).release(), /more times than acquired/);
  });

  it('releases the slot even when the work throws', async () => {
    const s = new Semaphore(1);
    await assert.rejects(s.run(1000, async () => { throw new Error('boom'); }), /boom/);
    assert.equal(s.inFlight, 0);
  });
});

describe('RateLimiter', () => {
  it('allows up to the limit per window, then says when to retry', () => {
    let now = 0;
    const r = new RateLimiter({ limit: 2, windowMs: 60_000, now: () => now });
    assert.equal(r.check('ip').allowed, true);
    assert.equal(r.check('ip').allowed, true);
    const third = r.check('ip');
    assert.equal(third.allowed, false);
    assert.equal(third.retryAfterSeconds, 60);

    now = 60_000;
    assert.equal(r.check('ip').allowed, true);
  });

  it('keys limits per client', () => {
    const r = new RateLimiter({ limit: 1 });
    assert.equal(r.check('a').allowed, true);
    assert.equal(r.check('b').allowed, true);
    assert.equal(r.check('a').allowed, false);
  });

  it('forgets expired windows so memory does not grow per IP forever', () => {
    let now = 0;
    const r = new RateLimiter({ limit: 1, windowMs: 1000, now: () => now });
    r.check('a');
    r.check('b');
    now = 1000;
    r.sweep();
    assert.equal(r.size, 0);
  });
});

describe('countPdfPages', () => {
  it('counts page objects and not the page tree', () => {
    const pdf = '<< /Type /Pages /Count 2 >> << /Type /Page >> << /Type /Page >>';
    assert.equal(countPdfPages(Buffer.from(pdf, 'latin1')), 2);
  });
});
