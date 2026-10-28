import { useRef } from 'react';
import { LandingNav } from '../components/landing/LandingNav';
import { Hero } from '../components/landing/Hero';
import { HowItWorks } from '../components/landing/HowItWorks';
import { TemplateShowcase } from '../components/landing/TemplateShowcase';
import { Features } from '../components/landing/Features';
import { PrivacyBand } from '../components/landing/PrivacyBand';
import { InstallSection } from '../components/landing/InstallSection';
import { Faq } from '../components/landing/Faq';
import { FinalCta } from '../components/landing/FinalCta';
import { LandingFooter } from '../components/landing/LandingFooter';
import { MobileCtaBar } from '../components/landing/MobileCtaBar';
import { useViewportPosition } from '../components/landing/shared';

/**
 * The marketing page at `/`. Each section lives in components/landing/; this
 * file only orders them and wires the phone CTA bar to the scroll position.
 */
export function LandingPage() {
  const heroCtaRef = useRef<HTMLDivElement>(null);
  const finalCtaRef = useRef<HTMLElement>(null);
  const heroCta = useViewportPosition(heroCtaRef, 'in');
  const finalCta = useViewportPosition(finalCtaRef, 'below');
  const showCtaBar = heroCta === 'above' && finalCta === 'below';

  return (
    <div className="min-h-dvh overflow-x-clip bg-white">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-ink-900 px-4 py-3 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <LandingNav />
      <main id="main">
        <Hero ctaRef={heroCtaRef} />
        <HowItWorks />
        <TemplateShowcase />
        <Features />
        <PrivacyBand />
        <InstallSection />
        <Faq />
        <FinalCta sectionRef={finalCtaRef} />
      </main>
      <LandingFooter />
      <MobileCtaBar visible={showCtaBar} />
    </div>
  );
}
