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

export interface CreditBatchTable {
  id: Generated<number>;
  user_id: string;
  source: 'trial' | 'purchase' | 'grant' | 'refund';
  amount: number;
  remaining: number;
  expires_at: Date;
  dedupe_key: string | null;
  note: string | null;
  created_at: Date;
}

export interface CreditEntryTable {
  id: Generated<number>;
  user_id: string;
  batch_id: number;
  kind: 'grant' | 'hold' | 'release' | 'expire';
  amount: number;
  ai_request_id: number | null;
  created_at: Date;
}

export interface AiRequestTable {
  id: Generated<number>;
  user_id: string;
  action: string;
  status: 'held' | 'succeeded' | 'failed' | 'rejected';
  credits: number;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_micro_usd: number | null;
  latency_ms: number | null;
  error_code: string | null;
  created_at: Date;
  finished_at: Date | null;
}

export interface AiConsentTable {
  user_id: string;
  consented_at: Date;
}

export interface CreditPackTable {
  id: Generated<number>;
  credits: number;
  validity_days: number;
  price_bdt: number;
  active: number;
  sort: number;
}

/**
 * Better Auth's user table, for reading only (Better Auth owns and writes it).
 * Its columns are camelCase.
 */
export interface UserTable {
  id: string;
  name: string;
  email: string;
  emailVerified: number;
  createdAt: Date;
}

export interface Database {
  user: UserTable;
  resume: ResumeTable;
  credit_batch: CreditBatchTable;
  credit_entry: CreditEntryTable;
  ai_request: AiRequestTable;
  ai_consent: AiConsentTable;
  credit_pack: CreditPackTable;
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
