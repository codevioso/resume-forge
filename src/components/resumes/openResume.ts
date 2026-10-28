import { ApiError, getResume, type SavedResume } from '../../lib/resumesApi';
import {
  contentHash,
  contentOf,
  mergeContent,
  partHashes,
  readDraft,
  removeDraft,
  sameContent,
  type ResumeContent,
} from './drafts';
import { ResumeSync } from './resumeSync';

export type OpenResult =
  | {
      kind: 'ready';
      sync: ResumeSync;
      content: ResumeContent;
      /**
       * `draft`: this device had changes the account did not, and they are
       * back in the editor (and being saved). `offline`: no connection, so the
       * editor shows the device's copy.
       */
      restored: 'none' | 'draft' | 'offline';
    }
  | { kind: 'notFound' }
  | { kind: 'signedOut' }
  | { kind: 'offline' }
  | { kind: 'error'; message: string };

/**
 * Load a saved resume for editing, reconciled with any changes this device
 * kept for it (drafts.ts):
 * - none, or the same as the server: the server's copy;
 * - made on top of the server's current version: restored, then saved;
 * - made on an older version: merged part by part with the server's copy,
 *   or, when both changed the same part, opened in conflict for the user;
 * - offline: the device's copy, saved once the connection is back.
 */
export async function openSavedResume(id: string): Promise<OpenResult> {
  const draft = readDraft(id);

  let server: SavedResume;
  try {
    server = await getResume(id);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : -1;
    if (status === 0 && draft) {
      const sync = new ResumeSync(id, {
        content: draft.content,
        version: draft.baseVersion,
        base: draft.base,
        server: null,
        sending: draft.sending,
      });
      return { kind: 'ready', sync, content: draft.content, restored: 'offline' };
    }
    if (status === 0) return { kind: 'offline' };
    if (status === 401) return { kind: 'signedOut' };
    if (status === 404) {
      removeDraft(id);
      return { kind: 'notFound' };
    }
    return { kind: 'error', message: err instanceof Error ? err.message : 'Something went wrong.' };
  }

  const theirs = contentOf(server);
  const lastSavedAt = Date.parse(server.updatedAt) || null;
  const fromServer = (content: ResumeContent, restored: 'none' | 'draft') => {
    const sync = new ResumeSync(id, {
      content,
      version: server.version,
      base: partHashes(theirs),
      server: theirs,
      lastSavedAt,
    });
    return { kind: 'ready' as const, sync, content, restored };
  };

  if (!draft || sameContent(draft.content, theirs)) {
    if (draft) removeDraft(id);
    return fromServer(theirs, 'none');
  }

  // A save sent as the tab closed may have landed without this device hearing back.
  let baseVersion = draft.baseVersion;
  let base = draft.base;
  if (draft.sending && server.version === draft.sending.fromVersion + 1 && contentHash(theirs) === draft.sending.hash) {
    baseVersion = server.version;
    base = partHashes(theirs);
  }

  if (baseVersion === server.version) return fromServer(draft.content, 'draft');

  const merged = base ? mergeContent(base, draft.content, theirs) : null;
  if (merged) {
    if (sameContent(merged, theirs)) {
      removeDraft(id);
      return fromServer(theirs, 'none');
    }
    return fromServer(merged, 'draft');
  }

  const sync = new ResumeSync(id, {
    content: draft.content,
    version: draft.baseVersion,
    base: draft.base,
    server: null,
    conflict: server,
  });
  return { kind: 'ready', sync, content: draft.content, restored: 'draft' };
}
