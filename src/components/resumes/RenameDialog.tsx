import { useId, useRef, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog } from './Dialog';
import { TITLE_MAX } from './drafts';

/** A title as stored: trimmed, within the limit. Empty means "no change". */
export const cleanTitle = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, TITLE_MAX);

/**
 * Rename a resume. The name is only for the user (it is not printed on the
 * resume), so the hint says so.
 */
export function RenameDialog({
  title,
  onRename,
  onClose,
}: {
  title: string;
  /** Resolves when saved; a rejection keeps the dialog open (the caller shows why). */
  onRename: (title: string) => Promise<void> | void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(title);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const hintId = useId();
  const next = cleanTitle(value);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!next || busy) return;
    if (next === title) return onClose();
    setBusy(true);
    try {
      await onRename(next);
      onClose();
    } catch {
      setBusy(false);
    }
  };

  return (
    <Dialog
      title="Rename resume"
      onClose={onClose}
      initialFocus={inputRef}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" form={`${inputId}-form`} disabled={!next || busy} className="btn-primary min-w-24">
            {busy ? <Loader2 className="size-4 animate-spin" aria-label="Saving" /> : 'Save'}
          </button>
        </>
      }
    >
      <form id={`${inputId}-form`} onSubmit={submit}>
        <label htmlFor={inputId} className="field-label">
          Name
        </label>
        <input
          ref={inputRef}
          id={inputId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          maxLength={TITLE_MAX}
          autoComplete="off"
          enterKeyHint="done"
          aria-describedby={hintId}
          className="field-input"
        />
        <p id={hintId} className="field-hint">
          Only you see this name — it isn't printed on the resume.
        </p>
      </form>
    </Dialog>
  );
}
