import { useId } from 'react';
import { cn } from '../../utils/cn';

export type PreviewContent = 'sample' | 'mine';

/**
 * Switch the previews between the sample resume and the user's own. Only
 * shown once the user has typed something worth previewing.
 */
export function ContentToggle({
  value,
  onChange,
  className,
}: {
  value: PreviewContent;
  onChange: (value: PreviewContent) => void;
  className?: string;
}) {
  const labelId = useId();
  const options: { value: PreviewContent; label: string }[] = [
    { value: 'sample', label: 'Sample resume' },
    { value: 'mine', label: 'My resume' },
  ];
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="text-sm text-slate-600" id={labelId}>
        Preview with
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1"
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={cn(
                'min-h-9 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition',
                active ? 'bg-white text-ink-900 shadow-soft' : 'text-slate-600 hover:text-ink-900',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
