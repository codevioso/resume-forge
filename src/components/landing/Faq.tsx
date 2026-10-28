import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { APP_NAME } from '../../constants/brand';
import { templates } from '../../data/templates';
import { cn } from '../../utils/cn';
import { Container, SECTION_Y, SectionHeader } from './shared';

const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: `Is ${APP_NAME} really free?`,
    a: `Yes. All ${templates.length} templates, the PDF export and accounts are free to use.`,
  },
  {
    q: 'Do I need an account?',
    a: 'No. Pick a template and start typing; your resume is saved in this browser. A free account is optional: with one, your resumes are saved to your account, so you can keep several and open them on any device.',
  },
  {
    q: 'Where is my resume stored?',
    a: 'Without an account, in your own browser, saved as you type. It is not stored on our servers, so clearing your browser data removes it and it will not appear on your other devices. If you sign in, your resumes are stored in your account on our servers, so they sync across your devices. Either way, a resume is sent to make your PDF only for the moment that takes.',
  },
  {
    q: 'What happens to my resume when I create an account?',
    a: 'The resume you were working on in this browser moves into your account the first time you sign in on this device, so you carry on where you left off.',
  },
  {
    q: 'Can I delete my account?',
    a: 'Yes, any time, from your Account page. Your account and every resume saved in it are deleted permanently.',
  },
  {
    q: 'Will the PDF look like the preview?',
    a: 'Exactly like it. The PDF is printed from the same page you preview, with the same layout and the same bundled fonts.',
  },
  {
    q: 'What if my resume is longer than one page?',
    a: 'It flows onto as many A4 pages as it needs. Entries are never split across two pages, and nothing is cut off.',
  },
  {
    q: 'Are the links in the PDF clickable?',
    a: 'Yes. Your email, phone number, LinkedIn, website and project links are all clickable in the PDF.',
  },
  {
    q: 'Can I use it offline?',
    a: `Install ${APP_NAME} as an app on your phone or desktop and the editor works offline. Exporting the PDF needs a connection.`,
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className={cn('scroll-mt-16 border-y border-slate-200/70 bg-slate-50', SECTION_Y)}
    >
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <SectionHeader
          id="faq-title"
          align="left"
          tinted
          eyebrow="FAQ"
          title="Questions, answered"
          lede="The short version: it's free, no account is needed, and without one your resume never leaves your browser."
          className="lg:sticky lg:top-28 lg:self-start"
        />

        <div className="card divide-y divide-slate-100 overflow-hidden">
          {FAQS.map((item, i) => (
            <details key={item.q} className="group" open={i === 0}>
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-[0.9375rem] font-semibold text-ink-900 transition select-none hover:bg-slate-50/80 focus-visible:-outline-offset-2 sm:px-6 sm:text-base [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-ink-700 transition duration-200 group-open:rotate-45 group-open:bg-ink-900 group-open:text-white motion-reduce:transition-none"
                >
                  <Plus className="size-4" strokeWidth={2.5} />
                </span>
              </summary>
              <div className="px-5 pb-5 text-[0.9375rem] leading-relaxed text-slate-600 sm:px-6 sm:pr-16">{item.a}</div>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
