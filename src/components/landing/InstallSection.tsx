import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AppWindow, Check, Download, Share, SquarePlus, Store, WifiOff } from 'lucide-react';
import { PlaneMark } from '../BrandMark';
import { APP_NAME } from '../../constants/brand';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { cn } from '../../utils/cn';
import { Container, SECTION_Y } from './shared';

const PERKS = [
  { icon: AppWindow, label: 'Opens in its own window' },
  { icon: WifiOff, label: 'Editor works offline' },
  { icon: Store, label: 'No app store needed' },
];

/** "Install app": the browser's own prompt where there is one, the Share-sheet steps on iOS. */
export function InstallSection() {
  const { canInstall, install, installed, isIos } = useInstallPrompt();
  const [busy, setBusy] = useState(false);
  if (installed) return null;

  return (
    <section id="install" aria-labelledby="install-title" className={cn('scroll-mt-16 overflow-hidden', SECTION_Y, 'pt-0 sm:pt-0 lg:pt-0')}>
      <Container className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16">
        <div>
          {/* Phones: the reader is already on one, so a compact app header replaces the mockup. */}
          <div className="mb-6 flex items-center gap-3.5 sm:hidden" aria-hidden="true">
            <AppIcon className="size-14 rounded-2xl" />
            <div className="leading-tight">
              <p className="text-base font-bold text-ink-900">{APP_NAME}</p>
              <p className="text-sm text-slate-500">Resume builder</p>
            </div>
          </div>
          <p className="text-xs font-semibold tracking-[0.14em] text-aqua-700 uppercase">Install the app</p>
          <h2
            id="install-title"
            className="mt-3 text-[1.875rem] leading-[1.15] font-extrabold tracking-[-0.025em] text-balance text-ink-900 sm:text-4xl lg:text-[2.625rem] lg:leading-[1.1]"
          >
            Keep {APP_NAME} on your home screen
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Install it on your phone or computer and it opens like any other app. The editor keeps working offline;
            you only need a connection to export your PDF.
          </p>

          <ul className="mt-6 flex flex-wrap gap-2">
            {PERKS.map(({ icon: Icon, label }) => (
              <li key={label} className="chip cursor-default hover:border-slate-200">
                <Icon className="size-4 text-aqua-700" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            {canInstall ? (
              <button
                type="button"
                className="btn-primary btn-lg w-full sm:w-auto"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await install();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Download className="size-5" aria-hidden="true" />
                Install app
              </button>
            ) : isIos ? (
              <ol className="grid gap-3 sm:grid-cols-2" aria-label="How to install on iPhone or iPad">
                <IosStep n={1} icon={Share}>
                  Tap <strong className="font-semibold text-ink-900">Share</strong> in Safari&rsquo;s toolbar
                </IosStep>
                <IosStep n={2} icon={SquarePlus}>
                  Choose <strong className="font-semibold text-ink-900">Add to Home Screen</strong>
                </IosStep>
              </ol>
            ) : (
              <p className="flex max-w-xl items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                <Download className="mt-0.5 size-5 shrink-0 text-aqua-700" aria-hidden="true" />
                <span>
                  Look for <strong className="font-semibold text-ink-900">Install</strong> in your browser: the
                  install icon in the address bar on desktop Chrome and Edge, or{' '}
                  <strong className="font-semibold text-ink-900">Add to Home screen</strong> in the browser menu on
                  Android.
                </span>
              </p>
            )}
          </div>
        </div>

        <PhoneArt className="hidden sm:flex" />
      </Container>
    </section>
  );
}

function IosStep({ n, icon: Icon, children }: { n: number; icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-sm text-slate-600 shadow-xs">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-aqua-50 text-aqua-700 ring-1 ring-aqua-200/70 ring-inset">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span>
        <span className="sr-only">Step {n}: </span>
        {children}
      </span>
    </li>
  );
}

/** A phone home screen with the app icon on it. Decorative. */
function PhoneArt({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('relative mx-auto flex justify-center', className)}>
      <div className="absolute top-1/2 left-1/2 size-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-aqua-100 via-mint-50 to-transparent blur-2xl" />

      <div className="relative h-[27rem] w-[13.5rem] rounded-[2.6rem] bg-ink-900 p-2.5 shadow-lift sm:h-[30rem] sm:w-[15rem]">
        <div className="relative h-full overflow-hidden rounded-[2.1rem] bg-gradient-to-b from-aqua-100 via-white to-mint-100">
          <div className="absolute top-2 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-ink-900" />
          <div className="flex justify-between px-5 pt-2.5 text-[10px] font-semibold text-ink-900">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-3 rounded-[2px] bg-ink-900/80" />
            </span>
          </div>

          <div className="grid grid-cols-4 gap-x-3 gap-y-4 px-4 pt-9">
            {Array.from({ length: 12 }, (_, i) =>
              i === 5 ? (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="relative">
                    <span className="absolute -inset-1 rounded-[0.9rem] ring-2 ring-aqua-400 motion-safe:animate-pulse" />
                    <AppIcon className="relative size-10 rounded-[0.7rem]" />
                  </div>
                  <span className="text-[8.5px] font-semibold text-ink-900">{APP_NAME}</span>
                </div>
              ) : (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className={cn('size-10 rounded-[0.7rem]', PLACEHOLDER_TINTS[i % PLACEHOLDER_TINTS.length])} />
                  <span className="h-1 w-7 rounded-full bg-ink-900/10" />
                </div>
              ),
            )}
          </div>

          <div className="absolute inset-x-3 bottom-3 flex justify-around rounded-[1.4rem] bg-white/60 px-2 py-2.5 ring-1 ring-white/70 backdrop-blur">
            {PLACEHOLDER_TINTS.slice(0, 4).map((c) => (
              <span key={c} className={cn('size-9 rounded-[0.65rem]', c)} />
            ))}
          </div>
        </div>
      </div>

      <div className="absolute top-[18%] -right-2 hidden rounded-2xl border border-slate-200/80 bg-white/95 py-2 pr-3.5 pl-2 shadow-lift sm:-right-10 sm:flex sm:items-center sm:gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-mint-50 text-mint-700 ring-1 ring-mint-200/70 ring-inset">
          <Check className="size-4" strokeWidth={3} />
        </span>
        <span className="text-[13px] font-semibold text-ink-900">Installed</span>
      </div>
    </div>
  );
}

/** The app icon, drawn as a vector (same artwork as public/icons). */
function AppIcon({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center justify-center bg-white shadow-soft ring-1 ring-ink-900/10', className)}>
      <PlaneMark className="h-auto w-[68%]" />
    </span>
  );
}

const PLACEHOLDER_TINTS = ['bg-ink-100', 'bg-slate-200', 'bg-aqua-100', 'bg-mint-100', 'bg-slate-200/80', 'bg-ink-50'];
