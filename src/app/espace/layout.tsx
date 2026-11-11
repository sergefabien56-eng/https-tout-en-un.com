import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/core/auth/service';
import { AppShell } from '@/ui/app-shell';
import { withAuthorizedShopTransaction } from '@/core/auth/authorize-shop';
import { AppError } from '@/core/errors/app-error';
import { SessionHeartbeat } from '@/ui/session-heartbeat';
import { getNavigationPermissions } from '@/ui/navigation-permissions';
import { countOwnUnreadBadge } from '@/modules/notifications/unread-badge';

/** Toutes les pages sous /espace partagent l'authentification et la coquille. */
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get('toutenun_session')?.value;
  if (!token) redirect('/connexion');
  const session = await getSession(token);
  if (!session) redirect('/connexion');
  const grants = await getNavigationPermissions(session.userId);
  let unreadNotifications: number;
  try { unreadNotifications = await countOwnUnreadBadge(token); }
  catch (error) {
    if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
    throw error;
  }
  const rawShop = (await cookies()).get('toutenun_shop')?.value;
  let selectedShop: string | null = null;
  let auditShopAccess = false;
  if (rawShop && /^[1-9]\d{0,18}$/.test(rawShop)) {
    try {
      selectedShop = await withAuthorizedShopTransaction({ token, shopId: rawShop, permission: 'shops:read' },
        async (db, ctx) => {
          const rows = await db.query<{ display_name: string }>(
            'SELECT display_name FROM shops WHERE id = $1 AND deleted_at IS NULL', [ctx.shopId]);
          return rows.rows[0]?.display_name ?? null;
        });
    } catch (error) {
      if (!(error instanceof AppError && error.httpStatus === 403)) throw error;
      // Permission retirée : ne jamais afficher l'ancien choix comme autorisé.
    }
  }
  if (selectedShop && rawShop && grants.permissions.has('audit:read')) {
    try {
      auditShopAccess = await withAuthorizedShopTransaction({ token, shopId: rawShop, permission: 'audit:read' },
        async () => true);
    } catch (error) {
      if (!(error instanceof AppError && error.httpStatus === 403)) throw error;
    }
  }
  return <AppShell userName={session.displayName} selectedShop={selectedShop} auditShopAccess={auditShopAccess}
    permissions={[...grants.permissions]}
    globalPermissions={[...grants.globalPermissions]} unreadNotifications={unreadNotifications}>
    <SessionHeartbeat />{children}</AppShell>;
}
