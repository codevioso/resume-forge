import os from 'node:os';

/**
 * Service configuration, read once from the environment.
 *
 * Every value is validated here rather than at the point of use, so a bad
 * deployment fails at startup with a message that names the variable — not on
 * the first export, hours later, with an error about something else.
 */

function int(env, name, fallback, { min, max }) {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}, got "${raw}"`);
  }
  return value;
}

function origin(raw, name) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} must be an absolute URL, got "${raw}"`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${name} must be http or https, got "${url.protocol}"`);
  }
  // Only the origin is meaningful. A path here would be silently ignored by the
  // origin comparison that guards outbound requests, so reject it outright.
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`${name} must be an origin with no path, got "${raw}"`);
  }
  return url.origin;
}

export function loadConfig(env = process.env) {
  // The web app the service renders, as reached from *this container*.
  //
  // In Docker Compose this is the internal hostname of the web service, never
  // the public URL. It is configuration, not request input: the previous
  // version took the URL from the request body, which let any caller point
  // headless Chromium at an arbitrary address — cloud metadata endpoints,
  // localhost admin ports — and read the response back as a PDF.
  if (!env.RENDER_ORIGIN) {
    throw new Error(
      'RENDER_ORIGIN is required: the origin of the web app as reached from the pdf-service ' +
        '(e.g. http://web:8080 in Docker Compose, http://localhost:5173 in development).',
    );
  }
  const renderOrigin = origin(env.RENDER_ORIGIN, 'RENDER_ORIGIN');

  // Browsers allowed to call this API. Empty means same-origin only, which is
  // the right default once a reverse proxy serves both under one host.
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => origin(s, 'ALLOWED_ORIGINS'));

  // One Chromium page per render. Each costs real memory, so this bounds the
  // service's footprint as much as its throughput. Default: one per core, max 4.
  const cores = Math.max(1, os.availableParallelism?.() ?? os.cpus().length);
  const concurrency = int(env, 'PDF_CONCURRENCY', Math.min(cores, 4), { min: 1, max: 16 });

  return Object.freeze({
    port: int(env, 'PORT', 3040, { min: 1, max: 65535 }),
    renderOrigin,
    printPath: '/print',
    allowedOrigins,
    concurrency,
    // How long a request may wait for a free slot before getting a 503.
    queueTimeoutMs: int(env, 'PDF_QUEUE_TIMEOUT_MS', 20_000, { min: 1_000, max: 300_000 }),
    // Wall clock for one render, navigation through PDF bytes.
    renderTimeoutMs: int(env, 'PDF_RENDER_TIMEOUT_MS', 30_000, { min: 5_000, max: 300_000 }),
    // Request body cap. A resume is a few KB; the photo is the only large part,
    // and it arrives as a data URL.
    maxBodyBytes: int(env, 'PDF_MAX_BODY_BYTES', 8 * 1024 * 1024, { min: 64 * 1024, max: 50 * 1024 * 1024 }),
    // Renders per client IP per minute. Chromium is the expensive resource
    // here, so this is what stops one client starving everyone else.
    rateLimitPerMinute: int(env, 'PDF_RATE_LIMIT_PER_MINUTE', 30, { min: 1, max: 10_000 }),
    // Number of reverse-proxy hops to trust for the client IP. 1 behind Caddy.
    trustProxy: int(env, 'TRUST_PROXY_HOPS', 0, { min: 0, max: 5 }),
  });
}
