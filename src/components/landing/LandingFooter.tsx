import { Link } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { BrandMark } from '../BrandMark';
import { APP_NAME } from '../../constants/brand';
import { scrollToSection, Container } from './shared';

type FooterLink = { label: string; to?: string; section?: string };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Templates', to: '/templates' },
      { label: 'Create my resume', to: '/templates' },
      { label: 'Features', section: 'features' },
      { label: 'How it works', section: 'how-it-works' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'FAQ', section: 'faq' },
      { label: 'Privacy', section: 'privacy' },
      { label: 'Install the app', section: 'install' },
    ],
  },
];

const linkClass =
  'inline-flex min-h-11 items-center rounded-md text-sm text-slate-600 transition hover:text-ink-900 sm:min-h-0 sm:py-1';

export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="pb-safe border-t border-slate-200/80">
      <Container className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:py-14 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="col-span-2 max-w-xs md:col-span-1">
          <Link to="/" aria-label={`${APP_NAME} home`} className="-ml-1 inline-flex rounded-lg p-1">
            <BrandMark className="h-10" />
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            A free resume builder with pixel-perfect PDFs. Your resume stays in your browser.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="text-xs font-semibold tracking-[0.12em] text-ink-900 uppercase">{col.title}</h2>
            <ul className="mt-3 grid gap-1 sm:mt-4 sm:gap-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.to ? (
                    <Link to={l.to} className={linkClass}>
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      href={`#${l.section}`}
                      className={linkClass}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(l.section!);
                      }}
                    >
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>

      <div className="border-t border-slate-200/80">
        <Container className="flex flex-col-reverse items-center justify-between gap-3 py-6 sm:flex-row">
          <p className="text-sm text-slate-500">
            © {year} {APP_NAME}. Free resume builder.
          </p>
          <button
            type="button"
            className="btn-ghost px-3 text-slate-600"
            onClick={() => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}
          >
            <ArrowUp className="size-4" aria-hidden="true" />
            Back to top
          </button>
        </Container>
      </div>
    </footer>
  );
}
