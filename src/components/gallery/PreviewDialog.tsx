import { useEffect, useId, useRef, type ReactNode, type RefObject, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { ResumeData, Template } from '../../types/resume';
import { cn } from '../../utils/cn';
import { CATEGORY_LABELS } from './categories';
import { ContentToggle, type PreviewContent } from './ContentToggle';
import { FittedPage } from './FittedPage';
import { DIALOG_QUERY, useMediaQuery } from './hooks';

const FEATURES = [
  'Prints every field you fill in',
  'Flows onto extra pages when you need them',
  'The PDF matches this preview',
  'Switch designs any time and keep your content',
];

type Props = {
  /** The templates the arrows step through (the current filter). */
  list: Template[];
  template: Template;
  selectedId: string | undefined;
  resumeData?: ResumeData;
  content: PreviewContent;
  onContentChange: ((value: PreviewContent) => void) | null;
  onNavigate: (template: Template) => void;
  onUse: (template: Template) => void;
  onClose: () => void;
  /**
   * Where focus goes back to on close: what opened the dialog. Captured by
   * the caller before opening, since the page turns inert (and drops focus)
   * in the same render that mounts the dialog.
   */
  returnFocusTo?: HTMLElement | null;
};

/**
 * A close look at one template before choosing it: a centred dialog on
 * desktop, a full-screen sheet on phones. Arrow keys (and a swipe on phones)
 * step through the gallery; Escape closes.
 *
 * Rendered into <body>; the page behind it is made `inert` by the caller.
 */
export function PreviewDialog(props: Props) {
  const { list, template, onNavigate, onClose } = props;
  const isDesktop = useMediaQuery(DIALOG_QUERY);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();

  const index = Math.max(0, list.findIndex((t) => t.id === template.id));
  const step = (delta: number) => {
    if (list.length < 2) return;
    onNavigate(list[(index + delta + list.length) % list.length]);
  };

  // Escape closes, arrows step through the list.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && list.length > 1) {
        e.preventDefault();
        const delta = e.key === 'ArrowLeft' ? -1 : 1;
        onNavigate(list[(index + delta + list.length) % list.length]);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [list, index, onNavigate, onClose]);

  // Focus moves into the dialog, and back to whatever opened it on close.
  // The page behind cannot scroll while it is open.
  const { returnFocusTo } = props;
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const root = document.documentElement;
    const previous = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };
    // Hold the scrollbar's space so the page behind doesn't shift sideways.
    const scrollbar = window.innerWidth - root.clientWidth;
    root.style.overflow = 'hidden';
    if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`;
    return () => {
      root.style.overflow = previous.overflow;
      root.style.paddingRight = previous.paddingRight;
      if (returnFocusTo?.isConnected) returnFocusTo.focus({ preventScroll: true });
    };
  }, [returnFocusTo]);

  const position = `${index + 1} of ${list.length}`;
  const shared = { ...props, titleId, descId, closeRef, position, step };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center lg:p-6">
      <div
        className="absolute inset-0 bg-ink-950/55 backdrop-blur-[2px] motion-safe:animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn(
          'relative flex w-full flex-col bg-white',
          isDesktop
            ? 'h-[min(880px,calc(100dvh-3rem))] max-w-5xl flex-row overflow-hidden rounded-3xl shadow-lift motion-safe:animate-rise'
            : 'h-dvh motion-safe:animate-sheet-up',
        )}
      >
        {isDesktop ? <DesktopLayout {...shared} /> : <PhoneLayout {...shared} />}
      </div>
    </div>,
    document.body,
  );
}

type LayoutProps = Props & {
  titleId: string;
  descId: string;
  closeRef: RefObject<HTMLButtonElement | null>;
  position: string;
  step: (delta: number) => void;
};

function DesktopLayout(p: LayoutProps) {
  const { template } = p;
  return (
    <>
      <div className="relative min-w-0 flex-1 bg-slate-100 px-16 py-8">
        <FittedPage
          key={`${template.id}-${p.content}`}
          template={template}
          resumeData={p.resumeData}
          fit="contain"
          className="flex h-full w-full items-center justify-center motion-safe:animate-fade-in"
          pageClassName="rounded-[4px] shadow-lift ring-1 ring-slate-900/5"
        />
        {p.list.length > 1 && (
          <>
            <NavButton side="left" onClick={() => p.step(-1)} />
            <NavButton side="right" onClick={() => p.step(1)} />
          </>
        )}
      </div>

      <div className="flex w-[360px] shrink-0 flex-col border-l border-slate-200">
        <div className="flex items-center justify-between gap-3 py-3 pr-3 pl-7">
          <span className="text-xs font-medium text-slate-500 tabular-nums">{p.position}</span>
          <button ref={p.closeRef} type="button" onClick={p.onClose} className="btn-icon" aria-label="Close preview">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6">
          <Details {...p} />
        </div>
        <div className="border-t border-slate-200 px-7 py-5">
          <UseButton {...p} className="w-full" />
          <p className="mt-3 text-center text-xs leading-5 text-slate-500">
            Opens the editor with this design.
            {p.list.length > 1 && (
              <>
                {' '}
                Use <Kbd>←</Kbd> <Kbd>→</Kbd> to browse.
              </>
            )}
          </p>
        </div>
      </div>
    </>
  );
}

function PhoneLayout(p: LayoutProps) {
  const { template } = p;
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) p.step(dx < 0 ? 1 : -1);
  };

  return (
    <>
      <div className="shrink-0 border-b border-slate-200/80 bg-white/90 pt-safe backdrop-blur-xl">
        <div className="flex h-14 items-center gap-1 px-1.5">
          <button ref={p.closeRef} type="button" onClick={p.onClose} className="btn-icon" aria-label="Close preview">
            <X className="size-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[15px] leading-tight font-semibold text-ink-900">{template.name}</p>
            <p className="text-xs text-slate-500 tabular-nums">{p.position}</p>
          </div>
          <span className="size-11 shrink-0" aria-hidden="true" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="bg-slate-100 px-5 py-5" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <FittedPage
            key={`${template.id}-${p.content}`}
            template={template}
            resumeData={p.resumeData}
            className="mx-auto w-full max-w-xl motion-safe:animate-fade-in"
            pageClassName="rounded-[3px] shadow-lift ring-1 ring-slate-900/5"
          />
        </div>
        <div className="mx-auto max-w-xl px-5 pt-5 pb-8">
          <Details {...p} />
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-200/80 bg-white px-4 pt-3 pb-safe-4">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <button type="button" onClick={() => p.step(-1)} className="btn-secondary w-12 px-0" aria-label="Previous template">
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <UseButton {...p} className="btn-lg min-w-0 flex-1" />
          <button type="button" onClick={() => p.step(1)} className="btn-secondary w-12 px-0" aria-label="Next template">
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );
}

function Details(p: LayoutProps) {
  const { template } = p;
  const isSelected = p.selectedId === template.id;
  return (
    <div className="motion-safe:animate-fade-in" key={template.id}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow">{CATEGORY_LABELS[template.category]}</span>
        {isSelected && (
          <span className="inline-flex items-center gap-1 rounded-full bg-aqua-50 px-2 py-0.5 text-xs font-semibold text-aqua-800 ring-1 ring-aqua-200">
            <Check className="size-3" strokeWidth={3} aria-hidden="true" />
            Selected
          </span>
        )}
      </div>
      <h2 id={p.titleId} className="mt-2 text-2xl font-bold tracking-tight text-ink-900">
        {template.name}
      </h2>
      <p id={p.descId} className="mt-2 text-[15px] leading-relaxed text-slate-600">
        {template.description}
      </p>

      <dl className="mt-6 space-y-4 text-sm">
        <Row label="Best for">{template.bestFor}</Row>
        <Row label="Colours">
          <span className="flex items-center gap-2">
            {[template.colors.primary, template.colors.secondary, template.colors.accent].map((c, i) => (
              <span
                key={i}
                className="size-6 rounded-full shadow-[inset_0_0_0_1px_rgb(15_23_42/0.14)]"
                style={{ backgroundColor: c }}
              />
            ))}
          </span>
        </Row>
      </dl>

      <ul className="mt-6 space-y-2.5 border-t border-slate-100 pt-5">
        {FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
            <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-mint-100 text-mint-800">
              <Check className="size-3" strokeWidth={3} aria-hidden="true" />
            </span>
            {f}
          </li>
        ))}
      </ul>

      {p.onContentChange && (
        <ContentToggle
          value={p.content}
          onChange={p.onContentChange}
          className="mt-6 flex-wrap border-t border-slate-100 pt-5"
        />
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_1fr] items-center gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-ink-900">{children}</dd>
    </div>
  );
}

function UseButton(p: LayoutProps & { className?: string }) {
  return (
    <button type="button" onClick={() => p.onUse(p.template)} className={cn('btn-primary', p.className)}>
      Use this template
      <ArrowRight className="size-4" aria-hidden="true" />
    </button>
  );
}

function NavButton({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous template' : 'Next template'}
      className={cn(
        'absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-ink-800 shadow-soft transition hover:bg-slate-50 hover:text-ink-950 active:scale-95',
        side === 'left' ? 'left-3' : 'right-3',
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-grid min-w-5 place-items-center rounded-md border border-slate-200 bg-slate-50 px-1 font-sans text-[11px] text-slate-600">
      {children}
    </kbd>
  );
}
