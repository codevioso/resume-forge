import { emptyResumeData } from '../data/emptyResume';
import type { CustomField, Education, Experience, Project, ResumeData, Skill, Template } from '../types/resume';

/**
 * Keeps the resume in the browser's localStorage, so a refresh, a closed tab
 * or a crash does not throw away everything the user typed.
 *
 * Nothing leaves the device: the resume is sent to the server only for the
 * length of one PDF export.
 */

export interface ResumePersistence {
  load(): { resumeData: ResumeData; selectedTemplate: Template | null } | null;
  /** False when the browser refused the write (storage full or disabled). */
  save(resumeData: ResumeData, selectedTemplate: Template | null): boolean;
}

export const RESUME_STORAGE_KEY = 'resume-forge:resume';

type Stored = { v: 1; resumeData: unknown; templateId: unknown };

/**
 * `templates` resolves the saved template id back to the registry entry. It is
 * passed in rather than imported because the registry imports every template
 * component, and each of those imports the resume context.
 */
export function createBrowserPersistence(templates: Template[], key = RESUME_STORAGE_KEY): ResumePersistence {
  return {
    load() {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const stored = JSON.parse(raw) as Stored;
        if (stored?.v !== 1) return null;
        return {
          resumeData: normalizeResumeData(stored.resumeData),
          selectedTemplate: templates.find((t) => t.id === stored.templateId) ?? null,
        };
      } catch {
        // Unreadable or blocked storage is the same as no saved resume.
        return null;
      }
    },
    save(resumeData, selectedTemplate) {
      try {
        const stored: Stored = { v: 1, resumeData, templateId: selectedTemplate?.id ?? null };
        window.localStorage.setItem(key, JSON.stringify(stored));
        return true;
      } catch {
        return false;
      }
    },
  };
}

type Loose = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const list = <T,>(v: unknown, read: (x: Loose, i: number) => T): T[] =>
  Array.isArray(v) ? v.filter((x): x is Loose => !!x && typeof x === 'object').map(read) : [];
const id = (x: Loose, prefix: string, i: number) => str(x.id) || `${prefix}-${i}`;

/**
 * Whatever was saved, in exactly the shape the app expects. Saved data can be
 * from an older version of the app or edited by hand; a missing list or a
 * number where text belongs must not crash every template on load.
 */
export function normalizeResumeData(raw: unknown): ResumeData {
  const empty = emptyResumeData();
  const r = (raw && typeof raw === 'object' ? raw : {}) as Loose;
  const p = (r.personalInfo && typeof r.personalInfo === 'object' ? r.personalInfo : {}) as Loose;
  const personalInfo = Object.fromEntries(
    Object.keys(empty.personalInfo).map((k) => [k, str(p[k])]),
  ) as unknown as ResumeData['personalInfo'];

  return {
    personalInfo,
    experiences: list<Experience>(r.experiences, (x, i) => ({
      id: id(x, 'exp', i),
      company: str(x.company),
      position: str(x.position),
      startDate: str(x.startDate),
      endDate: str(x.endDate),
      current: x.current === true,
      description: str(x.description),
    })),
    education: list<Education>(r.education, (x, i) => ({
      id: id(x, 'edu', i),
      institution: str(x.institution),
      degree: str(x.degree),
      field: str(x.field),
      startDate: str(x.startDate),
      endDate: str(x.endDate),
      gpa: str(x.gpa),
    })),
    skills: list<Skill>(r.skills, (x, i) => {
      const level = Number(x.level);
      return {
        id: id(x, 'skill', i),
        name: str(x.name),
        level: Number.isFinite(level) ? Math.min(100, Math.max(0, level)) : 80,
      };
    }),
    projects: list<Project>(r.projects, (x, i) => ({
      id: id(x, 'project', i),
      name: str(x.name),
      description: str(x.description),
      link: str(x.link),
      technologies: str(x.technologies),
    })),
    customFields: list<CustomField>(r.customFields, (x, i) => ({
      id: id(x, 'section', i),
      sectionTitle: str(x.sectionTitle),
      items: list(x.items, (y, j) => ({
        id: id(y, `section-${i}-item`, j),
        title: str(y.title),
        subtitle: str(y.subtitle),
        description: str(y.description),
      })),
    })),
  };
}
