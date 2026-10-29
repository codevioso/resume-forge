import { randomUUID } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { sql, type Kysely, type Selectable } from 'kysely';
import type { z } from 'zod';
import type { Database, ResumeTable } from '../db.js';
import { createResumeSchema, defaultTitle, updateResumeSchema } from './schema.js';

/**
 * A signed-in user's resumes: /api/resumes.
 *
 * Every query is scoped by the owner's id in its WHERE clause — never by
 * looking a row up and checking ownership afterwards — so another user's
 * resume is indistinguishable from one that does not exist: both are 404.
 *
 * Saves are optimistic: the client sends the version it last saw, and a save
 * from a device holding an older copy is refused with 409 and the current
 * copy, instead of silently overwriting what was written elsewhere.
 */

export type ResumeDto = {
  id: string;
  title: string;
  templateId: string;
  data: unknown;
  version: number;
  createdAt: string;
  updatedAt: string;
};

function toDto(row: Selectable<ResumeTable>): ResumeDto {
  return {
    id: row.id,
    title: row.title,
    templateId: row.template_id,
    // mysql2 parses JSON columns; tolerate a driver that hands back text.
    data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
    version: row.version,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function badRequest(res: Response, error: z.ZodError) {
  const issue = error.issues[0];
  const where = issue?.path.length ? `${issue.path.join('.')}: ` : '';
  res.status(400).json({ error: `${where}${issue?.message ?? 'invalid request'}` });
}

/** Set by the session middleware before this router runs. */
export type AuthedRequest = Request & { userId: string; user: { id: string; emailVerified: boolean } };

export function resumesRouter({ db, maxResumesPerUser }: { db: Kysely<Database>; maxResumesPerUser: number }) {
  const router = Router();
  const owner = (req: Request) => (req as AuthedRequest).userId;

  const find = (userId: string, id: string) =>
    db.selectFrom('resume').selectAll().where('id', '=', id).where('user_id', '=', userId).executeTakeFirst();

  router.get('/', async (req, res) => {
    const rows = await db
      .selectFrom('resume')
      .selectAll()
      .where('user_id', '=', owner(req))
      .orderBy('updated_at', 'desc')
      .execute();
    res.json({ resumes: rows.map(toDto), limit: maxResumesPerUser });
  });

  router.post('/', async (req, res) => {
    const parsed = createResumeSchema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(res, parsed.error);
    const userId = owner(req);

    const { count } = await db
      .selectFrom('resume')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('user_id', '=', userId)
      .executeTakeFirstOrThrow();
    if (Number(count) >= maxResumesPerUser) {
      return res.status(409).json({ error: `You can keep up to ${maxResumesPerUser} resumes. Delete one to make room.` });
    }

    const now = new Date();
    const id = randomUUID();
    const { title, templateId, data } = parsed.data;
    await db
      .insertInto('resume')
      .values({
        id,
        user_id: userId,
        title: title ?? defaultTitle(data),
        template_id: templateId,
        data: JSON.stringify(data),
        created_at: now,
        updated_at: now,
      })
      .execute();
    res.status(201).json({ resume: toDto((await find(userId, id))!) });
  });

  router.get('/:id', async (req, res) => {
    const row = await find(owner(req), String(req.params.id));
    if (!row) return res.status(404).json({ error: 'Resume not found.' });
    res.json({ resume: toDto(row) });
  });

  router.patch('/:id', async (req, res) => {
    const parsed = updateResumeSchema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(res, parsed.error);
    const userId = owner(req);
    const id = String(req.params.id);
    const { version, title, templateId, data } = parsed.data;

    const result = await db
      .updateTable('resume')
      .set({
        ...(title !== undefined && { title }),
        ...(templateId !== undefined && { template_id: templateId }),
        ...(data !== undefined && { data: JSON.stringify(data) }),
        version: sql<number>`version + 1`,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .where('user_id', '=', userId)
      .where('version', '=', version)
      .executeTakeFirst();

    if (Number(result.numUpdatedRows) === 0) {
      const current = await find(userId, id);
      if (!current) return res.status(404).json({ error: 'Resume not found.' });
      return res.status(409).json({
        error: 'This resume was changed on another device.',
        resume: toDto(current),
      });
    }
    res.json({ resume: toDto((await find(userId, id))!) });
  });

  router.post('/:id/duplicate', async (req, res) => {
    const userId = owner(req);
    const source = await find(userId, String(req.params.id));
    if (!source) return res.status(404).json({ error: 'Resume not found.' });

    const { count } = await db
      .selectFrom('resume')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('user_id', '=', userId)
      .executeTakeFirstOrThrow();
    if (Number(count) >= maxResumesPerUser) {
      return res.status(409).json({ error: `You can keep up to ${maxResumesPerUser} resumes. Delete one to make room.` });
    }

    const now = new Date();
    const id = randomUUID();
    const data = typeof source.data === 'string' ? source.data : JSON.stringify(source.data);
    await db
      .insertInto('resume')
      .values({
        id,
        user_id: userId,
        title: `${source.title} (copy)`.slice(0, 120),
        template_id: source.template_id,
        data,
        created_at: now,
        updated_at: now,
      })
      .execute();
    res.status(201).json({ resume: toDto((await find(userId, id))!) });
  });

  router.delete('/:id', async (req, res) => {
    const result = await db
      .deleteFrom('resume')
      .where('id', '=', String(req.params.id))
      .where('user_id', '=', owner(req))
      .executeTakeFirst();
    if (Number(result.numDeletedRows) === 0) return res.status(404).json({ error: 'Resume not found.' });
    res.status(204).end();
  });

  return router;
}
