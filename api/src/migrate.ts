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

const appMigrations: Record<string, Migration> = {
  '0001_resume': {
    async up(db: Kysely<unknown>) {
      // The owner column must match Better Auth's user.id exactly (type and
      // collation) for the foreign key; read it rather than assume it.
      const { rows } = await sql<{ COLUMN_TYPE: string; COLLATION_NAME: string | null }>`
        SELECT COLUMN_TYPE, COLLATION_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'id'`.execute(db);
      const userId = rows[0];
      if (!userId) throw new Error('Better Auth user table is missing; run its migrations first');
      const idType = sql.raw(
        userId.COLUMN_TYPE + (userId.COLLATION_NAME ? ` COLLATE ${userId.COLLATION_NAME}` : ''),
      );

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
