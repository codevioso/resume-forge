import { useMemo } from 'react';
import { Check, MonitorSmartphone } from 'lucide-react';
import { templates } from '../../data/templates';
import type { SavedResume } from '../../lib/resumesApi';
import { TemplateThumbnail } from '../TemplateThumbnail';
import { useMediaQuery } from '../editor/useEnvironment';
import { Dialog, DialogIcon, SHEET_QUERY } from './Dialog';
import { canonicalData, contentOf, type ResumeContent } from './drafts';
import { timeAgo } from './time';

const SECTION_LABELS: [keyof ResumeContent['data'], string][] = [
  ['personalInfo', 'personal details'],
  ['experiences', 'experience'],
  ['education', 'education'],
  ['skills', 'skills'],
  ['projects', 'projects'],
  ['customFields', 'extra sections'],
];

/** "Differs in experience, skills and the template." */
function differences(a: ResumeContent, b: ResumeContent): string[] {
  const out: string[] = [];
  for (const [key, label] of SECTION_LABELS) {
    if (canonicalData({ [key]: a.data[key] }) !== canonicalData({ [key]: b.data[key] })) out.push(label);
  }
  if (a.templateId !== b.templateId) out.push('the template');
  if (a.title !== b.title) out.push('the name');
  return out;
}

const list = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/**
 * Two devices changed the same resume: show both and let the user keep one.
 * Not dismissible — until the user chooses, nothing is saved.
 */
export function ConflictDialog({
  mine,
  theirs,
  onKeepMine,
  onUseTheirs,
}: {
  mine: ResumeContent;
  theirs: SavedResume;
  onKeepMine: () => void;
  onUseTheirs: () => void;
}) {
  const isSheet = useMediaQuery(SHEET_QUERY);
  const other = useMemo(() => contentOf(theirs), [theirs]);
  const diff = useMemo(() => differences(mine, other), [mine, other]);
  const thumbHeight = isSheet ? 128 : 232;

  return (
    <Dialog
      role="alertdialog"
      dismissible={false}
      size="lg"
      icon={
        isSheet ? undefined : (
          <DialogIcon tone="amber">
            <MonitorSmartphone className="size-6" aria-hidden="true" />
          </DialogIcon>
        )
      }
      title="This resume was changed on another device"
      description={
        <>
          Both copies changed since they were last in step
          {diff.length > 0 && <> — they differ in {list(diff)}</>}. Keep one; the other is replaced.
        </>
      }
      footer={
        <>
          <button type="button" onClick={onUseTheirs} className="btn-secondary">
            Use the other version
          </button>
          <button type="button" onClick={onKeepMine} className="btn-primary" data-autofocus>
            <Check className="size-4" aria-hidden="true" />
            Keep mine
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Version label="Yours" detail="On this device, not saved yet" content={mine} height={thumbHeight} highlight />
        <Version
          label="Other version"
          detail={`Saved ${timeAgo(theirs.updatedAt)}`}
          content={other}
          height={thumbHeight}
        />
      </div>
    </Dialog>
  );
}

function Version({
  label,
  detail,
  content,
  height,
  highlight = false,
}: {
  label: string;
  detail: string;
  content: ResumeContent;
  height: number;
  highlight?: boolean;
}) {
  const template = templates.find((t) => t.id === content.templateId) ?? templates[0];
  return (
    <figure
      className={
        highlight
          ? 'min-w-0 rounded-2xl border border-aqua-300 bg-aqua-50/60 p-2.5 sm:p-3'
          : 'min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 sm:p-3'
      }
    >
      <div className="flex justify-center overflow-hidden rounded-lg">
        <TemplateThumbnail
          template={template}
          resumeData={content.data}
          height={height}
          className="rounded-[4px] bg-white shadow-soft ring-1 ring-slate-900/5"
        />
      </div>
      <figcaption className="mt-2.5 px-0.5">
        <p className="text-sm font-semibold text-ink-900">{label}</p>
        <p className="truncate text-xs text-slate-500" title={content.title}>
          {content.title}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
      </figcaption>
    </figure>
  );
}
