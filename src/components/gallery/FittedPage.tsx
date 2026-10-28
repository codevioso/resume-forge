import { useRef } from 'react';
import { TemplateThumbnail } from '../TemplateThumbnail';
import { A4_HEIGHT_PX, A4_WIDTH_PX } from '../../constants/layout';
import type { ResumeData, Template } from '../../types/resume';
import { cn } from '../../utils/cn';
import { useElementSize } from './hooks';

const A4_RATIO = A4_WIDTH_PX / A4_HEIGHT_PX;

/**
 * The first page of a template, scaled to its box.
 *
 * `width` fills the box's width (the page may run past the bottom; the
 * caller crops it). `contain` fits the whole page inside the box.
 * The box (`className`) must have a definite width, and for `contain` a
 * definite height too.
 */
export function FittedPage({
  template,
  resumeData,
  fit = 'width',
  className,
  pageClassName,
}: {
  template: Template;
  resumeData?: ResumeData;
  fit?: 'width' | 'contain';
  className?: string;
  pageClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(ref);
  const byWidth = width / A4_RATIO;
  const pageHeight = Math.floor(fit === 'contain' ? Math.min(height, byWidth) : byWidth);

  // `inert`: the templates render real links (email, website…). In a preview
  // they must not be tab stops or reach screen readers.
  return (
    <div ref={ref} className={className} inert>
      {pageHeight > 0 && (
        <TemplateThumbnail
          template={template}
          resumeData={resumeData}
          height={pageHeight}
          className={cn('bg-white', pageClassName)}
        />
      )}
    </div>
  );
}
