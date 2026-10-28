import { useId, useRef, type ChangeEvent } from 'react';
import { Camera, User } from 'lucide-react';
import { useResume } from '../../context/ResumeContext';
import { photoToDataUrl } from '../../utils/photo';
import { GroupHeading, SectionCard, type SectionProps } from './layout';
import { TextAreaField, TextField } from './fields';
import { hasText, joinParts } from './util';

export function PersonalSection({ open, onToggle }: SectionProps) {
  const { resumeData, setResumeData } = useResume();
  const info = resumeData.personalInfo;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputId = useId();
  const contactId = useId();

  const updatePersonalInfo = (field: string, value: string) => {
    setResumeData((prev) => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value },
    }));
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    // Cleared so choosing the same file again still fires a change.
    input.value = '';
    if (!file) return;
    try {
      updatePersonalInfo('photo', await photoToDataUrl(file));
    } catch {
      window.alert('That file could not be opened as an image. Try a JPEG or PNG.');
    }
  };

  const removePhoto = () => {
    updatePersonalInfo('photo', '');
  };

  const choosePhoto = () => fileInputRef.current?.click();
  const photo = info.photo;

  return (
    <SectionCard
      icon={User}
      title="Personal info"
      summary={joinParts([info.fullName, info.title]) || 'Name, contact details and summary'}
      done={hasText(...Object.values(info))}
      open={open}
      onToggle={onToggle}
    >
      <div className="space-y-6">
        {/* Photo: the avatar opens the picker too (it is the file input's label). */}
        <div className="flex items-center gap-4">
          <label
            htmlFor={photoInputId}
            className="group relative size-20 shrink-0 cursor-pointer rounded-2xl after:pointer-events-none after:absolute after:inset-0 after:rounded-2xl after:ring-1 after:ring-ink-900/10 after:ring-inset"
          >
            {photo ? (
              <>
                <img src={photo} alt="Your photo" className="size-full rounded-2xl object-cover" />
                <span
                  aria-hidden="true"
                  className="absolute -right-1.5 -bottom-1.5 grid size-7 place-items-center rounded-full bg-white text-ink-800 shadow-soft ring-1 ring-slate-200"
                >
                  <Camera className="size-3.5" strokeWidth={2} />
                </span>
              </>
            ) : (
              <span className="flex size-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-colors group-hover:border-aqua-500 group-hover:text-aqua-700">
                <Camera className="size-6" strokeWidth={1.6} aria-hidden="true" />
                <span className="text-[0.6875rem] font-medium">Add photo</span>
              </span>
            )}
          </label>
          <input
            ref={fileInputRef}
            id={photoInputId}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink-800">
              Profile photo <span className="font-normal text-slate-500">(optional)</span>
            </p>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">A square, well-lit headshot works best.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={choosePhoto}
                aria-label={photo ? 'Change photo' : undefined}
                className="btn-secondary px-3.5"
              >
                {photo ? 'Change' : 'Upload photo'}
              </button>
              {photo && (
                <button
                  type="button"
                  onClick={removePhoto}
                  aria-label="Remove photo"
                  className="btn-ghost px-3.5 text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <TextField
            label="Full name"
            placeholder="John Doe"
            value={info.fullName}
            onChange={(v) => updatePersonalInfo('fullName', v)}
            autoComplete="name"
            autoCapitalize="words"
          />
          <TextField
            label="Professional title"
            placeholder="Senior Software Engineer"
            value={info.title}
            onChange={(v) => updatePersonalInfo('title', v)}
            autoComplete="organization-title"
          />
        </div>

        <div role="group" aria-labelledby={contactId}>
          <GroupHeading id={contactId}>Contact</GroupHeading>
          <div className="grid gap-x-3 gap-y-4 @sm:grid-cols-2">
            <TextField
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="john@example.com"
              value={info.email}
              onChange={(v) => updatePersonalInfo('email', v)}
            />
            <TextField
              label="Phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+1 (555) 123-4567"
              value={info.phone}
              onChange={(v) => updatePersonalInfo('phone', v)}
            />
            <TextField
              label="Location"
              className="@sm:col-span-2"
              autoComplete="address-level2"
              placeholder="San Francisco, CA"
              value={info.location}
              onChange={(v) => updatePersonalInfo('location', v)}
            />
            <TextField
              label="LinkedIn"
              optional
              type="url"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="linkedin.com/in/johndoe"
              value={info.linkedin}
              onChange={(v) => updatePersonalInfo('linkedin', v)}
            />
            <TextField
              label="Website"
              optional
              type="url"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://johndoe.com"
              value={info.website}
              onChange={(v) => updatePersonalInfo('website', v)}
            />
          </div>
        </div>

        <TextAreaField
          label="Professional summary"
          hint="Two to four sentences on your experience and what you do best."
          placeholder="A brief summary of your professional background and career objectives..."
          minRows={4}
          value={info.summary}
          onChange={(v) => updatePersonalInfo('summary', v)}
        />
      </div>
    </SectionCard>
  );
}
