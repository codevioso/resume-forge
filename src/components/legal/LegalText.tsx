import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BUSINESS, isPlaceholder, type BusinessField } from '../../constants/business';
import { cn } from '../../utils/cn';
import { PACKS, count, taka } from './facts';

/**
 * The building blocks the legal pages are written with. Pages stay prose;
 * anything still to be decided shows up highlighted, so nothing unfinished
 * can go live unnoticed.
 */

const MARK = 'rounded-[0.3em] bg-amber-100 px-1 py-px font-medium text-amber-900 ring-1 ring-amber-300/70 ring-inset [box-decoration-break:clone]';

/** A value that may still be a "[…]" placeholder: highlighted until it is filled in. */
export function Fill({ value }: { value: string }) {
  return isPlaceholder(value) ? <mark className={MARK}>{value}</mark> : <>{value}</>;
}

/** A business detail from constants/business.ts. */
export function Biz({ k }: { k: BusinessField }) {
  return <Fill value={BUSINESS[k]} />;
}

/** Something to write before launch that is not a business detail. Shown as a bracketed, highlighted note. */
export function Todo({ children }: { children: ReactNode }) {
  return <mark className={MARK}>[{children}]</mark>;
}

/**
 * A business decision for the owner to check: "[Review: …]". Delete the note
 * once the text around it is right.
 */
export function Review({ children }: { children: ReactNode }) {
  return (
    <p
      role="note"
      className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3.5 py-2.5 text-[0.875rem] leading-relaxed text-amber-900"
    >
      <span className="font-semibold">[Review:</span> {children}
      <span className="font-semibold">]</span>
    </p>
  );
}

const LINK = 'font-medium text-ink-900 underline decoration-aqua-500/70 decoration-[1.5px] underline-offset-[3px] transition hover:decoration-ink-900';

/** A link inside the text, to another page of the app. */
export function TextLink({ to, children, newTab = false }: { to: string; children: ReactNode; newTab?: boolean }) {
  return (
    <Link to={to} className={LINK} {...(newTab ? { target: '_blank', rel: 'noopener' } : {})}>
      {children}
    </Link>
  );
}

/** A link to another site. */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className={LINK} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/** The support email: a mailto link once filled in. */
export function SupportEmail({ className }: { className?: string }) {
  const email = BUSINESS.supportEmail;
  if (isPlaceholder(email)) return <Fill value={email} />;
  return (
    <a href={`mailto:${email}`} className={cn(LINK, 'break-all', className)}>
      {email}
    </a>
  );
}

/** The support phone number: a tel: link once filled in. */
export function SupportPhone({ className }: { className?: string }) {
  const phone = BUSINESS.phone;
  if (isPlaceholder(phone)) return <Fill value={phone} />;
  return (
    <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className={cn(LINK, 'whitespace-nowrap', className)}>
      {phone}
    </a>
  );
}

/** A bulleted list in the document's style. */
export function List({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn('list-disc space-y-2 pl-5 marker:text-aqua-600', className)}>{children}</ul>;
}

/** A smaller heading inside a section. */
export function Subhead({ children }: { children: ReactNode }) {
  return <h3 className="pt-3 text-[1.0625rem] font-bold tracking-[-0.01em] text-ink-900 sm:text-lg">{children}</h3>;
}

/** The credit packs and their prices. */
export function PacksTable({ caption }: { caption?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-left text-[0.9375rem]">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-slate-50 text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-semibold">Credits</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">Valid for</th>
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">Price</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {PACKS.map((p) => (
            <tr key={`${p.credits}-${p.days}`}>
              <td className="px-4 py-3 font-semibold text-ink-900 tabular-nums">{count(p.credits)}</td>
              <td className="px-4 py-3 tabular-nums">{p.days} days</td>
              <td className="px-4 py-3 text-right font-semibold text-ink-900 tabular-nums">{taka(p.priceBdt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
