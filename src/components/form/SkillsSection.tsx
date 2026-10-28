import { useState } from 'react';
import { Wrench } from 'lucide-react';
import { useResume } from '../../context/ResumeContext';
import type { Skill } from '../../types/resume';
import { AddButton, EmptyHint, RemoveButton, SectionCard, type SectionProps } from './layout';
import { LevelSlider } from './fields';
import { hasText, listSummary } from './util';

export function SkillsSection({ open, onToggle }: SectionProps) {
  const { resumeData, setResumeData } = useResume();
  const [addedId, setAddedId] = useState<string | null>(null);

  const addSkill = () => {
    const newSkill: Skill = {
      id: Date.now().toString(),
      name: '',
      level: 80,
    };
    setResumeData((prev) => ({
      ...prev,
      skills: [...prev.skills, newSkill],
    }));
    setAddedId(newSkill.id);
  };

  const updateSkill = (id: string, field: string, value: string | number) => {
    setResumeData((prev) => ({
      ...prev,
      skills: prev.skills.map((skill) =>
        skill.id === id ? { ...skill, [field]: value } : skill
      ),
    }));
  };

  const removeSkill = (id: string) => {
    setResumeData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill.id !== id),
    }));
  };

  const items = resumeData.skills;

  return (
    <SectionCard
      icon={Wrench}
      title="Skills"
      summary={listSummary(items.map((s) => s.name), 'Tools, languages and strengths')}
      count={items.length}
      units={['skill', 'skills']}
      done={items.some((s) => hasText(s.name))}
      open={open}
      onToggle={onToggle}
    >
      {items.length === 0 && <EmptyHint>List the skills you want a recruiter to notice first.</EmptyHint>}
      {items.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-slate-50/70">
          {items.map((skill, index) => {
            const name = skill.name.trim() || `skill ${index + 1}`;
            return (
              // Name and remove on one line, the level under them; on a wide form all three share a line.
              <li
                key={skill.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 px-3 pt-3 pb-1 motion-safe:animate-fade-in sm:px-4 @lg:grid-cols-[minmax(0,1fr)_minmax(13rem,17rem)_auto] @lg:gap-x-4 @lg:py-2"
              >
                <input
                  type="text"
                  aria-label={`Skill ${index + 1}`}
                  placeholder={`Skill #${index + 1}`}
                  autoComplete="off"
                  autoFocus={skill.id === addedId}
                  value={skill.name}
                  onChange={(e) => updateSkill(skill.id, 'name', e.target.value)}
                  className="field-input col-start-1 row-start-1"
                />
                <RemoveButton
                  label={`Remove ${name}`}
                  onClick={() => removeSkill(skill.id)}
                  className="col-start-2 row-start-1 -mr-2 @lg:col-start-3"
                />
                <div className="col-span-2 row-start-2 @lg:col-span-1 @lg:col-start-2 @lg:row-start-1">
                  <LevelSlider
                    label={`${name} level`}
                    value={skill.level}
                    onChange={(level) => updateSkill(skill.id, 'level', level)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <AddButton onClick={addSkill} className={items.length ? 'mt-3' : undefined}>
        Add skill
      </AddButton>
    </SectionCard>
  );
}
