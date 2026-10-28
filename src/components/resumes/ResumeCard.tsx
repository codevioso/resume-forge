import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CloudOff } from 'lucide-react';
import { normalizeResumeData } from '../../context/resumeStorage';
import type { ResumeData, Template } from '../../types/resume';
import { hasContent } from '../../data/emptyResume';
import type { SavedResume } from '../../lib/resumesApi';
import { cn } from '../../utils/cn';
import { FittedPage } from '../gallery/FittedPage';
import { ResumeActions, type ResumeAction } from './ResumeActions';
import { templateFor } from './templateFor';
import { formatEdited, formatFull } from './time';

/** Mount children only once the element is near the viewport: each thumbnail renders a whole resume. */
function useNearViewport<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);
  return { ref, near };
}

/**
 * One saved resume on the dashboard: a real render of its first page, its
 * name, template and when it was last edited. The whole card opens it (the
 * name is the link, stretched over the card); the "more" button sits above
 * that layer.
 */
export function ResumeCard({
  resume,
  now,
  unsynced,
  highlight,
  onAction,
  canDuplicate,
}: {
  resume: SavedResume;
  now: number;
  /** This device has changes for it that the account does not have yet. */
  unsynced: boolean;
  /** Just created here (a duplicate): draw the eye to it. */
  highlight: boolean;
  onAction: (action: ResumeAction) => void;
  canDuplicate: boolean;
}) {
  const template = templateFor(resume.templateId);
  const data = useMemo(() => normalizeResumeData(resume.data), [resume.data]);
  const blank = !hasContent(data);
  const edited = formatEdited(resume.updatedAt, now);
  const { ref, near } = useNearViewport<HTMLDivElement>();

  return (
    <article
      data-resume-card={resume.id}
      className={cn(
        'group relative flex h-full flex-col rounded-2xl border bg-white shadow-soft transition duration-200',
        'motion-safe:has-[[data-open]:active]:scale-[0.985]',
        highlight
          ? 'border-aqua-500 ring-2 ring-aqua-400/60'
          : 'border-slate-200/80 hover:border-slate-300 hover:shadow-lift motion-safe:hover:-translate-y-0.5',
      )}
    >
      <div className="flex flex-1 flex-col py-2.5 pr-1 pl-3 sm:py-3 sm:pl-4">
        <div className="flex items-start gap-1">
          <h3 className="min-w-0 flex-1 pt-1.5 text-sm leading-snug font-semibold text-ink-900 sm:text-[15px]">
            <Link
              to={`/editor/${resume.id}`}
              data-open
              className={cn(
                'line-clamp-2 outline-none [overflow-wrap:anywhere]',
                'after:absolute after:inset-0 after:z-[5] after:rounded-2xl after:content-[""]',
                'focus-visible:after:outline-2 focus-visible:after:outline-offset-[3px] focus-visible:after:outline-aqua-700',
              )}
            >
              {resume.title}
            </Link>
          </h3>
          <ResumeActions
            title={resume.title}
            subtitle={`${template.name} · ${edited}`}
            onAction={onAction}
            disabled={{ duplicate: !canDuplicate }}
            className="relative z-10 -mt-0.5 shrink-0"
          />
        </div>
        <div className="mt-auto pr-3 pt-1">
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
            <span
              className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: template.colors.primary }}
              aria-hidden="true"
            />
            <span className="truncate">{template.name}</span>
          </p>
          {unsynced ? (
            <p
              className="mt-0.5 flex items-center gap-1 text-xs font-medium text-amber-700"
              title="Open it to save these changes to your account."
            >
              <CloudOff className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">Changes on this device</span>
            </p>
          ) : (
            <p className="mt-0.5 truncate text-xs text-slate-500">
              <time dateTime={resume.updatedAt} title={formatFull(resume.updatedAt)}>
                {edited}
              </time>
            </p>
          )}
        </div>
      </div>

      {/* The page, cropped at the bottom like a sheet in a tray. First on
          screen, after the name in the DOM (the name is read first). */}
      <div
        ref={ref}
        className="relative order-first aspect-[5/6] overflow-hidden rounded-t-[calc(1rem-1px)] bg-slate-100 px-3 pt-3 sm:px-5 sm:pt-5"
      >
        {near && <Page template={template} data={data} blank={blank} />}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/[0.04] to-transparent" />
        {blank && (
          <span className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto w-max -translate-y-1/2 rounded-full bg-ink-900/85 px-3 py-1.5 text-xs font-semibold text-white shadow-soft backdrop-blur">
            Not started yet
          </span>
        )}
      </div>
    </article>
  );
}

/**
 * The rendered page. Memoised: the card re-renders every half minute (the
 * "Edited 2 minutes ago" clock), and the page is a whole resume.
 */
const Page = memo(function Page({ template, data, blank }: { template: Template; data: ResumeData; blank: boolean }) {
  return (
    <FittedPage
      template={template}
      // Nothing typed yet: the design with sample content, faded, under "Not started yet".
      resumeData={blank ? undefined : data}
      className={cn(
        'w-full transition-transform duration-300 ease-out motion-safe:group-hover:-translate-y-1',
        blank && 'opacity-45 saturate-50',
      )}
      pageClassName="rounded-t-[3px] shadow-[0_1px_2px_rgb(15_23_42/0.08),0_6px_20px_-6px_rgb(15_23_42/0.22)] ring-1 ring-slate-900/5"
    />
  );
});

/** A card's shape while the list loads. */
export function ResumeCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-soft" aria-hidden="true">
      <div className="aspect-[5/6] bg-slate-100 px-3 pt-3 sm:px-5 sm:pt-5">
        <div className="h-full rounded-t-[3px] bg-white/80" />
      </div>
      <div className="space-y-2 p-3 sm:p-4">
        <div className="h-3.5 w-3/4 rounded-full bg-slate-200/80" />
        <div className="h-3 w-1/2 rounded-full bg-slate-100" />
        <div className="h-3 w-2/5 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}
