import type { ResumeData } from '../types/resume';

/** A resume with nothing filled in. A fresh object every call, safe to mutate. */
export function emptyResumeData(): ResumeData {
  return {
    personalInfo: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      title: '',
      summary: '',
      linkedin: '',
      website: '',
      photo: '',
    },
    experiences: [],
    education: [],
    skills: [],
    projects: [],
    customFields: [],
  };
}

/** True when the user has typed or added anything at all. */
export function hasContent(data: ResumeData): boolean {
  const filled = Object.values(data.personalInfo).some((v) => typeof v === 'string' && v.trim() !== '');
  return (
    filled ||
    data.experiences.length > 0 ||
    data.education.length > 0 ||
    data.skills.length > 0 ||
    data.projects.length > 0 ||
    data.customFields.length > 0
  );
}
