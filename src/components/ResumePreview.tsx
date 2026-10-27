import { forwardRef, useLayoutEffect, useRef, useState } from 'react';
import { useResume } from '../context/ResumeContext';
import { A4_HEIGHT_PX, A4_WIDTH_PX } from '../constants/layout';
import { getTemplateComponent } from '../templates/registry';
import { templateFonts } from '../templates/fonts';

type ResumePreviewProps = {
  /**
   * Draw a dashed guide at every A4 page boundary. On for the editor, off for
   * the print route and the gallery thumbnails. Guides are screen-only: the
   * print stylesheet hides them even if a caller forgets to switch them off.
   */
  showPageGuides?: boolean;
};

/**
 * Where each page boundary falls, for the on-screen guides.
 *
 * Measured from the rendered document rather than assumed, so the editor shows
 * as many pages as the content actually needs. These are A4-height multiples;
 * the PDF can break a little earlier where an entry is kept whole and moved to
 * the next page, which the label below says.
 */
function PageGuides({ height }: { height: number }) {
  const pages = Math.max(1, Math.ceil(height / A4_HEIGHT_PX));
  if (pages < 2) return null;
  return (
    <div data-page-guides aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {Array.from({ length: pages - 1 }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: (i + 1) * A4_HEIGHT_PX,
            borderTop: '2px dashed rgba(239, 68, 68, 0.55)',
          }}
        >
          <span
            style={{
              position: 'absolute',
              right: 8,
              top: 4,
              fontSize: 11,
              fontFamily: 'system-ui, sans-serif',
              color: 'rgba(239, 68, 68, 0.85)',
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '1px 6px',
              borderRadius: 4,
            }}
          >
            Page {i + 2}
          </span>
        </div>
      ))}
    </div>
  );
}

export const ResumePreview = forwardRef<HTMLDivElement, ResumePreviewProps>(({ showPageGuides = false }, ref) => {
  const { resumeData, selectedTemplate } = useResume();
  const { personalInfo, experiences, education, skills } = resumeData;

  const hasContent =
    personalInfo.fullName ||
    personalInfo.email ||
    experiences.length > 0 ||
    education.length > 0 ||
    skills.length > 0;

  const Template = getTemplateComponent(selectedTemplate?.id);

  // Track the document's real height so the guides follow the content. A
  // ResizeObserver rather than a one-off measurement: the height changes on
  // every keystroke, and when a font or the photo finishes loading.
  const bodyRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(A4_HEIGHT_PX);
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || !showPageGuides) return;
    const update = () => setHeight(el.scrollHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [showPageGuides, Template]);

  if (!hasContent) {
    return (
      <div
        ref={ref}
        style={{
          width: A4_WIDTH_PX,
          height: A4_HEIGHT_PX,
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: templateFonts.modern,
        }}
      >
        <div style={{ textAlign: 'center', color: '#9ca3af' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 16px auto',
              borderRadius: '50%',
              backgroundColor: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg style={{ width: '40px', height: '40px', color: '#d1d5db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p style={{ fontSize: '18px', fontWeight: 500 }}>Start filling in your details</p>
          <p style={{ fontSize: '14px', marginTop: '4px' }}>Your resume preview will appear here</p>
        </div>
      </div>
    );
  }

  // No fixed height and no overflow clipping. This wrapper used to be a fixed
  // 1123px box with `overflow: hidden`, which silently cut off everything past
  // the first page — on screen and in the PDF alike. It now grows with the
  // document; the gallery thumbnail does its own cropping to page one.
  return (
    <div ref={ref} data-resume-preview style={{ width: A4_WIDTH_PX, minHeight: A4_HEIGHT_PX, position: 'relative' }}>
      <div ref={bodyRef}>
        <Template />
      </div>
      {showPageGuides && <PageGuides height={height} />}
    </div>
  );
});

ResumePreview.displayName = 'ResumePreview';
