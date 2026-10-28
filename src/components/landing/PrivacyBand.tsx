import type { LucideIcon } from 'lucide-react';
import { Check, FileDown, Laptop, Lock, Server } from 'lucide-react';
import { APP_NAME } from '../../constants/brand';
import { cn } from '../../utils/cn';
import { Container } from './shared';

const POINTS = [
  'Saved in your own browser as you type',
  'Never stored on our servers',
  'Sent only for the moment it takes to make your PDF',
];

const ROWS: { icon: LucideIcon; place: string; detail: string; status: string; tone: 'mint' | 'slate' | 'aqua' }[] = [
  { icon: Laptop, place: 'Your browser', detail: 'Saved as you type', status: 'Stored here', tone: 'mint' },
  { icon: Server, place: 'Our servers', detail: 'Nothing is kept there', status: 'Not stored', tone: 'slate' },
  { icon: FileDown, place: 'PDF export', detail: 'Sent once to make your PDF', status: 'Momentary', tone: 'aqua' },
];

const STATUS_TONE = {
  mint: 'bg-mint-50 text-mint-800 ring-mint-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  aqua: 'bg-aqua-50 text-aqua-800 ring-aqua-200',
} as const;

export function PrivacyBand() {
  return (
    <section id="privacy" aria-labelledby="privacy-title" className="scroll-mt-16 pb-16 sm:pb-24 lg:pb-28">
      <Container>
        <div className="relative overflow-hidden rounded-[2rem] border border-mint-100 bg-gradient-to-br from-mint-50 via-white to-aqua-50 px-5 py-10 sm:px-10 sm:py-14 lg:px-16 lg:py-16">
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-24 size-72 rounded-full bg-aqua-200/40 blur-3xl"
          />
          <div className="relative grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-ink-900 text-mint-300 shadow-soft">
                <Lock className="size-6" strokeWidth={2.2} aria-hidden="true" />
              </span>
              <p className="mt-6 text-xs font-semibold tracking-[0.14em] text-mint-800 uppercase">Privacy</p>
              <h2
                id="privacy-title"
                className="mt-3 text-balance text-[1.875rem] leading-[1.15] font-extrabold tracking-[-0.025em] text-ink-900 sm:text-4xl lg:text-[2.625rem] lg:leading-[1.1]"
              >
                Your resume stays yours.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                A resume holds your name, phone number and work history. That belongs on your device, so that is
                where {APP_NAME} keeps it.
              </p>
              <ul className="mt-6 space-y-3">
                {POINTS.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-[0.9375rem] font-medium text-ink-800">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-mint-500 text-white">
                      <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <figure className="card mx-auto w-full max-w-md p-2 shadow-lift">
              <figcaption className="flex items-center justify-between px-4 pt-3 pb-2">
                <span className="text-sm font-semibold text-ink-900">Where your resume lives</span>
                <span className="flex gap-1" aria-hidden="true">
                  <span className="size-2 rounded-full bg-slate-200" />
                  <span className="size-2 rounded-full bg-slate-200" />
                  <span className="size-2 rounded-full bg-slate-200" />
                </span>
              </figcaption>
              <ul className="divide-y divide-slate-100 rounded-xl bg-slate-50/70 ring-1 ring-slate-100">
                {ROWS.map((r) => (
                  <li key={r.place} className="flex items-center gap-3.5 px-4 py-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-ink-700 shadow-xs ring-1 ring-slate-200">
                      <r.icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block text-sm font-semibold text-ink-900">{r.place}</span>
                      <span className="mt-0.5 block text-[13px] text-slate-500">{r.detail}</span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
                        STATUS_TONE[r.tone],
                      )}
                    >
                      {r.status}
                    </span>
                  </li>
                ))}
              </ul>
            </figure>
          </div>
        </div>
      </Container>
    </section>
  );
}
