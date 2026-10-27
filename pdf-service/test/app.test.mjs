import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createApp } from '../lib/app.mjs';
import { loadConfig } from '../lib/config.mjs';
import { RenderError } from '../lib/renderer.mjs';

/**
 * Route behaviour, driven through a real HTTP server with a fake renderer —
 * no Chromium. The renderer is the only thing that touches a browser, so
 * everything a caller can observe about the API is testable without one.
 */

function fakeRenderer(impl) {
  return {
    connected: true,
    render: impl ?? (async () => ({ pdf: Buffer.from('%PDF-1.4 fake'), pages: 2 })),
  };
}

async function serve(app) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address();
  return { server, base: `http://127.0.0.1:${port}` };
}

const body = (id = 'modern') => JSON.stringify({
  snapshot: { selectedTemplate: { id }, resumeData: { personalInfo: { fullName: 'Amara' } } },
});

function post(base, payload, headers = {}) {
  return fetch(`${base}/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: payload,
  });
}

describe('POST /pdf', () => {
  let ctx;
  before(async () => {
    const config = loadConfig({ RENDER_ORIGIN: 'http://web:8080', PDF_RATE_LIMIT_PER_MINUTE: '100' });
    ctx = await serve(createApp({ config, renderer: fakeRenderer() }).app);
  });
  after(() => ctx.server.close());

  it('returns the PDF with its page count', async () => {
    const res = await post(ctx.base, body());
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
    assert.equal(res.headers.get('x-page-count'), '2');
    assert.match(await res.text(), /^%PDF/);
  });

  it('rejects an invalid payload with a 400 naming the problem', async () => {
    const res = await post(ctx.base, body('../etc'));
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /template id/);
  });

  it('treats malformed JSON as the client\'s fault', async () => {
    const res = await post(ctx.base, '{not json');
    assert.equal(res.status, 400);
  });

  it('sends no CORS headers when no origins are configured', async () => {
    const res = await post(ctx.base, body(), { Origin: 'https://evil.example' });
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  });
});

describe('POST /pdf under load and failure', () => {
  it('answers 429 with Retry-After once a client exceeds its rate', async () => {
    const config = loadConfig({ RENDER_ORIGIN: 'http://web:8080', PDF_RATE_LIMIT_PER_MINUTE: '1' });
    const { server, base } = await serve(createApp({ config, renderer: fakeRenderer() }).app);
    try {
      assert.equal((await post(base, body())).status, 200);
      const limited = await post(base, body());
      assert.equal(limited.status, 429);
      assert.ok(Number(limited.headers.get('retry-after')) > 0);
    } finally {
      server.close();
    }
  });

  it('answers 503 rather than queueing forever when every slot is busy', async () => {
    const config = loadConfig({
      RENDER_ORIGIN: 'http://web:8080',
      PDF_CONCURRENCY: '1',
      PDF_QUEUE_TIMEOUT_MS: '1000',
      PDF_RATE_LIMIT_PER_MINUTE: '100',
    });
    let release;
    const blocked = new Promise((r) => { release = r; });
    const renderer = fakeRenderer(async () => {
      await blocked;
      return { pdf: Buffer.from('%PDF'), pages: 1 };
    });
    const { server, base } = await serve(createApp({ config, renderer }).app);
    try {
      const first = post(base, body());
      await new Promise((r) => setTimeout(r, 50));
      const second = await post(base, body());
      assert.equal(second.status, 503);
      assert.ok(second.headers.get('retry-after'));
      release();
      assert.equal((await first).status, 200);
    } finally {
      server.close();
    }
  });

  it('never leaks the browser\'s own error text to the caller', async () => {
    const config = loadConfig({ RENDER_ORIGIN: 'http://web:8080' });
    const renderer = fakeRenderer(async () => {
      throw new RenderError('net::ERR_CONNECTION_REFUSED at http://10.0.0.5:9000/internal', { status: 502 });
    });
    const { server, base } = await serve(createApp({ config, renderer }).app);
    try {
      const res = await post(base, body());
      assert.equal(res.status, 502);
      const text = await res.text();
      assert.doesNotMatch(text, /10\.0\.0\.5/);
      assert.match(text, /Could not generate the PDF/);
    } finally {
      server.close();
    }
  });

  it('allows a configured origin and still refuses others', async () => {
    const config = loadConfig({ RENDER_ORIGIN: 'http://web:8080', ALLOWED_ORIGINS: 'https://resume.example' });
    const { server, base } = await serve(createApp({ config, renderer: fakeRenderer() }).app);
    try {
      const good = await post(base, body(), { Origin: 'https://resume.example' });
      assert.equal(good.headers.get('access-control-allow-origin'), 'https://resume.example');
      const bad = await post(base, body(), { Origin: 'https://evil.example' });
      assert.equal(bad.headers.get('access-control-allow-origin'), null);
    } finally {
      server.close();
    }
  });
});

describe('health endpoints', () => {
  it('/health stays up even while the browser is down', async () => {
    const config = loadConfig({ RENDER_ORIGIN: 'http://web:8080' });
    const renderer = { connected: false, render: async () => ({}) };
    const { server, base } = await serve(createApp({ config, renderer }).app);
    try {
      // Liveness must not depend on Chromium, or a browser crash would get the
      // container killed instead of the browser simply relaunched.
      assert.equal((await fetch(`${base}/health`)).status, 200);
      const ready = await fetch(`${base}/ready`);
      assert.equal(ready.status, 503);
      assert.equal((await ready.json()).browser, 'starting');
    } finally {
      server.close();
    }
  });
});
