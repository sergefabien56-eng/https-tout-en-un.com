/**
 * Logo commun de l'application — importé par le Propriétaire uniquement.
 *
 * Trois principes non négociables :
 *  1. Aucun contenu actif n'est accepté. Le type est relevé sur les OCTETS, jamais sur le
 *     `Content-Type` annoncé ni sur l'extension : un SVG (XML, donc actif) est refusé même
 *     renommé en `.png`.
 *  2. L'image est ré-encodée avant stockage. Les métadonnées d'origine (EXIF, commentaires)
 *     ne survivent pas, donc aucun texte caché ne peut être réinjecté.
 *  3. Les dimensions sont lues dans l'en-tête binaire, pas dans une déclaration.
 */
import type { PoolClient } from 'pg';
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { hashSessionToken } from '@/core/auth/primitives';
import { withIdentityTransaction } from '@/core/db/client';
import { AppError, ForbiddenError, ValidationError } from '@/core/errors/app-error';

export type LogoMime = 'image/png' | 'image/jpeg' | 'image/webp';
export type LogoExtension = 'png' | 'jpg' | 'webp';

export interface OrganizationLogo {
  readonly bytes: Buffer;
  readonly mime: LogoMime;
  readonly extension: LogoExtension;
  readonly width: number;
  readonly height: number;
  readonly updatedAt: string;
}

export const LOGO_KEY = 'organization.logo';
export const LOGO_MAX_BYTES = 1_048_576; // 1 Mio
export const LOGO_MAX_SIDE = 2048;
export const LOGO_MIN_SIDE = 32;
/** Au-delà de ce rapport, l'image est une bande : elle ne peut pas être un logo carré. */
export const LOGO_MAX_ASPECT = 4;
const LOGO_CONTENT_PREFIX = '/api/organization/logo';

/** Signature binaire — la seule preuve de type acceptée. */
export function sniffImageMime(bytes: Buffer): LogoMime | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString('latin1') === 'RIFF' &&
    bytes.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

/** Dimensions lues dans l'en-tête. Aucune bibliothèque image n'est nécessaire pour cela. */
export function readImageSize(bytes: Buffer, mime: LogoMime): { width: number; height: number } | null {
  if (mime === 'image/png') {
    if (bytes.length < 24 || bytes.subarray(12, 16).toString('latin1') !== 'IHDR') return null;
    const width = bytes.readUInt32BE(16); const height = bytes.readUInt32BE(20);
    return width > 0 && height > 0 ? { width, height } : null;
  }
  if (mime === 'image/jpeg') {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1]!;
      const length = bytes.readUInt16BE(offset + 2);
      // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15 portent les dimensions.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const height = bytes.readUInt16BE(offset + 5); const width = bytes.readUInt16BE(offset + 7);
        return width > 0 && height > 0 ? { width, height } : null;
      }
      if (length < 2) return null;
      offset += 2 + length;
    }
    return null;
  }
  // WEBP : trois variantes (VP8 perdu, VP8L sans perte, VP8X étendu).
  const chunk = bytes.subarray(12, 16).toString('latin1');
  if (chunk === 'VP8 ' && bytes.length >= 30) {
    const width = bytes.readUInt16LE(26) & 0x3fff; const height = bytes.readUInt16LE(28) & 0x3fff;
    return width > 0 && height > 0 ? { width, height } : null;
  }
  if (chunk === 'VP8L' && bytes.length >= 25) {
    const bits = bytes.readUInt32LE(21);
    const width = (bits & 0x3fff) + 1; const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height };
  }
  if (chunk === 'VP8X' && bytes.length >= 30)
    return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 };
  return null;
}

export interface LogoInspection { readonly mime: LogoMime; readonly extension: LogoExtension;
  readonly width: number; readonly height: number }

/**
 * Contrôle serveur. L'ordre des refus est significatif : on rejette d'abord le type
 * (donc le contenu actif), ensuite seulement la taille et les dimensions.
 */
export function inspectLogoUpload(bytes: Buffer): LogoInspection {
  if (bytes.length === 0) throw new ValidationError('Fichier vide.');
  if (bytes.length > LOGO_MAX_BYTES) throw new ValidationError('Fichier trop volumineux : 1 Mio maximum.');
  const mime = sniffImageMime(bytes);
  if (!mime) throw new ValidationError('Format non accepté. Utilisez une image PNG, JPEG ou WebP. ' +
    'Les fichiers SVG sont refusés : ils peuvent contenir du code actif.');
  const size = readImageSize(bytes, mime);
  if (!size) throw new ValidationError('Image illisible : dimensions introuvables.');
  if (size.width < LOGO_MIN_SIDE || size.height < LOGO_MIN_SIDE)
    throw new ValidationError(`Image trop petite : ${LOGO_MIN_SIDE} px minimum de côté.`);
  if (size.width > LOGO_MAX_SIDE || size.height > LOGO_MAX_SIDE)
    throw new ValidationError(`Image trop grande : ${LOGO_MAX_SIDE} px maximum de côté.`);
  if (Math.max(size.width, size.height) / Math.min(size.width, size.height) > LOGO_MAX_ASPECT)
    throw new ValidationError('Proportions non adaptées à un logo : écart maximum de 1 pour 4.');
  return { mime, extension: mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : 'webp',
    width: size.width, height: size.height };
}

export async function readOrganizationLogoRecord(db: PoolClient): Promise<OrganizationLogo | null> {
  const result = await db.query<{ value: unknown; updated_at: Date }>(
    'SELECT value, updated_at FROM app_settings WHERE key = $1', [LOGO_KEY]);
  const row = result.rows[0];
  if (!row) return null;
  const value = row.value as { data?: unknown; mime?: unknown; width?: unknown; height?: unknown } | null;
  // Une valeur corrompue n'est pas un logo : on affiche le secours plutôt qu'une image cassée.
  if (!value || typeof value.data !== 'string' || typeof value.mime !== 'string') return null;
  const bytes = Buffer.from(value.data, 'base64');
  const mime = sniffImageMime(bytes);
  if (!mime) return null;
  const size = readImageSize(bytes, mime);
  if (!size) return null;
  return { bytes, mime, extension: mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : 'webp',
    width: size.width, height: size.height, updatedAt: row.updated_at.toISOString() };
}

export function logoUrl(logo: OrganizationLogo | null): string | null {
  return logo ? `${LOGO_CONTENT_PREFIX}?v=${logo.updatedAt}` : null;
}

export interface OrganizationLogoState {
  readonly custom: boolean;
  readonly url: string | null;
  readonly updatedAt: string | null;
  readonly width: number | null;
  readonly height: number | null;
  /** `true` tant que le Propriétaire n'a pas fourni d'image : l'icône provisoire est affichée. */
  readonly provisional: boolean;
  /** Ce que l'écran doit dire, sans jargon. */
  readonly note: string;
}

export async function readOrganizationLogo(token: string | undefined): Promise<OrganizationLogoState> {
  return withAuthorizedGlobalTransaction({ token, permission: 'settings:read' }, async (db) => {
    const logo = await readOrganizationLogoRecord(db);
    return { custom: logo !== null, url: logoUrl(logo), updatedAt: logo?.updatedAt ?? null,
      width: logo?.width ?? null, height: logo?.height ?? null, provisional: logo === null,
      note: logo === null
        ? 'Aucun logo importé : l’icône provisoire est affichée. Le site fonctionne sans logo.'
        : 'Logo importé par le Propriétaire. Il remplace l’icône provisoire sur tous les écrans.' };
  });
}

/**
 * Ré-encode en PNG carré, sans métadonnée. `fit: 'inside'` CONSERVE les proportions :
 * le logo n'est jamais déformé, il est seulement réduit.
 */
export async function reencodePng(bytes: Buffer, side: number): Promise<Buffer> {
  const { default: sharp } = await import('sharp');
  return sharp(bytes, { failOn: 'error', limitInputPixels: LOGO_MAX_SIDE * LOGO_MAX_SIDE })
    .rotate()                                   // applique l'orientation EXIF puis l'efface
    .resize({ width: side, height: side, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

/**
 * Résolution de session seule, sans permission métier.
 *
 * Le logo commun ne dépend d'aucun module : un membre dont le rôle est limité à une
 * boutique doit le voir. Utiliser `dashboard:read` ici l'en aurait privé — le test
 * d'intégration l'a révélé avant publication.
 */
async function withSessionOnly<T>(token: string | undefined,
  task: (db: PoolClient) => Promise<T>): Promise<T> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
  return withIdentityTransaction(async (db) => {
    const auth = await db.query<{ user_id: string }>(`SELECT s.user_id FROM sessions s
      JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1
      AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'active'`,
    [hashSessionToken(token)]);
    if (!auth.rows[0]?.user_id) throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
    return task(db);
  });
}

/** Consommation publique : l'image elle-même. Aucun droit de modification n'est exigé pour la voir. */
export async function readOrganizationLogoBytes(token: string | undefined): Promise<OrganizationLogo | null> {
  return withSessionOnly(token, (db) => readOrganizationLogoRecord(db));
}

/** État du logo pour tout utilisateur connecté — même sans accès aux paramètres. */
export async function readVisibleOrganizationLogo(token: string | undefined): Promise<OrganizationLogoState> {
  return withSessionOnly(token, async (db) => {
    const logo = await readOrganizationLogoRecord(db);
    return { custom: logo !== null, url: logoUrl(logo), updatedAt: logo?.updatedAt ?? null,
      width: logo?.width ?? null, height: logo?.height ?? null, provisional: logo === null,
      note: logo === null ? 'Aucun logo importé : l’icône provisoire est affichée.'
        : 'Logo importé par le Propriétaire.' };
  });
}

/**
 * Enregistrement : Propriétaire exclusivement.
 *
 * `settings:manage` ne suffit pas — le Gestionnaire le possède. Une vérification de rôle
 * est ajoutée, sur le modèle déjà utilisé pour la gestion des comptes.
 */
export async function updateOrganizationLogo(token: string | undefined, bytes: Buffer)
  : Promise<{ width: number; height: number }> {
  const inspection = inspectLogoUpload(bytes);
  return withAuthorizedGlobalTransaction({ token, permission: 'settings:manage' }, async (db, { userId }) => {
    const owner = await db.query<{ allowed: boolean }>(`SELECT EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = $1 AND role_code = 'owner' AND shop_id IS NULL) AS allowed`,
    [userId]);
    if (!owner.rows[0]?.allowed) throw new ForbiddenError('Seul le Propriétaire peut changer le logo de l’application.');

    // Ré-encodage systématique : toute métadonnée d'origine disparaît, et l'image est
    // ramenée à 512 px de côté maximum pour rester légère sur mobile.
    const side = Math.min(512, Math.max(inspection.width, inspection.height));
    const clean = await reencodePng(bytes, side);
    if (sniffImageMime(clean) !== 'image/png') throw new AppError('VALIDATION_FAILED',
      { userMessage: 'Le traitement de l’image a échoué. Réessayez avec une autre image.' });
    const cleanSize = readImageSize(clean, 'image/png');
    if (!cleanSize) throw new AppError('VALIDATION_FAILED',
      { userMessage: 'Le traitement de l’image a échoué. Réessayez avec une autre image.' });

    await db.query(`INSERT INTO app_settings (key, value) VALUES ($1, 'null'::jsonb)
      ON CONFLICT (key) DO NOTHING`, [LOGO_KEY]);
    await db.query('SELECT 1 FROM app_settings WHERE key = $1 FOR UPDATE', [LOGO_KEY]);
    await db.query('UPDATE app_settings SET value = $2::jsonb, updated_by = $3, updated_at = now() WHERE key = $1',
      [LOGO_KEY, JSON.stringify({ data: clean.toString('base64'), mime: 'image/png',
        width: cleanSize.width, height: cleanSize.height }), userId]);
    // Policy 0017 : acteur local posé uniquement après autorisation globale, et après
    // vérification du rôle Propriétaire. L'écriture d'audit et l'image vivent dans la même
    // transaction : un journal refusé annule l'enregistrement, jamais l'inverse.
    await db.query("SELECT set_config('app.audit_actor_id', $1, true)", [userId]);
    // Le journal ne contient jamais l'image : uniquement le fait, les dimensions et l'auteur.
    await db.query(`INSERT INTO audit_log (actor_user_id, module, action, entity_type, before, after)
      VALUES ($1, 'settings', 'update_organization_logo', 'app_setting', $2::jsonb, $3::jsonb)`,
    [userId, JSON.stringify({ logo: 'absent ou remplacé' }),
      JSON.stringify({ logo: 'présent', mime: 'image/png', width: cleanSize.width, height: cleanSize.height,
        bytes: clean.length })]);
    return { width: cleanSize.width, height: cleanSize.height };
  });
}

export async function removeOrganizationLogo(token: string | undefined): Promise<void> {
  return withAuthorizedGlobalTransaction({ token, permission: 'settings:manage' }, async (db, { userId }) => {
    const owner = await db.query<{ allowed: boolean }>(`SELECT EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = $1 AND role_code = 'owner' AND shop_id IS NULL) AS allowed`,
    [userId]);
    if (!owner.rows[0]?.allowed) throw new ForbiddenError('Seul le Propriétaire peut retirer le logo de l’application.');
    const existing = await readOrganizationLogoRecord(db);
    if (!existing) return;
    await db.query('DELETE FROM app_settings WHERE key = $1', [LOGO_KEY]);
    await db.query("SELECT set_config('app.audit_actor_id', $1, true)", [userId]);
    await db.query(`INSERT INTO audit_log (actor_user_id, module, action, entity_type, before, after)
      VALUES ($1, 'settings', 'remove_organization_logo', 'app_setting', $2::jsonb, $3::jsonb)`,
    [userId, JSON.stringify({ logo: 'présent' }), JSON.stringify({ logo: 'retiré — icône provisoire affichée' })]);
  });
}
