import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { getAiConsent } from '../../lib/creditsApi';
import { AiConsentDialog } from './AiConsentDialog';
import { setAiConsentAt, useCredits } from './useCredits';

/**
 * The one-time AI consent, for AI buttons:
 *
 *   const { ensureConsent, consentDialog } = useAiConsent();
 *   const onClick = async () => {
 *     if (!(await ensureConsent())) return; // the user chose "Not now"
 *     …run the AI action…
 *   };
 *   return <>{button}{consentDialog}</>;
 *
 * `ensureConsent()` resolves true at once when consent is already on record;
 * otherwise it opens the consent dialog and resolves when the user answers.
 * Render `consentDialog` (null unless asking) somewhere in the component.
 *
 * If an AI endpoint still answers 403 `consent_required` (consent withdrawn
 * on another device), call `ensureConsent({ fresh: true })` and retry once.
 *
 * Guests: resolves false. Ask them to create an account first.
 */
export function useAiConsent(): {
  /** null until known (or when signed out). */
  consented: boolean | null;
  ensureConsent: (options?: { fresh?: boolean }) => Promise<boolean>;
  consentDialog: ReactNode;
} {
  const { summary, signedIn } = useCredits();
  const [asking, setAsking] = useState(false);
  const resolver = useRef<((consented: boolean) => void) | null>(null);
  const latest = useRef({ summary, signedIn });
  latest.current = { summary, signedIn };

  // Unmounted while asking: the caller gets an answer (no).
  useEffect(
    () => () => {
      resolver.current?.(false);
      resolver.current = null;
    },
    [],
  );

  const ensureConsent = useCallback(async ({ fresh = false }: { fresh?: boolean } = {}) => {
    const { summary, signedIn } = latest.current;
    if (!signedIn) return false;
    if (fresh) {
      setAiConsentAt(null);
    } else {
      if (summary?.aiConsentAt) return true;
      if (!summary) {
        // Credits not read yet: ask the server rather than show the dialog to someone who agreed.
        try {
          const consent = await getAiConsent();
          if (consent.consented) {
            setAiConsentAt(consent.at);
            return true;
          }
        } catch {
          /* unknown: ask */
        }
      }
    }
    resolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setAsking(true);
    });
  }, []);

  const finish = useCallback((consented: boolean) => {
    setAsking(false);
    resolver.current?.(consented);
    resolver.current = null;
  }, []);

  return {
    consented: summary ? summary.aiConsentAt !== null : null,
    ensureConsent,
    consentDialog: asking ? <AiConsentDialog onDone={finish} /> : null,
  };
}
