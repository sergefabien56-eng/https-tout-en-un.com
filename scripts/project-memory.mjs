/** Continuité du CODE uniquement ; aucun accès DB/secret ni sauvegarde de production. */
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const required = [
  'PROJECT_OVERVIEW.md', 'PROJECT_STATUS.md', 'MASTER_ROADMAP.md',
  'TECHNICAL_ARCHITECTURE.md', 'DATABASE_SCHEMA.md', 'FEATURES_COMPLETED.md',
  'FEATURES_PENDING.md', 'BUGS_AND_ISSUES.md', 'DECISIONS_LOG.md',
  'NEXT_ACTIONS.md', 'CHANGELOG.md', 'AI_HANDOVER.md', 'RESUME_HERE.md',
];
function check() {
  const errors = [];
  for (const name of required) {
    const file = join(root, 'PROJECT_MEMORY', name);
    if (!existsSync(file) || statSync(file).size < 100) errors.push(`Document manquant/vide : ${name}`);
  }
  for (let i = 1; i <= 10; i++) {
    const prefix = `drizzle/${String(i).padStart(4, '0')}_`;
    const tracked = run('git', ['ls-files', '--', 'drizzle/']).split('\n');
    for (const suffix of ['.up.sql', '.down.sql'])
      if (!tracked.some((f) => f.startsWith(prefix) && f.endsWith(suffix))) errors.push(`${prefix}*${suffix} absent`);
  }
  for (const f of ['scripts/migrate.mjs', 'scripts/test-backup-restore.mjs',
    'src/core/auth/service.ts', 'src/core/db/shop-scope.ts',
    'src/modules/notifications/set-read.ts', 'src/modules/audit/list-audit.ts',
    'tests/e2e/auth-smoke.spec.ts', '.github/workflows/ci.yml'])
    if (!existsSync(join(root, f))) errors.push(`Chemin de référence manquant : ${f}`);
  const policy = readFileSync(join(root, 'drizzle/0009_notifications.up.sql'), 'utf8');
  if (!policy.includes('FORCE ROW LEVEL SECURITY')) errors.push('RLS notifications absente');
  const desc = readFileSync(join(root, 'PROJECT_MEMORY/DATABASE_SCHEMA.md'), 'utf8');
  if (!desc.includes('user_notifications') || !desc.includes('0010')) errors.push('Schéma documenté à revoir');
  const pending = readFileSync(join(root, 'PROJECT_MEMORY/RESUME_HERE.md'), 'utf8');
  if (!pending.includes('NEXT_ACTIONS.md') || !pending.includes('AI_HANDOVER.md')) errors.push('Reprise incomplète');
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('Cohérence de base OK : 13 documents, 10 paires SQL, code cité et garde-fous vérifiés. Ne remplace pas tests/CI/revue humaine.');
}
function snapshot(label) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,60}$/.test(label ?? ''))
    throw new Error('Étiquette exigée (lettres/chiffres/._-, max 61), sans secret ni chemin.');
  const dirty = run('git', ['status', '--porcelain', '--untracked-files=all']);
  if (dirty) throw new Error('Snapshot refusé : arbre non propre ; ne perd pas les fichiers non suivis. Committez ou sécurisez le travail avant de relancer.');
  const head = run('git', ['rev-parse', 'HEAD']);
  const dir = join(root, '.project-backups');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const prefix = `${new Date().toISOString().replace(/[:.]/g, '-')}-${label}-${head.slice(0, 12)}`;
  const bundle = join(dir, `${prefix}.bundle`);
  const zip = join(dir, `${prefix}.zip`);
  const sumfile = join(dir, `${prefix}.sha256`);
  try {
    run('git', ['bundle', 'create', bundle, '--all']);
    run('git', ['bundle', 'verify', bundle]);
    run('git', ['archive', '--format=zip', `--output=${zip}`, 'HEAD']);
    const sums = [bundle, zip].map((file) => `${createHash('sha256').update(readFileSync(file)).digest('hex')}  ${file.split('/').at(-1)}`);
    writeFileSync(sumfile, `${sums.join('\n')}\n`, { mode: 0o600 });
    console.log(`Snapshot local (CODE, pas DB) : ${bundle}\n${zip}\n${sumfile}\nSHA HEAD: ${head}\nExporter ces trois fichiers hors sandbox.`);
  } catch (err) {
    // Laisser les éléments partiels visibles, ne pas les prétendre validés.
    throw new Error(`Snapshot incomplet ; examiner ${dir} : ${err.message}`);
  }
}
const action = process.argv[2];
if (action === 'check') check();
else if (action === 'snapshot') snapshot(process.argv[3]);
else { console.error('Usage: node scripts/project-memory.mjs check | snapshot <etiquette>'); process.exitCode = 2; }
