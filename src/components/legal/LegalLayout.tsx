import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUp, CalendarDays, Check, ChevronDown, ChevronRight, Hash, ListOrdered, Mail, PencilLine } from 'lucide-react';
import { BrandMark } from '../BrandMark';
import { APP_NAME } from '../../constants/brand';
import { BUSINESS_HAS_PLACEHOLDERS } from '../../constants/business';
import { cn } from '../../utils/cn';
import { IconChip, useViewportPosition } from '../landing/shared';
import { Biz, SupportEmail } from './LegalText';
import { LEGAL_PAGES, type LegalPageId } from './legalPages';

/** One numbered section of a legal document. `id` is its anchor (/privacy#cookies). */
export type LegalSection = { id: string; title: string; body: ReactNode };

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function scrollToId(id: string, smooth: boolean) {
  const el = document.getElementById(id);
  if (!el) return false;
  // 'instant', not 'auto': the stylesheet makes 'auto' smooth (html { scroll-behavior: smooth }).
  el.scrollIntoView({ behavior: smooth && !reducedMotion() ? 'smooth' : 'instant', block: 'start' });
  return true;
}

/**
 * Jump to a section without a router navigation: scroll, put the anchor in
 * the address bar (so it can be shared) and move focus to the heading.
 * Modified clicks (new tab, new window) are left to the browser.
 */
function jumpTo(e: MouseEvent<HTMLAnchorElement>, id: string, before?: () => void) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  before?.();
  // After `before` has changed the layout (closing the phone contents list).
  requestAnimationFrame(() => {
    if (!scrollToId(id, true)) return;
    window.history.replaceState(window.history.state, '', `#${id}`);
    document.getElementById(`${id}-title`)?.focus({ preventScroll: true });
  });
}

/** The section being read: the last one whose heading has passed under the header. */
function useActiveSection(idsKey: string) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const ids = idsKey ? idsKey.split('|') : [];
    if (!ids.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 140) current = id;
      }
      // Scrolled to the very end: the last section, however short.
      const root = document.documentElement;
      if (window.scrollY > 0 && window.innerHeight + window.scrollY >= root.scrollHeight - 4) current = ids[ids.length - 1];
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [idsKey]);
  return active;
}

/**
 * The frame of every legal page: a calm document to read.
 *
 * Desktop: the text in a 65–75 character column, with the sections listed on
 * the right ("On this page"), following the reader. Phones: an app bar (back,
 * brand — the page's name once its title has scrolled away), the contents in
 * a collapsible list, and the other legal pages as tappable rows at the end.
 */
export function LegalLayout({
  page,
  lede,
  summary,
  sections = [],
  children,
}: {
  page: LegalPageId;
  /** One or two sentences under the title: what this page is. */
  lede?: ReactNode;
  /** "In short": the main points, above the full text. */
  summary?: ReactNode[];
  sections?: LegalSection[];
  /** Free-form content instead of (or after) the sections — the contact page. */
  children?: ReactNode;
}) {
  const meta = LEGAL_PAGES.find((p) => p.id === page)!;
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titlePosition = useViewportPosition(titleRef, 'in');
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const active = useActiveSection(sections.map((s) => s.id).join('|'));
  const hasToc = sections.length > 0;

  useEffect(() => {
    const previous = document.title;
    document.title = `${meta.title} · ${APP_NAME}`;
    return () => {
      document.title = previous;
    };
  }, [meta.title]);

  // A new page opens at its top, or at the section its link points to.
  useEffect(() => {
    const id = decodeURIComponent(hash.slice(1));
    if (!id || !scrollToId(id, false)) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    // Text set before the web font has loaded is a different height, so the
    // section moves: land on it again once the font is in.
    if (!document.fonts || document.fonts.status === 'loaded') return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) scrollToId(id, false);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, hash]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goBack = () => {
    // React Router counts entries it created; 0 means this page opened the tab.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/');
  };

  const year = new Date().getFullYear();

  return (
    <div className="relative isolate min-h-dvh bg-white">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-ink-900 px-4 py-3 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      {/* The hero's light, quieter: a document, not a landing page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] bg-[radial-gradient(46rem_22rem_at_88%_-6%,var(--color-aqua-50),transparent_70%),radial-gradient(38rem_20rem_at_-4%_0%,var(--color-mint-50),transparent_70%)]"
      />

      <header
        className={cn(
          'pt-safe sticky top-0 z-30 border-b backdrop-blur-xl backdrop-saturate-150 transition-[background-color,border-color] duration-200',
          scrolled ? 'border-slate-200/80 bg-white/90' : 'border-transparent bg-white/40',
        )}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-1.5 sm:h-16 sm:gap-2 sm:px-6 lg:px-8">
          <button type="button" onClick={goBack} className="btn-icon shrink-0 sm:hidden" aria-label="Back">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={goBack} className="btn-ghost -ml-3 hidden shrink-0 px-3 text-slate-600 sm:inline-flex">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </button>
          <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" aria-hidden="true" />
          <Link to="/" aria-label={`${APP_NAME} home`} className="hidden shrink-0 rounded-lg p-1 sm:flex">
            <BrandMark className="h-9" />
          </Link>

          {/* Phones: the brand, then the page's name once its title has scrolled away. */}
          <div className="flex min-w-0 flex-1 justify-center sm:hidden">
            {titlePosition === 'above' ? (
              <span className="truncate px-1 text-base font-bold tracking-tight text-ink-900 motion-safe:animate-fade-in">
                {meta.title}
              </span>
            ) : (
              <Link to="/" aria-label={`${APP_NAME} home`} className="flex min-h-11 items-center rounded-lg px-2">
                <BrandMark variant="compact" />
              </Link>
            )}
          </div>
          {/* Balances the back button so the middle is centred. */}
          <span className="size-11 shrink-0 sm:hidden" aria-hidden="true" />

          <nav aria-label="Legal" className="ml-auto hidden md:block">
            <ul className="flex items-center gap-0.5">
              {LEGAL_PAGES.map((p) => (
                <li key={p.id}>
                  <Link
                    to={p.to}
                    aria-current={p.id === page ? 'page' : undefined}
                    className={cn(
                      'inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium transition',
                      p.id === page ? 'bg-ink-50 text-ink-900' : 'text-slate-600 hover:bg-slate-50 hover:text-ink-900',
                    )}
                  >
                    {p.short}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main
        id="main"
        className={cn(
          'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8',
          hasToc && 'lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_15rem] xl:gap-24',
        )}
      >
        <div className={cn('min-w-0', hasToc ? 'max-w-[70ch]' : 'max-w-4xl')}>
          <div className="pt-7 sm:pt-14">
            <p className="eyebrow">{page === 'contact' ? 'Contact' : 'Legal'}</p>
            <h1
              ref={titleRef}
              className="mt-3 text-[2.125rem] leading-[1.08] font-extrabold tracking-[-0.035em] text-balance text-ink-900 sm:text-5xl"
            >
              {meta.title}
            </h1>
            <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
              <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
              <span>
                Last updated <Biz k="effectiveDate" />
              </span>
            </p>
            {lede && (
              <p className="mt-6 max-w-[62ch] text-[1.0625rem] leading-relaxed text-pretty text-slate-600 sm:text-xl sm:leading-relaxed">
                {lede}
              </p>
            )}
            {BUSINESS_HAS_PLACEHOLDERS && <DraftNotice />}
          </div>

          {summary && summary.length > 0 && <Summary points={summary} />}

          {hasToc && (
            <details ref={detailsRef} className="group mt-6 rounded-2xl border border-slate-200 bg-white shadow-xs lg:hidden">
              <summary className="flex min-h-13 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 select-none [&::-webkit-details-marker]:hidden">
                <ListOrdered className="size-5 shrink-0 text-aqua-700" aria-hidden="true" />
                <span className="flex-1 font-semibold text-ink-900">On this page</span>
                <span className="text-sm text-slate-500">{sections.length} sections</span>
                <ChevronDown className="size-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <ol className="border-t border-slate-100 p-2">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      onClick={(e) =>
                        jumpTo(e, s.id, () => {
                          if (detailsRef.current) detailsRef.current.open = false;
                        })
                      }
                      className="flex min-h-11 items-center gap-3 rounded-xl px-2 py-1.5 text-[0.9375rem] leading-snug text-ink-800 transition hover:bg-slate-50 active:bg-slate-100"
                    >
                      <span className="w-5 shrink-0 text-right text-sm text-slate-400 tabular-nums">{i + 1}</span>
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </details>
          )}

          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-20 pt-12 sm:scroll-mt-24 sm:pt-14">
              <h2
                id={`${s.id}-title`}
                tabIndex={-1}
                className="group flex items-baseline gap-2 text-[1.375rem] leading-tight font-bold tracking-[-0.02em] text-ink-900 outline-none sm:text-[1.625rem]"
              >
                <span className="shrink-0 text-aqua-700 tabular-nums">{i + 1}.</span>
                <span>
                  {s.title}
                  <a
                    href={`#${s.id}`}
                    onClick={(e) => jumpTo(e, s.id)}
                    aria-label={`Link to section ${i + 1}, ${s.title}`}
                    className="ml-1.5 hidden rounded-md p-1 align-middle text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-aqua-700 focus-visible:opacity-100 sm:inline-flex"
                  >
                    <Hash className="size-4" aria-hidden="true" />
                  </a>
                </span>
              </h2>
              <div className="mt-4 space-y-4 text-base leading-[1.75] text-pretty text-slate-700 sm:text-[1.0625rem] [&_strong]:font-semibold [&_strong]:text-ink-900">
                {s.body}
              </div>
            </section>
          ))}

          {children}

          <DocumentEnd page={page} />
        </div>

        {hasToc && (
          <aside className="hidden pt-[3.75rem] lg:block">
            <nav aria-label="On this page" className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pb-8">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">On this page</p>
              <ol className="mt-4 border-l border-slate-200">
                {sections.map((s, i) => {
                  const current = active === s.id;
                  return (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        onClick={(e) => jumpTo(e, s.id)}
                        aria-current={current ? 'location' : undefined}
                        className={cn(
                          '-ml-px flex gap-1 border-l-2 py-1.5 pl-4 text-sm leading-snug transition',
                          current
                            ? 'border-aqua-500 font-semibold text-ink-900'
                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-ink-900',
                        )}
                      >
                        <span className="w-6 shrink-0 tabular-nums">{i + 1}.</span>
                        <span>{s.title}</span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </aside>
        )}
      </main>

      <footer className="pb-safe mt-12 border-t border-slate-200/80 sm:mt-20">
        <div className="mx-auto flex max-w-6xl flex-col-reverse items-center justify-between gap-2 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-500">
            © {year} {APP_NAME} · <Biz k="legalName" />
          </p>
          <button
            type="button"
            className="btn-ghost px-3 text-slate-600"
            onClick={() => window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' })}
          >
            <ArrowUp className="size-4" aria-hidden="true" />
            Back to top
          </button>
        </div>
      </footer>
    </div>
  );
}

/** Shown while business details are still placeholders, so a draft never passes for the final text. */
function DraftNotice() {
  return (
    <p className="mt-6 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-3 text-sm leading-relaxed text-amber-900">
      <PencilLine className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        <strong className="font-semibold">Draft.</strong> Highlighted text in [brackets] is still to be filled in
        {import.meta.env.DEV && (
          <>
            {' '}
            (<code className="font-mono text-[0.8125rem]">src/constants/business.ts</code>), and the [Review] notes checked
          </>
        )}
        .
      </span>
    </p>
  );
}

function Summary({ points }: { points: ReactNode[] }) {
  return (
    <section
      aria-labelledby="in-short"
      className="mt-8 rounded-[1.25rem] border border-mint-100 bg-gradient-to-br from-mint-50 via-white to-aqua-50/70 p-5 sm:p-7"
    >
      <h2 id="in-short" className="text-xs font-semibold tracking-[0.14em] text-mint-800 uppercase">
        In short
      </h2>
      <ul className="mt-4 space-y-3">
        {points.map((p, i) => (
          <li key={i} className="flex gap-3 text-[0.9375rem] leading-relaxed text-ink-800 sm:text-base">
            <span className="mt-[0.2rem] flex size-5 shrink-0 items-center justify-center rounded-full bg-mint-500 text-white">
              <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
            </span>
            <span className="min-w-0">{p}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-[13px] text-slate-500">This summary is here to help; the full text below is what applies.</p>
    </section>
  );
}

/** After the text: who to ask, and the other legal pages. */
function DocumentEnd({ page }: { page: LegalPageId }) {
  const others = LEGAL_PAGES.filter((p) => p.id !== page);
  return (
    <div className="mt-14 sm:mt-20">
      {page !== 'contact' && (
        <div className="flex flex-col gap-4 rounded-[1.25rem] bg-slate-50 p-5 ring-1 ring-slate-200/70 ring-inset sm:flex-row sm:items-center sm:gap-5 sm:p-6">
          <div className="flex min-w-0 flex-1 gap-4">
            <IconChip icon={Mail} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink-900">Questions about this page?</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Write to <SupportEmail />. We reply <Biz k="responseTime" />.
              </p>
            </div>
          </div>
          <Link to="/contact" className="btn-secondary w-full sm:w-auto">
            Contact us
          </Link>
        </div>
      )}

      <nav aria-label="Other legal pages" className="mt-10">
        <h2 className="px-1 text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">More legal pages</h2>
        <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
          {others.map((p, i) => (
            <li key={p.id}>
              <Link to={p.to} className="flex min-h-[4.25rem] items-center gap-3.5 px-4 py-3 transition hover:bg-slate-50 active:bg-slate-100">
                <IconChip icon={p.icon} tone={i % 2 ? 'mint' : 'aqua'} className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink-900">{p.title}</span>
                  <span className="mt-0.5 block text-sm text-slate-500">{p.blurb}</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-slate-400" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
