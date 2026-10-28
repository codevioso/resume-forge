import { useState } from 'react';
import { initialsOf, type AccountUser } from './authHelpers';
import { cn } from '../../utils/cn';

/**
 * The user's picture (Google accounts) or their initials on the brand navy.
 * Decorative: whatever it sits in names the user in text.
 */
export function Avatar({ user, className }: { user: Pick<AccountUser, 'name' | 'email' | 'image'>; className?: string }) {
  const [broken, setBroken] = useState(false);
  const base = cn('inline-flex size-9 shrink-0 select-none items-center justify-center overflow-hidden rounded-full text-[13px]', className);

  if (user.image && !broken) {
    return (
      <img
        src={user.image}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={cn(base, 'bg-slate-100 object-cover')}
      />
    );
  }
  return (
    <span aria-hidden="true" className={cn(base, 'bg-ink-900 font-semibold tracking-wide text-aqua-200')}>
      {initialsOf(user.name, user.email)}
    </span>
  );
}
