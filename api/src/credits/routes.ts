import { Router, type Request } from 'express';
import { AI_ACTIONS } from '../ai/actions.js';
import type { AiService } from '../ai/service.js';
import type { AuthedRequest } from '../resumes/routes.js';
import type { CreditService } from './service.js';

/**
 * /api/credits (signed in): balance, live batches with expiry, history, the
 * price of each AI action, and the packs on sale.
 * /api/ai/consent (signed in): read, give and withdraw consent to AI
 * processing.
 */
export function creditsRouter({ credits, ai, purchasable }: { credits: CreditService; ai: AiService; purchasable: boolean }) {
  const router = Router();
  const user = (req: Request) => (req as AuthedRequest).user;

  router.get('/credits', async (req, res) => {
    // Safety net: a confirmed account that somehow missed its trial gets it now.
    await credits.ensureTrial(user(req));
    const summary = await credits.summary(user(req).id);
    const consentedAt = await ai.consentedAt(user(req).id);
    res.json({
      ...summary,
      prices: Object.fromEntries(Object.entries(AI_ACTIONS).map(([k, v]) => [k, v.credits])),
      trial: credits.trial,
      aiConsentAt: consentedAt?.toISOString() ?? null,
    });
  });

  router.get('/credits/packs', async (_req, res) => {
    // Packs are listed before payments exist, so the app can show what is
    // coming; `purchasable` turns on with the payment gateway (phase 5).
    res.json({ packs: await credits.packs(), purchasable });
  });

  router.get('/ai/consent', async (req, res) => {
    const at = await ai.consentedAt(user(req).id);
    res.json({ consented: at !== null, at: at?.toISOString() ?? null });
  });

  router.post('/ai/consent', async (req, res) => {
    await ai.giveConsent(user(req).id);
    const at = await ai.consentedAt(user(req).id);
    res.json({ consented: true, at: at?.toISOString() ?? null });
  });

  router.delete('/ai/consent', async (req, res) => {
    await ai.withdrawConsent(user(req).id);
    res.json({ consented: false, at: null });
  });

  return router;
}
