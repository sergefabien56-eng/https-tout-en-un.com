import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/core/auth/service';
import { appConfig } from '@/core/config/app.config';
import { LogoutButton } from './logout-button';
import { AppShell } from '@/ui/app-shell';
import { getNavigationPermissions } from '@/ui/navigation-permissions';

export const dynamic = 'force-dynamic';

export default async function PrivateSpace() {
  const token = (await cookies()).get('toutenun_session')?.value;
  // Aucun rendu de données privées sans une session active et non révoquée dans PostgreSQL.
  if (!token) redirect('/connexion');
  const session = await getSession(token);
  if (!session) redirect('/connexion');
  const permissions = await getNavigationPermissions(session.userId);
  return (
    <AppShell userName={session.displayName} permissions={[...permissions]}>
    <main className="workspace-main">
      <span className="tag">Espace privé</span>
      <h1>{appConfig.shortName}</h1>
      <p>Bienvenue, {session.displayName}.</p>
      <div className="card">
        <h2>Vos données</h2>
        <p>Aucune boutique Jumia n’est connectée. Les ventes, commandes et finances sont indisponibles — pas à zéro.</p>
        <span className="tag soon">Connexion Jumia · Phase 2</span>
      </div>
      <LogoutButton />
    </main>
    </AppShell>
  );
}
