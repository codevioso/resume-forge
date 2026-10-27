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
    level: 40 + ((i * 7) % 60),
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
  skills: [{ id: 's0', name: 'Figma', level: 80 }],
  projects: [],
  customFields: [],
};

/**
 * Every field the editor collects, each holding a unique marker. A template
 * passes the field test only if every marker reaches the PDF's text.
 *
 * This checks which fields print, not pagination. No text here may contain
 * "present", since the current job is checked by its "Present" label.
 */
export const fullResume: ResumeData = {
  personalInfo: {
    fullName: 'Morgan Reyes',
    title: 'MKTITLE Engineer',
    email: 'mkemail@example.com',
    phone: '+351 912 345 678',
    location: 'MKLOCATION, Lisbon',
    linkedin: 'linkedin.com/in/mklinkedin',
    website: 'mkwebsite.dev',
    photo: '',
    summary: 'MKSUMMARY Builds data platforms.',
  },
  experiences: [
    {
      id: 'e0',
      position: 'MKPOSA Lead',
      company: 'MKCOMPA Labs',
      startDate: 'MKSTARTA',
      endDate: '',
      current: true,
      description: 'MKDESCA Owned the ingestion pipeline.',
    },
    {
      id: 'e1',
      position: 'MKPOSB Engineer',
      company: 'MKCOMPB Corp',
      startDate: 'MKSTARTB',
      endDate: 'MKENDB',
      current: false,
      description: 'MKDESCB Shipped the billing service.',
    },
  ],
  education: [
    { id: 'd0', institution: 'MKINSTA University', degree: 'MKDEGA', field: 'MKFIELDA', startDate: 'MKESTARTA', endDate: 'MKEENDA', gpa: 'MKGPAA' },
    { id: 'd1', institution: 'MKINSTB College', degree: 'MKDEGB', field: 'MKFIELDB', startDate: 'MKESTARTB', endDate: 'MKEENDB', gpa: 'MKGPAB' },
  ],
  skills: [
    { id: 's0', name: 'MKSKILLA', level: 90 },
    { id: 's1', name: 'MKSKILLB', level: 70 },
    { id: 's2', name: 'MKSKILLC', level: 50 },
  ],
  projects: [
    { id: 'p0', name: 'MKPROJA', description: 'MKPDESCA Streams events.', link: 'github.com/mk/mkplinka', technologies: 'MKTECHA, Go' },
    { id: 'p1', name: 'MKPROJB', description: 'MKPDESCB Schedules jobs.', link: 'https://mkplinkb.dev', technologies: 'MKTECHB' },
  ],
  customFields: [
    {
      id: 'c0',
      sectionTitle: 'MKSECTION Awards',
      items: [
        { id: 'c0a', title: 'MKCTITLEA', subtitle: 'MKCSUBA', description: 'MKCDESCA Recognised for reliability work.' },
        { id: 'c0b', title: 'MKCTITLEB', subtitle: 'MKCSUBB', description: 'MKCDESCB Speaker at a regional meetup.' },
      ],
    },
  ],
};

/** Field → text that must appear in the PDF when that field is filled in. */
export const fullResumeExpectations: Record<string, string> = {
  'personalInfo.fullName': 'Morgan Reyes',
  'personalInfo.title': 'MKTITLE',
  'personalInfo.email': 'mkemail@example.com',
  'personalInfo.phone': '+351 912 345 678',
  'personalInfo.location': 'MKLOCATION',
  'personalInfo.linkedin': 'linkedin.com/in/mklinkedin',
  'personalInfo.website': 'mkwebsite.dev',
  'personalInfo.summary': 'MKSUMMARY',
  'experiences[0].position': 'MKPOSA',
  'experiences[0].company': 'MKCOMPA',
  'experiences[0].startDate': 'MKSTARTA',
  'experiences[0].current → "Present"': 'Present',
  'experiences[0].description': 'MKDESCA',
  'experiences[1].position': 'MKPOSB',
  'experiences[1].company': 'MKCOMPB',
  'experiences[1].startDate': 'MKSTARTB',
  'experiences[1].endDate': 'MKENDB',
  'experiences[1].description': 'MKDESCB',
  'education[0].institution': 'MKINSTA',
  'education[0].degree': 'MKDEGA',
  'education[0].field': 'MKFIELDA',
  'education[0].startDate': 'MKESTARTA',
  'education[0].endDate': 'MKEENDA',
  'education[0].gpa': 'MKGPAA',
  'education[1].institution': 'MKINSTB',
  'education[1].degree': 'MKDEGB',
  'education[1].field': 'MKFIELDB',
  'education[1].startDate': 'MKESTARTB',
  'education[1].endDate': 'MKEENDB',
  'education[1].gpa': 'MKGPAB',
  'skills[0].name': 'MKSKILLA',
  'skills[2].name': 'MKSKILLC',
  'projects[0].name': 'MKPROJA',
  'projects[0].description': 'MKPDESCA',
  'projects[0].link': 'github.com/mk/mkplinka',
  'projects[0].technologies': 'MKTECHA',
  'projects[1].name': 'MKPROJB',
  'projects[1].description': 'MKPDESCB',
  'projects[1].link': 'mkplinkb.dev',
  'projects[1].technologies': 'MKTECHB',
  'customFields[0].sectionTitle': 'MKSECTION',
  'customFields[0].items[0].title': 'MKCTITLEA',
  'customFields[0].items[0].subtitle': 'MKCSUBA',
  'customFields[0].items[0].description': 'MKCDESCA',
  'customFields[0].items[1].title': 'MKCTITLEB',
  'customFields[0].items[1].subtitle': 'MKCSUBB',
  'customFields[0].items[1].description': 'MKCDESCB',
};

/** Link targets the PDF must contain: contact details and project links are clickable. */
export const fullResumeLinks = [
  'mailto:mkemail@example.com',
  'tel:+351912345678',
  'https://linkedin.com/in/mklinkedin',
  'https://mkwebsite.dev',
  'https://github.com/mk/mkplinka',
  'https://mkplinkb.dev',
];
