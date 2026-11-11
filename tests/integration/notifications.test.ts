/** Permissions d'identité et RLS des notifications personnelles. */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PoolClient } from 'pg';
import { createSessionToken } from '@/core/auth/primitives';

let db: PGlite;
vi.mock('@/core/db/client', () => ({
  withIdentityTransaction: async <T>(task: (client: PoolClient) => Promise<T>): Promise<T> => {
    await db.exec('BEGIN');
    try { await db.exec('SET LOCAL ROLE app_user;');
      const result = await task(db as unknown as PoolClient);
      await db.exec('COMMIT'); return result;
    } catch (e) { await db.exec('ROLLBACK'); throw e; }
  },
}));
const { listOwnNotifications } = await import('@/modules/notifications/list-own');
const { setOwnNotificationRead } = await import('@/modules/notifications/set-read');
const first = createSessionToken(), second = createSessionToken();
beforeAll(async () => {
  db = await PGlite.create();
  for (const file of readdirSync(join(process.cwd(), 'drizzle')).filter((f) => f.endsWith('.up.sql')).sort())
    await db.exec(readFileSync(join(process.cwd(), 'drizzle', file), 'utf8'));
  await db.exec(`INSERT INTO users (email,password_hash,display_name) VALUES
    ('a@fixture.invalid','hash','A'),('b@fixture.invalid','hash','B');
    CREATE ROLE app_user NOLOGIN;
    GRANT USAGE ON SCHEMA public TO app_user;
    GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
    GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;`);
  for (const [id, token] of [[1,first],[2,second]] as const)
    await db.query("INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 hour')", [id,token.hash]);
  await db.query("INSERT INTO user_notifications (user_id,kind,title,message) VALUES(1,'security_login','Connexion','A')");
  await db.query("INSERT INTO user_notifications (user_id,kind,title,message) VALUES(2,'security_login','Connexion','B')");
});
afterAll(async () => { await db.close(); });
describe('notifications personnelles', () => {
  it('chaque compte voit uniquement les siennes', async () => {
    expect((await listOwnNotifications(first.token)).notifications.map((r) => r.message)).toEqual(['A']);
    expect((await listOwnNotifications(second.token)).notifications.map((r) => r.message)).toEqual(['B']);
  });
  it('RLS refuse les INSERT vers autrui et ne montre rien sans contexte', async () => {
    await db.exec('BEGIN; SET LOCAL ROLE app_user;');
    try {
      expect((await db.query('SELECT id FROM user_notifications')).rows).toEqual([]);
      await db.query("SELECT set_config('app.notification_user_id','1',true)");
      expect((await db.query('SELECT id FROM user_notifications')).rows).toHaveLength(1);
      await db.exec('SAVEPOINT denied_write');
      await expect(db.query("INSERT INTO user_notifications (user_id,kind,title,message) VALUES(2,'security_login','Interdit','X')"))
        .rejects.toThrow();
      await db.exec('ROLLBACK TO SAVEPOINT denied_write');
    } finally { await db.exec('ROLLBACK'); }
  });
  it('lu/non lu : seul le propriétaire peut modifier ; répétition idempotente et audit atomique', async () => {
    const own = (await listOwnNotifications(first.token)).notifications[0];
    const foreign = (await listOwnNotifications(second.token)).notifications[0];
    expect(own?.id).toBeDefined(); expect(foreign?.id).toBeDefined();
    await expect(setOwnNotificationRead(first.token, foreign!.id, true)).rejects.toMatchObject({ httpStatus: 404 });
    expect((await setOwnNotificationRead(first.token, own!.id, true)).readAt).not.toBeNull();
    expect((await listOwnNotifications(first.token)).notifications[0]?.readAt).not.toBeNull();
    await setOwnNotificationRead(first.token, own!.id, true);
    expect((await db.query("SELECT action FROM audit_log WHERE module='notifications'")).rows).toHaveLength(1);
    expect((await setOwnNotificationRead(first.token, own!.id, false)).readAt).toBeNull();
    expect((await listOwnNotifications(first.token)).notifications[0]?.readAt).toBeNull();
    expect((await listOwnNotifications(second.token)).notifications[0]?.readAt).toBeNull();
    expect((await db.query("SELECT action FROM audit_log WHERE module='notifications' ORDER BY id")).rows)
      .toEqual([{ action: 'mark_read' }, { action: 'mark_unread' }]);
  });
  it('jeton absent ou périmé ne donne aucune donnée', async () => {
    await expect(setOwnNotificationRead(undefined, '1', true)).rejects.toMatchObject({ httpStatus: 401 });
    await expect(setOwnNotificationRead(createSessionToken().token, '1', true)).rejects.toMatchObject({ httpStatus: 401 });
    await expect(setOwnNotificationRead(first.token, '1 OR 1=1', true)).rejects.toMatchObject({ httpStatus: 400 });
    await expect(listOwnNotifications(undefined)).rejects.toMatchObject({ httpStatus: 401 });
    await expect(listOwnNotifications(createSessionToken().token)).rejects.toMatchObject({ httpStatus: 401 });
    await expect(listOwnNotifications(first.token, 0)).rejects.toMatchObject({ httpStatus: 400 });
  });
});
