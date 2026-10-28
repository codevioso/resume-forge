import { useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { useResume } from '../context/ResumeContext';
import { emptyResumeData, hasContent } from '../data/emptyResume';
import { sampleData } from './form/sampleData';
import { PersonalSection } from './form/PersonalSection';
import { ExperienceSection } from './form/ExperienceSection';
import { EducationSection } from './form/EducationSection';
import { SkillsSection } from './form/SkillsSection';
import { ProjectsSection } from './form/ProjectsSection';
import { CustomSections } from './form/CustomSections';

type Section = 'personal' | 'experience' | 'education' | 'skills' | 'projects' | 'custom';

/**
 * The resume form: a short intro with the quick actions, then one
 * collapsible card per section. It fills the width it is given and has no
 * fixed heights, so the page decides where it scrolls.
 */
export function EditorForm() {
  const { resumeData, setResumeData } = useResume();
  const [expandedSections, setExpandedSections] = useState<Section[]>(['personal']);

  // The resume is saved in the browser, so replacing it is no longer undone
  // by a refresh: ask first whenever there is something to lose.
  const loadSampleData = () => {
    if (hasContent(resumeData) && !window.confirm('Replace your resume with the sample? Your current details will be lost.')) return;
    setResumeData(sampleData);
    setExpandedSections(['personal', 'experience', 'education', 'skills', 'projects', 'custom']);
  };

  const clearAllData = () => {
    if (hasContent(resumeData) && !window.confirm('Clear your whole resume? This cannot be undone.')) return;
    setResumeData(emptyResumeData());
  };

  const toggleSection = (section: Section) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const expandSection = (section: Section) => {
    setExpandedSections((prev) => (prev.includes(section) ? prev : [...prev, section]));
  };

  const sectionProps = (section: Section) => ({
    open: expandedSections.includes(section),
    onToggle: () => toggleSection(section),
  });

  return (
    <div className="space-y-3 sm:space-y-4">
      <header className="pb-1">
        <h2 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">Your details</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Fill in what applies to you. The preview updates as you type.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={loadSampleData} className="btn-secondary">
            <Sparkles className="size-4 text-aqua-700" aria-hidden="true" />
            Load sample
          </button>
          <button type="button" onClick={clearAllData} className="btn-ghost text-slate-600 hover:text-ink-900">
            <RotateCcw className="size-4" aria-hidden="true" />
            Clear
          </button>
        </div>
      </header>

      <PersonalSection {...sectionProps('personal')} />
      <ExperienceSection {...sectionProps('experience')} />
      <EducationSection {...sectionProps('education')} />
      <SkillsSection {...sectionProps('skills')} />
      <ProjectsSection {...sectionProps('projects')} />
      <CustomSections {...sectionProps('custom')} onExpand={() => expandSection('custom')} />
    </div>
  );
}
