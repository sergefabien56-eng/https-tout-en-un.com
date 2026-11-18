/** Quatorze codes de secours SUPPLÉMENTAIRES pour les seuls tests CI jetables.
 * 10 (bootstrap) + 14 = 24 codes = 6 scénarios x 4 (bureau/mobile x tentative/retry).
 * Scénarios : 0-3 admin authentifié, 4-5 accessibilité admin (recette L10).
 * Ne jamais afficher ni archiver le fichier ou les codes ; bootstrap standard inchangé.
 */
import { randomBytes, createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import pg from 'pg';

const file = '/tmp/ci-recovery-codes';
if (process.env.CI !== 'true' || process.env.APP_ENV !== 'staging' || !process.env.DATABASE_URL_ADMIN) {
  throw new Error('Codes E2E : environnement CI jetable requis.');
}
const url = new URL(process.env.DATABASE_URL_ADMIN);
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/tout_en_un_test') {
  throw new Error('Codes E2E : base de test locale requise.');
}
const existing = (await readFile(file, 'utf8')).trim().split('\n');
if (existing.length !== 10 || existing.some((value) => !/^[A-Za-z0-9_-]{22}$/.test(value))) {
  throw new Error('Codes E2E : fichier initial invalide.');
}
const codes = Array.from({ length: 14 }, () => randomBytes(16).toString('base64url'));
const hashes = codes.map((code) => createHash('sha256').update(code, 'ascii').digest('hex'));
const db = new pg.Client({ connectionString: process.env.DATABASE_URL_ADMIN });
await db.connect();
try {
  await db.query('BEGIN');
  const result = await db.query(`UPDATE users SET totp_recovery_codes_hash = totp_recovery_codes_hash || $1::text[]
    WHERE email = 'proprietaire@ci.invalid' AND cardinality(totp_recovery_codes_hash) = 10 RETURNING id`, [hashes]);
  if (result.rowCount !== 1) throw new Error('Codes E2E : propriétaire de test ou état initial incorrect.');
  await writeFile(file, `${[...existing, ...codes].join('\n')}\n`, { mode: 0o600 });
  await db.query('COMMIT');
  console.log('Codes de secours supplémentaires créés pour les scénarios CI.');
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
} finally {
  await db.end();
}
