import { Kysely, MysqlDialect, type ColumnType, type Generated } from 'kysely';
import { createPool, type Pool } from 'mysql2';

/**
 * One connection pool for everything: Better Auth's tables and the app's own
 * share it (Better Auth accepts a ready Kysely instance), so there is a single
 * set of connections to size and to close on shutdown.
 */

export interface ResumeTable {
  id: string;
  user_id: string;
  title: string;
  template_id: string;
  /** ResumeData as JSON. mysql2 returns JSON columns already parsed. */
  data: ColumnType<unknown, string, string>;
  /** Bumped on every write; a stale version is a conflicting edit. */
  version: Generated<number>;
  created_at: ColumnType<Date, Date, never>;
  updated_at: Date;
}

export interface Database {
  resume: ResumeTable;
}

export function createDatabase(databaseUrl: string): { db: Kysely<Database>; pool: Pool } {
  const pool = createPool({
    uri: databaseUrl,
    connectionLimit: 10,
    // UTC in and out, so timestamps mean the same thing on every server.
    timezone: 'Z',
    charset: 'utf8mb4',
    supportBigNumbers: true,
  });
  const db = new Kysely<Database>({ dialect: new MysqlDialect({ pool }) });
  return { db, pool };
}
