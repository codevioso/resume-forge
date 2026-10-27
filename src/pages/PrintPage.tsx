import { useEffect, useMemo, useState } from 'react';
import { ResumePreview } from '../components/ResumePreview';
import { ResumeProvider } from '../context/ResumeContext';
import { A4_WIDTH_PX } from '../constants/layout';
import { PDF_EXPORT_STORAGE_KEY } from '../constants/pdfExport';
import type { ResumeData, Template } from '../types/resume';

type PrintSnapshot = {
  resumeData: ResumeData;
  selectedTemplate: Template;
};

function readSnapshot(): PrintSnapshot | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PDF_EXPORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PrintSnapshot>;
    if (!parsed.resumeData || !parsed.selectedTemplate?.id) return null;
    return {
      resumeData: parsed.resumeData,
      selectedTemplate: parsed.selectedTemplate as Template,
    };
  } catch {
    return null;
  }
}

function PrintCanvas() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.body.style.background = '#ffffff';
    return () => {
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.documentElement.style.margin = '';
      document.documentElement.style.padding = '';
      document.body.style.background = '';
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await document.fonts.ready;
      const imgs = [...document.querySelectorAll('img')];
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              }),
        ),
      );
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => setTimeout(r, 80));
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Width only. This used to be a fixed 1123px box with `overflow: hidden`,
  // the last of three places that clipped every resume to one page. Chromium
  // now paginates the document by the @page rule in src/styles/print.css.
  // No background either: the canvas is white (print.css) or painted by the
  // template's PageBackdrop, and a white box here ended where the content
  // ended, leaving a light seam across the last page of every dark design.
  return (
    <div style={{ width: A4_WIDTH_PX, margin: 0, padding: 0 }}>
      <div data-print-ready={ready ? 'true' : undefined} style={{ width: '100%', height: '100%' }}>
        <ResumePreview />
      </div>
    </div>
  );
}

/**
 * Playwright loads this route with sessionStorage pre-filled by the PDF service.
 * Nested ResumeProvider overrides the app shell provider so the snapshot is authoritative.
 */
export function PrintPage() {
  const snapshot = useMemo(() => readSnapshot(), []);

  if (!snapshot) {
    return (
      <div data-print-error="true" style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        Missing print data. Export from the editor while the PDF service is running.
      </div>
    );
  }

  return (
    <ResumeProvider initialResumeData={snapshot.resumeData} initialTemplate={snapshot.selectedTemplate}>
      <PrintCanvas />
    </ResumeProvider>
  );
}
