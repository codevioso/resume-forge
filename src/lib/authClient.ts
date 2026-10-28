import { createAuthClient } from 'better-auth/react';
import { magicLinkClient } from 'better-auth/client/plugins';

/**
 * The browser side of sign-in (api/src/auth.ts is the server side).
 *
 * Same origin, under /api/auth: the session is an httpOnly cookie the browser
 * sends by itself, so nothing here stores or reads a token.
 *
 * Use `authClient.useSession()` for the signed-in user, and the methods on
 * `authClient` (signUp.email, signIn.email, signIn.social, signIn.magicLink,
 * requestPasswordReset, resetPassword, signOut, deleteUser) for the flows.
 */
export const authClient = createAuthClient({
  basePath: '/api/auth',
  plugins: [magicLinkClient()],
});

export const { useSession } = authClient;

/** Which sign-in methods the server can complete (it depends on its email and Google settings). */
export type AuthMethods = { emailPassword: boolean; magicLink: boolean; google: boolean };

export async function fetchAuthMethods(): Promise<AuthMethods> {
  const res = await fetch('/api/auth-methods');
  if (!res.ok) throw new Error(`auth-methods: HTTP ${res.status}`);
  return res.json();
}
