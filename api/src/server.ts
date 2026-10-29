import { AiService } from './ai/service.js';
import { fakeModel } from './ai/model.js';
import { createApp, log } from './app.js';
import { createAuth } from './auth.js';
import { ConfigError, loadConfig } from './config.js';
import { CreditService } from './credits/service.js';
import { createDatabase } from './db.js';
import { smtpMailer } from './mailer.js';
import { migrate } from './migrate.js';

let config;
try {
  config = loadConfig();
} catch (err) {
  if (err instanceof ConfigError) {
    console.error(`api: ${err.message}`);
    process.exit(1);
  }
  throw err;
}

const { db } = createDatabase(config.databaseUrl);
const mailer = config.email ? smtpMailer(config.email.smtpUrl, config.email.from) : null;
const credits = new CreditService({ db, trial: config.trial });
// The real Claude client arrives with the first AI action (phase 2); until
// then AI stays disabled (AI_ENABLED) and nothing calls the model.
const ai = new AiService({ db, credits, model: fakeModel, limits: config.ai });
const auth = createAuth({ config, db, mailer, onUserVerified: (user) => credits.ensureTrial(user) });

// The database container can still be starting when this one is; retry
// rather than crash-loop.
for (let attempt = 1; ; attempt++) {
  try {
    const applied = await migrate(auth, db);
    if (applied.length) log('info', { msg: 'migrated', applied });
    break;
  } catch (err) {
    if (attempt >= 30) throw err;
    log('warn', { msg: 'database not ready, retrying', attempt, error: (err as Error).message });
    await new Promise((r) => setTimeout(r, 2000));
  }
}

const app = createApp({ config, auth, db, credits, ai });
const server = app.listen(config.port, () => {
  log('info', {
    msg: 'listening',
    port: config.port,
    publicUrl: config.publicUrl,
    email: config.email !== null,
    google: config.google !== null,
    ai: config.ai.enabled,
  });
});

let closing = false;
async function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  log('info', { msg: 'shutting down', signal });
  server.close();
  await db.destroy();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
