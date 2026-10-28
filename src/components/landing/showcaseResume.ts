import type { ResumeData } from '../../types/resume';

/**
 * A fuller version of the gallery's sample resume, so the template previews on
 * the landing page show a well-filled first page rather than half a page of
 * white. Fictional person, fictional companies.
 */
export const showcaseResume: ResumeData = {
  personalInfo: {
    fullName: 'Jordan Lee',
    title: 'Senior Product Engineer',
    email: 'jordan.lee@example.com',
    phone: '(555) 010-2030',
    location: 'Austin, TX',
    linkedin: 'linkedin.com/in/jordanlee',
    website: 'jordanlee.dev',
    photo: '',
    summary:
      'Product-minded engineer with ten years of experience building fast, accessible web apps. I turn fuzzy problems into shipped features, mentor engineers, and care about the details users notice.',
  },
  experiences: [
    {
      id: 'e1',
      company: 'Northwind Labs',
      position: 'Senior Software Engineer',
      startDate: '2021-03',
      endDate: '',
      current: true,
      description:
        'Owned the design system and performance program across four product teams. Cut page load times by a third and raised accessibility scores on every core flow.',
    },
    {
      id: 'e2',
      company: 'Contoso Apps',
      position: 'Software Engineer',
      startDate: '2018-06',
      endDate: '2021-02',
      current: false,
      description:
        'Built customer dashboards in React and TypeScript and partnered with design on a shared component library used by every new feature.',
    },
    {
      id: 'e3',
      company: 'Fabrikam Studio',
      position: 'Frontend Developer',
      startDate: '2016-07',
      endDate: '2018-05',
      current: false,
      description:
        'Shipped marketing sites and an internal booking tool; introduced automated testing and a review checklist the team still uses.',
    },
    {
      id: 'e4',
      company: 'Litware',
      position: 'Junior Web Developer',
      startDate: '2014-08',
      endDate: '2016-06',
      current: false,
      description: 'Built and maintained client websites, and rewrote the in-house image pipeline to halve build times.',
    },
  ],
  education: [
    {
      id: 'ed1',
      institution: 'State University',
      degree: 'B.S. Computer Science',
      field: 'Human–Computer Interaction',
      startDate: '2010',
      endDate: '2014',
      gpa: '3.7',
    },
  ],
  skills: [
    { id: 's1', name: 'TypeScript', level: 95 },
    { id: 's2', name: 'React', level: 92 },
    { id: 's3', name: 'Node.js', level: 85 },
    { id: 's4', name: 'System design', level: 80 },
    { id: 's5', name: 'Accessibility', level: 88 },
    { id: 's6', name: 'Testing', level: 84 },
  ],
  projects: [
    {
      id: 'p1',
      name: 'Trailhead',
      description: 'Open-source hiking planner with offline maps and trip sharing.',
      link: 'github.com/jordanlee/trailhead',
      technologies: 'React · Vite · IndexedDB',
    },
    {
      id: 'p2',
      name: 'Ledgerly',
      description: 'Budgeting app for freelancers with invoice reminders.',
      link: 'ledgerly.app',
      technologies: 'Next.js · Postgres',
    },
  ],
  customFields: [
    {
      id: 'cf1',
      sectionTitle: 'Languages',
      items: [
        { id: 'l1', title: 'English', subtitle: 'Native' },
        { id: 'l2', title: 'Spanish', subtitle: 'Professional' },
      ],
    },
    {
      id: 'cf2',
      sectionTitle: 'Certifications',
      items: [
        { id: 'c1', title: 'Cloud Developer Certificate', subtitle: '2022' },
        { id: 'c2', title: 'Web Accessibility Specialist', subtitle: '2020' },
      ],
    },
  ],
};
