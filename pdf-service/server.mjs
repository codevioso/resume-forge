import { createApp, log } from './lib/app.mjs';
import { loadConfig } from './lib/config.mjs';
import { Renderer } from './lib/renderer.mjs';

/**
 * Entry point: read config, start the browser, serve, and shut down cleanly.
 *
 * See docs/DEPLOY.md for the environment variables and how this runs under
 * Docker Compose.
 */

let config;
try {
  config = loadConfig();
} catch (err) {
  // A misconfigured deployment should fail loudly at boot, naming the variable,
  // rather than serve requests that all fail later for a less obvious reason.
  console.error(`[pdf-service] configuration error: ${err.message}`);
  process.exit(1);
}

const renderer = new Renderer({
  renderOrigin: config.renderOrigin,
  printPath: config.printPath,
  renderTimeoutMs: config.renderTimeoutMs,
});
const { app, slots, limiter } = createApp({ config, renderer });

const server = app.listen(config.port, () => {
  log('info', {
    msg: 'listening',
    port: config.port,
    renderOrigin: config.renderOrigin,
    concurrency: config.concurrency,
    corsOrigins: config.allowedOrigins.length ? config.allowedOrigins : 'same-origin only',
  });
});

// Launch Chromium now rather than on the first export, so no user pays for it.
// A failure here is logged, not fatal: /ready reports it, and the renderer
// retries on the next request.
renderer.warmUp().then(
  () => log('info', { msg: 'browser ready' }),
  (err) => log('error', { msg: 'browser failed to launch', error: err.message }),
);

const sweep = setInterval(() => limiter.sweep(), 60_000);
sweep.unref();

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log('info', { msg: 'shutting down', signal, inFlight: slots.inFlight, waiting: slots.waiting });

  // Docker sends SIGTERM and waits (10s by default, set higher in compose)
  // before SIGKILL. Stop taking new connections, let in-flight renders finish,
  // then close the browser so no Chromium process is orphaned.
  server.close();
  const deadline = Date.now() + config.renderTimeoutMs;
  while (slots.inFlight > 0 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100));
  }
  await renderer.close();
  log('info', { msg: 'stopped' });
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
