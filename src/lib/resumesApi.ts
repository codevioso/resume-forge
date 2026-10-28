import type { ResumeData } from '../types/resume';

/**
 * The signed-in user's saved resumes (api/src/resumes/routes.ts).
 *
 * Every call throws `ApiError` on failure, with the server's own message —
 * written to be shown to the user — and the HTTP status:
 * - 401: not signed in (the session ended);
 * - 404: no such resume for this user;
 * - 409 from `saveResume`: another device saved first. `conflict` holds the
 *   current server copy, so the user can choose which to keep;
 * - 409 from `createResume`/`duplicateResume`: the account's resume limit;
 * - 0: the request never reached the server (offline).
 */

export type SavedResume = {
  id: string;
  title: string;
  templateId: string;
  data: ResumeData;
  /** Send back with every save; bumped by the server on each one. */
  version: number;
  createdAt: string;
  updatedAt: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly conflict?: SavedResume,
  ) {
    super(message);
  }
}

/**
 * Browsers cap the bodies of all in-flight `keepalive` requests at 64 KiB
 * together, and refuse a larger one outright. A save bigger than this (a
 * resume with a photo) goes as a normal request instead: it still completes
 * when the tab is only hidden, and the draft kept on the device covers a
 * closed tab.
 */
const KEEPALIVE_MAX_BYTES = 60_000;

async function call<T>(method: string, path: string, body?: unknown, options?: { keepalive?: boolean }): Promise<T> {
  let res: Response;
  const payload = body === undefined ? undefined : JSON.stringify(body);
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: payload === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: payload,
      keepalive:
        options?.keepalive === true && new TextEncoder().encode(payload ?? '').length <= KEEPALIVE_MAX_BYTES,
    });
  } catch {
    throw new ApiError("You're offline. Your changes are kept on this device until you're back online.", 0);
  }
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(json?.error ?? `Request failed (HTTP ${res.status}).`, res.status, json?.resume);
  }
  return json as T;
}

export async function listResumes(): Promise<{ resumes: SavedResume[]; limit: number }> {
  return call('GET', '/api/resumes');
}

export async function getResume(id: string): Promise<SavedResume> {
  return (await call<{ resume: SavedResume }>('GET', `/api/resumes/${encodeURIComponent(id)}`)).resume;
}

export async function createResume(input: { templateId: string; data?: ResumeData; title?: string }): Promise<SavedResume> {
  return (await call<{ resume: SavedResume }>('POST', '/api/resumes', input)).resume;
}

/** Saves still waiting for the server's answer. */
const inFlightSaves = new Set<Promise<unknown>>();

/**
 * Save changes. Only the fields given are changed.
 *
 * `keepalive` lets the request outlive the page, for the last save as the user
 * leaves (see KEEPALIVE_MAX_BYTES for the size it applies to).
 */
export async function saveResume(
  id: string,
  changes: { version: number; title?: string; templateId?: string; data?: ResumeData },
  options?: { keepalive?: boolean },
): Promise<SavedResume> {
  const request = call<{ resume: SavedResume }>('PATCH', `/api/resumes/${encodeURIComponent(id)}`, changes, options);
  inFlightSaves.add(request);
  try {
    return (await request).resume;
  } finally {
    inFlightSaves.delete(request);
  }
}

/**
 * Resolves once every save already sent has been answered (successfully or
 * not). The resume list waits for this, so leaving the editor straight after
 * an edit never shows the copy from before it.
 */
export async function settleSaves(): Promise<void> {
  while (inFlightSaves.size > 0) {
    await Promise.allSettled([...inFlightSaves]);
  }
}

export async function duplicateResume(id: string): Promise<SavedResume> {
  return (await call<{ resume: SavedResume }>('POST', `/api/resumes/${encodeURIComponent(id)}/duplicate`)).resume;
}

export async function deleteResume(id: string): Promise<void> {
  await call('DELETE', `/api/resumes/${encodeURIComponent(id)}`);
}
