import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { Copy, Ellipsis, ExternalLink, Pencil, Trash2, type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useMediaQuery } from '../editor/useEnvironment';
import { Dialog, SHEET_QUERY } from './Dialog';

export type ResumeAction = 'open' | 'rename' | 'duplicate' | 'delete';

const ITEMS: { id: ResumeAction; label: string; icon: LucideIcon; danger?: boolean }[] = [
  { id: 'open', label: 'Open', icon: ExternalLink },
  { id: 'rename', label: 'Rename', icon: Pencil },
  { id: 'duplicate', label: 'Duplicate', icon: Copy },
  { id: 'delete', label: 'Delete', icon: Trash2, danger: true },
];

/**
 * A resume card's "more" button. A menu under the button with a mouse and
 * keyboard; on phones, an action sheet from the bottom, like a native app.
 */
export function ResumeActions({
  title,
  subtitle,
  onAction,
  disabled = {},
  className,
}: {
  title: string;
  /** Under the title in the phone sheet: the template and when it was edited. */
  subtitle: ReactNode;
  onAction: (action: ResumeAction) => void;
  disabled?: Partial<Record<ResumeAction, boolean>>;
  className?: string;
}) {
  const isSheet = useMediaQuery(SHEET_QUERY);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const choose = (action: ResumeAction) => {
    setOpen(false);
    // After the menu has closed and focus is back, so a dialog opened next
    // returns focus to this button.
    requestAnimationFrame(() => onAction(action));
  };

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup={isSheet ? 'dialog' : 'menu'}
        aria-expanded={open}
        aria-controls={open && !isSheet ? menuId : undefined}
        aria-label={`More actions for ${title}`}
        className={cn(
          'grid size-11 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-ink-900 active:scale-95',
          open && 'bg-slate-100 text-ink-900',
        )}
      >
        <Ellipsis className="size-5" aria-hidden="true" />
      </button>

      {open &&
        (isSheet ? (
          <Dialog
            title={title}
            description={subtitle}
            onClose={() => setOpen(false)}
            footer={
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
                Cancel
              </button>
            }
          >
            <ul className="-mx-2 -mt-1 pb-1" role="list">
              {ITEMS.map(({ id, label, icon: Icon, danger }) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => choose(id)}
                    disabled={disabled[id]}
                    className={cn(
                      'flex min-h-14 w-full items-center gap-4 rounded-2xl px-3 text-left text-base font-medium transition active:bg-slate-100 disabled:opacity-40',
                      danger ? 'text-red-600' : 'text-ink-900',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-10 shrink-0 place-items-center rounded-xl',
                        danger ? 'bg-red-50' : 'bg-slate-100 text-ink-700',
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </Dialog>
        ) : (
          <Menu id={menuId} triggerRef={triggerRef} onClose={() => setOpen(false)} onChoose={choose} disabled={disabled} />
        ))}
    </div>
  );
}

function Menu({
  id,
  triggerRef,
  onClose,
  onChoose,
  disabled,
}: {
  id: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onChoose: (action: ResumeAction) => void;
  disabled: Partial<Record<ResumeAction, boolean>>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [upward, setUpward] = useState(false);

  // Open upward when there is no room below (the last row of cards).
  useLayoutEffect(() => {
    const trigger = triggerRef.current?.getBoundingClientRect();
    const menu = ref.current?.getBoundingClientRect();
    if (trigger && menu) setUpward(trigger.bottom + menu.height + 12 > window.innerHeight && trigger.top > menu.height + 12);
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus({ preventScroll: true });
  }, [triggerRef]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!ref.current?.contains(target) && !triggerRef.current?.contains(target)) onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [onClose, triggerRef]);

  const onKeyDown = (e: KeyboardEvent) => {
    const items = [...(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      triggerRef.current?.focus();
    } else if (e.key === 'Tab') {
      onClose();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      items[(index + step + items.length) % items.length]?.focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      items[e.key === 'Home' ? 0 : items.length - 1]?.focus();
    }
  };

  return (
    <div
      ref={ref}
      id={id}
      role="menu"
      aria-label="Resume actions"
      onKeyDown={onKeyDown}
      className={cn(
        'absolute right-0 z-30 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lift motion-safe:animate-fade-in',
        upward ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
      )}
    >
      {ITEMS.map(({ id: action, label, icon: Icon, danger }) => (
        <div key={action}>
          {danger && <div className="mx-2 my-1 h-px bg-slate-100" role="separator" />}
          <button
            type="button"
            role="menuitem"
            onClick={() => onChoose(action)}
            disabled={disabled[action]}
            className={cn(
              'flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium outline-none transition disabled:opacity-40',
              danger
                ? 'text-red-600 hover:bg-red-50 focus-visible:bg-red-50'
                : 'text-ink-800 hover:bg-slate-100 focus-visible:bg-slate-100',
            )}
          >
            <Icon className={cn('size-4', danger ? 'text-red-500' : 'text-slate-500')} aria-hidden="true" />
            {label}
          </button>
        </div>
      ))}
    </div>
  );
}
