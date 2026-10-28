import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { useResume } from '../../context/ResumeContext';
import type { Education } from '../../types/resume';
import { AddButton, EmptyHint, EntryCard, EntryList, SectionCard, type SectionProps } from './layout';
import { TextField } from './fields';
import { confirmRemove, dateRange, hasText, joinParts, listSummary } from './util';

export function EducationSection({ open, onToggle }: SectionProps) {
  const { resumeData, setResumeData } = useResume();
  const [addedId, setAddedId] = useState<string | null>(null);

  const addEducation = () => {
    const newEdu: Education = {
      id: Date.now().toString(),
      institution: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      gpa: '',
    };
    setResumeData((prev) => ({
      ...prev,
      education: [...prev.education, newEdu],
    }));
    setAddedId(newEdu.id);
  };

  const updateEducation = (id: string, field: string, value: string) => {
    setResumeData((prev) => ({
      ...prev,
      education: prev.education.map((edu) =>
        edu.id === id ? { ...edu, [field]: value } : edu
      ),
    }));
  };

  const removeEducation = (id: string) => {
    setResumeData((prev) => ({
      ...prev,
      education: prev.education.filter((edu) => edu.id !== id),
    }));
  };

  const items = resumeData.education;
  const isFilled = (edu: Education) =>
    hasText(edu.institution, edu.degree, edu.field, edu.startDate, edu.endDate, edu.gpa);

  return (
    <SectionCard
      icon={GraduationCap}
      title="Education"
      summary={listSummary(items.map((e) => e.institution || e.degree), 'Degrees, diplomas and courses')}
      count={items.length}
      units={['school', 'schools']}
      done={items.some(isFilled)}
      open={open}
      onToggle={onToggle}
    >
      {items.length === 0 && <EmptyHint>Add degrees, diplomas or courses, most recent first.</EmptyHint>}
      <EntryList>
        {items.map((edu) => {
          const heading = joinParts([edu.degree, edu.institution]);
          const name = heading || 'this school';
          return (
            <EntryCard
              key={edu.id}
              title={heading}
              placeholder="New school"
              meta={dateRange(edu.startDate, edu.endDate)}
              removeLabel={`Remove ${name}`}
              onRemove={() => {
                if (isFilled(edu) && !confirmRemove(name)) return;
                removeEducation(edu.id);
              }}
            >
              <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                <TextField
                  label="School or university"
                  className="col-span-2"
                  placeholder="University Name"
                  autoComplete="off"
                  autoFocus={edu.id === addedId}
                  value={edu.institution}
                  onChange={(v) => updateEducation(edu.id, 'institution', v)}
                />
                <TextField
                  label="Degree"
                  className="col-span-2 @md:col-span-1"
                  placeholder="Bachelor's"
                  autoComplete="off"
                  value={edu.degree}
                  onChange={(v) => updateEducation(edu.id, 'degree', v)}
                />
                <TextField
                  label="Field of study"
                  className="col-span-2 @md:col-span-1"
                  placeholder="Computer Science"
                  autoComplete="off"
                  value={edu.field}
                  onChange={(v) => updateEducation(edu.id, 'field', v)}
                />
                <TextField
                  label="Start date"
                  placeholder="Sep 2016"
                  autoComplete="off"
                  value={edu.startDate}
                  onChange={(v) => updateEducation(edu.id, 'startDate', v)}
                />
                <TextField
                  label="End date"
                  placeholder="May 2020"
                  autoComplete="off"
                  value={edu.endDate}
                  onChange={(v) => updateEducation(edu.id, 'endDate', v)}
                />
                <TextField
                  label="GPA"
                  optional
                  placeholder="3.8"
                  inputMode="decimal"
                  autoComplete="off"
                  value={edu.gpa}
                  onChange={(v) => updateEducation(edu.id, 'gpa', v)}
                />
              </div>
            </EntryCard>
          );
        })}
      </EntryList>
      <AddButton onClick={addEducation} className={items.length ? 'mt-3' : undefined}>
        Add education
      </AddButton>
    </SectionCard>
  );
}
