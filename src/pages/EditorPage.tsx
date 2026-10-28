import { Activity, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Download, Info, Loader2 } from 'lucide-react';
import { useResume } from '../context/ResumeContext';
import { EditorForm } from '../components/EditorForm';
import type { Template } from '../types/resume';
import { cn } from '../utils/cn';
import { EditorHeader } from '../components/editor/EditorHeader';
import { SaveIndicator } from '../components/editor/SaveIndicator';
import { TemplateSwitcher } from '../components/editor/TemplateSwitcher';
import { ZoomControls } from '../components/editor/ZoomControls';
import { MAX_ZOOM, MIN_ZOOM, PreviewCanvas, type PreviewMetrics } from '../components/editor/PreviewCanvas';
import { PICKER_GAP, TemplatePicker, thumbHeightFor } from '../components/editor/TemplatePicker';
import { BottomTabBar, MobileAppBar, type MobileTab } from '../components/editor/MobileChrome';
import { ToastViewport, useToasts } from '../components/editor/Toasts';
import { useMediaQuery, useOnlineStatus, useViewportWidth } from '../components/editor/useEnvironment';

/**
 * Where the editor posts a resume to get a PDF back.
 *
 * Defaults to `/api/pdf` on the app's own origin, which is how production is
 * deployed: the reverse proxy serves the app and the PDF API under one host,
 * so no CORS is involved at all (see docs/DEPLOY.md). Set
 * `VITE_PDF_SERVICE_URL` only to point a development build at a service on
 * another origin — a full URL ending in `/pdf`, or a base URL.
 */
function resolvePdfExportUrl(): string {
  const raw = import.meta.env.VITE_PDF_SERVICE_URL?.trim();
  if (!raw) return '/api/pdf';
  if (raw.endsWith('/pdf')) return raw;
  return `${raw.replace(/\/$/, '')}/pdf`;
}

/**
 * A filename built from the person's name: `amara-okonkwo-resume.pdf`.
 *
 * Every run of characters outside a-z0-9 collapses to one hyphen, so slashes,
 * colons and trailing dots — anything a filesystem might reject — cannot
 * survive into the name.
 */
function pdfFileName(fullName: string): string {
  const slug = fullName
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug ? `${slug}-resume.pdf` : 'resume.pdf';
}

/** What to tell the user when the export fails, by what actually went wrong. */
function exportFailureMessage(status: number | null): string {
  if (status === 429) return 'Too many exports in a short time. Please wait a minute and try again.';
  if (status === 503) return 'The PDF service is busy right now. Please try again in a few seconds.';
  if (status === 413) return 'This resume is too large to export — try a smaller photo.';
  if (status === 400) return 'Some of the resume data could not be exported. Check for unusually long entries.';
  return 'Could not generate the PDF. Please try again in a moment.';
}

/** Tailwind's `lg`: the two-pane desktop editor from here up. */
const DESKTOP_QUERY = '(min-width: 1024px)';

const ZOOM_STEP = 0.1;

const MOBILE_TITLES: Record<MobileTab, string> = {
  edit: 'Edit resume',
  preview: 'Preview',
  design: 'Design',
};

/** Phone panels sit under the translucent app bar and above the tab bar. */
const MOBILE_PANEL =
  'absolute inset-0 overflow-y-auto overscroll-contain pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-[calc(env(safe-area-inset-bottom)+4rem)] scroll-pt-[calc(env(safe-area-inset-top)+4.5rem)] scroll-pb-[calc(env(safe-area-inset-bottom)+5rem)]';

/** Content column on phones and tablets (Tailwind `max-w-2xl`, `px-4`). */
const MOBILE_CONTENT_MAX = 672;
const MOBILE_GUTTER = 16;

const pagesLabel = (pages: number) => `${pages} ${pages === 1 ? 'page' : 'pages'}`;

export function EditorPage() {
  const navigate = useNavigate();
  const { resumeData, selectedTemplate, setSelectedTemplate, saveStatus } = useResume();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const online = useOnlineStatus();
  const viewportWidth = useViewportWidth();
  const { toasts, showToast, dismissToast } = useToasts();

  const [isExporting, setIsExporting] = useState(false);
  const [zoom, setZoom] = useState<number | 'fit'>('fit');
  const [metrics, setMetrics] = useState<PreviewMetrics>({ fitScale: 1, pages: 1 });
  const [tab, setTab] = useState<MobileTab>('edit');

  useEffect(() => {
    if (!selectedTemplate) {
      navigate('/templates', { replace: true });
    }
  }, [selectedTemplate, navigate]);

  // --- Phone tabs -----------------------------------------------------------
  // Each view is its own scroll container; hidden ones are display:none, which
  // forgets the scroll offset, so it is saved on the way out and put back.
  const editScrollRef = useRef<HTMLElement | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const designScrollRef = useRef<HTMLElement | null>(null);
  const scrollOffsets = useRef<Record<MobileTab, number>>({ edit: 0, preview: 0, design: 0 });
  const scrollerFor = (t: MobileTab) =>
    t === 'edit' ? editScrollRef.current : t === 'preview' ? previewScrollRef.current : designScrollRef.current;

  const selectTab = (next: MobileTab) => {
    if (next === tab) {
      scrollerFor(next)?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    scrollOffsets.current[tab] = scrollerFor(tab)?.scrollTop ?? 0;
    setTab(next);
  };

  useLayoutEffect(() => {
    const el = scrollerFor(tab);
    if (el) el.scrollTop = scrollOffsets.current[tab];
  }, [tab]);

  // --- Template and zoom ----------------------------------------------------
  const pickTemplate = useCallback((template: Template) => setSelectedTemplate(template), [setSelectedTemplate]);

  const scale = zoom === 'fit' ? metrics.fitScale : zoom;
  const zoomIn = () =>
    setZoom(Math.min(MAX_ZOOM, Math.floor(scale / ZOOM_STEP + 1e-6) * ZOOM_STEP + ZOOM_STEP));
  const zoomOut = () =>
    setZoom(Math.max(MIN_ZOOM, Math.ceil(scale / ZOOM_STEP - 1e-6) * ZOOM_STEP - ZOOM_STEP));

  // --- Export ---------------------------------------------------------------
  const handleExportPDF = async () => {
    if (!selectedTemplate || isExporting) return;

    if (navigator.onLine === false) {
      showToast({
        tone: 'offline',
        title: "You're offline",
        message:
          saveStatus === 'failed'
            ? "Exporting needs a connection. Keep this tab open and export when you're back online."
            : "Your resume is saved on this device. Export the PDF when you're back online.",
      });
      return;
    }

    setIsExporting(true);
    let status: number | null = null;
    try {
      // No print URL is sent. The service renders a URL from its own
      // configuration; it used to take one from this request body, which let
      // any caller point the server's browser at an arbitrary address.
      const response = await fetch(resolvePdfExportUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: { resumeData, selectedTemplate } }),
      });
      status = response.status;

      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const detail = contentType.includes('application/json')
          ? JSON.stringify(await response.json())
          : await response.text();
        throw new Error(detail || `HTTP ${response.status}`);
      }
      if (!contentType.includes('application/pdf')) {
        throw new Error('PDF service did not return a PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const fileName = pdfFileName(resumeData.personalInfo.fullName);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      showToast({ tone: 'success', title: 'PDF downloaded', message: fileName });
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast({ tone: 'error', title: 'Export failed', message: exportFailureMessage(status) });
    } finally {
      setIsExporting(false);
    }
  };

  if (!selectedTemplate) {
    return null;
  }

  const saveIndicator = (
    <SaveIndicator status={saveStatus} online={online} size={isDesktop ? 'md' : 'sm'} />
  );

  // Design tab grid: 2 columns on phones, 3 on small tablets.
  const designColumns = viewportWidth >= 640 ? 3 : 2;
  const designContentWidth = Math.min(viewportWidth, MOBILE_CONTENT_MAX) - MOBILE_GUTTER * 2;
  const designThumbHeight = thumbHeightFor(
    (designContentWidth - PICKER_GAP * (designColumns - 1)) / designColumns,
  );

  const exportFabOffset = 'calc(env(safe-area-inset-bottom) + 4rem + 0.75rem)';

  return (
    <div className={cn('flex h-dvh flex-col overflow-hidden', isDesktop ? 'bg-slate-100' : 'relative bg-slate-50')}>
      {isDesktop ? (
        <EditorHeader
          status={saveIndicator}
          isExporting={isExporting}
          onExport={handleExportPDF}
          controls={
            <>
              <ZoomControls
                scale={scale}
                isFit={zoom === 'fit'}
                canZoomIn={scale < MAX_ZOOM - 1e-6}
                canZoomOut={scale > MIN_ZOOM + 1e-6}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onFit={() => setZoom('fit')}
              />
              <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden="true" />
              <TemplateSwitcher template={selectedTemplate} onSelect={pickTemplate} />
            </>
          }
        />
      ) : (
        <MobileAppBar
          title={MOBILE_TITLES[tab]}
          status={saveIndicator}
          onBack={() => navigate('/templates')}
          onExport={handleExportPDF}
          isExporting={isExporting}
        />
      )}

      <main className={cn('relative min-h-0 flex-1', isDesktop && 'flex')}>
        {/* The form. Mounted once in both layouts so its state survives a resize. */}
        <section
          ref={editScrollRef}
          aria-label="Resume details"
          className={cn(
            isDesktop
              ? 'w-[480px] shrink-0 overflow-y-auto overscroll-contain border-r border-slate-200 bg-slate-50 xl:w-[540px]'
              : [MOBILE_PANEL, tab !== 'edit' && 'hidden'],
          )}
        >
          <div className={isDesktop ? 'px-6 pt-6 pb-10' : 'mx-auto max-w-2xl px-4 pt-4 pb-8'}>
            <EditorForm />
          </div>
        </section>

        {/* The live preview. */}
        <section
          aria-label="Preview"
          className={cn(
            isDesktop ? 'relative min-w-0 flex-1' : ['absolute inset-0', tab !== 'preview' && 'hidden'],
          )}
        >
          <PreviewCanvas
            zoom={isDesktop ? zoom : 'fit'}
            maxFit={1}
            active={isDesktop || tab === 'preview'}
            onMetrics={setMetrics}
            scrollRef={previewScrollRef}
            className={cn(
              'absolute inset-0',
              isDesktop
                ? 'px-10 pt-8 pb-20 [scrollbar-gutter:stable] [background-image:radial-gradient(rgb(148_163_184/0.32)_1px,transparent_1.2px)] [background-size:22px_22px]'
                : 'px-4 pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-[calc(env(safe-area-inset-bottom)+4rem+5.5rem)]',
            )}
            before={
              !isDesktop && (
                <div className="flex items-center justify-between gap-3 py-3">
                  <button
                    type="button"
                    onClick={() => selectTab('design')}
                    className="-ml-1 flex min-h-11 min-w-0 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-ink-900 active:bg-slate-200/60"
                  >
                    <span
                      className="size-3 shrink-0 rounded-full ring-2 ring-white outline outline-1 outline-slate-300"
                      style={{ backgroundColor: selectedTemplate.colors.primary }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{selectedTemplate.name}</span>
                    <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                  </button>
                  <span className="shrink-0 text-xs font-medium text-slate-500">A4 · {pagesLabel(metrics.pages)}</span>
                </div>
              )
            }
          />

          {isDesktop ? (
            <div className="pointer-events-none absolute right-7 bottom-5 flex justify-end">
              <div
                className="pointer-events-auto flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 py-1.5 pr-3.5 pl-3 text-xs font-medium text-slate-600 shadow-soft backdrop-blur"
                title="Dashed lines in the preview mark where each A4 page ends."
              >
                <Info className="size-3.5 text-aqua-700" aria-hidden="true" />
                A4 · {pagesLabel(metrics.pages)}
                {metrics.pages > 1 && <span className="text-slate-400">· dashed lines mark page breaks</span>}
              </div>
            </div>
          ) : (
            <div
              className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-4"
              style={{ bottom: exportFabOffset }}
            >
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={isExporting}
                aria-busy={isExporting}
                className="btn-primary btn-lg pointer-events-auto rounded-full px-7 shadow-lift disabled:opacity-90"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                    Exporting…
                  </>
                ) : (
                  <>
                    <Download className="size-5" aria-hidden="true" />
                    Export PDF
                  </>
                )}
              </button>
            </div>
          )}
        </section>

        {/* Phone-only: the template picker. */}
        {!isDesktop && (
          <section
            ref={designScrollRef}
            aria-label="Design"
            className={cn(MOBILE_PANEL, tab !== 'design' && 'hidden')}
          >
            <Activity mode={tab === 'design' ? 'visible' : 'hidden'}>
              <div className="mx-auto max-w-2xl px-4 pt-4 pb-8">
                <p className="mb-3 text-sm text-slate-500">
                  Tap a template to switch. Your content stays exactly as it is.
                </p>
                <TemplatePicker
                  selectedId={selectedTemplate.id}
                  onSelect={pickTemplate}
                  columns={designColumns}
                  thumbHeight={designThumbHeight}
                />
              </div>
            </Activity>
          </section>
        )}
      </main>

      {!isDesktop && <BottomTabBar active={tab} onSelect={selectTab} />}

      <ToastViewport
        toasts={toasts}
        onDismiss={dismissToast}
        placement={isDesktop ? 'top-right' : 'bottom'}
        style={
          isDesktop
            ? undefined
            : { bottom: tab === 'preview' ? `calc(${exportFabOffset} + 4rem)` : exportFabOffset }
        }
      />
    </div>
  );
}
