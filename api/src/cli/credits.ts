/**
 * Credits from the command line, for support and testing (no admin panel).
 *
 *   grant <email> <credits> [--days 30] [--note "beta tester"]
 *   show  <email>
 *
 * Development:  npm run credits -- grant someone@example.com 1000 --days 30
 * Production:   docker compose exec api node dist/cli/credits.js grant someone@example.com 1000 --days 30
 */
import { loadConfig } from '../config.js';
import { CreditService } from '../credits/service.js';
import { createDatabase } from '../db.js';

function usage(message?: string): never {
  if (message) console.error(`credits: ${message}\n`);
  console.error('Usage:\n  credits grant <email> <credits> [--days 30] [--note "text"]\n  credits show <email>');
  process.exit(1);
}

const [command, email, ...rest] = process.argv.slice(2);
const flag = (name: string) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};

if (!command || !email) usage();

const config = loadConfig();
const { db } = createDatabase(config.databaseUrl);
const credits = new CreditService({ db, trial: config.trial });

try {
  const user = await db
    .selectFrom('user')
    .select(['id', 'email', 'name'])
    .where('email', '=', email.toLowerCase())
    .executeTakeFirst();
  if (!user) usage(`no account with email ${email}`);

  if (command === 'grant') {
    const amount = Number(rest[0]);
    const days = Number(flag('days') ?? 30);
    if (!Number.isInteger(amount) || amount <= 0) usage('credits must be a positive whole number');
    if (!Number.isInteger(days) || days <= 0) usage('--days must be a positive whole number');
    await credits.grant({ userId: user.id, amount, days, source: 'grant', note: flag('note') ?? 'Granted by support' });
    console.log(`Granted ${amount} credits to ${user.email}, valid ${days} days.`);
  } else if (command !== 'show') {
    usage(`unknown command "${command}"`);
  }

  const summary = await credits.summary(user.id, 10);
  console.log(`\n${user.name} <${user.email}> — balance ${summary.balance}`);
  for (const b of summary.batches) {
    console.log(`  ${String(b.remaining).padStart(6)} of ${String(b.amount).padEnd(6)} ${b.source.padEnd(8)} expires ${b.expiresAt.slice(0, 10)}  ${b.note ?? ''}`);
  }
  if (!summary.batches.length) console.log('  (no live credits)');
} finally {
  await db.destroy();
}
