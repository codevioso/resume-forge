import { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { useResume } from '../../context/ResumeContext';
import type { Project } from '../../types/resume';
import { AddButton, EmptyHint, EntryCard, EntryList, SectionCard, type SectionProps } from './layout';
import { TextAreaField, TextField } from './fields';
import { confirmRemove, hasText, listSummary } from './util';

export function ProjectsSection({ open, onToggle }: SectionProps) {
  const { resumeData, setResumeData } = useResume();
  const [addedId, setAddedId] = useState<string | null>(null);

  const addProject = () => {
    const newProject: Project = {
      id: Date.now().toString(),
      name: '',
      description: '',
      link: '',
      technologies: '',
    };
    setResumeData((prev) => ({
      ...prev,
      projects: [...prev.projects, newProject],
    }));
    setAddedId(newProject.id);
  };

  const updateProject = (id: string, field: string, value: string) => {
    setResumeData((prev) => ({
      ...prev,
      projects: prev.projects.map((proj) =>
        proj.id === id ? { ...proj, [field]: value } : proj
      ),
    }));
  };

  const removeProject = (id: string) => {
    setResumeData((prev) => ({
      ...prev,
      projects: prev.projects.filter((proj) => proj.id !== id),
    }));
  };

  const items = resumeData.projects;
  const isFilled = (p: Project) => hasText(p.name, p.description, p.link, p.technologies);

  return (
    <SectionCard
      icon={FolderOpen}
      title="Projects"
      summary={listSummary(items.map((p) => p.name), 'Work you’re proud of, side projects too')}
      count={items.length}
      units={['project', 'projects']}
      done={items.some(isFilled)}
      open={open}
      onToggle={onToggle}
    >
      {items.length === 0 && <EmptyHint>Show work you’re proud of. Side projects count too.</EmptyHint>}
      <EntryList>
        {items.map((project) => {
          const name = project.name.trim() || 'this project';
          return (
            <EntryCard
              key={project.id}
              title={project.name.trim()}
              placeholder="New project"
              meta={project.technologies.trim()}
              removeLabel={`Remove ${name}`}
              onRemove={() => {
                if (isFilled(project) && !confirmRemove(name)) return;
                removeProject(project.id);
              }}
            >
              <div className="grid gap-x-3 gap-y-4 @md:grid-cols-2">
                <TextField
                  label="Project name"
                  placeholder="Project Name"
                  autoComplete="off"
                  autoFocus={project.id === addedId}
                  value={project.name}
                  onChange={(v) => updateProject(project.id, 'name', v)}
                />
                <TextField
                  label="Link"
                  optional
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="https://github.com/..."
                  value={project.link}
                  onChange={(v) => updateProject(project.id, 'link', v)}
                />
                <TextField
                  label="Technologies used"
                  className="@md:col-span-2"
                  placeholder="React, Node.js, PostgreSQL"
                  autoComplete="off"
                  value={project.technologies}
                  onChange={(v) => updateProject(project.id, 'technologies', v)}
                />
                <TextAreaField
                  label="Description"
                  className="@md:col-span-2"
                  placeholder="Describe the project..."
                  value={project.description}
                  onChange={(v) => updateProject(project.id, 'description', v)}
                />
              </div>
            </EntryCard>
          );
        })}
      </EntryList>
      <AddButton onClick={addProject} className={items.length ? 'mt-3' : undefined}>
        Add project
      </AddButton>
    </SectionCard>
  );
}
