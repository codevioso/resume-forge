import { useState } from 'react';
import { Briefcase } from 'lucide-react';
import { useResume } from '../../context/ResumeContext';
import type { Experience } from '../../types/resume';
import { AddButton, EmptyHint, EntryCard, EntryList, SectionCard, type SectionProps } from './layout';
import { CheckboxField, TextAreaField, TextField } from './fields';
import { confirmRemove, dateRange, hasText, joinParts, listSummary } from './util';

export function ExperienceSection({ open, onToggle }: SectionProps) {
  const { resumeData, setResumeData } = useResume();
  // The entry just added, so its first field takes focus.
  const [addedId, setAddedId] = useState<string | null>(null);

  const addExperience = () => {
    const newExp: Experience = {
      id: Date.now().toString(),
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
    };
    setResumeData((prev) => ({
      ...prev,
      experiences: [...prev.experiences, newExp],
    }));
    setAddedId(newExp.id);
  };

  const updateExperience = (id: string, field: string, value: string | boolean) => {
    setResumeData((prev) => ({
      ...prev,
      experiences: prev.experiences.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    }));
  };

  const removeExperience = (id: string) => {
    setResumeData((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((exp) => exp.id !== id),
    }));
  };

  const items = resumeData.experiences;
  const isFilled = (exp: Experience) =>
    hasText(exp.company, exp.position, exp.startDate, exp.endDate, exp.description);

  return (
    <SectionCard
      icon={Briefcase}
      title="Experience"
      summary={listSummary(items.map((e) => e.company || e.position), 'Jobs, internships and other roles')}
      count={items.length}
      units={['position', 'positions']}
      done={items.some(isFilled)}
      open={open}
      onToggle={onToggle}
    >
      {items.length === 0 && <EmptyHint>Add your jobs, starting with the most recent.</EmptyHint>}
      <EntryList>
        {items.map((exp) => {
          const heading = joinParts([exp.position, exp.company]);
          const name = heading || 'this position';
          return (
            <EntryCard
              key={exp.id}
              title={heading}
              placeholder="New position"
              meta={dateRange(exp.startDate, exp.current ? 'Present' : exp.endDate)}
              removeLabel={`Remove ${name}`}
              onRemove={() => {
                if (isFilled(exp) && !confirmRemove(name)) return;
                removeExperience(exp.id);
              }}
            >
              <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                <TextField
                  label="Job title"
                  className="col-span-2 @md:col-span-1"
                  placeholder="Job Title"
                  autoComplete="organization-title"
                  autoFocus={exp.id === addedId}
                  value={exp.position}
                  onChange={(v) => updateExperience(exp.id, 'position', v)}
                />
                <TextField
                  label="Company"
                  className="col-span-2 @md:col-span-1"
                  placeholder="Company Name"
                  autoComplete="organization"
                  value={exp.company}
                  onChange={(v) => updateExperience(exp.id, 'company', v)}
                />
                <TextField
                  label="Start date"
                  placeholder="Jan 2020"
                  autoComplete="off"
                  value={exp.startDate}
                  onChange={(v) => updateExperience(exp.id, 'startDate', v)}
                />
                <TextField
                  label="End date"
                  placeholder="Present"
                  autoComplete="off"
                  // While "I currently work here" is ticked the resume prints "Present";
                  // the old end date is kept, just not shown, in case it is unticked.
                  value={exp.current ? '' : exp.endDate}
                  disabled={exp.current}
                  onChange={(v) => updateExperience(exp.id, 'endDate', v)}
                />
                <div className="col-span-2 -mt-2 -mb-1">
                  <CheckboxField
                    label="I currently work here"
                    checked={exp.current}
                    onChange={(checked) => updateExperience(exp.id, 'current', checked)}
                  />
                </div>
                <TextAreaField
                  label="Description"
                  className="col-span-2"
                  placeholder="Describe your responsibilities and achievements..."
                  value={exp.description}
                  onChange={(v) => updateExperience(exp.id, 'description', v)}
                />
              </div>
            </EntryCard>
          );
        })}
      </EntryList>
      <AddButton onClick={addExperience} className={items.length ? 'mt-3' : undefined}>
        Add experience
      </AddButton>
    </SectionCard>
  );
}
