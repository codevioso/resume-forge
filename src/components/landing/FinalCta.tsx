import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PlaneMark } from '../BrandMark';
import { Container } from './shared';

/** The closing call to action: the page's one dark band. */
export function FinalCta({ sectionRef }: { sectionRef: RefObject<HTMLElement | null> }) {
  return (
    <section ref={sectionRef} aria-labelledby="cta-title" className="py-16 sm:py-24">
      <Container>
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-ink-900 px-6 py-14 text-center shadow-lift sm:px-12 sm:py-20 lg:py-24">
          <div aria-hidden="true" className="absolute inset-0 -z-10">
            <div className="absolute -top-32 -right-24 size-[26rem] rounded-full bg-aqua-400/20 blur-3xl" />
            <div className="absolute -bottom-36 -left-24 size-[24rem] rounded-full bg-mint-400/15 blur-3xl" />
            <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1.2px)] [background-size:22px_22px]" />
          </div>

          {/* The plane, trailing dots that run off the band's left edge. */}
          <div aria-hidden="true" className="relative mx-auto h-12 w-fit sm:h-14">
            <svg
              viewBox="0 0 400 112"
              preserveAspectRatio="none"
              className="absolute top-[56%] right-[calc(100%-0.5rem)] h-12 w-[min(34rem,40vw)] -translate-y-[4%] text-aqua-400/70 sm:h-24"
              fill="none"
            >
              <path
                d="M 0 108 C 150 112, 240 30, 400 4"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="0.5 10"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <PlaneMark className="relative h-full drop-shadow-[0_8px_18px_rgb(14_240_248/0.25)]" />
          </div>
          <h2
            id="cta-title"
            className="mx-auto mt-6 max-w-2xl text-[2rem] leading-[1.1] font-extrabold tracking-[-0.03em] text-balance text-white sm:text-5xl"
          >
            Cleared for takeoff?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-ink-200 sm:text-lg">
            Pick a template, fill in your details and download your PDF. Free, with <span className="whitespace-nowrap">no sign-up</span>.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/templates" className="btn-accent btn-lg group">
              Create my resume
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              to="/templates"
              className="btn btn-lg border border-white/20 text-white hover:border-white/35 hover:bg-white/10"
            >
              Browse templates
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
