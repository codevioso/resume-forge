import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { templates } from '../data/templates';
import { useResume } from '../context/ResumeContext';
import { APP_NAME } from '../constants/brand';
import type { Template } from '../types/resume';
import { useSession } from '../lib/authClient';
import { ApiError, createResume } from '../lib/resumesApi';
import { PlaneMark } from '../components/BrandMark';
import { ToastViewport, useToasts } from '../components/editor/Toasts';
import { useMediaQuery } from '../components/editor/useEnvironment';
import {
  POPULAR_TEMPLATE_IDS,
  canPreviewWithOwnResume,
  countByCategory,
  isCategory,
  type CategoryFilterValue,
} from '../components/gallery/categories';
import { CategoryFilter } from '../components/gallery/CategoryFilter';
import { ContentToggle, type PreviewContent } from '../components/gallery/ContentToggle';
import { GalleryHeader } from '../components/gallery/GalleryHeader';
import { PreviewDialog } from '../components/gallery/PreviewDialog';
import { SelectionBar } from '../components/gallery/SelectionBar';
import { TemplateCard } from '../components/gallery/TemplateCard';

/**
 * The template gallery: step one of the flow. Pick a design (or look at one
 * up close first), then continue to the editor.
 *
 * Guests choose the design of the one resume kept in their browser. For a
 * signed-in user (and `?new=1`, the "New resume" button on My resumes)
 * continuing creates a new resume in their account with that design and
 * opens it; the browser resume is left alone.
 *
 * The category filter lives in the URL (`?category=tech`), so it survives
 * Back from the editor and can be linked to.
 */
export function TemplatesPage() {
  const navigate = useNavigate();
  const { selectedTemplate: guestTemplate, setSelectedTemplate: setGuestTemplate, resumeData } = useResume();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: session } = useSession();
  const askedForNew = searchParams.get('new') === '1';
  const newResumeFlow = askedForNew || Boolean(session?.user);
  const [picked, setPicked] = useState<Template | null>(null);
  const selectedTemplate = newResumeFlow ? picked : guestTemplate;
  const setSelectedTemplate = newResumeFlow ? setPicked : setGuestTemplate;
  const { creating, create, toasts, dismissToast } = useCreateResume();
  const isPhone = useMediaQuery('(max-width: 767px)');

  const categoryParam = searchParams.get('category');
  const category: CategoryFilterValue = isCategory(categoryParam) ? categoryParam : 'all';
  const counts = useMemo(() => countByCategory(templates), []);
  const visible = useMemo(
    () => (category === 'all' ? templates : templates.filter((t) => t.category === category)),
    [category],
  );

  // The browser resume is the guest's; a new saved resume starts empty.
  const canUseOwn = !newResumeFlow && canPreviewWithOwnResume(resumeData);
  const [content, setContent] = useState<PreviewContent>('sample');
  const previewData = canUseOwn && content === 'mine' ? resumeData : undefined;

  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewOpener, setPreviewOpener] = useState<HTMLElement | null>(null);
  const openPreview = (template: Template) => {
    setPreviewOpener(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setPreviewId(template.id);
  };
  const previewing = previewId ? templates.find((t) => t.id === previewId) ?? null : null;

  // Swap the app bar's brand for the page title once the heading scrolls away.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    const el = headingRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setCondensed(!entry.isIntersecting), {
      rootMargin: '-64px 0px 0px 0px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const previous = document.title;
    document.title = `Choose a template — ${APP_NAME}`;
    return () => {
      document.title = previous;
    };
  }, []);

  // No entrance animation on arrival: the cards render 20 live templates, and
  // an animation that starts from opacity 0 held the whole page blank until
  // that work finished (about a second on a laptop, longer on a phone). A
  // filter change only settles the grid (cards stay mounted and are hidden,
  // so thumbnails don't re-render).

  const gridRef = useRef<HTMLUListElement>(null);
  const filterAnchorRef = useRef<HTMLDivElement>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);
  /** Where the filter bar sticks: the header's height. */
  const stickyTop = () => (filterBarRef.current ? parseFloat(getComputedStyle(filterBarRef.current).top) || 0 : 0);
  /** Set when the filter changes while the chips are stuck under the header. */
  const scrollToResults = useRef(false);

  // When the chips are stuck under the header, a new filter starts the user at
  // the top of the new results rather than somewhere in a shorter list.
  // Layout effect: before paint, so the old scroll position never shows.
  useLayoutEffect(() => {
    const anchor = filterAnchorRef.current;
    if (!scrollToResults.current || !anchor) return;
    scrollToResults.current = false;
    const top = anchor.getBoundingClientRect().top + window.scrollY - stickyTop();
    window.scrollTo({ top, behavior: 'instant' });
  }, [category]);

  const firstFilter = useRef(true);
  useEffect(() => {
    if (firstFilter.current) {
      firstFilter.current = false;
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gridRef.current?.animate(
      [
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 260, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' },
    );
  }, [category]);

  const setCategory = (value: CategoryFilterValue) => {
    if (value === category) return;
    const anchor = filterAnchorRef.current;
    scrollToResults.current = !!anchor && anchor.getBoundingClientRect().top < stickyTop() - 1;
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete('category');
    else next.set('category', value);
    setSearchParams(next, { replace: true });
  };

  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(askedForNew ? '/resumes' : '/');
  };

  const handleContinue = () => {
    if (!selectedTemplate) return;
    if (newResumeFlow) void create(selectedTemplate);
    else navigate('/editor');
  };

  const chooseAndContinue = (template: Template) => {
    setSelectedTemplate(template);
    setPreviewId(null);
    if (newResumeFlow) void create(template);
    else navigate('/editor');
  };

  return (
    <>
      <div className="min-h-dvh bg-slate-50" inert={previewing ? true : undefined}>
        <GalleryHeader
          selected={selectedTemplate}
          condensed={condensed}
          onBack={goBack}
          onContinue={handleContinue}
        />

        <main className="pb-36 md:pb-20">
          <section className="mx-auto max-w-7xl px-4 pt-6 pb-5 md:px-6 md:pt-12 md:pb-8 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
              <div className="max-w-2xl">
                <p className="eyebrow">{newResumeFlow ? 'New resume' : 'Step 1 of 3'}</p>
                <h1
                  ref={headingRef}
                  className="mt-2 text-[28px] leading-[1.15] font-bold tracking-tight text-ink-900 sm:text-4xl lg:text-[2.75rem]"
                >
                  Choose Your Template
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600 sm:text-lg">
                  All {templates.length} designs are free. Each prints every field you fill in, flows onto extra pages
                  when needed, and downloads as a PDF that matches the preview.
                </p>
              </div>
              {canUseOwn && (
                <ContentToggle value={content} onChange={setContent} className="shrink-0 flex-wrap" />
              )}
            </div>
          </section>

          {/* Filters: stick under the header while the grid scrolls. */}
          <div ref={filterAnchorRef} aria-hidden="true" />
          <div
            ref={filterBarRef}
            className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 border-y border-slate-200/70 bg-slate-50/85 backdrop-blur-xl md:top-[calc(4rem+env(safe-area-inset-top))]"
          >
            <div className="mx-auto flex max-w-7xl items-center gap-6 md:px-6 lg:px-8">
              <CategoryFilter
                value={category}
                counts={counts}
                onChange={setCategory}
                className="min-w-0 flex-1 px-4 py-2.5 md:px-0"
              />
              <p className="hidden shrink-0 text-sm text-slate-500 tabular-nums lg:block" aria-live="polite">
                {visible.length === templates.length
                  ? `${templates.length} templates`
                  : `${visible.length} of ${templates.length} templates`}
              </p>
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 pt-5 md:px-6 md:pt-8 lg:px-8">
            <ul
              ref={gridRef}
              className="grid grid-cols-2 gap-3 [overflow-anchor:none] sm:gap-5 md:grid-cols-3 lg:gap-6 xl:grid-cols-4"
              aria-label="Templates"
            >
              {templates.map((template) => {
                const shown = category === 'all' || template.category === category;
                return (
                  <li key={template.id} hidden={!shown}>
                    <TemplateCard
                      template={template}
                      selected={selectedTemplate?.id === template.id}
                      popular={POPULAR_TEMPLATE_IDS.has(template.id)}
                      resumeData={previewData}
                      key={previewData ? 'mine' : 'sample'}
                      onSelect={() => setSelectedTemplate(template)}
                      onPreview={() => openPreview(template)}
                    />
                  </li>
                );
              })}
            </ul>

            <p className="mx-auto mt-10 max-w-md text-center text-sm leading-relaxed text-slate-500 md:mt-14">
              Not sure yet? Pick any design to start. Your content stays when you switch templates in the editor.
            </p>
          </div>
        </main>

        <SelectionBar selected={selectedTemplate} onContinue={handleContinue} />
      </div>

      {/* Announce selection changes; the visible labels differ by screen size. */}
      <p className="sr-only" aria-live="polite">
        {selectedTemplate ? `${selectedTemplate.name} selected` : ''}
      </p>

      {previewing && (
        <PreviewDialog
          list={visible.some((t) => t.id === previewing.id) ? visible : templates}
          template={previewing}
          selectedId={selectedTemplate?.id}
          resumeData={previewData}
          content={content}
          onContentChange={canUseOwn ? setContent : null}
          onNavigate={(t) => setPreviewId(t.id)}
          onUse={chooseAndContinue}
          onClose={() => setPreviewId(null)}
          returnFocusTo={previewOpener}
        />
      )}

      {creating && <CreatingOverlay template={creating} />}
      <ToastViewport
        toasts={toasts}
        onDismiss={dismissToast}
        placement={isPhone ? 'bottom' : 'top-right'}
        style={isPhone ? { bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' } : undefined}
      />
    </>
  );
}

/**
 * Create a saved resume with a template and open it. Problems (the account's
 * limit, no connection) are toasts; a session that ended goes to sign-in and
 * comes back here.
 */
function useCreateResume() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState<Template | null>(null);
  const { toasts, showToast, dismissToast } = useToasts();

  const create = async (template: Template) => {
    if (creating) return;
    setCreating(template);
    try {
      const resume = await createResume({ templateId: template.id });
      navigate(`/editor/${resume.id}`);
    } catch (err) {
      setCreating(null);
      const status = err instanceof ApiError ? err.status : -1;
      if (status === 401) {
        navigate(`/signin?next=${encodeURIComponent('/templates?new=1')}`);
      } else if (status === 409) {
        showToast({ tone: 'error', title: 'No room for another resume', message: (err as Error).message });
      } else if (status === 0) {
        showToast({
          tone: 'offline',
          title: "You're offline",
          message: "Creating a resume needs a connection. Try again when you're back online.",
        });
      } else {
        showToast({
          tone: 'error',
          title: "Couldn't create the resume",
          message: err instanceof Error ? err.message : 'Please try again.',
        });
      }
    }
  };

  return { creating, create, toasts, dismissToast };
}

/** While the new resume is being created: the page holds still under a short message. */
function CreatingOverlay({ template }: { template: Template }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-white/75 px-6 backdrop-blur-sm motion-safe:animate-fade-in"
      role="status"
      aria-live="assertive"
    >
      <div className="flex flex-col items-center text-center">
        <span className="relative grid size-16 place-items-center rounded-2xl bg-white shadow-lift ring-1 ring-slate-200">
          <PlaneMark className="h-7" />
          <Loader2
            className="absolute -right-1.5 -bottom-1.5 size-6 animate-spin rounded-full bg-white p-0.5 text-aqua-700"
            aria-hidden="true"
          />
        </span>
        <p className="mt-5 text-lg font-semibold text-ink-900">Creating your resume…</p>
        <p className="mt-1 text-sm text-slate-600">With the {template.name} design</p>
      </div>
    </div>,
    document.body,
  );
}
