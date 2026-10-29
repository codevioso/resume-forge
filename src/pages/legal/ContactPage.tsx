import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, KeyRound, Mail, Phone, ReceiptText, Sparkles, UserX } from 'lucide-react';
import { APP_NAME } from '../../constants/brand';
import { IconChip } from '../../components/landing/shared';
import { LegalLayout } from '../../components/legal/LegalLayout';
import { Biz, SupportEmail, SupportPhone } from '../../components/legal/LegalText';

const H2 = 'text-[1.375rem] leading-tight font-bold tracking-[-0.02em] text-ink-900 sm:text-[1.625rem]';

function ContactCard({ icon, label, value, note }: { icon: LucideIcon; label: string; value: ReactNode; note: ReactNode }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200/80 bg-white p-5 shadow-soft sm:p-6">
      <div className="flex items-center gap-3">
        <IconChip icon={icon} />
        <p className="text-sm font-semibold tracking-wide text-slate-500">{label}</p>
      </div>
      <p className="mt-4 text-lg font-semibold break-words text-ink-900 sm:text-xl">{value}</p>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-slate-600">{note}</p>
    </div>
  );
}

const DETAILS: { term: string; value: ReactNode }[] = [
  { term: 'Business name', value: <Biz k="legalName" /> },
  { term: 'Trading as', value: <Biz k="tradeName" /> },
  { term: 'Trade licence', value: <Biz k="tradeLicense" /> },
  {
    term: 'Address',
    value: (
      <>
        <Biz k="address" />, <Biz k="country" />
      </>
    ),
  },
];

const SHORTCUTS: { icon: LucideIcon; title: string; body: ReactNode; to: string; action: string }[] = [
  {
    icon: UserX,
    title: 'Delete your account',
    body: (
      <>
        No need to write to us: sign in and use <strong className="font-semibold text-ink-900">Delete account</strong> on
        your Account page. Your account, saved resumes and credits are deleted immediately.
      </>
    ),
    to: '/account',
    action: 'Account page',
  },
  {
    icon: ReceiptText,
    title: 'A problem with a payment',
    body: 'Include your account email, the date, amount and payment method, and the transaction ID, so we can find it quickly.',
    to: '/refunds#how-to-ask',
    action: 'Refund policy',
  },
  {
    icon: KeyRound,
    title: 'Forgotten password',
    body: 'Reset it yourself: we email you a link to choose a new one.',
    to: '/forgot-password',
    action: 'Reset password',
  },
  {
    icon: Sparkles,
    title: 'Stop AI processing',
    body: 'Withdraw your agreement on your Account page, and nothing more is sent to the AI provider.',
    to: '/account',
    action: 'Account page',
  },
];

export function ContactPage() {
  return (
    <LegalLayout
      page="contact"
      lede={<>Questions, a problem with a payment, or anything else about {APP_NAME}: write to us or call.</>}
    >
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <ContactCard
          icon={Mail}
          label="Email"
          value={<SupportEmail />}
          note={
            <>
              Best for most questions. We reply <Biz k="responseTime" />.
            </>
          }
        />
        <ContactCard icon={Phone} label="Phone" value={<SupportPhone />} note={<Biz k="supportHours" />} />
      </div>

      <section aria-labelledby="business-details" className="mt-14 sm:mt-16">
        <h2 id="business-details" className={H2}>
          Business details
        </h2>
        <p className="mt-3 max-w-[62ch] text-base leading-relaxed text-slate-600 sm:text-[1.0625rem]">
          {APP_NAME} is a resume builder run by <Biz k="legalName" /> in <Biz k="country" />. Building resumes and
          downloading them as PDFs is free; optional AI features are paid for with credits.
        </p>
        <dl className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
          {DETAILS.map((d) => (
            <div key={d.term} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6 sm:py-4">
              <dt className="text-sm font-medium text-slate-500 sm:text-[0.9375rem]">{d.term}</dt>
              <dd className="text-[0.9375rem] leading-relaxed break-words text-ink-900 sm:text-base">{d.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="before-you-write" className="mt-14 sm:mt-16">
        <h2 id="before-you-write" className={H2}>
          You may not need to write
        </h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {SHORTCUTS.map((s, i) => (
            <li key={s.title} className="flex flex-col rounded-[1.25rem] border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <IconChip icon={s.icon} tone={i % 2 ? 'mint' : 'aqua'} className="size-10" />
                <h3 className="font-semibold text-ink-900">{s.title}</h3>
              </div>
              <p className="mt-3 flex-1 text-[0.9375rem] leading-relaxed text-slate-600">{s.body}</p>
              <Link
                to={s.to}
                className="group mt-3 -mb-1 inline-flex min-h-11 w-fit items-center gap-1.5 text-[0.9375rem] font-semibold text-aqua-800 hover:text-ink-900"
              >
                {s.action}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </LegalLayout>
  );
}
