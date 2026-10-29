import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Kysely } from 'kysely';
import type { Auth } from './auth.js';
import type { Config } from './config.js';
import type { Database } from './db.js';
import { AiError, type AiService } from './ai/service.js';
import { creditsRouter } from './credits/routes.js';
import type { CreditService } from './credits/service.js';
import { resumesRouter, type AuthedRequest } from './resumes/routes.js';

export function log(level: 'info' | 'warn' | 'error', fields: Record<string, unknown>) {
  // One JSON object per line, like the pdf-service. Never includes resume
  // content, passwords or tokens.
  const line = JSON.stringify({ t: new Date().toISOString(), level, svc: 'api', ...fields });
  if (level === 'error') console.error(line);
  else console.log(line);
}

/**
 * The HTTP app around injected dependencies, so tests drive the real routes
 * against a test database with an in-memory mailer.
 */
export function createApp({
  config,
  auth,
  db,
  credits,
  ai,
}: {
  config: Config;
  auth: Auth;
  db: Kysely<Database>;
  credits: CreditService;
  ai: AiService;
}) {
  const app = express();
  app.disable('x-powered-by');
  // Behind the edge proxy: trust exactly its hop for the client address.
  app.set('trust proxy', config.trustProxyHops);

  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store',
    });
    next();
  });

  // Better Auth reads its own request bodies, so it is mounted before the
  // JSON parser.
  app.all('/api/auth/*splat', toNodeHandler(auth));

  app.use(express.json({ limit: '3mb' }));

  const creditsHandler = creditsRouter({ credits, ai, purchasable: false });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Which sign-in methods this server can actually complete, so the web app
  // never offers one that would fail (email needs SMTP, Google needs a client).
  app.get('/api/auth-methods', (_req, res) => {
    res.json({
      emailPassword: config.email !== null,
      magicLink: config.email !== null,
      google: config.google !== null,
    });
  });

  /**
   * Writes must come from the site itself. Session cookies are SameSite=Lax,
   * which already keeps them off cross-site POSTs; this refuses any write that
   * announces a foreign Origin, as a second wall.
   */
  const sameOrigin = (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (req.method !== 'GET' && req.method !== 'HEAD' && origin && origin !== config.publicUrl) {
      return res.status(403).json({ error: 'Cross-site request refused.' });
    }
    next();
  };

  const requireUser = async (req: Request, res: Response, next: NextFunction) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) return res.status(401).json({ error: 'Sign in to continue.' });
    (req as AuthedRequest).userId = session.user.id;
    (req as AuthedRequest).user = { id: session.user.id, emailVerified: session.user.emailVerified };
    next();
  };

  app.use(
    '/api/resumes',
    sameOrigin,
    requireUser,
    resumesRouter({ db, maxResumesPerUser: config.maxResumesPerUser }),
  );

  // Credits and AI consent: signed in only. The router is mounted at /api so
  // its own paths read in full (/credits, /ai/consent).
  app.use(['/api/credits', '/api/ai'], sameOrigin, requireUser);
  app.use('/api', creditsHandler);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  // Malformed JSON and oversized bodies are the client's mistake, not a 500;
  // anything else is logged and answered without internal detail.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AiError) {
      return res.status(err.status).json({ error: err.message, code: err.code, ...err.details });
    }
    const type = (err as { type?: string })?.type;
    if (type === 'entity.too.large') return res.status(413).json({ error: 'That is too large to save.' });
    if (type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body is not valid JSON.' });
    log('error', { msg: 'unhandled', error: (err as Error)?.message });
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });

  return app;
}
