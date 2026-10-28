import type { LucideIcon } from 'lucide-react';
import { FileCheck, FileStack, Link2, ListChecks, Save, WifiOff } from 'lucide-react';
import { APP_NAME } from '../../constants/brand';
import { cn } from '../../utils/cn';
import { Container, IconChip, SECTION_Y, SectionHeader } from './shared';

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: FileCheck,
    title: 'Pixel-perfect PDF',
    body: 'Your PDF is printed from the very page you preview, with the same layout and the same bundled fonts. What you see is exactly what you send.',
  },
  {
    icon: FileStack,
    title: 'Pages that flow',
    body: 'A long resume flows onto as many A4 pages as it needs. Entries never split across a page break, and nothing gets cut off.',
  },
  {
    icon: ListChecks,
    title: 'Every field, printed',
    body: 'Whatever you fill in makes it onto the page. No fields that quietly disappear between the editor and the PDF.',
  },
  {
    icon: Link2,
    title: 'Clickable links',
    body: 'Email, phone, LinkedIn, website and project links are live in the PDF, so a recruiter is one click away from you.',
  },
  {
    icon: Save,
    title: 'Saved as you type',
    body: 'Your resume is saved in your browser while you work. Close the tab and pick up right where you left off.',
  },
  {
    icon: WifiOff,
    title: 'Install it, work offline',
    body: `Add ${APP_NAME} to your phone or desktop like any app. The editor works offline; exporting a PDF needs a connection.`,
  },
];

export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className={cn('scroll-mt-16', SECTION_Y)}>
      <Container>
        <SectionHeader
          id="features-title"
          eyebrow="Features"
          title="The details that make a resume work"
          lede={`How it looks, how it prints, and who gets to see it: ${APP_NAME} gets the parts that matter right.`}
        />

        {/* Phones: one grouped list, like a settings screen. Larger screens: a card grid. */}
        <ul className="card mt-10 divide-y divide-slate-100 overflow-hidden sm:mt-16 sm:grid sm:grid-cols-2 sm:gap-6 sm:divide-y-0 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent sm:shadow-none lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <li
              key={f.title}
              className="flex gap-4 p-5 sm:block sm:rounded-2xl sm:border sm:border-slate-200/80 sm:bg-white sm:p-7 sm:shadow-soft sm:transition-[translate,box-shadow] sm:duration-300 sm:hover:-translate-y-0.5 sm:hover:shadow-lift motion-reduce:transition-none"
            >
              <IconChip icon={f.icon} tone={i % 2 ? 'mint' : 'aqua'} />
              <div className="min-w-0">
                <h3 className="text-base font-bold tracking-tight text-ink-900 sm:mt-5 sm:text-lg">{f.title}</h3>
                <p className="mt-1 text-[0.9375rem] leading-relaxed text-slate-600 sm:mt-2">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
