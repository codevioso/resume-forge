import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { TemplateThumbnail } from '../TemplateThumbnail';
import { A4_HEIGHT_PX, A4_WIDTH_PX } from '../../constants/layout';
import { templates } from '../../data/templates';
import type { Template } from '../../types/resume';
import { cn } from '../../utils/cn';
import { Container, DeferredMount, SECTION_Y, SectionHeader } from './shared';
import { showcaseResume } from './showcaseResume';

/** Five designs not already in the hero, chosen to show the range. */
const SHOWCASE_IDS = ['executive', 'slate', 'ocean', 'sunset', 'noir'];

const THUMB_H = 320;
const THUMB_W = Math.round((THUMB_H * A4_WIDTH_PX) / A4_HEIGHT_PX);

/*
 * The row runs edge to edge, but its first card lines up with the page's
 * content column (Container: max-w-6xl, px-4/6/8).
 */
const ROW_INSET =
  'px-4 scroll-px-4 sm:px-6 sm:scroll-px-6 lg:px-[max(2rem,calc((100%-72rem)/2+2rem))] lg:scroll-px-[max(2rem,calc((100%-72rem)/2+2rem))]';

export function TemplateShowcase() {
  const items = SHOWCASE_IDS.map((id) => templates.find((t) => t.id === id)).filter((t): t is Template => !!t);
  const rowRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const updateEdges = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    updateEdges();
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [updateEdges]);

  const scroll = (dir: 1 | -1) => {
    const el = rowRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * Math.max(THUMB_W, el.clientWidth * 0.7), behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <section
      id="templates"
      aria-labelledby="showcase-title"
      className={cn('scroll-mt-16 border-y border-slate-200/70 bg-slate-50', SECTION_Y)}
    >
      <Container className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <SectionHeader
          id="showcase-title"
          align="left"
          tinted
          eyebrow="Templates"
          title={`${templates.length} designs, from classic to bold`}
          lede="Quiet and traditional or bright and colorful: every template is professionally designed and lays out cleanly on A4 pages."
          className="md:max-w-xl"
        />
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <button
            type="button"
            className="btn-icon border border-slate-200 bg-white shadow-xs hover:bg-white disabled:opacity-40"
            onClick={() => scroll(-1)}
            disabled={edges.start}
            aria-label="Scroll templates back"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn-icon border border-slate-200 bg-white shadow-xs hover:bg-white disabled:opacity-40"
            onClick={() => scroll(1)}
            disabled={edges.end}
            aria-label="Scroll templates forward"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
          <Link to="/templates" className="btn-secondary ml-2">
            Browse all templates
          </Link>
        </div>
      </Container>

      <ul
        ref={rowRef}
        onScroll={updateEdges}
        aria-label="Template previews"
        className={cn('no-scrollbar mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pt-2 pb-6 sm:gap-6', ROW_INSET)}
      >
        {items.map((t) => (
          <li
            key={t.id}
            className="group relative shrink-0 snap-start rounded-2xl has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-aqua-500"
            style={{ width: THUMB_W }}
          >
            {/* The preview is inert (its contact links are real <a>s); the title's link covers the whole card. */}
            <div
              inert
              className="overflow-hidden rounded-xl bg-white shadow-soft ring-1 ring-ink-900/8 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lift motion-reduce:transition-none"
            >
              <DeferredMount placeholder={<div className="animate-pulse bg-slate-100" style={{ height: THUMB_H }} />}>
                <TemplateThumbnail template={t} height={THUMB_H} resumeData={showcaseResume} className="bg-white" />
              </DeferredMount>
            </div>
            <div className="mt-3.5 px-0.5">
              <h3 className="truncate text-[0.9375rem] font-semibold text-ink-900">
                <Link to="/templates" className="outline-none after:absolute after:inset-0 after:rounded-2xl">
                  {t.name}
                </Link>
              </h3>
              <p className="mt-0.5 truncate text-[13px] text-slate-500">{t.bestFor}</p>
            </div>
          </li>
        ))}

        <li className="shrink-0 snap-start">
          <Link
            to="/templates"
            className="group relative flex flex-col justify-end overflow-hidden rounded-xl bg-ink-900 p-6 text-white shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift motion-reduce:transition-none"
            style={{ width: THUMB_W, height: THUMB_H }}
          >
            <div aria-hidden="true" className="absolute -top-16 -right-16 size-56 rounded-full bg-aqua-400/25 blur-3xl" />
            <div aria-hidden="true" className="absolute -bottom-20 -left-10 size-48 rounded-full bg-mint-400/15 blur-3xl" />
            <div aria-hidden="true" className="absolute top-8 left-6 flex">
              {['bg-aqua-400', 'bg-mint-400', 'bg-white'].map((c, i) => (
                <span
                  key={c}
                  className="-ml-3 h-20 w-14 rounded-md bg-white/95 p-1.5 shadow-lift ring-1 ring-white/20 first:ml-0"
                  style={{ transform: `rotate(${(i - 1) * 8}deg)` }}
                >
                  <span className={cn('block h-2.5 rounded-sm', c === 'bg-white' ? 'bg-ink-300' : c)} />
                  <span className="mt-1.5 block h-1 w-8 rounded-full bg-slate-200" />
                  <span className="mt-1 block h-1 w-6 rounded-full bg-slate-200" />
                  <span className="mt-1 block h-1 w-9 rounded-full bg-slate-200" />
                </span>
              ))}
            </div>
            <p className="relative text-4xl font-extrabold tracking-tight">{templates.length}</p>
            <p className="relative mt-1 text-lg font-bold">templates to choose from</p>
            <p className="relative mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-aqua-300">
              Browse the gallery
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </p>
          </Link>
        </li>
      </ul>

      <Container className="md:hidden">
        <Link to="/templates" className="btn-secondary btn-lg mt-2 w-full">
          Browse all {templates.length} templates
          <ArrowRight className="size-5" aria-hidden="true" />
        </Link>
      </Container>
    </section>
  );
}
