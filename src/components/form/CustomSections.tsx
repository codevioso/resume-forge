import { useId, useState } from 'react';
import { Layers, Lightbulb } from 'lucide-react';
import { useResume } from '../../context/ResumeContext';
import type { CustomField, CustomFieldItem } from '../../types/resume';
import { AddButton, EntryCard, EntryList, RemoveButton, SectionCard, type SectionProps } from './layout';
import { TextField } from './fields';
import { confirmRemove, hasText, listSummary } from './util';

export function CustomSections({ open, onToggle, onExpand }: SectionProps & { onExpand: () => void }) {
  const { resumeData, setResumeData } = useResume();
  // The section or item just added, so its first field takes focus.
  const [addedId, setAddedId] = useState<string | null>(null);

  const addCustomSection = () => {
    const newSection: CustomField = {
      id: Date.now().toString(),
      sectionTitle: '',
      items: [],
    };
    setResumeData((prev) => ({
      ...prev,
      customFields: [...prev.customFields, newSection],
    }));
    setAddedId(newSection.id);
    if (!open) onExpand();
  };

  const updateCustomSectionTitle = (sectionId: string, title: string) => {
    setResumeData((prev) => ({
      ...prev,
      customFields: prev.customFields.map((cf) =>
        cf.id === sectionId ? { ...cf, sectionTitle: title } : cf
      ),
    }));
  };

  const removeCustomSection = (sectionId: string) => {
    setResumeData((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((cf) => cf.id !== sectionId),
    }));
  };

  const addCustomItem = (sectionId: string) => {
    const newItem: CustomFieldItem = {
      id: Date.now().toString(),
      title: '',
      subtitle: '',
      description: '',
    };
    setResumeData((prev) => ({
      ...prev,
      customFields: prev.customFields.map((cf) =>
        cf.id === sectionId ? { ...cf, items: [...cf.items, newItem] } : cf
      ),
    }));
    setAddedId(newItem.id);
  };

  const updateCustomItem = (sectionId: string, itemId: string, field: string, value: string) => {
    setResumeData((prev) => ({
      ...prev,
      customFields: prev.customFields.map((cf) =>
        cf.id === sectionId
          ? {
              ...cf,
              items: cf.items.map((item) =>
                item.id === itemId ? { ...item, [field]: value } : item
              ),
            }
          : cf
      ),
    }));
  };

  const removeCustomItem = (sectionId: string, itemId: string) => {
    setResumeData((prev) => ({
      ...prev,
      customFields: prev.customFields.map((cf) =>
        cf.id === sectionId
          ? { ...cf, items: cf.items.filter((item) => item.id !== itemId) }
          : cf
      ),
    }));
  };

  const sections = resumeData.customFields;
  const itemFilled = (item: CustomFieldItem) => hasText(item.title, item.subtitle, item.description);
  const sectionFilled = (cf: CustomField) => hasText(cf.sectionTitle) || cf.items.some(itemFilled);

  return (
    <SectionCard
      icon={Layers}
      title="Custom sections"
      summary={listSummary(sections.map((cf) => cf.sectionTitle), 'Languages, certifications, awards…')}
      count={sections.length}
      units={['section', 'sections']}
      done={sections.some(sectionFilled)}
      open={open}
      onToggle={onToggle}
    >
      {sections.length === 0 && (
        <div className="mb-3 flex gap-3 rounded-xl bg-aqua-50 p-3.5 ring-1 ring-aqua-100 ring-inset">
          <Lightbulb className="mt-0.5 size-5 shrink-0 text-aqua-700" strokeWidth={1.8} aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-ink-900">Make it your own</p>
            <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
              Add sections like Languages, Certifications, Awards, Volunteer Work, Publications or anything else you
              need.
            </p>
          </div>
        </div>
      )}

      <EntryList>
        {sections.map((section) => (
          <CustomSectionCard
            key={section.id}
            section={section}
            focusTitle={section.id === addedId}
            addedItemId={addedId}
            onTitleChange={(title) => updateCustomSectionTitle(section.id, title)}
            onRemove={() => {
              const name = section.sectionTitle.trim() ? `the “${section.sectionTitle.trim()}” section` : 'this section';
              if (sectionFilled(section) && !confirmRemove(name)) return;
              removeCustomSection(section.id);
            }}
            onAddItem={() => addCustomItem(section.id)}
            onItemChange={(itemId, field, value) => updateCustomItem(section.id, itemId, field, value)}
            onRemoveItem={(itemId) => removeCustomItem(section.id, itemId)}
          />
        ))}
      </EntryList>

      <AddButton onClick={addCustomSection} className={sections.length ? 'mt-3' : undefined}>
        Add custom section
      </AddButton>
    </SectionCard>
  );
}

function CustomSectionCard({
  section,
  focusTitle,
  addedItemId,
  onTitleChange,
  onRemove,
  onAddItem,
  onItemChange,
  onRemoveItem,
}: {
  section: CustomField;
  focusTitle: boolean;
  addedItemId: string | null;
  onTitleChange: (title: string) => void;
  onRemove: () => void;
  onAddItem: () => void;
  onItemChange: (itemId: string, field: string, value: string) => void;
  onRemoveItem: (itemId: string) => void;
}) {
  const itemsLabelId = useId();
  const title = section.sectionTitle.trim();

  return (
    <li className="@container rounded-xl border border-slate-200 bg-slate-50/70 p-3 motion-safe:animate-fade-in sm:p-4">
      <div className="flex items-end gap-2">
        <TextField
          label="Section title"
          className="flex-1"
          placeholder="e.g., Languages, Certifications, Awards..."
          autoComplete="off"
          autoFocus={focusTitle}
          value={section.sectionTitle}
          onChange={onTitleChange}
        />
        <RemoveButton
          label={title ? `Remove the ${title} section` : 'Remove this section'}
          onClick={onRemove}
          className="-mr-2"
        />
      </div>

      {section.items.length > 0 && (
        <>
          <p id={itemsLabelId} className="sr-only">
            Items in {title || 'this section'}
          </p>
          <ul
            aria-labelledby={itemsLabelId}
            className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white"
          >
            {section.items.map((item) => {
              const itemTitle = item.title.trim();
              return (
                <EntryCard
                  key={item.id}
                  variant="row"
                  title={itemTitle}
                  placeholder="New item"
                  removeLabel={`Remove ${itemTitle || 'this item'}`}
                  onRemove={() => onRemoveItem(item.id)}
                >
                  <div className="grid gap-x-3 gap-y-3.5 @md:grid-cols-2">
                    <TextField
                      label="Title"
                      placeholder="e.g., English, AWS Cert..."
                      autoComplete="off"
                      autoFocus={item.id === addedItemId}
                      value={item.title}
                      onChange={(v) => onItemChange(item.id, 'title', v)}
                    />
                    <TextField
                      label="Subtitle"
                      optional
                      placeholder="e.g., Native, Amazon..."
                      autoComplete="off"
                      value={item.subtitle}
                      onChange={(v) => onItemChange(item.id, 'subtitle', v)}
                    />
                    <TextField
                      label="Description"
                      optional
                      className="@md:col-span-2"
                      placeholder="e.g., Issued Dec 2022, Fluent..."
                      autoComplete="off"
                      value={item.description}
                      onChange={(v) => onItemChange(item.id, 'description', v)}
                    />
                  </div>
                </EntryCard>
              );
            })}
          </ul>
        </>
      )}

      <AddButton
        size="sm"
        onClick={onAddItem}
        className="mt-3"
        aria-label={title ? `Add item to ${title}` : 'Add item to this section'}
      >
        Add item
      </AddButton>
    </li>
  );
}
