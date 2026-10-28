import { useRef, useState, type KeyboardEvent } from 'react';
import { Pencil } from 'lucide-react';
import { cleanTitle } from '../resumes/RenameDialog';
import { TITLE_MAX } from '../resumes/drafts';
import { cn } from '../../utils/cn';

/**
 * The resume's name in the desktop header. Click it to rename in place:
 * Enter or clicking away keeps the new name, Escape puts the old one back.
 */
export function ResumeTitleField({
  value,
  onRename,
  className,
}: {
  value: string;
  onRename: (title: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const done = useRef(false);

  const start = () => {
    setDraft(value);
    done.current = false;
    setEditing(true);
  };

  const finish = (commit: boolean) => {
    if (done.current) return;
    done.current = true;
    const next = cleanTitle(draft);
    if (commit && next && next !== value) onRename(next);
    setEditing(false);
    requestAnimationFrame(() => buttonRef.current?.focus({ preventScroll: true }));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finish(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    }
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => finish(true)}
        onKeyDown={onKeyDown}
        maxLength={TITLE_MAX}
        aria-label="Resume name"
        className={cn(
          '-ml-1.5 h-7 min-w-40 max-w-full rounded-lg border border-aqua-600 bg-white px-1.5 text-[15px] font-semibold text-ink-900 ring-4 ring-aqua-100 outline-none [field-sizing:content]',
          className,
        )}
      />
    );
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={start}
      title="Rename"
      className={cn(
        'group -ml-1.5 flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-lg px-1.5 text-left text-[15px] font-semibold text-ink-900 transition hover:bg-slate-100',
        className,
      )}
    >
      <span className="truncate" data-resume-title>
        {value}
      </span>
      <span className="sr-only">, rename</span>
      <Pencil
        className="size-3.5 shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
        aria-hidden="true"
      />
    </button>
  );
}
