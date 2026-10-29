import { getMigrations } from 'better-auth/db/migration';
import { sql, type Kysely } from 'kysely';
import { Migrator, type Migration, type MigrationProvider } from 'kysely/migration';
import type { Auth } from './auth.js';
import type { Database } from './db.js';

/**
 * Brings the schema up to date at start-up, before the server accepts
 * requests. Two owners, in order:
 *
 * 1. Better Auth's own tables (user, session, account, verification), which
 *    it creates and extends itself as its version moves.
 * 2. The app's tables, as numbered migrations below. Never edit one that has
 *    shipped; add the next number. Kysely records which have run.
 */

/**
 * The column type of Better Auth's user.id, collation included. Every table
 * owned by a user references it, and a foreign key needs an exact match; read
 * it rather than assume it.
 */
async function userIdType(db: Kysely<unknown>) {
  const { rows } = await sql<{ COLUMN_TYPE: string; COLLATION_NAME: string | null }>`
    SELECT COLUMN_TYPE, COLLATION_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'id'`.execute(db);
  const userId = rows[0];
  if (!userId) throw new Error('Better Auth user table is missing; run its migrations first');
  return sql.raw(userId.COLUMN_TYPE + (userId.COLLATION_NAME ? ` COLLATE ${userId.COLLATION_NAME}` : ''));
}

const appMigrations: Record<string, Migration> = {
  '0001_resume': {
    async up(db: Kysely<unknown>) {
      const idType = await userIdType(db);

      await sql`
        CREATE TABLE resume (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          user_id ${idType} NOT NULL,
          title VARCHAR(120) NOT NULL,
          template_id VARCHAR(40) NOT NULL,
          data JSON NOT NULL,
          version INT NOT NULL DEFAULT 1,
          created_at DATETIME(3) NOT NULL,
          updated_at DATETIME(3) NOT NULL,
          KEY resume_user_updated (user_id, updated_at),
          CONSTRAINT resume_user_fk FOREIGN KEY (user_id) REFERENCES \`user\` (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`.execute(db);
    },
    async down(db: Kysely<unknown>) {
      await sql`DROP TABLE resume`.execute(db);
    },
  },

  // Credits (docs/PLAN-2.0.md §4) and the AI request log (§5).
  '0002_credits': {
    async up(db: Kysely<unknown>) {
      const idType = await userIdType(db);
      const table = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';

      // A grant of credits with its own expiry. `remaining` is what is left of
      // it; spending takes from the batch that expires soonest. `dedupe_key`
      // makes one-off grants idempotent: "trial:<user>", "payment:<id>".
      await sql`
        CREATE TABLE credit_batch (
          id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          user_id ${idType} NOT NULL,
          source VARCHAR(16) NOT NULL,
          amount INT NOT NULL,
          remaining INT NOT NULL,
          expires_at DATETIME(3) NOT NULL,
          dedupe_key VARCHAR(100) NULL,
          note VARCHAR(200) NULL,
          created_at DATETIME(3) NOT NULL,
          UNIQUE KEY credit_batch_dedupe (dedupe_key),
          KEY credit_batch_user_expiry (user_id, expires_at),
          CONSTRAINT credit_batch_user_fk FOREIGN KEY (user_id) REFERENCES \`user\` (id) ON DELETE CASCADE,
          CONSTRAINT credit_batch_amounts CHECK (amount > 0 AND remaining >= 0 AND remaining <= amount)
        ) ${sql.raw(table)}`.execute(db);

      // The append-only ledger: every change to a batch, so the history always
      // explains the balance. grant (+), hold (−, an AI action took credits),
      // release (+, a failed action gave them back), expire (−).
      await sql`
        CREATE TABLE credit_entry (
          id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          user_id ${idType} NOT NULL,
          batch_id BIGINT NOT NULL,
          kind VARCHAR(16) NOT NULL,
          amount INT NOT NULL,
          ai_request_id BIGINT NULL,
          created_at DATETIME(3) NOT NULL,
          KEY credit_entry_user_time (user_id, created_at),
          KEY credit_entry_request (ai_request_id),
          CONSTRAINT credit_entry_user_fk FOREIGN KEY (user_id) REFERENCES \`user\` (id) ON DELETE CASCADE,
          CONSTRAINT credit_entry_batch_fk FOREIGN KEY (batch_id) REFERENCES credit_batch (id) ON DELETE CASCADE
        ) ${sql.raw(table)}`.execute(db);

      // One row per AI action: what it cost us and how it went. Never content.
      await sql`
        CREATE TABLE ai_request (
          id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          user_id ${idType} NOT NULL,
          action VARCHAR(32) NOT NULL,
          status VARCHAR(16) NOT NULL,
          credits INT NOT NULL,
          model VARCHAR(60) NULL,
          input_tokens INT NULL,
          output_tokens INT NULL,
          cost_micro_usd INT NULL,
          latency_ms INT NULL,
          error_code VARCHAR(60) NULL,
          created_at DATETIME(3) NOT NULL,
          finished_at DATETIME(3) NULL,
          KEY ai_request_user_time (user_id, created_at),
          KEY ai_request_time (created_at),
          CONSTRAINT ai_request_user_fk FOREIGN KEY (user_id) REFERENCES \`user\` (id) ON DELETE CASCADE
        ) ${sql.raw(table)}`.execute(db);

      // When the user agreed that text they choose is sent to the AI provider.
      await sql`
        CREATE TABLE ai_consent (
          user_id ${idType} NOT NULL PRIMARY KEY,
          consented_at DATETIME(3) NOT NULL,
          CONSTRAINT ai_consent_user_fk FOREIGN KEY (user_id) REFERENCES \`user\` (id) ON DELETE CASCADE
        ) ${sql.raw(table)}`.execute(db);

      // What can be bought. Edited in the database, not in code.
      await sql`
        CREATE TABLE credit_pack (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          credits INT NOT NULL,
          validity_days INT NOT NULL,
          price_bdt INT NOT NULL,
          active TINYINT(1) NOT NULL DEFAULT 1,
          sort INT NOT NULL DEFAULT 0
        ) ${sql.raw(table)}`.execute(db);
      await sql`
        INSERT INTO credit_pack (credits, validity_days, price_bdt, sort) VALUES
          (1000, 30, 50, 1), (1000, 90, 70, 2), (1000, 180, 80, 3)`.execute(db);
    },
    async down(db: Kysely<unknown>) {
      for (const t of ['credit_pack', 'ai_consent', 'credit_entry', 'ai_request', 'credit_batch']) {
        await sql`DROP TABLE ${sql.id(t)}`.execute(db);
      }
    },
  },
};

const provider: MigrationProvider = { getMigrations: async () => appMigrations };

export async function migrate(auth: Auth, db: Kysely<Database>) {
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();

  const migrator = new Migrator({ db, provider, migrationTableName: 'app_migration', migrationLockTableName: 'app_migration_lock' });
  const { error, results } = await migrator.migrateToLatest();
  for (const r of results ?? []) {
    if (r.status === 'Error') throw new Error(`migration ${r.migrationName} failed`);
  }
  if (error) throw error;
  return results?.filter((r) => r.status === 'Success').map((r) => r.migrationName) ?? [];
}
