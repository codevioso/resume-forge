import type { ResumeData } from '../../types/resume';

/** What "Load sample" fills the form with. */
export const sampleData: ResumeData = {
  personalInfo: {
    fullName: 'Alex Johnson',
    title: 'Senior Full Stack Developer',
    email: 'alex.johnson@email.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/alexjohnson',
    website: 'alexjohnson.dev',
    photo: '',
    summary: 'Passionate full-stack developer with 8+ years of experience building scalable web applications. Expert in React, Node.js, and cloud technologies. Led teams of up to 10 developers and delivered projects that increased user engagement by 40%. Strong advocate for clean code, test-driven development, and continuous learning.',
  },
  experiences: [
    {
      id: '1',
      company: 'TechCorp Inc.',
      position: 'Senior Full Stack Developer',
      startDate: 'Jan 2021',
      endDate: '',
      current: true,
      description: 'Leading development of microservices architecture serving 2M+ users. Reduced API response times by 60% through optimization. Mentoring junior developers and conducting code reviews.',
    },
    {
      id: '2',
      company: 'StartupXYZ',
      position: 'Full Stack Developer',
      startDate: 'Mar 2018',
      endDate: 'Dec 2020',
      current: false,
      description: 'Built and maintained e-commerce platform from scratch. Implemented payment integrations and real-time inventory management. Increased conversion rate by 25% through UX improvements.',
    },
  ],
  education: [
    {
      id: '1',
      institution: 'Stanford University',
      degree: 'Master of Science',
      field: 'Computer Science',
      startDate: 'Sep 2014',
      endDate: 'Jun 2016',
      gpa: '3.9',
    },
    {
      id: '2',
      institution: 'UC Berkeley',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      startDate: 'Sep 2010',
      endDate: 'May 2014',
      gpa: '3.7',
    },
  ],
  skills: [
    { id: '1', name: 'React / Next.js', level: 95 },
    { id: '2', name: 'TypeScript', level: 90 },
    { id: '3', name: 'Node.js', level: 88 },
    { id: '4', name: 'PostgreSQL', level: 85 },
    { id: '5', name: 'AWS / Cloud', level: 82 },
    { id: '6', name: 'Docker / K8s', level: 78 },
  ],
  projects: [
    {
      id: '1',
      name: 'E-Commerce Platform',
      description: 'Full-featured e-commerce platform with real-time inventory, payment processing, and admin dashboard.',
      link: 'github.com/alex/ecommerce',
      technologies: 'Next.js, Stripe, PostgreSQL, Redis',
    },
    {
      id: '2',
      name: 'Task Management App',
      description: 'Collaborative project management tool with real-time updates and team features.',
      link: 'github.com/alex/taskapp',
      technologies: 'React, Socket.io, Node.js, MongoDB',
    },
  ],
  customFields: [
    {
      id: 'cf1',
      sectionTitle: 'Languages',
      items: [
        { id: 'l1', title: 'English', subtitle: 'Native', description: '' },
        { id: 'l2', title: 'Spanish', subtitle: 'Professional Working', description: '' },
        { id: 'l3', title: 'French', subtitle: 'Conversational', description: '' },
      ],
    },
    {
      id: 'cf2',
      sectionTitle: 'Certifications',
      items: [
        { id: 'c1', title: 'AWS Solutions Architect', subtitle: 'Amazon Web Services', description: 'Issued Dec 2022' },
        { id: 'c2', title: 'Google Cloud Professional', subtitle: 'Google', description: 'Issued Aug 2021' },
      ],
    },
  ],
};
