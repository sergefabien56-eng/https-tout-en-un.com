import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/core/auth/service';
import { AppShell } from '@/ui/app-shell';
import { getNavigationPermissions } from '@/ui/navigation-permissions';

/** Toutes les pages sous /espace partagent l'authentification et la coquille. */
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get('toutenun_session')?.value;
  if (!token) redirect('/connexion');
  const session = await getSession(token);
  if (!session) redirect('/connexion');
  const grants = await getNavigationPermissions(session.userId);
  return <AppShell userName={session.displayName} permissions={[...grants.permissions]}
    globalPermissions={[...grants.globalPermissions]}>{children}</AppShell>;
}
