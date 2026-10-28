import { ResumeProvider } from '../context/ResumeContext';
import { sampleResume } from '../data/sampleResume';
import type { ResumeData, Template } from '../types/resume';
import { A4_HEIGHT_PX, A4_WIDTH_PX } from '../constants/layout';
import { StaticLinks } from '../templates/fields';
import { cn } from '../utils/cn';
import { ResumePreview } from './ResumePreview';

/**
 * A real, scaled-down render of a template: the same components the editor
 * and the PDF use, filled with the sample resume. Shows the first A4 page.
 *
 * A picture, not a document: it is inert (nothing inside can be focused or
 * clicked) and its contact links render as plain text, so it can sit inside a
 * clickable card or a link.
 *
 * `height` is the thumbnail's height in px; the width follows the A4 ratio.
 * `className` styles the frame around it (background, rounding, border).
 */
export function TemplateThumbnail({
  template,
  height = 256,
  className,
  resumeData = sampleResume,
}: {
  template: Template;
  height?: number;
  className?: string;
  resumeData?: ResumeData;
}) {
  const scale = height / A4_HEIGHT_PX;
  return (
    <ResumeProvider initialResumeData={resumeData} initialTemplate={template}>
      <div className={cn('flex justify-center overflow-hidden bg-slate-100', className)} style={{ height }} aria-hidden="true" inert>
        <div style={{ width: A4_WIDTH_PX * scale, height }}>
          <div
            style={{
              width: A4_WIDTH_PX,
              height: A4_HEIGHT_PX,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
            }}
          >
            <StaticLinks.Provider value>
              <ResumePreview />
            </StaticLinks.Provider>
          </div>
        </div>
      </div>
    </ResumeProvider>
  );
}
