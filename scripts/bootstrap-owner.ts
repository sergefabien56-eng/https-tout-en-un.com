#!/usr/bin/env tsx
/**
 * Exécution manuelle UNE FOIS après les migrations. Le QR contient un secret TOTP : fichier
 * privé 0600 à conserver hors du dépôt et à supprimer après l'enrôlement sur téléphone.
 * Exemple : OWNER_EMAIL=... OWNER_NAME=... OWNER_PASSWORD_FILE=/chemin/prive/... \
 *           TOTP_QR_FILE=/chemin/prive/... npm run auth:bootstrap
 */
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Client } from 'pg';
import QRCode from 'qrcode';
import { createFirstOwner } from '../src/core/auth/bootstrap';

async function main(): Promise<void> {
  const { DATABASE_URL_ADMIN, OWNER_EMAIL, OWNER_NAME, OWNER_PASSWORD_FILE,
    TOTP_QR_FILE, TOTP_RECOVERY_FILE, APP_ENC_KEYS, APP_ENC_ACTIVE } = process.env;
  if (!DATABASE_URL_ADMIN || !OWNER_EMAIL || !OWNER_NAME || !OWNER_PASSWORD_FILE ||
      !TOTP_QR_FILE || !TOTP_RECOVERY_FILE || !APP_ENC_KEYS || !APP_ENC_ACTIVE) {
    throw new Error('Configuration incomplète. Voir docs/auth-bootstrap.md ; aucun compte créé.');
  }
  const file = resolve(TOTP_QR_FILE);
  const recoveryFile = resolve(TOTP_RECOVERY_FILE);
  if (file === recoveryFile) throw new Error('Les fichiers QR et secours doivent être différents.');
  if ([file, recoveryFile].some((path) => path.startsWith(resolve(process.cwd()) + '/'))) {
    throw new Error('QR dans le dossier projet interdit : choisir un chemin privé HORS du dépôt.');
  }
  const password = (await readFile(OWNER_PASSWORD_FILE, 'utf8')).trimEnd();
  const db = new Client({ connectionString: DATABASE_URL_ADMIN });
  await db.connect();
  let qrWritten = false;
  let recoveryWritten = false;
  try {
    await db.query('BEGIN');
    const { uri, recoveryCodes } = await createFirstOwner(db, {
      email: OWNER_EMAIL, displayName: OWNER_NAME, password,
      keyRing: APP_ENC_KEYS, activeVersion: Number(APP_ENC_ACTIVE),
    });
    // Génération locale sans requête réseau ni sortie sur stdout contenant le secret.
    const png = await QRCode.toBuffer(uri, { type: 'png', errorCorrectionLevel: 'M', margin: 2 });
    await writeFile(file, png, { flag: 'wx', mode: 0o600 });
    qrWritten = true;
    await writeFile(recoveryFile, recoveryCodes.join('\n') + '\n', { flag: 'wx', mode: 0o600 });
    recoveryWritten = true;
    await db.query('COMMIT');
    process.stdout.write(`Compte créé. QR : ${file}. Codes de secours : ${recoveryFile}. Conserver les codes hors ligne ; supprimer le QR après scan.\n`);
  } catch (error) {
    await db.query('ROLLBACK');
    if (qrWritten) await unlink(file);
    if (recoveryWritten) await unlink(recoveryFile);
    throw error;
  } finally { await db.end(); }
}

main().catch((error: unknown) => {
  // Messages neutres seulement : jamais d'objets pouvant contenir des secrets.
  process.stderr.write(`Bootstrap impossible : ${error instanceof Error ? error.message : 'erreur inconnue'}\n`);
  process.exitCode = 1;
});
