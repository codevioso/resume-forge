import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, CircleQuestionMark, LayoutTemplate, ListOrdered, Menu, Sparkles, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BrandMark } from '../BrandMark';
import { AccountMenu, AccountSheetSection } from '../account/AccountMenu';
import { APP_NAME } from '../../constants/brand';
import { cn } from '../../utils/cn';
import { Container, IconChip, scrollToSection } from './shared';

type NavItem = { label: string; icon: LucideIcon } & ({ to: string } | { section: string });

const NAV: NavItem[] = [
  { label: 'Templates', to: '/templates', icon: LayoutTemplate },
  { label: 'Features', section: 'features', icon: Sparkles },
  { label: 'How it works', section: 'how-it-works', icon: ListOrdered },
  { label: 'FAQ', section: 'faq', icon: CircleQuestionMark },
];

/** Route links go through the router; section links scroll smoothly in place. */
function NavLink({ item, className, onNavigate, children }: {
  item: NavItem;
  className: string;
  onNavigate?: () => void;
  children: ReactNode;
}) {
  if ('to' in item) {
    return (
      <Link to={item.to} className={className} onClick={onNavigate}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={`#${item.section}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        onNavigate?.();
        // After the sheet has closed and unlocked page scrolling.
        requestAnimationFrame(() => scrollToSection(item.section));
      }}
    >
      {children}
    </a>
  );
}

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'pt-safe sticky top-0 z-40 border-b backdrop-blur-xl backdrop-saturate-150 transition-[background-color,border-color] duration-200',
        scrolled ? 'border-slate-200/80 bg-white/80' : 'border-transparent bg-white/50',
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-4 md:grid md:grid-cols-[1fr_auto_1fr]">
        <Link to="/" aria-label={`${APP_NAME} home`} className="-ml-1 flex items-center justify-self-start rounded-lg p-1">
          <BrandMark variant="compact" className="md:hidden" />
          <BrandMark className="hidden h-10 md:block" />
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.label}>
                <NavLink
                  item={item}
                  className="inline-flex min-h-11 items-center rounded-lg px-3.5 text-sm font-medium text-slate-600 transition hover:bg-ink-50/70 hover:text-ink-900"
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center justify-end gap-1">
          <AccountMenu className="hidden md:flex" />
          <AccountMenu compact className="md:hidden" />
          <Link to="/templates" className="btn-primary group ml-1 hidden md:inline-flex">
            Create my resume
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="btn-icon -mr-2 md:hidden"
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu className="size-6" aria-hidden="true" />
          </button>
        </div>
      </Container>

      {open && createPortal(<MenuSheet onClose={close} />, document.body)}
    </header>
  );
}

/** The phone menu: a bottom sheet, where the thumb already is. */
function MenuSheet({ onClose }: { onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lock page scrolling behind the sheet. Layout effect, so the lock is gone
  // before a section link scrolls the page.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = prev;
    };
  }, []);

  // Focus moves into the sheet, stays there, and returns to the menu button.
  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null;
    const sheet = sheetRef.current;
    const focusables = () =>
      Array.from(sheet?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      returnTo?.focus({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="absolute inset-0 bg-ink-950/45 backdrop-blur-[2px] motion-safe:animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="landing-menu-title"
        className="pb-safe-4 absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[1.75rem] bg-white px-4 pt-2.5 shadow-lift motion-safe:animate-sheet-up"
      >
        <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-200" aria-hidden="true" />
        <div className="mt-2 flex items-center justify-between pl-2">
          <h2 id="landing-menu-title" className="text-base font-bold text-ink-900">
            Menu
          </h2>
          <button type="button" className="btn-icon -mr-1" aria-label="Close menu" onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Main" className="mt-1">
          <ul className="space-y-1">
            {NAV.map((item, i) => (
              <li key={item.label}>
                <NavLink
                  item={item}
                  onNavigate={onClose}
                  className="flex min-h-14 items-center gap-3.5 rounded-2xl px-2 py-1.5 text-base font-semibold text-ink-900 transition active:bg-slate-100 hover:bg-slate-50"
                >
                  <IconChip icon={item.icon} tone={i % 2 ? 'mint' : 'aqua'} className="size-10" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className="size-5 text-slate-400" aria-hidden="true" />
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <AccountSheetSection onNavigate={onClose} />

        <Link to="/templates" className="btn-primary btn-lg mt-3 w-full" onClick={onClose}>
          Create my resume
          <ArrowRight className="size-5" aria-hidden="true" />
        </Link>
        <p className="mt-3 mb-1 text-center text-xs text-slate-500">Free · No account needed</p>
      </div>
    </div>
  );
}
