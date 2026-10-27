import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { useResume } from '../../context/ResumeContext';
import type { PersonalInfo } from '../../types/resume';
import { ContactLink, dateRange, degreeLine, gpaText, joinParts } from '../fields';
import { templateFonts } from '../fonts';
import { keepTogether, keepWithNext, pageRoot, repeatPadding } from '../paging';
import { PageBackdrop } from '../PageBackdrop';
import { resumePillStyle } from '../resumePill';
import { CustomFieldBlocks, PhotoOrInitials, SkillPillStrip } from './additionalUi';

/** One printed A4 page. A background tile this tall repeats once per page, so every page gets the whole design. */
const perPage = '297mm';

type ContactField = 'email' | 'phone' | 'location' | 'linkedin' | 'website';
const allContacts: ContactField[] = ['email', 'phone', 'location', 'linkedin', 'website'];
/** How each contact detail links in the PDF. Location is plain text. */
const contactKind = { email: 'email', phone: 'phone', location: undefined, linkedin: 'url', website: 'url' } as const;

/** The filled-in contact details, in order, each a link where it can be one. Blank ones are left out. */
function contactNodes(info: PersonalInfo, fields: ContactField[] = allContacts): ReactNode[] {
  return fields
    .filter((f) => info[f]?.trim())
    .map((f) => {
      const kind = contactKind[f];
      return kind ? <ContactLink key={f} kind={kind} value={info[f]} /> : <span key={f}>{info[f]}</span>;
    });
}

/** Contact details on one line with `sep` between them. Each value stays whole when the line wraps. */
function ContactLine({ info, fields, sep, style }: { info: PersonalInfo; fields?: ContactField[]; sep: string; style: CSSProperties }) {
  const nodes = contactNodes(info, fields);
  if (nodes.length === 0) return null;
  return (
    <p style={style}>
      {nodes.map((node, i) => (
        <Fragment key={i}>
          {i > 0 && sep}
          <span style={{ whiteSpace: 'nowrap' }}>{node}</span>
        </Fragment>
      ))}
    </p>
  );
}

export function PaperTemplate() {
  const { resumeData } = useResume();
  const { personalInfo, experiences, education, skills, projects, customFields } = resumeData;
  const ink = '#1e3a8a';
  const rust = '#b45309';
  return (
    <div style={{ ...pageRoot, ...repeatPadding, fontFamily: templateFonts.serif, backgroundColor: '#fffef7', padding: '32px 40px', color: '#292524' }}>
      <PageBackdrop background="#fffef7" />
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '20px', borderBottom: `3px double ${ink}`, paddingBottom: '18px' }}>
        <PhotoOrInitials photo={personalInfo.photo} name={personalInfo.fullName} size={88} rounded={4} border={`3px solid ${ink}`} initialsBg="#dbeafe" initialsColor={ink} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '26px', margin: 0, fontWeight: 700, color: ink, letterSpacing: '0.02em' }}>{personalInfo.fullName || 'Your Name'}</h1>
          <p style={{ fontSize: '12px', margin: '6px 0 0', fontStyle: 'italic', color: rust }}>{personalInfo.title}</p>
          <ContactLine info={personalInfo} sep=" | " style={{ fontSize: '9px', margin: '10px 0 0', color: '#57534e', lineHeight: 1.6 }} />
        </div>
      </div>
      {personalInfo.summary && (
        <p style={{ ...repeatPadding, fontSize: '10px', lineHeight: 1.75, textAlign: 'justify', margin: '0 0 16px', padding: '12px 14px', backgroundColor: '#fffbeb', borderLeft: `3px solid ${rust}` }}>{personalInfo.summary}</p>
      )}
      {experiences.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <h2 style={{ ...keepWithNext, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.25em', color: ink, margin: '0 0 10px' }}>Selected work</h2>
          {experiences.map((exp) => {
            const dates = dateRange(exp.startDate, exp.endDate, exp.current, '–');
            return (
              <div key={exp.id} style={{ ...keepTogether, marginBottom: '12px', fontSize: '10px' }}>
                <strong>{exp.position}</strong>
                {exp.company && <span style={{ color: rust }}>{exp.position ? ' · ' : ''}{exp.company}</span>}
                {dates && <span style={{ color: '#78716c', fontSize: '9px' }}> ({dates})</span>}
                {exp.description && <div style={{ fontSize: '9px', marginTop: '4px', lineHeight: 1.55, color: '#44403c' }}>{exp.description}</div>}
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', gap: '24px', fontSize: '9px' }}>
        <div style={{ flex: 1 }}>
          {education.length > 0 && <strong style={{ ...keepWithNext, display: 'block', color: ink }}>Education</strong>}
          {education.map((e) => {
            const meta = joinParts([dateRange(e.startDate, e.endDate), gpaText(e.gpa)]);
            return (
              <div key={e.id} style={{ ...keepTogether, marginTop: '6px', lineHeight: 1.5 }}>
                {joinParts([degreeLine(e), e.institution], ', ')}
                {meta && <div style={{ color: '#78716c' }}>{meta}</div>}
              </div>
            );
          })}
        </div>
        <div style={{ flex: 1 }}>
          {skills.length > 0 && <strong style={{ ...keepWithNext, display: 'block', color: ink }}>Expertise</strong>}
          <div style={{ marginTop: '8px' }}>
            <SkillPillStrip skills={skills} bgColors={['#e0e7ff', '#ffedd5', '#fce7f3']} textColors={[ink, rust, '#9d174d']} radius={4} />
          </div>
        </div>
      </div>
      {projects.length > 0 && (
        <div style={{ marginTop: '14px', fontSize: '9px' }}>
          <strong style={{ ...keepWithNext, display: 'block', color: ink }}>Projects</strong>
          {projects.map((p) => (
            <div key={p.id} style={{ ...keepTogether, marginTop: '6px', lineHeight: 1.5 }}>
              {joinParts([p.name, p.technologies], ' — ')}
              {p.link && (
                <>
                  <span style={{ color: '#78716c' }}>{p.name || p.technologies ? ' · ' : ''}</span>
                  <ContactLink kind="url" value={p.link} style={{ color: rust }} />
                </>
              )}
              {p.description && <div style={{ marginTop: '2px', lineHeight: 1.55, color: '#44403c' }}>{p.description}</div>}
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: '14px' }}>
        <CustomFieldBlocks sections={customFields} cardBg="#fffbeb" titleColor={ink} accentColor={rust} />
      </div>
    </div>
  );
}

/** Grid's entry header: title on the left, a date or link on the right. */
const gridEntryHead: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' };
const gridEntryAside: CSSProperties = { flexShrink: 0, maxWidth: '45%', textAlign: 'right', overflowWrap: 'anywhere' };

export function GridTemplate() {
  const { resumeData } = useResume();
  const { personalInfo, experiences, education, skills, projects, customFields } = resumeData;
  const colors = ['#fef3c7', '#dbeafe', '#fce7f3', '#d1fae5', '#e9d5ff'];
  const contacts = contactNodes(personalInfo);
  return (
    <div
      style={{
        ...pageRoot,
        ...repeatPadding,
        fontFamily: templateFonts.sans,
        backgroundColor: '#fafafa',
        backgroundImage: 'radial-gradient(#d4d4d8 1px, transparent 1px)',
        backgroundSize: '14px 14px',
        padding: '28px 32px',
      }}
    >
      <PageBackdrop background="#fafafa radial-gradient(#d4d4d8 1px, transparent 1px) 0 0 / 14px 14px" />
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '14px' }}>
        <div style={{ gridRow: 'span 2', backgroundColor: '#fff', padding: '18px', borderRadius: '16px', border: '1px solid #e4e4e7', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <PhotoOrInitials photo={personalInfo.photo} name={personalInfo.fullName} size={72} rounded={14} border="3px solid #6366f1" initialsBg="#818cf8" />
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', color: '#18181b', fontWeight: 800 }}>{personalInfo.fullName || 'Your Name'}</h1>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>{personalInfo.title}</p>
            </div>
          </div>
          {personalInfo.summary && <p style={{ margin: '14px 0 0', fontSize: '9px', lineHeight: 1.65, color: '#52525b' }}>{personalInfo.summary}</p>}
        </div>
        {contacts.length > 0 && (
          <div style={{ ...keepTogether, backgroundColor: colors[0], padding: '14px', borderRadius: '12px', fontSize: '9px', color: '#713f12' }}>
            <strong>Contact</strong>
            <div style={{ marginTop: '6px', lineHeight: 1.6, overflowWrap: 'anywhere' }}>
              {contacts.map((node, i) => (
                <div key={i}>{node}</div>
              ))}
            </div>
          </div>
        )}
        {education.length > 0 && (
          <div style={{ backgroundColor: colors[3], padding: '14px', borderRadius: '12px', fontSize: '9px', color: '#14532d' }}>
            <strong>Education</strong>
            {education.map((e) => {
              const meta = joinParts([dateRange(e.startDate, e.endDate), gpaText(e.gpa)]);
              return (
                <div key={e.id} style={{ ...keepTogether, marginTop: '6px', lineHeight: 1.5 }}>
                  {e.institution && <div style={{ fontWeight: 600 }}>{e.institution}</div>}
                  {degreeLine(e) && <div>{degreeLine(e)}</div>}
                  {meta && <div style={{ opacity: 0.75 }}>{meta}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {experiences.length > 0 && (
        <div style={{ ...repeatPadding, backgroundColor: '#fff', padding: '16px', borderRadius: '14px', marginBottom: '12px', border: '1px solid #e4e4e7' }}>
          <div style={{ ...keepWithNext, fontSize: '10px', fontWeight: 800, color: '#18181b', marginBottom: '10px' }}>Experience</div>
          {experiences.map((exp) => {
            const dates = dateRange(exp.startDate, exp.endDate, exp.current);
            return (
              <div key={exp.id} style={{ ...keepTogether, marginBottom: '10px', fontSize: '9px' }}>
                <div style={gridEntryHead}>
                  <span>
                    <strong style={{ color: '#4f46e5' }}>{exp.position}</strong>
                    {exp.company && <>{exp.position ? ' @ ' : ''}{exp.company}</>}
                  </span>
                  {dates && <span style={{ ...gridEntryAside, color: '#71717a' }}>{dates}</span>}
                </div>
                {exp.description && <div style={{ color: '#71717a', marginTop: '4px' }}>{exp.description}</div>}
              </div>
            );
          })}
        </div>
      )}
      {projects.length > 0 && (
        <div style={{ ...repeatPadding, backgroundColor: '#fff', padding: '16px', borderRadius: '14px', marginBottom: '12px', border: '1px solid #e4e4e7' }}>
          <div style={{ ...keepWithNext, fontSize: '10px', fontWeight: 800, color: '#18181b', marginBottom: '10px' }}>Projects</div>
          {projects.map((project) => (
            <div key={project.id} style={{ ...keepTogether, marginBottom: '10px', fontSize: '9px' }}>
              <div style={gridEntryHead}>
                <span>
                  <strong style={{ color: '#4f46e5' }}>{project.name}</strong>
                  {project.technologies && <span style={{ color: '#52525b' }}>{project.name ? ' · ' : ''}{project.technologies}</span>}
                </span>
                {project.link && <ContactLink kind="url" value={project.link} style={{ ...gridEntryAside, color: '#6366f1' }} />}
              </div>
              {project.description && <div style={{ color: '#71717a', marginTop: '4px' }}>{project.description}</div>}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <SkillPillStrip skills={skills} bgColors={['#fef08a', '#bfdbfe', '#fbcfe8', '#bbf7d0', '#ddd6fe']} textColors={['#854d0e', '#1e40af', '#9d174d', '#166534', '#5b21b6']} />
      </div>
      <div style={{ marginTop: '12px' }}>
        <CustomFieldBlocks sections={customFields} cardBg="#f4f4f5" titleColor="#18181b" accentColor="#6366f1" />
      </div>
    </div>
  );
}

/** Stripe's white entry card, its date pill and its small violet section label. */
const stripeCard: CSSProperties = { backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 10px rgba(124,58,237,0.08)' };
const stripeDatePill: CSSProperties = {
  ...resumePillStyle({ preset: 'xs', padXPx: 10 }),
  color: '#fff',
  backgroundColor: '#7c3aed',
  borderRadius: '10px',
  flexShrink: 0,
};
const stripeLabel: CSSProperties = { ...keepWithNext, display: 'block', fontSize: '9px', color: '#5b21b6', marginBottom: '6px' };

export function StripeTemplate() {
  const { resumeData } = useResume();
  const { personalInfo, experiences, education, skills, projects, customFields } = resumeData;
  const stripes = ['#7c3aed', '#6366f1', '#4f46e5', '#4338ca', '#312e81'];
  // Five equal bands per page, repeating on every page rather than stretching over the whole document.
  const bands = `linear-gradient(to bottom, ${stripes.map((c, i) => `${c} ${i * 20}% ${(i + 1) * 20}%`).join(', ')})`;
  return (
    <div style={{ ...pageRoot, fontFamily: templateFonts.sans, display: 'flex', backgroundColor: '#faf5ff' }}>
      <PageBackdrop background={`${bands} 0 0 / 28px ${perPage} repeat-y, #faf5ff`} />
      <div style={{ width: '28px', flexShrink: 0, backgroundImage: bands, backgroundSize: `28px ${perPage}`, backgroundRepeat: 'repeat-y' }} />
      <div style={{ ...repeatPadding, flex: 1, padding: '28px 32px' }}>
        <div style={{ display: 'flex', gap: '18px', marginBottom: '18px' }}>
          <PhotoOrInitials photo={personalInfo.photo} name={personalInfo.fullName} size={96} rounded={16} border="4px solid #a78bfa" initialsBg="#7c3aed" initialsColor="#fff" boxShadow="0 6px 20px rgba(124,58,237,0.35)" />
          <div>
            <h1 style={{ margin: 0, fontSize: '27px', fontWeight: 800, color: '#312e81' }}>{personalInfo.fullName || 'Your Name'}</h1>
            <p style={{ margin: '6px 0 0', color: '#7c3aed', fontWeight: 700, fontSize: '13px' }}>{personalInfo.title}</p>
            <ContactLine info={personalInfo} sep=" · " style={{ margin: '8px 0 0', fontSize: '10px', color: '#64748b', lineHeight: 1.6 }} />
          </div>
        </div>
        {personalInfo.summary && <p style={{ ...repeatPadding, margin: '0 0 16px', fontSize: '10px', lineHeight: 1.65, color: '#475569', padding: '14px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e9d5ff' }}>{personalInfo.summary}</p>}
        {experiences.map((exp) => {
          const dates = dateRange(exp.startDate, exp.endDate, exp.current);
          return (
            <div key={exp.id} style={{ ...keepTogether, ...stripeCard, marginBottom: '12px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#1e1b4b' }}>{exp.position}</span>
                {dates && <span style={stripeDatePill}>{dates}</span>}
              </div>
              {exp.company && <div style={{ fontSize: '10px', color: '#6d28d9', fontWeight: 600, marginTop: '4px' }}>{exp.company}</div>}
              {exp.description && <p style={{ fontSize: '9px', color: '#64748b', margin: '6px 0 0' }}>{exp.description}</p>}
            </div>
          );
        })}
        {education.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <strong style={stripeLabel}>Education</strong>
            {education.map((e) => {
              const dates = dateRange(e.startDate, e.endDate);
              const detail = joinParts([degreeLine(e), gpaText(e.gpa)]);
              return (
                <div key={e.id} style={{ ...keepTogether, ...stripeCard, marginBottom: '8px', padding: '9px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#1e1b4b' }}>{e.institution}</span>
                    {dates && <span style={stripeDatePill}>{dates}</span>}
                  </div>
                  {detail && <div style={{ fontSize: '9px', color: '#6d28d9', fontWeight: 600, marginTop: '3px' }}>{detail}</div>}
                </div>
              );
            })}
          </div>
        )}
        <div style={{ marginTop: '10px' }}>
          <SkillPillStrip skills={skills} bgColors={['#ede9fe', '#fae8ff', '#e0e7ff', '#fce7f3']} textColors={['#5b21b6', '#86198f', '#3730a3', '#9d174d']} />
        </div>
        {projects.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <strong style={stripeLabel}>Projects</strong>
            {projects.map((p) => (
              <div key={p.id} style={{ ...keepTogether, ...stripeCard, marginBottom: '8px', padding: '9px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#1e1b4b' }}>{p.name}</span>
                  {p.link && (
                    <ContactLink kind="url" value={p.link} style={{ fontSize: '9px', color: '#7c3aed', fontWeight: 600, flexShrink: 0, maxWidth: '50%', textAlign: 'right', overflowWrap: 'anywhere' }} />
                  )}
                </div>
                {p.technologies && <div style={{ fontSize: '9px', color: '#6d28d9', fontWeight: 600, marginTop: '3px' }}>{p.technologies}</div>}
                {p.description && <p style={{ fontSize: '9px', color: '#64748b', margin: '4px 0 0' }}>{p.description}</p>}
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: '12px' }}>
          <CustomFieldBlocks sections={customFields} cardBg="#f5f3ff" titleColor="#312e81" accentColor="#7c3aed" />
        </div>
      </div>
    </div>
  );
}

/** Pulse's white entry card. */
const pulseCard: CSSProperties = { backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f3e8ff' };

export function PulseTemplate() {
  const { resumeData } = useResume();
  const { personalInfo, experiences, education, skills, projects, customFields } = resumeData;
  // The wash is sized to one page so every page gets it whole, instead of one gradient stretched over the document.
  const wash = 'linear-gradient(160deg, #fdf4ff 0%, #faf5ff 40%, #eef2ff 100%)';
  const washSize = `794px ${perPage}`;
  return (
    <div
      style={{
        ...pageRoot,
        ...repeatPadding,
        fontFamily: templateFonts.sans,
        backgroundColor: '#faf5ff',
        backgroundImage: wash,
        backgroundSize: washSize,
        backgroundRepeat: 'repeat-y',
        padding: '32px 36px',
      }}
    >
      <PageBackdrop background={`${wash} 0 0 / ${washSize} repeat-y, #faf5ff`} />
      <div style={{ textAlign: 'center', marginBottom: '22px' }}>
        <div
          style={{
            width: '112px',
            height: '112px',
            margin: '0 auto 14px',
            borderRadius: '50%',
            padding: '4px',
            background: 'linear-gradient(135deg, #e879f9, #a855f7, #6366f1)',
            boxSizing: 'border-box',
          }}
        >
          {personalInfo.photo ? (
            <img
              src={personalInfo.photo}
              alt=""
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '28px',
                fontWeight: 800,
              }}
            >
              {(personalInfo.fullName || 'YL')
                .split(/\s+/)
                .filter(Boolean)
                .map((w) => w[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </div>
          )}
        </div>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#581c87' }}>{personalInfo.fullName || 'Your Name'}</h1>
        <p style={{ margin: '6px 0 0', color: '#7e22ce', fontSize: '13px', fontWeight: 600 }}>{personalInfo.title}</p>
        <ContactLine info={personalInfo} sep=" · " style={{ margin: '8px 0 0', fontSize: '10px', color: '#6b7280', lineHeight: 1.6 }} />
      </div>
      {personalInfo.summary && (
        <div style={{ ...repeatPadding, padding: '14px 16px', borderRadius: '14px', backgroundColor: '#fff', marginBottom: '16px', fontSize: '10px', lineHeight: 1.65, color: '#4b5563', boxShadow: '0 2px 16px rgba(168,85,247,0.12)' }}>{personalInfo.summary}</div>
      )}
      {experiences.map((exp) => {
        const dates = dateRange(exp.startDate, exp.endDate, exp.current);
        return (
          <div key={exp.id} style={{ ...keepTogether, ...pulseCard, marginBottom: '12px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#6b21a8' }}>{exp.position}</span>
              {dates && <span style={{ fontSize: '9px', color: '#9333ea', fontWeight: 600, flexShrink: 0 }}>{dates}</span>}
            </div>
            {exp.company && <div style={{ fontSize: '10px', color: '#9333ea', fontWeight: 600 }}>{exp.company}</div>}
            {exp.description && <p style={{ fontSize: '9px', color: '#6b7280', margin: '6px 0 0' }}>{exp.description}</p>}
          </div>
        );
      })}
      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
        <SkillPillStrip skills={skills} bgColors={['#fae8ff', '#ede9fe', '#cffafe', '#fce7f3']} textColors={['#86198f', '#5b21b6', '#0e7490', '#9d174d']} radius={999} />
      </div>
      {education.length > 0 && (
        <div style={{ marginTop: '14px', fontSize: '9px', textAlign: 'center', color: '#6b7280', lineHeight: 1.6 }}>
          {education.map((e) => {
            const detail = joinParts([degreeLine(e), dateRange(e.startDate, e.endDate), gpaText(e.gpa)]);
            return (
              <div key={e.id} style={{ ...keepTogether, marginBottom: '4px' }}>
                {e.institution && <strong style={{ color: '#6b21a8' }}>{e.institution}</strong>}
                {e.institution && detail ? ' · ' : ''}
                {detail}
              </div>
            );
          })}
        </div>
      )}
      {projects.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          {projects.map((p) => (
            <div key={p.id} style={{ ...keepTogether, ...pulseCard, marginBottom: '10px', padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#7c3aed' }}>{p.name}</span>
                {p.link && (
                  <ContactLink kind="url" value={p.link} style={{ fontSize: '9px', color: '#9333ea', fontWeight: 600, flexShrink: 0, maxWidth: '50%', textAlign: 'right', overflowWrap: 'anywhere' }} />
                )}
              </div>
              {p.technologies && <div style={{ fontSize: '9px', color: '#9333ea', fontWeight: 600, marginTop: '2px' }}>{p.technologies}</div>}
              {p.description && <p style={{ fontSize: '9px', color: '#6b7280', margin: '4px 0 0' }}>{p.description}</p>}
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: '14px' }}>
        <CustomFieldBlocks sections={customFields} cardBg="#ffffff" titleColor="#581c87" accentColor="#a855f7" />
      </div>
    </div>
  );
}

export function SummitTemplate() {
  const { resumeData } = useResume();
  const { personalInfo, experiences, education, skills, projects, customFields } = resumeData;
  return (
    <div style={{ ...pageRoot, fontFamily: templateFonts.sans, backgroundColor: '#f1f5f9' }}>
      <PageBackdrop background="#f1f5f9" />
      <div
        style={{
          // At least 132px; grows when the contact lines wrap, so they never run under the card.
          minHeight: '132px',
          background: 'linear-gradient(125deg, #0f172a 0%, #334155 40%, #0ea5e9 100%)',
          padding: '24px 36px',
          color: '#fff',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>{personalInfo.fullName || 'Your Name'}</h1>
            <p style={{ margin: '6px 0 0', fontSize: '13px', opacity: 0.95, fontWeight: 500 }}>{personalInfo.title}</p>
            <ContactLine info={personalInfo} fields={['email', 'phone', 'location']} sep=" · " style={{ margin: '10px 0 0', fontSize: '10px', opacity: 0.85 }} />
            <ContactLine info={personalInfo} fields={['linkedin', 'website']} sep=" · " style={{ margin: '3px 0 0', fontSize: '10px', opacity: 0.85 }} />
          </div>
          <div style={{ marginTop: '8px' }}>
            <PhotoOrInitials photo={personalInfo.photo} name={personalInfo.fullName} size={88} rounded={12} border="3px solid rgba(255,255,255,0.9)" initialsBg="#38bdf8" initialsColor="#0f172a" boxShadow="0 8px 24px rgba(0,0,0,0.25)" />
          </div>
        </div>
      </div>
      {/* The slate margin around the card repeats on every page; the card still tucks 28px under the hero on page one. */}
      <div style={{ ...repeatPadding, padding: '24px 32px' }}>
        <div style={{ ...repeatPadding, marginTop: '-52px', backgroundColor: '#fff', borderRadius: '14px', padding: '22px', boxShadow: '0 8px 32px rgba(15,23,42,0.12)' }}>
          {/* The hero paints over the card's top 28px; this keeps the card's text out from under it. */}
          <div style={{ height: '28px' }} />
          {personalInfo.summary && <p style={{ fontSize: '10px', lineHeight: 1.65, color: '#475569', margin: '0 0 16px' }}>{personalInfo.summary}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', fontSize: '9px' }}>
            <div>
              <h3 style={{ ...keepWithNext, fontSize: '10px', color: '#0f172a', margin: '0 0 10px', letterSpacing: '0.1em' }}>EXPERIENCE</h3>
              {experiences.map((exp) => {
                const dates = dateRange(exp.startDate, exp.endDate, exp.current);
                return (
                  <div key={exp.id} style={{ ...keepTogether, marginBottom: '12px' }}>
                    <strong style={{ color: '#1e293b' }}>{exp.position}</strong>
                    {(exp.company || dates) && (
                      <div style={{ color: '#64748b' }}>
                        {exp.company}
                        {dates && <span style={{ color: '#94a3b8' }}>{exp.company ? ' · ' : ''}{dates}</span>}
                      </div>
                    )}
                    {exp.description && <p style={{ margin: '4px 0 0', color: '#64748b', lineHeight: 1.45 }}>{exp.description}</p>}
                  </div>
                );
              })}
            </div>
            <div>
              <h3 style={{ ...keepWithNext, fontSize: '10px', color: '#0f172a', margin: '0 0 10px', letterSpacing: '0.1em' }}>EDUCATION & SKILLS</h3>
              {education.map((edu) => {
                const meta = joinParts([dateRange(edu.startDate, edu.endDate), gpaText(edu.gpa)]);
                return (
                  <div key={edu.id} style={{ ...keepTogether, marginBottom: '8px', color: '#334155' }}>
                    {joinParts([edu.institution, degreeLine(edu)], ' — ')}
                    {meta && <div style={{ color: '#94a3b8' }}>{meta}</div>}
                  </div>
                );
              })}
              <div style={{ marginTop: '10px' }}>
                <SkillPillStrip skills={skills} bgColors={['#e0f2fe', '#dbeafe', '#cffafe', '#e0e7ff']} textColors={['#0369a1', '#1d4ed8', '#0e7490', '#3730a3']} />
              </div>
              {projects.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <strong style={{ ...keepWithNext, display: 'block', color: '#0ea5e9', marginBottom: '6px' }}>Projects</strong>
                  {projects.map((p) => (
                    <div key={p.id} style={{ ...keepTogether, marginBottom: '10px' }}>
                      <strong style={{ color: '#1e293b' }}>{p.name}</strong>
                      {p.technologies && <div style={{ color: '#64748b' }}>{p.technologies}</div>}
                      {p.description && <p style={{ margin: '4px 0 0', color: '#64748b', lineHeight: 1.45 }}>{p.description}</p>}
                      {p.link && (
                        <div style={{ marginTop: '2px', overflowWrap: 'anywhere' }}>
                          <ContactLink kind="url" value={p.link} style={{ color: '#0ea5e9' }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <CustomFieldBlocks sections={customFields} cardBg="#f8fafc" titleColor="#0f172a" accentColor="#0ea5e9" />
          </div>
        </div>
      </div>
    </div>
  );
}
