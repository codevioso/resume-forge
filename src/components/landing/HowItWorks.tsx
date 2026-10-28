import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, Check, Download, FileText, LayoutTemplate, PenLine } from 'lucide-react';
import { templates } from '../../data/templates';
import { cn } from '../../utils/cn';
import { Container, SECTION_Y, SectionHeader } from './shared';

const STEPS: { title: string; body: string; icon: LucideIcon; art: ReactNode }[] = [
  {
    title: 'Pick a design',
    icon: LayoutTemplate,
    body: `Browse ${templates.length} professionally designed templates and choose the one that suits your field.`,
    art: <PickArt />,
  },
  {
    title: 'Fill in your details',
    icon: PenLine,
    body: 'Type into simple forms and watch the live preview update. Everything is saved as you go: in your browser, or in your account if you sign in.',
    art: <FillArt />,
  },
  {
    title: 'Download your PDF',
    icon: Download,
    body: 'Export an A4 PDF that matches the preview exactly, with clickable links and as many pages as it needs.',
    art: <DownloadArt />,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className={cn('scroll-mt-16', SECTION_Y)}>
      <Container>
        <SectionHeader
          id="how-title"
          eyebrow="How it works"
          title="From blank page to PDF in three steps"
          lede="No account needed and nothing to install. Open the editor and start writing."
        />

        {/* Phones and tablets: a compact vertical timeline. */}
        <ol className="mx-auto mt-10 max-w-xl sm:mt-14 lg:hidden">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative flex gap-4 pb-8 last:pb-0">
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-12 bottom-2 left-[1.375rem] w-0 border-l-2 border-dotted border-aqua-400"
                />
              )}
              <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-ink-900 text-white shadow-soft">
                <step.icon className="size-5" aria-hidden="true" />
              </span>
              <div className="pt-0.5">
                <p className="text-xs font-semibold tracking-[0.12em] text-aqua-700 uppercase">Step {i + 1}</p>
                <h3 className="mt-1 text-lg font-bold tracking-tight text-ink-900">{step.title}</h3>
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-slate-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* Desktop: illustrated cards. */}
        <ol className="mt-16 hidden grid-cols-3 gap-6 lg:grid">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative">
              <div className="card h-full overflow-hidden">
                <div
                  aria-hidden="true"
                  className="relative flex h-44 items-center justify-center overflow-hidden border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white"
                >
                  <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)] bg-[radial-gradient(var(--color-slate-200)_1px,transparent_1.2px)] [background-size:16px_16px]" />
                  <div className="relative">{step.art}</div>
                </div>
                <div className="p-6">
                  <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-aqua-700 uppercase">
                    <span className="flex size-6 items-center justify-center rounded-full bg-ink-900 text-[11px] tracking-normal text-white">
                      {i + 1}
                    </span>
                    Step {i + 1}
                  </p>
                  <h3 className="mt-3 text-lg font-bold tracking-tight text-ink-900">{step.title}</h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-slate-600">{step.body}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-[4.5rem] -right-[1.375rem] z-10 hidden size-8 items-center justify-center rounded-full bg-white text-aqua-700 shadow-soft ring-1 ring-slate-200 lg:flex"
                >
                  <ArrowRight className="size-4" />
                </span>
              )}
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

/* ---- Step illustrations: small, decorative UI sketches built from boxes. ---- */

function MiniPage({ head, selected, className }: { head: string; selected?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        'relative h-[5.5rem] w-16 rounded-md bg-white p-1.5 shadow-soft ring-1 ring-slate-200',
        selected && 'ring-2 ring-aqua-400',
        className,
      )}
    >
      <div className={cn('h-3 rounded-sm', head)} />
      <div className="mt-1.5 space-y-1">
        <div className="h-1 w-10 rounded-full bg-slate-200" />
        <div className="h-1 w-8 rounded-full bg-slate-200" />
        <div className="h-1 w-11 rounded-full bg-slate-200" />
        <div className="h-1 w-7 rounded-full bg-slate-200" />
        <div className="h-1 w-9 rounded-full bg-slate-200" />
      </div>
      {selected && (
        <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-mint-500 text-white ring-2 ring-white">
          <Check className="size-3" strokeWidth={3.5} />
        </span>
      )}
    </div>
  );
}

function PickArt() {
  return (
    <div className="flex items-end gap-3">
      <MiniPage head="bg-ink-200" className="-rotate-3" />
      <MiniPage head="bg-ink-900" selected className="-translate-y-2 scale-110" />
      <MiniPage head="bg-mint-300" className="rotate-3" />
    </div>
  );
}

function FillArt() {
  return (
    <div className="w-52 rounded-xl bg-white p-3 shadow-soft ring-1 ring-slate-200">
      <div className="h-1.5 w-12 rounded-full bg-slate-300" />
      <div className="mt-1.5 flex h-7 items-center rounded-md border border-aqua-400 bg-white px-2 text-[11px] font-medium text-ink-900 ring-2 ring-aqua-100">
        Jordan Lee
        <span className="ml-px h-3.5 w-px bg-ink-900 motion-safe:animate-pulse" />
      </div>
      <div className="mt-2.5 h-1.5 w-16 rounded-full bg-slate-300" />
      <div className="mt-1.5 flex h-7 items-center rounded-md border border-slate-200 px-2 text-[11px] text-slate-500">
        Senior Product Engineer
      </div>
      <div className="mt-2.5 flex justify-end">
        <span className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-2 py-0.5 text-[10px] font-semibold text-mint-800 ring-1 ring-mint-200 ring-inset">
          <Check className="size-2.5" strokeWidth={3.5} />
          Saved
        </span>
      </div>
    </div>
  );
}

function DownloadArt() {
  return (
    <div className="w-56 rounded-xl bg-white p-3 shadow-soft ring-1 ring-slate-200">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-ink-50 text-ink-700">
          <FileText className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[11px] font-semibold text-ink-900">jordan-lee.pdf</span>
          <span className="block text-[10px] text-slate-500">A4 · 2 pages</span>
        </span>
        <span className="flex size-8 items-center justify-center rounded-lg bg-ink-900 text-white">
          <Download className="size-4" />
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-full rounded-full bg-gradient-to-r from-aqua-400 to-mint-400" />
      </div>
    </div>
  );
}
