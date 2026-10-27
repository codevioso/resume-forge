import { Fragment } from 'react';
import type { CSSProperties } from 'react';
import { useResume } from '../../context/ResumeContext';
import { ContactLink, dateRange, degreeLine, gpaText, joinParts } from '../fields';
import { templateFonts } from '../fonts';
import { keepTogether, keepWithNext, pageRoot, repeatPadding } from '../paging';
import { PageBackdrop, rightColumn } from '../PageBackdrop';
import { resumePillStyle } from '../resumePill';
import { SectionTitleAccent } from '../sectionLabel';
import { CustomFieldBlocks, PhotoOrInitials, SkillPillStrip } from './additionalUi';

type ContactItem = { kind?: 'email' | 'phone' | 'url'; value?: string };

const filled = (value?: string) => Boolean(value?.trim());

/** The filled-in contact values, separated by `sep`; email, phone and URLs are links. */
function ContactRun({ items, sep = ' · ' }: { items: ContactItem[]; sep?: string }) {
  return (
    <>
      {items
        .filter((it) => filled(it.value))
        .map((it, i) => (
          <Fragment key={i}>
            {i > 0 && sep}
            {it.kind ? <ContactLink kind={it.kind} value={it.value} /> : it.value}
          </Fragment>
        ))}
    </>
  );
}

/** "Jan 2020 – May 2024 · GPA 3.8", or whichever part exists. */
const educationMeta = (edu: { startDate: string; endDate: string; gpa?: string }) =>
  joinParts([dateRange(edu.startDate, edu.endDate), gpaText(edu.gpa)]);

export function AtlasTemplate() {
  const { resumeData } = useResume();
  const { personalInfo, experiences, education, skills, projects, customFields } = resumeData;
  const navy = '#0c1929';
  const coral = '#fb7185';
  const mint = '#5eead4';
  const paper = '#f8fafc';
  const pill = (border: string): CSSProperties => ({
    ...resumePillStyle({ fontSizePx: 9, heightPx: 24, padXPx: 10, borderWidthPx: 1 }),
    maxWidth: '100%',
    backgroundColor: '#fff',
    borderRadius: '20px',
    border: `1px solid ${border}`,
  });
  return (
    <div style={{ ...pageRoot, ...repeatPadding, fontFamily: templateFonts.sans, backgroundColor: paper, position: 'relative', padding: '28px 32px' }}>
      <PageBackdrop background={paper} />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '280px',
          height: '180px',
          background: `linear-gradient(135deg, ${coral}33 0%, ${mint}44 100%)`,
          borderRadius: '0 0 0 120px',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
          <PhotoOrInitials photo={personalInfo.photo} name={personalInfo.fullName} size={108} rounded={20} border={`4px solid ${navy}`} initialsBg={coral} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: navy, letterSpacing: '-0.02em' }}>{personalInfo.fullName || 'Your Name'}</h1>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: coral, fontWeight: 600 }}>{personalInfo.title}</p>
            <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '9px', color: '#475569' }}>
              {filled(personalInfo.email) && <ContactLink kind="email" value={personalInfo.email} style={pill(`${mint}66`)} />}
              {filled(personalInfo.phone) && <ContactLink kind="phone" value={personalInfo.phone} style={pill(`${coral}55`)} />}
              {filled(personalInfo.location) && <span style={pill('#cbd5e1')}>{personalInfo.location}</span>}
              {filled(personalInfo.linkedin) && <ContactLink kind="url" value={personalInfo.linkedin} style={pill(`${mint}66`)} />}
              {filled(personalInfo.website) && <ContactLink kind="url" value={personalInfo.website} style={pill(`${coral}55`)} />}
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', paddingTop: '22px', gap: '24px', position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1 }}>
          {personalInfo.summary && (
            <section style={{ ...keepTogether, marginBottom: '18px', padding: '14px 16px', backgroundColor: '#fff', borderRadius: '12px', border: `1px solid #e2e8f0`, boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}>
              <h2 style={{ ...keepWithNext, fontSize: '10px', color: navy, letterSpacing: '0.15em', margin: '0 0 8px' }}>ABOUT</h2>
              <p style={{ fontSize: '10px', lineHeight: 1.65, color: '#334155', margin: 0 }}>{personalInfo.summary}</p>
            </section>
          )}
          {experiences.length > 0 && (
            <section>
              <SectionTitleAccent
                as="h2"
                accentColumnPx={20}
                style={{ margin: '0 0 12px' }}
                accentBarStyle={{
                  height: 4,
                  borderRadius: '2px',
                  background: `linear-gradient(90deg, ${coral}, ${mint})`,
                }}
                titleStyle={{ fontSize: '10px', color: navy, letterSpacing: '0.15em', fontWeight: 700 }}
              >
                EXPERIENCE
              </SectionTitleAccent>
              {experiences.map((exp) => {
                const dates = dateRange(exp.startDate, exp.endDate, exp.current);
                return (
                  <div key={exp.id} style={{ ...keepTogether, marginBottom: '14px', paddingLeft: '12px', borderLeft: `3px solid ${coral}` }}>
                    <div style={{ ...keepWithNext, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: navy }}>{exp.position}</div>
                        <div style={{ fontSize: '10px', color: coral, fontWeight: 600 }}>{exp.company}</div>
                      </div>
                      {dates && (
                        <span
                          style={{
                            ...resumePillStyle({ preset: 'xs', padXPx: 8 }),
                            backgroundColor: `${mint}33`,
                            color: '#0f766e',
                            borderRadius: '8px',
                          }}
                        >
                          {dates}
                        </span>
                      )}
                    </div>
                    {exp.description && <p style={{ fontSize: '9px', color: '#64748b', margin: '6px 0 0', lineHeight: 1.55 }}>{exp.description}</p>}
                  </div>
                );
              })}
            </section>
          )}
          {projects.length > 0 && (
            <section style={{ marginTop: '16px' }}>
              <h2 style={{ ...keepWithNext, fontSize: '10px', color: navy, letterSpacing: '0.15em', margin: '0 0 10px' }}>PROJECTS</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {projects.map((p, i) => (
                  <div key={p.id} style={{ ...keepTogether, width: 'calc(50% - 5px)', padding: '10px', backgroundColor: i % 2 === 0 ? '#fff1f2' : '#f0fdfa', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: navy }}>{p.name}</div>
                    {p.technologies && <div style={{ fontSize: '8px', color: coral, marginTop: '4px' }}>{p.technologies}</div>}
                    {p.description && <div style={{ fontSize: '8px', color: '#64748b', marginTop: '4px', lineHeight: 1.45 }}>{p.description}</div>}
                    {filled(p.link) && (
                      <div style={{ fontSize: '8px', color: '#0f766e', marginTop: '4px', overflowWrap: 'anywhere' }}>
                        <ContactLink kind="url" value={p.link} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <div style={{ width: '210px', flexShrink: 0 }}>
          {skills.length > 0 && (
            <section style={{ marginBottom: '16px' }}>
              <h2 style={{ ...keepWithNext, fontSize: '10px', color: navy, letterSpacing: '0.15em', margin: '0 0 10px' }}>SKILLS</h2>
              <SkillPillStrip skills={skills} bgColors={['#ffe4e6', '#e0f2fe', '#f3e8ff', '#ecfccb', '#fef3c7']} textColors={['#be123c', '#0369a1', '#7c3aed', '#3f6212', '#b45309']} />
            </section>
          )}
          {education.map((edu) => {
            const degree = degreeLine(edu);
            const meta = educationMeta(edu);
            return (
              <section key={edu.id} style={{ ...keepTogether, marginBottom: '14px', padding: '12px', backgroundColor: '#fff', borderRadius: '10px', border: `1px solid ${mint}55` }}>
                <h2 style={{ fontSize: '9px', color: mint, letterSpacing: '0.12em', margin: '0 0 6px' }}>EDUCATION</h2>
                {degree && <div style={{ fontSize: '10px', fontWeight: 700, color: navy }}>{degree}</div>}
                {edu.institution && <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>{edu.institution}</div>}
                {meta && <div style={{ fontSize: '8px', color: '#94a3b8', marginTop: '4px' }}>{meta}</div>}
              </section>
            );
          })}
          <CustomFieldBlocks sections={customFields} cardBg="#f1f5f9" titleColor={navy} accentColor={coral} />
        </div>
      </div>
    </div>
  );
}

export function HorizonTemplate() {
  const { resumeData } = useResume();
  const { personalInfo, experiences, education, skills, projects, customFields } = resumeData;
  const sky = '#0ea5e9';
  const indigo = '#4f46e5';
  const rose = '#f43f5e';
  const contact: ContactItem[] = [
    { kind: 'email', value: personalInfo.email },
    { kind: 'phone', value: personalInfo.phone },
    { value: personalInfo.location },
  ];
  const web: ContactItem[] = [
    { kind: 'url', value: personalInfo.linkedin },
    { kind: 'url', value: personalInfo.website },
  ];
  const hasContact = contact.some((c) => filled(c.value));
  const hasWeb = web.some((c) => filled(c.value));
  return (
    <div
      style={{
        ...pageRoot,
        fontFamily: templateFonts.sans,
        // The old full-height wash would stretch over every page; keep its top fade on page one only.
        backgroundImage: 'linear-gradient(180deg, #ecfeff 0px, #ffffff 505px)',
        backgroundSize: '100% 505px',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div style={{ ...repeatPadding, padding: '32px 36px' }}>
        <div style={{ paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: '16px' }}>
            <h1 style={{ margin: 0, fontSize: '30px', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{personalInfo.fullName || 'Your Name'}</h1>
            <p style={{ margin: '8px 0 0', fontSize: '13px', fontWeight: 600, color: indigo }}>{personalInfo.title}</p>
            {(hasContact || hasWeb) && (
              <div style={{ marginTop: '10px', fontSize: '10px', color: '#64748b', lineHeight: 1.6, overflowWrap: 'anywhere' }}>
                {hasContact && (
                  <div>
                    <ContactRun items={contact} />
                  </div>
                )}
                {hasWeb && (
                  <div>
                    <ContactRun items={web} />
                  </div>
                )}
              </div>
            )}
          </div>
          <PhotoOrInitials photo={personalInfo.photo} name={personalInfo.fullName} size={96} rounded="full" border={`4px solid ${sky}`} initialsBg={indigo} boxShadow="0 8px 24px rgba(79,70,229,0.35)" />
        </div>
        {personalInfo.summary && (
          <div style={{ ...keepTogether, marginBottom: '20px', padding: '14px 18px', backgroundColor: '#fff', borderRadius: '14px', borderLeft: `4px solid ${sky}`, boxShadow: '0 2px 16px rgba(14,165,233,0.12)' }}>
            <p style={{ fontSize: '10px', lineHeight: 1.7, color: '#475569', margin: 0, fontStyle: 'italic' }}>{personalInfo.summary}</p>
          </div>
        )}
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ width: '200px', flexShrink: 0 }}>
            {skills.length > 0 && (
              <div style={{ marginBottom: '18px' }}>
                <div style={{ ...keepWithNext, fontSize: '10px', fontWeight: 700, color: rose, marginBottom: '10px', letterSpacing: '0.12em' }}>SKILLS</div>
                <SkillPillStrip skills={skills} bgColors={['#ffe4e6', '#e0e7ff', '#cffafe', '#fef9c3', '#dcfce7']} textColors={['#be123c', '#3730a3', '#0e7490', '#a16207', '#166534']} radius={20} />
              </div>
            )}
            {education.map((edu) => {
              const degree = degreeLine(edu);
              const meta = educationMeta(edu);
              return (
                <div key={edu.id} style={{ ...keepTogether, marginBottom: '12px', padding: '10px 12px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                  {edu.institution && <div style={{ fontSize: '10px', fontWeight: 700, color: '#0f172a' }}>{edu.institution}</div>}
                  {degree && <div style={{ fontSize: '9px', color: indigo, marginTop: '2px' }}>{degree}</div>}
                  {meta && <div style={{ fontSize: '8px', color: '#94a3b8', marginTop: '4px' }}>{meta}</div>}
                </div>
              );
            })}
            <CustomFieldBlocks sections={customFields} cardBg="#f8fafc" titleColor="#0f172a" accentColor={sky} />
          </div>
          <div style={{ flex: 1 }}>
            {experiences.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ ...keepWithNext, fontSize: '10px', fontWeight: 700, color: sky, marginBottom: '12px', letterSpacing: '0.12em' }}>TIMELINE</div>
                {experiences.map((exp, i) => (
                  <div key={exp.id} style={{ ...keepTogether, display: 'flex', gap: '12px', marginBottom: i === experiences.length - 1 ? 0 : '16px' }}>
                    {/* Start over end in the gutter: "Jan 2020 –" then "Present". */}
                    <div style={{ width: '56px', flexShrink: 0, fontSize: '8px', lineHeight: 1.4, color: '#94a3b8', textAlign: 'right', paddingTop: '4px', whiteSpace: 'pre-line' }}>
                      {dateRange(exp.startDate, exp.endDate, exp.current, ' –\n')}
                    </div>
                    <div style={{ flex: 1, paddingLeft: '14px', borderLeft: `3px solid ${i % 2 === 0 ? sky : indigo}`, position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '-7px', top: '6px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: i % 2 === 0 ? sky : indigo }} />
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{exp.position}</div>
                      <div style={{ fontSize: '10px', color: indigo, fontWeight: 600 }}>{exp.company}</div>
                      {exp.description && <p style={{ fontSize: '9px', color: '#64748b', margin: '6px 0 0', lineHeight: 1.5 }}>{exp.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {projects.length > 0 && (
              <div>
                <div style={{ ...keepWithNext, fontSize: '10px', fontWeight: 700, color: indigo, marginBottom: '10px' }}>PROJECTS</div>
                {projects.map((p) => (
                  <div key={p.id} style={{ ...keepTogether, marginBottom: '10px', padding: '10px 12px', backgroundColor: '#eef2ff', borderRadius: '8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700 }}>{p.name}</div>
                    {p.technologies && <div style={{ fontSize: '8px', color: indigo }}>{p.technologies}</div>}
                    {p.description && <div style={{ fontSize: '8px', color: '#64748b', marginTop: '4px' }}>{p.description}</div>}
                    {filled(p.link) && (
                      <div style={{ fontSize: '8px', color: '#0369a1', marginTop: '4px', overflowWrap: 'anywhere' }}>
                        <ContactLink kind="url" value={p.link} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MonoTemplate() {
  const { resumeData } = useResume();
  const { personalInfo, experiences, education, skills, projects, customFields } = resumeData;
  const bg = '#0c0c0f';
  const green = '#4ade80';
  const pink = '#f472b6';
  return (
    <div style={{ ...pageRoot, ...repeatPadding, fontFamily: templateFonts.mono, backgroundColor: bg, color: green, padding: '28px 32px' }}>
      <PageBackdrop background={bg} />
      <div style={{ ...keepTogether, display: 'flex', gap: '20px', marginBottom: '20px', border: `1px solid ${green}44`, borderRadius: '8px', padding: '16px', backgroundColor: '#111118' }}>
        <PhotoOrInitials photo={personalInfo.photo} name={personalInfo.fullName} size={88} rounded={8} border={`2px solid ${green}`} initialsBg="#1e1e2e" initialsColor={pink} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '10px', color: pink, marginBottom: '6px' }}>{'>'} profile.json</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{personalInfo.fullName || 'Your Name'}</div>
          <div style={{ fontSize: '10px', color: green, marginTop: '4px' }}>{personalInfo.title}</div>
          <div style={{ fontSize: '8px', color: '#94a3b8', marginTop: '8px', lineHeight: 1.6, overflowWrap: 'anywhere' }}>
            {filled(personalInfo.email) && (
              <div>
                email: <ContactLink kind="email" value={personalInfo.email} />
              </div>
            )}
            {filled(personalInfo.phone) && (
              <div>
                phone: <ContactLink kind="phone" value={personalInfo.phone} />
              </div>
            )}
            {filled(personalInfo.location) && <div>location: {personalInfo.location}</div>}
            {filled(personalInfo.linkedin) && (
              <div>
                linkedin: <ContactLink kind="url" value={personalInfo.linkedin} />
              </div>
            )}
            {filled(personalInfo.website) && (
              <div>
                website: <ContactLink kind="url" value={personalInfo.website} />
              </div>
            )}
          </div>
        </div>
      </div>
      {personalInfo.summary && (
        <div style={{ ...keepTogether, marginBottom: '16px', padding: '12px', backgroundColor: '#111118', borderRadius: '6px', border: `1px dashed ${green}55`, fontSize: '9px', lineHeight: 1.6, color: '#cbd5e1' }}>
          <span style={{ color: pink }}>// summary</span>
          <br />
          {personalInfo.summary}
        </div>
      )}
      {experiences.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ ...keepWithNext, fontSize: '9px', color: pink, marginBottom: '8px' }}>{'>'} experience.log</div>
          {experiences.map((exp) => {
            const dates = dateRange(exp.startDate, exp.endDate, exp.current, ' → ');
            return (
              <div key={exp.id} style={{ ...keepTogether, marginBottom: '12px', paddingLeft: '10px', borderLeft: `2px solid ${green}66` }}>
                <div style={{ fontSize: '10px', color: '#f8fafc' }}>{joinParts([exp.position, exp.company], ' @ ')}</div>
                {dates && <div style={{ fontSize: '8px', color: green }}>[{dates}]</div>}
                {exp.description && <div style={{ fontSize: '8px', color: '#94a3b8', marginTop: '4px' }}>{exp.description}</div>}
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', gap: '20px', fontSize: '8px' }}>
        {education.length > 0 && (
          <div style={{ flex: 1 }}>
            <div style={{ ...keepWithNext, color: pink, marginBottom: '6px' }}>{'>'} education</div>
            {education.map((edu) => {
              const degree = degreeLine(edu);
              const dates = dateRange(edu.startDate, edu.endDate, false, ' → ');
              const gpa = gpaText(edu.gpa);
              return (
                <div key={edu.id} style={{ ...keepTogether, marginBottom: '8px', lineHeight: 1.5 }}>
                  {edu.institution && <div style={{ color: '#e2e8f0' }}>{edu.institution}</div>}
                  {degree && <div style={{ color: '#94a3b8' }}>{degree}</div>}
                  {(dates || gpa) && (
                    <div style={{ color: '#94a3b8' }}>
                      {dates && <span style={{ color: green }}>[{dates}]</span>}
                      {dates && gpa && ' '}
                      {gpa}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {skills.length > 0 && (
          <div style={{ flex: 1 }}>
            <div style={{ ...keepWithNext, color: pink, marginBottom: '6px' }}>{'>'} skills[]</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {skills.map((s) => (
                <span
                  key={s.id}
                  style={{
                    ...resumePillStyle({ preset: 'xs', padXPx: 8, borderWidthPx: 1 }),
                    backgroundColor: '#1e293b',
                    border: `1px solid ${green}44`,
                    borderRadius: '4px',
                    color: green,
                  }}
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      {projects.length > 0 && (
        <div style={{ marginTop: '14px', fontSize: '8px' }}>
          <div style={{ ...keepWithNext, color: pink, marginBottom: '6px' }}>{'>'} projects</div>
          {projects.map((p) => (
            <div key={p.id} style={{ ...keepTogether, marginBottom: '8px', paddingLeft: '10px', borderLeft: `2px solid ${green}66`, lineHeight: 1.5 }}>
              <div style={{ color: '#cbd5e1' }}>
                <span style={{ color: '#f8fafc' }}>{p.name}</span>
                {p.technologies && ` — ${p.technologies}`}
              </div>
              {p.description && <div style={{ color: '#94a3b8' }}>{p.description}</div>}
              {filled(p.link) && (
                <div style={{ color: green, overflowWrap: 'anywhere' }}>
                  <ContactLink kind="url" value={p.link} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: '12px' }}>
        <CustomFieldBlocks
          sections={customFields}
          cardBg="#111118"
          titleColor={green}
          accentColor={pink}
          itemTitleColor="#f8fafc"
          itemMutedColor="#94a3b8"
        />
      </div>
    </div>
  );
}

export function SlateTemplate() {
  const { resumeData } = useResume();
  const { personalInfo, experiences, education, skills, projects, customFields } = resumeData;
  const deep = '#312e81';
  const lilac = '#c4b5fd';
  const amber = '#fbbf24';
  const paper = '#faf5ff';
  // Midpoint of the old deep -> #1e1b4b vertical gradient, which would now stretch over every page.
  const column = '#282566';
  const columnPx = 248;
  return (
    <div style={{ ...pageRoot, fontFamily: templateFonts.sans, display: 'flex', flexDirection: 'row-reverse', backgroundColor: paper }}>
      <PageBackdrop background={rightColumn(column, columnPx, paper)} />
      <div style={{ ...repeatPadding, width: `${columnPx}px`, flexShrink: 0, backgroundColor: column, color: '#f5f3ff', padding: '28px 20px' }}>
        <PhotoOrInitials photo={personalInfo.photo} name={personalInfo.fullName} size={112} rounded="full" border={`4px solid ${amber}`} initialsBg="#6366f1" boxShadow="0 4px 20px rgba(0,0,0,0.3)" />
        <h1 style={{ fontSize: '20px', margin: '18px 0 6px', fontWeight: 800, lineHeight: 1.2 }}>{personalInfo.fullName || 'Your Name'}</h1>
        <p style={{ fontSize: '11px', color: lilac, margin: 0, fontWeight: 500 }}>{personalInfo.title}</p>
        <div style={{ ...keepTogether, marginTop: '20px', fontSize: '9px', lineHeight: 1.85, color: '#c7d2fe', overflowWrap: 'anywhere' }}>
          {filled(personalInfo.email) && (
            <div>
              <ContactLink kind="email" value={personalInfo.email} />
            </div>
          )}
          {filled(personalInfo.phone) && (
            <div>
              <ContactLink kind="phone" value={personalInfo.phone} />
            </div>
          )}
          {filled(personalInfo.location) && <div>{personalInfo.location}</div>}
          {filled(personalInfo.linkedin) && (
            <div>
              <ContactLink kind="url" value={personalInfo.linkedin} />
            </div>
          )}
          {filled(personalInfo.website) && (
            <div>
              <ContactLink kind="url" value={personalInfo.website} />
            </div>
          )}
        </div>
        {skills.length > 0 && (
            <div style={{ marginTop: '22px' }}>
              <div style={{ ...keepWithNext, fontSize: '9px', letterSpacing: '0.2em', color: amber, marginBottom: '10px' }}>SKILLS</div>
              <SkillPillStrip skills={skills} bgColors={['#4338ca', '#5b21b6', '#6d28d9']} textColors={['#fef3c7', '#e9d5ff', '#fce7f3']} radius={6} />
            </div>
        )}
        {education.map((edu) => {
          const degree = degreeLine(edu);
          const meta = educationMeta(edu);
          return (
            <div key={edu.id} style={{ ...keepTogether, marginTop: '18px', padding: '10px', backgroundColor: '#ffffff18', borderRadius: '8px', fontSize: '9px' }}>
              {edu.institution && <div style={{ fontWeight: 700, color: '#fff' }}>{edu.institution}</div>}
              {degree && <div style={{ color: lilac, marginTop: '4px' }}>{degree}</div>}
              {meta && <div style={{ fontSize: '8px', color: '#c7d2fe', marginTop: '4px' }}>{meta}</div>}
            </div>
          );
        })}
        <div style={{ marginTop: '18px' }}>
          <CustomFieldBlocks
            sections={customFields}
            cardBg="#ffffff22"
            titleColor="#fef3c7"
            accentColor={amber}
            itemTitleColor="#ffffff"
            itemMutedColor="#c7d2fe"
          />
        </div>
      </div>
      <div style={{ ...repeatPadding, flex: 1, minWidth: 0, padding: '28px 26px', color: '#1e1b4b' }}>
        {personalInfo.summary && (
          <p style={{ ...keepTogether, fontSize: '10px', lineHeight: 1.7, margin: '0 0 20px', padding: '14px', backgroundColor: '#fff', borderRadius: '12px', border: `1px solid ${lilac}66` }}>{personalInfo.summary}</p>
        )}
        {experiences.length > 0 && (
          <div>
            <h2 style={{ ...keepWithNext, fontSize: '11px', color: deep, margin: '0 0 12px', letterSpacing: '0.1em' }}>EXPERIENCE</h2>
            {experiences.map((exp) => {
              const dates = dateRange(exp.startDate, exp.endDate, exp.current);
              return (
                <div key={exp.id} style={{ ...keepTogether, marginBottom: '14px' }}>
                  <div style={{ ...keepWithNext, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>{exp.position}</span>
                    {dates && (
                      <span
                        style={{
                          ...resumePillStyle({ preset: 'xs' }),
                          color: '#6b7280',
                          backgroundColor: '#ede9fe',
                          borderRadius: '8px',
                        }}
                      >
                        {dates}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '10px', color: '#5b21b6', fontWeight: 600 }}>{exp.company}</div>
                  {exp.description && <p style={{ fontSize: '9px', color: '#64748b', margin: '6px 0 0', lineHeight: 1.5 }}>{exp.description}</p>}
                </div>
              );
            })}
          </div>
        )}
        {projects.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <h2 style={{ ...keepWithNext, fontSize: '11px', color: deep, margin: '0 0 10px' }}>PROJECTS</h2>
            {projects.map((p) => (
              <div key={p.id} style={{ ...keepTogether, marginBottom: '10px', fontSize: '9px' }}>
                <div style={{ ...keepWithNext, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                  <strong style={{ fontSize: '10px' }}>{p.name}</strong>
                  {filled(p.link) && (
                    <ContactLink kind="url" value={p.link} style={{ fontSize: '8px', color: '#5b21b6', textAlign: 'right', overflowWrap: 'anywhere', maxWidth: '55%' }} />
                  )}
                </div>
                {p.technologies && <div style={{ color: '#5b21b6', fontWeight: 600, marginTop: '2px' }}>{p.technologies}</div>}
                {p.description && <div style={{ color: '#6b7280', marginTop: '2px', lineHeight: 1.5 }}>{p.description}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function IvoryTemplate() {
  const { resumeData } = useResume();
  const { personalInfo, experiences, education, skills, projects, customFields } = resumeData;
  const gold = '#b45309';
  const wine = '#7f1d1d';
  const paper = '#fffbeb';
  const contact: ContactItem[] = [
    { kind: 'email', value: personalInfo.email },
    { kind: 'phone', value: personalInfo.phone },
    { value: personalInfo.location },
  ];
  const web: ContactItem[] = [
    { kind: 'url', value: personalInfo.linkedin },
    { kind: 'url', value: personalInfo.website },
  ];
  const hasContact = contact.some((c) => filled(c.value));
  const hasWeb = web.some((c) => filled(c.value));
  return (
    <div style={{ ...pageRoot, ...repeatPadding, fontFamily: templateFonts.serif, backgroundColor: paper, color: '#422006', padding: '36px 44px' }}>
      <PageBackdrop background={paper} />
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        {/* A flex row: text-align does not centre the block-level photo. */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <PhotoOrInitials photo={personalInfo.photo} name={personalInfo.fullName} size={104} rounded="full" border={`5px double ${gold}`} initialsBg="#fef3c7" initialsColor={wine} />
        </div>
        <h1 style={{ fontSize: '30px', fontWeight: 400, margin: '16px 0 6px', color: wine, letterSpacing: '0.04em' }}>{personalInfo.fullName || 'Your Name'}</h1>
        <p style={{ fontSize: '12px', fontStyle: 'italic', margin: 0, color: gold }}>{personalInfo.title}</p>
        {(hasContact || hasWeb) && (
          <div style={{ fontSize: '10px', margin: '12px 0 0', color: '#78716c', lineHeight: 1.6, overflowWrap: 'anywhere' }}>
            {hasContact && (
              <div>
                <ContactRun items={contact} />
              </div>
            )}
            {hasWeb && (
              <div>
                <ContactRun items={web} />
              </div>
            )}
          </div>
        )}
      </div>
      {personalInfo.summary && (
        <div style={{ ...keepTogether, maxWidth: '640px', margin: '0 auto 22px', padding: '16px 20px', backgroundColor: '#fff7ed', borderRadius: '4px', border: `1px solid ${gold}44` }}>
          <p style={{ fontSize: '10px', lineHeight: 1.8, textAlign: 'center', margin: 0, fontStyle: 'italic', color: '#57534e' }}>{personalInfo.summary}</p>
        </div>
      )}
      {experiences.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ ...keepWithNext, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.25em', color: gold, margin: '0 0 14px', textAlign: 'center' }}>
            Experience
          </h2>
          {experiences.map((exp) => {
            const dates = dateRange(exp.startDate, exp.endDate, exp.current);
            return (
              <div key={exp.id} style={{ ...keepTogether, marginBottom: '14px', paddingBottom: '12px', borderBottom: `1px solid ${gold}33` }}>
                <div style={{ ...keepWithNext, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: wine }}>{exp.position}</span>
                  {dates && <span style={{ fontSize: '9px', color: '#a8a29e' }}>{dates}</span>}
                </div>
                <div style={{ fontSize: '10px', color: gold, fontWeight: 600, marginTop: '2px' }}>{exp.company}</div>
                {exp.description && <p style={{ fontSize: '9px', margin: '6px 0 0', lineHeight: 1.6, color: '#57534e' }}>{exp.description}</p>}
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', gap: '36px' }}>
        {education.length > 0 && (
          <div style={{ flex: 1 }}>
            <h2 style={{ ...keepWithNext, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', color: gold, margin: '0 0 10px' }}>Education</h2>
            {education.map((edu) => {
              const degree = degreeLine(edu);
              const meta = educationMeta(edu);
              return (
                <div key={edu.id} style={{ ...keepTogether, fontSize: '10px', marginBottom: '10px' }}>
                  {edu.institution && <strong>{edu.institution}</strong>}
                  {degree && <div style={{ color: '#78716c', marginTop: '2px' }}>{degree}</div>}
                  {meta && <div style={{ fontSize: '9px', color: '#a8a29e', marginTop: '2px' }}>{meta}</div>}
                </div>
              );
            })}
          </div>
        )}
        {skills.length > 0 && (
          <div style={{ flex: 1 }}>
            <h2 style={{ ...keepWithNext, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', color: gold, margin: '0 0 10px' }}>Skills</h2>
            <SkillPillStrip skills={skills} bgColors={['#ffedd5', '#fecaca', '#fde68a', '#d9f99d', '#e9d5ff']} textColors={['#9a3412', '#991b1b', '#a16207', '#3f6212', '#6b21a8']} />
          </div>
        )}
      </div>
      {projects.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h2 style={{ ...keepWithNext, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', color: gold, margin: '0 0 10px' }}>Projects</h2>
          {projects.map((p) => (
            <div key={p.id} style={{ ...keepTogether, fontSize: '9px', marginBottom: '8px' }}>
              <div style={{ ...keepWithNext, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '16px' }}>
                <span>
                  <strong style={{ color: wine }}>{p.name}</strong>
                  {p.technologies && ` — ${p.technologies}`}
                </span>
                {filled(p.link) && (
                  <ContactLink kind="url" value={p.link} style={{ color: '#78716c', textAlign: 'right', overflowWrap: 'anywhere', maxWidth: '50%' }} />
                )}
              </div>
              {p.description && <div style={{ marginTop: '3px', lineHeight: 1.6, color: '#57534e' }}>{p.description}</div>}
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: '16px' }}>
        <CustomFieldBlocks sections={customFields} cardBg="#fff7ed" titleColor={wine} accentColor={gold} />
      </div>
    </div>
  );
}
