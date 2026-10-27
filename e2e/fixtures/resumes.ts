import type { ResumeData } from '../../src/types/resume';

/**
 * Resumes for the pagination tests.
 *
 * Every entry in the long resume carries a unique marker. That turns "did all
 * the content reach the PDF" into a checkable question: extract the PDF's text
 * and look for each marker. A missing marker is content the user typed and the
 * PDF lost.
 *
 * This is the measurement that exposed the original bug. Before pagination,
 * the Modern template rendered this resume to one page with 10 of its 35
 * markers missing: three of eight jobs, every project and every certification.
 */

const words =
  'delivered measurable outcomes across distributed teams while improving reliability throughput and developer experience for customers'.split(' ');
const prose = (n: number) => Array.from({ length: n }, (_, i) => words[i % words.length]).join(' ');

export const longResumeMarkers: string[] = [];
const mark = (kind: string, i: number) => {
  const token = `MK${kind}${String(i).padStart(2, '0')}`;
  longResumeMarkers.push(token);
  return token;
};

export const longResume: ResumeData = {
  personalInfo: {
    fullName: 'Amara Okonkwo',
    title: 'Staff Software Engineer',
    email: 'amara.okonkwo@example.com',
    phone: '+1 (415) 555-0134',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/amaraokonkwo',
    website: 'amara.dev',
    photo: '',
    summary: `${mark('SUM', 0)} ${prose(60)}`,
  },
  experiences: Array.from({ length: 8 }, (_, i) => ({
    id: `e${i}`,
    company: `${mark('EXP', i)} Company ${i}`,
    position: 'Senior Engineer',
    startDate: `${2010 + i}-01`,
    endDate: `${2011 + i}-06`,
    current: false,
    description: prose(70),
  })),
  education: Array.from({ length: 3 }, (_, i) => ({
    id: `d${i}`,
    institution: `${mark('EDU', i)} University ${i}`,
    degree: 'BSc',
    field: 'Computer Science',
    startDate: `${2002 + i}-09`,
    endDate: `${2006 + i}-06`,
    gpa: '3.8',
  })),
  skills: Array.from({ length: 16 }, (_, i) => ({
    id: `s${i}`,
    name: mark('SKL', i),
    level: (i % 5) + 1,
  })),
  projects: Array.from({ length: 4 }, (_, i) => ({
    id: `p${i}`,
    name: `${mark('PRJ', i)} Project`,
    description: prose(30),
    link: `github.com/amara/project-${i}`,
    technologies: 'TypeScript, Go',
  })),
  customFields: [
    {
      id: 'c0',
      sectionTitle: 'Certifications',
      items: Array.from({ length: 3 }, (_, i) => ({
        id: `ci${i}`,
        title: `${mark('CRT', i)} Certificate`,
        subtitle: 'Issuer',
        description: '',
      })),
    },
  ],
};

/** Fits on one page in every template. Must never produce a blank second page. */
export const shortResume: ResumeData = {
  personalInfo: {
    fullName: 'Sam Lee',
    title: 'Designer',
    email: 'sam@example.com',
    phone: '+1 555 0100',
    location: 'Austin, TX',
    summary: 'Product designer focused on clear, accessible interfaces.',
  },
  experiences: [
    {
      id: 'e0',
      company: 'Northwind',
      position: 'Designer',
      startDate: '2021-01',
      endDate: '',
      current: true,
      description: 'Led the design system.',
    },
  ],
  education: [],
  skills: [{ id: 's0', name: 'Figma', level: 4 }],
  projects: [],
  customFields: [],
};
