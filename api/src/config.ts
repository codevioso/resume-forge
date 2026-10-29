/**
 * Configuration, read once from the environment and validated up front.
 *
 * A bad value stops the process at start with a message naming the variable,
 * rather than surfacing later as a confusing failure on someone's sign-up.
 *
 * Optional integrations switch themselves on only when fully configured, and
 * the sign-in methods that depend on them switch with them:
 * - email (SMTP_URL + EMAIL_FROM) enables email-and-password accounts, email
 *   verification, password reset and sign-in links;
 * - Google (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET) enables "Sign in with
 *   Google".
 * `GET /api/auth-methods` tells the web app which are available.
 */

export interface Config {
  port: number;
  /** The site's public origin, e.g. https://resume.example.com. Links in emails and OAuth redirects use it. */
  publicUrl: string;
  /** Signs session cookies and tokens. At least 32 characters. */
  authSecret: string;
  databaseUrl: string;
  email: { smtpUrl: string; from: string } | null;
  google: { clientId: string; clientSecret: string } | null;
  maxResumesPerUser: number;
  /** Rate limiting of sign-in endpoints. Off only in tests. */
  rateLimit: boolean;
  /** Proxies in front (the edge) whose X-Forwarded-For is trusted for the client IP. */
  trustProxyHops: number;
  /** Free credits for a newly confirmed account, and how many days they last. */
  trial: { credits: number; days: number };
  ai: { enabled: boolean; perMinute: number; perDay: number };
}

export class ConfigError extends Error {}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new ConfigError(`${name} is required`);
  return value;
}

function int(env: NodeJS.ProcessEnv, name: string, fallback: number, min: number, max: number): number {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ConfigError(`${name} must be an integer between ${min} and ${max}, got "${raw}"`);
  }
  return value;
}

function origin(raw: string, name: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ConfigError(`${name} must be an absolute URL, got "${raw}"`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new ConfigError(`${name} must be http or https, got "${url.protocol}"`);
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new ConfigError(`${name} must be an origin with no path, got "${raw}"`);
  }
  return url.origin;
}

/** Both or neither: a half-configured integration is a typo, not a choice. */
function pair(env: NodeJS.ProcessEnv, a: string, b: string): [string, string] | null {
  const va = env[a]?.trim();
  const vb = env[b]?.trim();
  if (!va && !vb) return null;
  if (!va || !vb) throw new ConfigError(`${a} and ${b} must be set together`);
  return [va, vb];
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const authSecret = required(env, 'AUTH_SECRET');
  if (authSecret.length < 32) {
    throw new ConfigError('AUTH_SECRET must be at least 32 characters (generate one with: openssl rand -base64 48)');
  }

  const databaseUrl = required(env, 'DATABASE_URL');
  if (!/^mysql:\/\//.test(databaseUrl)) throw new ConfigError('DATABASE_URL must start with mysql://');

  const email = pair(env, 'SMTP_URL', 'EMAIL_FROM');
  if (email && !/^smtps?:\/\//.test(email[0])) throw new ConfigError('SMTP_URL must start with smtp:// or smtps://');
  const google = pair(env, 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET');

  return Object.freeze({
    port: int(env, 'PORT', 3050, 1, 65535),
    publicUrl: origin(required(env, 'PUBLIC_URL'), 'PUBLIC_URL'),
    authSecret,
    databaseUrl,
    email: email && { smtpUrl: email[0], from: email[1] },
    google: google && { clientId: google[0], clientSecret: google[1] },
    maxResumesPerUser: int(env, 'MAX_RESUMES_PER_USER', 50, 1, 1000),
    rateLimit: env.NODE_ENV !== 'test',
    trustProxyHops: int(env, 'TRUST_PROXY_HOPS', 0, 0, 5),
    trial: {
      credits: int(env, 'TRIAL_CREDITS', 300, 0, 100_000),
      days: int(env, 'TRIAL_DAYS', 15, 1, 3650),
    },
    ai: {
      // Off until a model is configured (phase 2); the credits work regardless.
      enabled: env.AI_ENABLED === 'true',
      perMinute: int(env, 'AI_RATE_PER_MINUTE', 10, 1, 1000),
      perDay: int(env, 'AI_DAILY_LIMIT', 100, 1, 100_000),
    },
  });
}
