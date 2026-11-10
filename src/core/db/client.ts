/** Connexion serveur : rôle applicatif NON BYPASSRLS requis en production. */
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { parseShopId, type ShopId } from '@/core/db/shop-scope';

let pool: Pool | undefined;
function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL absente : accès base refusé.');
    pool = new Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 });
  }
  return pool;
}

/**
 * Chaque requête métier est incluse dans une transaction : le contexte RLS est LOCAL et
 * disparaît après COMMIT/ROLLBACK. Ne JAMAIS utiliser SET (persistant sur le pool).
 * shopId null = accès global à réserver à un code d'administration explicitement autorisé.
 */
export async function withShopTransaction<T>(shopId: ShopId, task: (db: PoolClient) => Promise<T>): Promise<T> {
  const id = parseShopId(shopId);
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    try {
      await client.query("SELECT set_config('app.shop_id', $1, true)", [id]);
      const result = await task(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } finally {
    client.release();
  }
}

/** Requête identité, sans shop scope ; ne doit jamais servir à accéder aux tables métier. */
export async function identityQuery<T extends QueryResultRow>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
  // Contexte local absent, les tables protégées par RLS ne doivent pas remonter de lignes.
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    try {
      const rows = (await client.query<T>(sql, [...params])).rows;
      await client.query('COMMIT');
      return rows;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } finally { client.release(); }
}

/** Repository pour les boutiques : filtre explicite ET RLS en défense en profondeur. */
export async function getShopById(shopId: ShopId): Promise<{
  id: string; displayName: string; status: string; countryCode: string;
} | null> {
  const id = parseShopId(shopId);
  return withShopTransaction(id, async (db) => {
    const result = await db.query<{
      id: string; display_name: string; status: string; country_code: string;
    }>(
      'SELECT id, display_name, status, country_code FROM shops WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    const row = result.rows[0];
    return row ? { id: row.id, displayName: row.display_name, status: row.status, countryCode: row.country_code } : null;
  });
}

/** Transactions d'identité uniquement. Interdire les tables métier sur cette connexion sans contexte RLS. */
export async function withIdentityTransaction<T>(task: (db: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    try {
      const result = await task(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } finally { client.release(); }
}
