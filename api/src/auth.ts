import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins/magic-link';
import type { Kysely } from 'kysely';
import type { Config } from './config.js';
import type { Database } from './db.js';
import { actionEmail, type Mailer } from './mailer.js';

/**
 * Accounts, sessions and sign-in, by Better Auth.
 *
 * Mounted at /api/auth on the site's own origin, so the session is a
 * first-party, httpOnly cookie and no CORS configuration exists to get wrong.
 *
 * Sign-in methods follow configuration (see config.ts):
 * - email and password, with verification before first sign-in, password
 *   reset and sign-in links — only when email can actually be sent. Requiring
 *   verification without a way to deliver it would lock every new account out;
 *   offering password accounts without it would let anyone squat an address.
 * - Google — only with a client id and secret.
 *
 * Linking a Google sign-in to an existing account with the same email happens
 * only if that account's email is verified (Better Auth's default), so
 * registering someone else's address with a password cannot later capture
 * their Google identity.
 */
export function createAuth({ config, db, mailer }: { config: Config; db: Kysely<Database>; mailer: Mailer | null }) {
  const emailEnabled = mailer !== null;
  const send = async (email: Parameters<Mailer['send']>[0]) => {
    if (!mailer) throw new Error('Email is not configured');
    await mailer.send(email);
  };

  return betterAuth({
    appName: 'Paperplane',
    baseURL: config.publicUrl,
    basePath: '/api/auth',
    secret: config.authSecret,
    database: { db, type: 'mysql' },
    trustedOrigins: [config.publicUrl],

    emailAndPassword: {
      enabled: emailEnabled,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) =>
        send(
          actionEmail({
            to: user.email,
            subject: 'Reset your Paperplane password',
            intro: 'Someone asked to reset the password for your Paperplane account. The link works for one hour.',
            action: 'Choose a new password',
            url,
            footer: "If you didn't ask for this, ignore this email — your password stays as it is.",
          }),
        ),
    },

    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, url }) =>
        send(
          actionEmail({
            to: user.email,
            subject: 'Confirm your email for Paperplane',
            intro: 'Confirm this address to finish creating your Paperplane account. The link works for 24 hours.',
            action: 'Confirm my email',
            url,
            footer: "If you didn't create an account, ignore this email and nothing will happen.",
          }),
        ),
    },

    socialProviders: config.google
      ? {
          google: {
            clientId: config.google.clientId,
            clientSecret: config.google.clientSecret,
            prompt: 'select_account',
          },
        }
      : {},

    plugins: emailEnabled
      ? [
          magicLink({
            expiresIn: 60 * 15,
            storeToken: 'hashed',
            sendMagicLink: async ({ email, url }) =>
              send(
                actionEmail({
                  to: email,
                  subject: 'Your Paperplane sign-in link',
                  intro: 'Use this link to sign in to Paperplane. It works once, for 15 minutes.',
                  action: 'Sign in to Paperplane',
                  url,
                  footer: "If you didn't ask to sign in, ignore this email — no one can use it without access to your inbox.",
                }),
              ),
          }),
        ]
      : [],

    user: {
      // The account page offers "Delete my account"; resumes go with it
      // (ON DELETE CASCADE).
      deleteUser: { enabled: true },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      // Deleting an account or changing a password needs a sign-in within the
      // last day.
      freshAge: 60 * 60 * 24,
    },

    account: {
      accountLinking: { enabled: true, trustedProviders: ['google'] },
    },

    rateLimit: {
      enabled: config.rateLimit,
      window: 60,
      max: 100,
      customRules: {
        // Every page load asks "who is signed in?". Limiting that answer
        // turned signed-in users into guests whenever an IP shared by many
        // people (an office, a campus, a mobile carrier) spent the budget —
        // the client reads a 429 as "no session". It is a cheap read that
        // reveals nothing without a valid cookie, so it is not limited.
        '/get-session': false,
        '/sign-in/email': { window: 60, max: 10 },
        '/sign-up/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 60, max: 3 },
        '/sign-in/magic-link': { window: 60, max: 3 },
        '/send-verification-email': { window: 60, max: 3 },
      },
    },

    advanced: {
      // The edge proxy sets X-Forwarded-For to the real client address
      // (overwriting anything the client sent), so it is the one to trust.
      ipAddress: { ipAddressHeaders: ['x-forwarded-for'] },
      useSecureCookies: config.publicUrl.startsWith('https://'),
      cookiePrefix: 'paperplane',
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
