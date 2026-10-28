import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Phones only: the main call to action, pinned above the home indicator once
 * the hero's buttons have scrolled away. Hidden again at the closing CTA, so
 * the page never shows the same button twice.
 */
export function MobileCtaBar({ visible }: { visible: boolean }) {
  return (
    <div
      inert={!visible}
      aria-hidden={!visible}
      className={cn(
        'pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/85 backdrop-blur-xl backdrop-saturate-150 transition duration-300 ease-out motion-reduce:transition-none md:hidden',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0',
      )}
    >
      <div className="px-4 pt-3 pb-3">
        <Link to="/templates" className="btn-primary btn-lg w-full">
          Create my resume
          <ArrowRight className="size-5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
