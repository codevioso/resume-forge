import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { templates } from '../data/templates';
import { useResume } from '../context/ResumeContext';
import { APP_NAME } from '../constants/brand';
import type { Template } from '../types/resume';
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
 * The category filter lives in the URL (`?category=tech`), so it survives
 * Back from the editor and can be linked to.
 */
export function TemplatesPage() {
  const navigate = useNavigate();
  const { selectedTemplate, setSelectedTemplate, resumeData } = useResume();
  const [searchParams, setSearchParams] = useSearchParams();

  const categoryParam = searchParams.get('category');
  const category: CategoryFilterValue = isCategory(categoryParam) ? categoryParam : 'all';
  const counts = useMemo(() => countByCategory(templates), []);
  const visible = useMemo(
    () => (category === 'all' ? templates : templates.filter((t) => t.category === category)),
    [category],
  );

  const canUseOwn = canPreviewWithOwnResume(resumeData);
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
    setSearchParams(value === 'all' ? {} : { category: value }, { replace: true });
  };

  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/');
  };

  const handleContinue = () => {
    if (selectedTemplate) navigate('/editor');
  };

  const chooseAndContinue = (template: Template) => {
    setSelectedTemplate(template);
    setPreviewId(null);
    navigate('/editor');
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
                <p className="eyebrow">Step 1 of 3</p>
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
    </>
  );
}
