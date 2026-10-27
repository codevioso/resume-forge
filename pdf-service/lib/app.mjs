import cors from 'cors';
import express from 'express';
import { QueueTimeoutError, RateLimiter, Semaphore } from './limits.mjs';
import { RenderError } from './renderer.mjs';
import { validateRenderRequest } from './validate.mjs';

function log(level, fields) {
  // One JSON object per line, so `docker compose logs` can be piped into jq or
  // a log shipper without a parser. Never includes resume content.
  const line = JSON.stringify({ t: new Date().toISOString(), level, svc: 'pdf-service', ...fields });
  if (level === 'error') console.error(line);
  else console.log(line);
}

/**
 * Builds the Express app around an injected renderer.
 *
 * The renderer is a parameter, not an import, so tests can drive every route
 * with a fake and never start Chromium.
 */
export function createApp({ config, renderer }) {
  const app = express();
  const slots = new Semaphore(config.concurrency);
  const limiter = new RateLimiter({ limit: config.rateLimitPerMinute });

  app.disable('x-powered-by');
  // Behind Caddy the client IP is in X-Forwarded-For. Trusting it blindly would
  // let any caller choose their own rate-limit key, so only the configured
  // number of proxy hops is trusted.
  app.set('trust proxy', config.trustProxy);

  app.use((_, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store',
    });
    next();
  });

  // With no configured origins, no CORS headers are sent at all, which means
  // browsers allow same-origin calls only. That is the production shape: the
  // reverse proxy serves the app and /api from one host.
  if (config.allowedOrigins.length > 0) {
    const allowed = new Set(config.allowedOrigins);
    app.use(
      cors({
        origin: (origin, cb) => cb(null, !origin || allowed.has(origin)),
        methods: ['POST', 'GET'],
        maxAge: 600,
      }),
    );
  }

  app.use(express.json({ limit: config.maxBodyBytes }));

  // Liveness: the process is up and answering. Says nothing about Chromium, so
  // a browser crash does not get the container killed and restarted — the
  // renderer relaunches the browser on its own.
  app.get('/health', (_, res) => {
    res.json({ ok: true });
  });

  // Readiness: worth sending traffic to. Reports load so an operator can see
  // saturation without reading logs.
  app.get('/ready', (_, res) => {
    const body = {
      ok: renderer.connected,
      browser: renderer.connected ? 'connected' : 'starting',
      inFlight: slots.inFlight,
      waiting: slots.waiting,
      concurrency: config.concurrency,
    };
    res.status(renderer.connected ? 200 : 503).json(body);
  });

  app.post('/pdf', async (req, res) => {
    const started = Date.now();
    const verdict = limiter.check(req.ip);
    if (!verdict.allowed) {
      res.set('Retry-After', String(verdict.retryAfterSeconds));
      return res.status(429).json({ error: 'Too many exports. Try again shortly.' });
    }

    const parsed = validateRenderRequest(req.body);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });

    const templateId = parsed.snapshot.selectedTemplate.id;
    try {
      const { pdf, pages } = await slots.run(config.queueTimeoutMs, () => renderer.render(parsed.snapshot));
      log('info', { msg: 'rendered', templateId, pages, bytes: pdf.length, ms: Date.now() - started });
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="resume.pdf"',
        'X-Page-Count': String(pages),
      });
      return res.send(Buffer.from(pdf));
    } catch (err) {
      if (err instanceof QueueTimeoutError) {
        log('warn', { msg: 'queue full', templateId, inFlight: slots.inFlight, waiting: slots.waiting });
        res.set('Retry-After', '5');
        return res.status(503).json({ error: 'The PDF service is busy. Try again in a few seconds.' });
      }
      const status = err instanceof RenderError ? err.status : 500;
      log('error', { msg: 'render failed', templateId, status, error: err?.message, ms: Date.now() - started });
      // The browser's own error text can carry internal URLs and stack detail;
      // it goes to the log, and the caller gets a stable message.
      return res.status(status).json({ error: 'Could not generate the PDF.' });
    }
  });

  // Malformed JSON and oversized bodies are the client's fault, not a 500.
  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'The resume is too large to export.' });
    }
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body is not valid JSON.' });
    }
    log('error', { msg: 'unhandled', error: err?.message });
    return res.status(500).json({ error: 'Internal error.' });
  });

  return { app, slots, limiter };
}

export { log };
