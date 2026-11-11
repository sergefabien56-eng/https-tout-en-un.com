import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { listOwnSessions } from '@/modules/identity/active-sessions';
import { AppError } from '@/core/errors/app-error';

export const dynamic = 'force-dynamic';
export default async function SessionsPage() {
  let sessions: Awaited<ReturnType<typeof listOwnSessions>>;
  try { sessions = await listOwnSessions((await cookies()).get('toutenun_session')?.value); }
  catch (error) {
    if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
    throw error;
  }
  const date = (iso: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(iso));
  return <main className="workspace-main">
    <span className="tag">Sécurité du compte</span>
    <h1>Mes sessions</h1>
    <p>Connexions actives vérifiées dans la base. Heures affichées en UTC ; aucun jeton ou adresse IP n’est affiché.</p>
    <div className="card users-list" role="region" aria-label="Tableau des sessions défilant horizontalement" tabIndex={0}><table><caption>Jusqu’à 100 sessions actives</caption>
      <thead><tr><th scope="col">Appareil</th><th scope="col">Connecté le</th><th scope="col">Dernière activité</th><th scope="col">Expiration</th></tr></thead>
      <tbody>{sessions.map((session) => <tr key={session.id}>
        <th scope="row">{session.device}{session.current ? ' — cette session' : ''}</th>
        <td>{date(session.createdAt)}</td><td>{date(session.lastSeenAt)}</td><td>{date(session.expiresAt)}</td>
      </tr>)}</tbody>
    </table></div>
    <p>La déconnexion de cet appareil est disponible depuis la connexion ; la révocation des autres sessions sera ajoutée après validation des contrôles de sécurité.</p>
  </main>;
}
