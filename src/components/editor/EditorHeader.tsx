import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Download, Loader2 } from 'lucide-react';
import { BrandMark } from '../BrandMark';
import { APP_NAME } from '../../constants/brand';

/**
 * The desktop editor's header: brand and save status on the left, the
 * document controls (passed in as `controls`) and Export PDF on the right.
 */
export function EditorHeader({
  status,
  controls,
  isExporting,
  onExport,
}: {
  status: ReactNode;
  controls: ReactNode;
  isExporting: boolean;
  onExport: () => void;
}) {
  return (
    <header className="relative z-40 flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-5 xl:px-6">
      <Link to="/" className="-ml-1 shrink-0 rounded-lg p-1" aria-label={`${APP_NAME} home`}>
        <BrandMark className="h-9" />
      </Link>
      <span className="h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />
      <div className="min-w-0 flex-1">{status}</div>
      <div className="flex shrink-0 items-center gap-2.5">
        {controls}
        <button
          type="button"
          onClick={onExport}
          disabled={isExporting}
          aria-busy={isExporting}
          className="btn-primary min-w-[8.75rem] disabled:opacity-80"
        >
          {isExporting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Exporting…
            </>
          ) : (
            <>
              <Download className="size-4" aria-hidden="true" />
              Export PDF
            </>
          )}
        </button>
      </div>
    </header>
  );
}
