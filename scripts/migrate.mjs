#!/usr/bin/env node
/**
 * Applique ou annule les migrations SQL de drizzle/ sur la base de DATABASE_URL.
 * - transaction par migration (une migration = un commit atomique)
 * - table de suivi schema_migrations (version, checksum, appliquée le, durée)
 * - checksum : une migration déjà appliquée ne doit jamais changer sur place
 * Usage : node scripts/migrate.mjs up | down [nombre]
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

const DIR = join(process.cwd(), 'drizzle');
const direction = process.argv[2] === 'down' ? 'down' : 'up';
const steps = Number(process.argv[3] ?? (direction === 'down' ? 1 : Number.POSITIVE_INFINITY));

const files = readdirSync(DIR)
  .filter((file) => file.endsWith(`.${direction}.sql`))
  .sort()
  .map((file) => ({ version: file.replace(`.${direction}.sql`, ''), file }));
const ordered = direction === 'up' ? files : [...files].reverse();

if (ordered.length === 0) {
  console.log(`Aucune migration ${direction} à appliquer.`);
  process.exit(0);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now(),
    duration_ms integer NOT NULL
  )`);

  const installed = await client.query('SELECT version FROM schema_migrations ORDER BY version DESC');
  const installedVersions = new Set(installed.rows.map((row) => row.version));
  const target = direction === 'up'
    ? ordered
    : ordered.filter((migration) => installedVersions.has(migration.version)).slice(0, steps);
  if (direction === 'down' && target.length === 0) {
    console.log('Aucune migration appliquée à annuler.');
  }
  // Le rollback doit viser la DERNIÈRE migration réellement appliquée. Ne jamais exécuter
  // le .down d'une version absente de schema_migrations (une deuxième invocation ne doit
  // surtout pas tenter de supprimer des objets déjà détruits).
  if (direction === 'down' && target.length > 0 && target[0].version !== installed.rows[0]?.version) {
    throw new Error(`Migration down absente pour ${installed.rows[0].version} : rollback interrompu.`);
  }
  for (const migration of target) {
    const sql = readFileSync(join(DIR, migration.file), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const existing = await client.query('SELECT checksum FROM schema_migrations WHERE version = $1', [migration.version]);

    if (direction === 'up' && existing.rowCount > 0) {
      if (existing.rows[0].checksum !== checksum) {
        throw new Error(
          `La migration ${migration.version} a déjà été appliquée avec un contenu différent. ` +
            'Créez une nouvelle migration au lieu de modifier une migration appliquée.',
        );
      }
      console.log(`= ${migration.version} (déjà appliquée)`);
      continue;
    }

    if (direction === 'down' && existing.rowCount === 0) {
      throw new Error(`Migration ${migration.version} non appliquée : rollback refusé.`);
    }
    const startedAt = Date.now();
    await client.query('BEGIN');
    try {
      await client.query(sql);
      if (direction === 'up') {
        await client.query(
          'INSERT INTO schema_migrations (version, checksum, duration_ms) VALUES ($1, $2, $3)',
          [migration.version, checksum, Date.now() - startedAt],
        );
      } else {
        await client.query('DELETE FROM schema_migrations WHERE version = $1', [migration.version]);
      }
      await client.query('COMMIT');
      console.log(`${direction === 'up' ? '+' : '-'} ${migration.version} (${Date.now() - startedAt} ms)`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${migration.version} échouée : ${error.message}`);
    }
  }
} finally {
  await client.end();
}
