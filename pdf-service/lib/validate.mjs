/**
 * Request validation for POST /pdf.
 *
 * The payload is rendered by a real browser, so this is a security boundary,
 * not just tidiness. Two things in particular:
 *
 * - Every string is length-capped and every list size-capped. Chromium will
 *   lay out whatever it is given, and an unbounded payload is an unbounded
 *   render — the cheapest way to take the service down.
 * - `photo` must be an inline image. Templates render it as `<img src>`, so a
 *   value like `http://169.254.169.254/latest/meta-data/` would make Chromium
 *   fetch an internal address. The browser also blocks every request that is
 *   not to the render origin; this is the first of two walls, not the only one.
 */

export const LIMITS = Object.freeze({
  shortText: 300,
  longText: 6_000,
  experiences: 40,
  education: 20,
  skills: 120,
  projects: 40,
  customFields: 20,
  customItems: 60,
  // A base64 data URL. A downscaled portrait is ~10 KB; this leaves room for
  // an unprocessed upload without allowing an arbitrary payload.
  photoChars: 6 * 1024 * 1024,
});

const TEMPLATE_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const PHOTO = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/;

class Invalid extends Error {}

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function str(v, path, max, { required = false } = {}) {
  if (v === undefined || v === null) {
    if (required) throw new Invalid(`${path} is required`);
    return '';
  }
  if (typeof v !== 'string') throw new Invalid(`${path} must be a string`);
  if (v.length > max) throw new Invalid(`${path} is longer than ${max} characters`);
  return v;
}

function list(v, path, max) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new Invalid(`${path} must be an array`);
  if (v.length > max) throw new Invalid(`${path} has more than ${max} entries`);
  return v;
}

function entry(v, path) {
  if (!isObject(v)) throw new Invalid(`${path} must be an object`);
  return v;
}

function photo(v) {
  if (v === undefined || v === null || v === '') return '';
  if (typeof v !== 'string') throw new Invalid('resumeData.personalInfo.photo must be a string');
  if (v.length > LIMITS.photoChars) throw new Invalid('resumeData.personalInfo.photo is too large');
  if (!PHOTO.test(v)) {
    throw new Invalid('resumeData.personalInfo.photo must be an inline image (data:image/...;base64,...)');
  }
  return v;
}

function personalInfo(v) {
  const p = entry(v, 'resumeData.personalInfo');
  const at = 'resumeData.personalInfo';
  return {
    fullName: str(p.fullName, `${at}.fullName`, LIMITS.shortText),
    email: str(p.email, `${at}.email`, LIMITS.shortText),
    phone: str(p.phone, `${at}.phone`, LIMITS.shortText),
    location: str(p.location, `${at}.location`, LIMITS.shortText),
    title: str(p.title, `${at}.title`, LIMITS.shortText),
    summary: str(p.summary, `${at}.summary`, LIMITS.longText),
    linkedin: str(p.linkedin, `${at}.linkedin`, LIMITS.shortText),
    website: str(p.website, `${at}.website`, LIMITS.shortText),
    photo: photo(p.photo),
  };
}

function experience(e, i) {
  const at = `resumeData.experiences[${i}]`;
  const x = entry(e, at);
  return {
    id: str(x.id, `${at}.id`, LIMITS.shortText),
    company: str(x.company, `${at}.company`, LIMITS.shortText),
    position: str(x.position, `${at}.position`, LIMITS.shortText),
    startDate: str(x.startDate, `${at}.startDate`, LIMITS.shortText),
    endDate: str(x.endDate, `${at}.endDate`, LIMITS.shortText),
    current: x.current === true,
    description: str(x.description, `${at}.description`, LIMITS.longText),
  };
}

function education(e, i) {
  const at = `resumeData.education[${i}]`;
  const x = entry(e, at);
  return {
    id: str(x.id, `${at}.id`, LIMITS.shortText),
    institution: str(x.institution, `${at}.institution`, LIMITS.shortText),
    degree: str(x.degree, `${at}.degree`, LIMITS.shortText),
    field: str(x.field, `${at}.field`, LIMITS.shortText),
    startDate: str(x.startDate, `${at}.startDate`, LIMITS.shortText),
    endDate: str(x.endDate, `${at}.endDate`, LIMITS.shortText),
    gpa: str(x.gpa, `${at}.gpa`, LIMITS.shortText),
  };
}

function skill(s, i) {
  const at = `resumeData.skills[${i}]`;
  const x = entry(s, at);
  const level = Number(x.level);
  return {
    id: str(x.id, `${at}.id`, LIMITS.shortText),
    name: str(x.name, `${at}.name`, LIMITS.shortText),
    // A percentage: the editor's slider runs 0–100 and templates draw it as a
    // bar width. Clamped rather than rejected: an out-of-range level is a
    // cosmetic problem in a meter, not a reason to refuse the whole document.
    level: Number.isFinite(level) ? Math.min(100, Math.max(0, Math.round(level))) : 0,
  };
}

function project(p, i) {
  const at = `resumeData.projects[${i}]`;
  const x = entry(p, at);
  return {
    id: str(x.id, `${at}.id`, LIMITS.shortText),
    name: str(x.name, `${at}.name`, LIMITS.shortText),
    description: str(x.description, `${at}.description`, LIMITS.longText),
    link: str(x.link, `${at}.link`, LIMITS.shortText),
    technologies: str(x.technologies, `${at}.technologies`, LIMITS.shortText),
  };
}

function customField(c, i) {
  const at = `resumeData.customFields[${i}]`;
  const x = entry(c, at);
  return {
    id: str(x.id, `${at}.id`, LIMITS.shortText),
    sectionTitle: str(x.sectionTitle, `${at}.sectionTitle`, LIMITS.shortText),
    items: list(x.items, `${at}.items`, LIMITS.customItems).map((it, j) => {
      const at2 = `${at}.items[${j}]`;
      const y = entry(it, at2);
      return {
        id: str(y.id, `${at2}.id`, LIMITS.shortText),
        title: str(y.title, `${at2}.title`, LIMITS.shortText),
        subtitle: str(y.subtitle, `${at2}.subtitle`, LIMITS.shortText),
        description: str(y.description, `${at2}.description`, LIMITS.longText),
      };
    }),
  };
}

function resumeData(v) {
  if (!isObject(v)) throw new Invalid('resumeData must be an object');
  return {
    personalInfo: personalInfo(v.personalInfo ?? {}),
    experiences: list(v.experiences, 'resumeData.experiences', LIMITS.experiences).map(experience),
    education: list(v.education, 'resumeData.education', LIMITS.education).map(education),
    skills: list(v.skills, 'resumeData.skills', LIMITS.skills).map(skill),
    projects: list(v.projects, 'resumeData.projects', LIMITS.projects).map(project),
    customFields: list(v.customFields, 'resumeData.customFields', LIMITS.customFields).map(customField),
  };
}

/**
 * Returns `{ ok: true, snapshot }` with a normalised copy of the payload, or
 * `{ ok: false, error }`. The normalised copy is what gets rendered: unknown
 * fields are dropped rather than passed through to the page.
 */
export function validateRenderRequest(body) {
  try {
    if (!isObject(body)) throw new Invalid('request body must be a JSON object');
    const snapshot = body.snapshot;
    if (!isObject(snapshot)) throw new Invalid('snapshot is required');

    const t = snapshot.selectedTemplate;
    if (!isObject(t)) throw new Invalid('snapshot.selectedTemplate is required');
    const id = str(t.id, 'snapshot.selectedTemplate.id', 40, { required: true });
    if (!TEMPLATE_ID.test(id)) throw new Invalid('snapshot.selectedTemplate.id is not a valid template id');

    return {
      ok: true,
      snapshot: {
        // PrintPage reads the template object from the same snapshot, so the
        // display metadata passes through; only the id is validated, because
        // only the id selects code.
        selectedTemplate: { ...t, id },
        resumeData: resumeData(snapshot.resumeData),
      },
    };
  } catch (err) {
    if (err instanceof Invalid) return { ok: false, error: err.message };
    throw err;
  }
}
