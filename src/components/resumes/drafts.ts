import { normalizeResumeData } from '../../context/resumeStorage';
import type { ResumeData } from '../../types/resume';
import type { SavedResume } from '../../lib/resumesApi';

/**
 * The device's copy of a saved resume's unsynced changes.
 *
 * Written on every edit that has not reached the server yet (the same policy
 * as the guest resume: a debounce would lose the last edit to a closed tab),
 * and removed as soon as the server has it. So a draft only ever exists for
 * changes the account does not have: made offline, or in a tab that closed
 * before its last save was answered.
 */

/** What the user edits in a saved resume. */
export type ResumeContent = { data: ResumeData; templateId: string; title: string };

/**
 * A fingerprint of each part of a version, to tell which parts changed since
 * then without keeping a second full copy (photos make the data large).
 */
export type PartHashes = { data: string; templateId: string; title: string };

export type Draft = {
  v: 1;
  /** The server version these changes were made on top of. */
  baseVersion: number;
  /** That version's parts, for merging with a newer server copy part by part. Null when unknown. */
  base: PartHashes | null;
  content: ResumeContent;
  savedAt: number;
  /**
   * Set while a save is on its way. If the tab closed before the answer, the
   * next load can recognise that this save did land (the server's version is
   * one higher and has exactly this content) rather than call it a conflict.
   */
  sending: { fromVersion: number; hash: string } | null;
  /** The editor instance that wrote it; another tab must not delete it on its own success. */
  owner: string;
};

const PREFIX = 'paperplane:draft:';
export const draftKey = (id: string) => `${PREFIX}${id}`;

export function readDraft(id: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(id));
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<Draft>;
    if (d?.v !== 1 || typeof d.baseVersion !== 'number' || !d.content || typeof d.content !== 'object') return null;
    return {
      v: 1,
      baseVersion: d.baseVersion,
      base: d.base && typeof d.base === 'object' ? d.base : null,
      content: {
        data: normalizeResumeData(d.content.data),
        templateId: typeof d.content.templateId === 'string' ? d.content.templateId : '',
        title: typeof d.content.title === 'string' ? d.content.title : '',
      },
      savedAt: typeof d.savedAt === 'number' ? d.savedAt : 0,
      sending: d.sending && typeof d.sending === 'object' ? d.sending : null,
      owner: typeof d.owner === 'string' ? d.owner : '',
    };
  } catch {
    return null;
  }
}

/**
 * `dataJson` is `content.data` already serialised (the caller has it), so a
 * keystroke serialises the resume once, not twice.
 *
 * False when the browser refused the write (storage full or disabled).
 */
export function writeDraft(id: string, draft: Omit<Draft, 'v' | 'content'> & { content: ResumeContent }, dataJson?: string): boolean {
  try {
    const { content, ...rest } = draft;
    const json =
      `{"v":1,"content":{"data":${dataJson ?? JSON.stringify(content.data)},` +
      `"templateId":${JSON.stringify(content.templateId)},"title":${JSON.stringify(content.title)}},` +
      JSON.stringify(rest).slice(1);
    window.localStorage.setItem(draftKey(id), json);
    return true;
  } catch {
    return false;
  }
}

/** Remove the draft, unless another editor (`owner`) has written one since. */
export function removeDraft(id: string, owner?: string) {
  try {
    if (owner) {
      const current = readDraft(id);
      if (current && current.owner && current.owner !== owner) return;
    }
    window.localStorage.removeItem(draftKey(id));
  } catch {
    // Storage blocked: nothing was written either.
  }
}

/** Ids of every resume with changes on this device that the account does not have yet. */
export function draftIds(): Set<string> {
  const ids = new Set<string>();
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(PREFIX)) ids.add(key.slice(PREFIX.length));
    }
  } catch {
    // Storage blocked: no drafts.
  }
  return ids;
}

/** cyrb53: a fast 53-bit string hash. Fingerprints only; not for security. */
export function hashString(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/**
 * The resume data in one canonical form. The server re-serialises what it is
 * sent (its own key order, defaults filled in), so two copies are compared
 * after both pass through the same normaliser, never as raw JSON.
 */
export const canonicalData = (data: unknown) => JSON.stringify(normalizeResumeData(data));

export function partHashes(content: ResumeContent): PartHashes {
  return { data: hashString(canonicalData(content.data)), templateId: content.templateId, title: content.title };
}

/** One fingerprint of the whole content. */
export const contentHash = (content: ResumeContent) => {
  const p = partHashes(content);
  return hashString(`${p.data}\u0000${p.templateId}\u0000${p.title}`);
};

export const sameContent = (a: ResumeContent, b: ResumeContent) => contentHash(a) === contentHash(b);

/** A server copy as editor content. */
export function contentOf(resume: SavedResume): ResumeContent {
  return { data: normalizeResumeData(resume.data), templateId: resume.templateId, title: resume.title };
}

/**
 * Three-way merge, part by part (data, template, title), of two copies that
 * both started from `base`. A part changed on one side only takes that side;
 * changed on both sides to different values, it is a real conflict and the
 * user chooses (null).
 */
export function mergeContent(base: PartHashes, mine: ResumeContent, theirs: ResumeContent): ResumeContent | null {
  const m = partHashes(mine);
  const t = partHashes(theirs);
  const pick = <K extends keyof PartHashes>(key: K): 'mine' | 'theirs' | null => {
    if (m[key] === t[key] || t[key] === base[key]) return 'mine';
    if (m[key] === base[key]) return 'theirs';
    return null;
  };
  const data = pick('data');
  const templateId = pick('templateId');
  const title = pick('title');
  if (!data || !templateId || !title) return null;
  return {
    data: data === 'mine' ? mine.data : theirs.data,
    templateId: templateId === 'mine' ? mine.templateId : theirs.templateId,
    title: title === 'mine' ? mine.title : theirs.title,
  };
}

/** "Amara Okonkwo" → "Amara Okonkwo's resume"; no name yet → "Untitled resume". Mirrors the server's default. */
export function defaultTitle(fullName: string): string {
  const name = fullName.trim();
  return (name ? `${name}'s resume` : 'Untitled resume').slice(0, TITLE_MAX);
}

/** The server's limit on a resume's title. */
export const TITLE_MAX = 120;
