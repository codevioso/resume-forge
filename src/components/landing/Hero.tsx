import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, PenLine } from 'lucide-react';
import { PlaneMark } from '../BrandMark';
import { useResume } from '../../context/ResumeContext';
import { templates } from '../../data/templates';
import { Container, scrollToSection } from './shared';
import { HeroVisual } from './HeroVisual';

const TRUST = ['Free to use', 'No sign-up', 'Stays on your device'];

export function Hero({ ctaRef }: { ctaRef: RefObject<HTMLDivElement | null> }) {
  // A resume already in progress (saved in this browser) gets a way straight back in.
  const { selectedTemplate } = useResume();

  return (
    <section aria-labelledby="hero-title" className="relative isolate">
      {/* Backdrop: brand-tinted light from the top corners and a faint dot grid. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(52rem_34rem_at_88%_-8%,var(--color-aqua-100),transparent_65%),radial-gradient(40rem_28rem_at_-6%_4%,var(--color-mint-50),transparent_70%)]" />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)] bg-[radial-gradient(var(--color-ink-200)_1px,transparent_1.2px)] [background-size:24px_24px] opacity-60" />
      </div>

      <Container className="grid items-center gap-10 pt-10 pb-14 sm:pt-16 sm:pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-8 lg:pt-20 lg:pb-20">
        <div className="text-center lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-aqua-200 bg-white/80 py-1 pr-3.5 pl-1.5 text-[13px] font-semibold text-ink-800 shadow-xs backdrop-blur motion-safe:animate-rise">
            <span className="flex h-6 items-center rounded-full bg-aqua-50 px-2">
              <PlaneMark className="h-3.5" />
            </span>
            {templates.length} professional templates, all free
          </p>

          <h1
            id="hero-title"
            className="mt-6 text-[2.625rem] leading-[1.04] font-extrabold tracking-[-0.035em] text-balance text-ink-900 motion-safe:animate-rise sm:text-6xl lg:text-[4.25rem]"
            style={{ animationDelay: '60ms' }}
          >
            Your resume, ready for{' '}
            <span className="relative inline-block whitespace-nowrap">
              <span className="relative z-10">takeoff.</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 300 24"
                preserveAspectRatio="none"
                className="absolute -bottom-[0.06em] left-[-2%] h-[0.3em] w-[96%] text-aqua-400"
                fill="none"
              >
                <path d="M4 17 C 70 7, 190 3, 296 11" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          <p
            className="mx-auto mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-pretty text-slate-600 motion-safe:animate-rise sm:text-lg lg:mx-0"
            style={{ animationDelay: '120ms' }}
          >
            Pick a professionally designed template, fill in your details with a live preview, and download a
            pixel-perfect PDF. Free, with no sign-up, and saved on your device instead of our servers.
          </p>

          <div
            ref={ctaRef}
            className="mt-8 flex flex-col gap-3 motion-safe:animate-rise sm:flex-row sm:justify-center lg:justify-start"
            style={{ animationDelay: '180ms' }}
          >
            <Link to="/templates" className="btn-primary btn-lg group">
              Create my resume
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            {selectedTemplate ? (
              <Link to="/editor" className="btn-secondary btn-lg">
                <PenLine className="size-5 text-aqua-700" aria-hidden="true" />
                Continue my resume
              </Link>
            ) : (
              <a
                href="#how-it-works"
                className="btn-secondary btn-lg"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('how-it-works');
                }}
              >
                See how it works
              </a>
            )}
          </div>

          <ul
            className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-sm font-medium text-slate-600 motion-safe:animate-rise lg:justify-start"
            style={{ animationDelay: '240ms' }}
          >
            {TRUST.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-mint-100 text-mint-800">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <HeroVisual className="lg:-mr-4" />
      </Container>
    </section>
  );
}
