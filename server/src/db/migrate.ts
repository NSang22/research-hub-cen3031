import 'dotenv/config';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArg(name: string): string | undefined {
  const prefix = `${name}=`;
  const raw = process.argv.find((a) => a.startsWith(prefix));
  return raw ? raw.slice(prefix.length) : undefined;
}

async function migrate() {
  const skipUntil = parseArg('--skip-until');
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = join(__dirname, 'migrations');
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (skipUntil) {
      if (!files.includes(skipUntil)) {
        throw new Error(
          `--skip-until: no migration file "${skipUntil}". Files: ${files.join(', ')}`
        );
      }
      for (const file of files) {
        if (file < skipUntil) {
          await client.query(
            `INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
            [file]
          );
        }
      }
      console.log(
        `Recorded migrations lexicographically before "${skipUntil}" as already applied (no SQL run for those).`
      );
    }

    for (const file of files) {
      const done = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
      if (done.rowCount) {
        console.log(`Skipping already applied: ${file}`);
        continue;
      }
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');
      console.log(`Running migration: ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    }
    console.log('Migrations complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err: unknown) => {
  console.error('Migration failed:', err);
  const e = err as { code?: string };
  if (e.code === '42710' || e.code === '42P07') {
    console.error(
      '\nIf this database was created outside this migrate script, mark older migrations as applied, then rerun:\n' +
        '  npm run migrate -- --skip-until=006_application_questions.sql\n' +
        '(Use the first migration file you have not yet applied; filenames are compared in sort order.)\n'
    );
  }
  process.exit(1);
});
