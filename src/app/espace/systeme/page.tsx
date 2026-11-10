import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getDeepHealth } from '@/modules/monitoring/deep-health';
import { AppError } from '@/core/errors/app-error';

export const dynamic = 'force-dynamic';

export default async function SystemPage() {
  let result: Awaited<ReturnType<typeof getDeepHealth>>;
  try { result = await getDeepHealth((await cookies()).get('toutenun_session')?.value); }
  catch (error) {
    if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
    if (error instanceof AppError && error.httpStatus === 403) notFound();
    throw error;
  }
  return <main className="workspace-main">
    <span className="tag">Administration · Propriétaire</span>
    <h1>Système</h1>
    <p>État vérifié au {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'medium', timeZone: 'UTC' }).format(new Date(result.checkedAt))} UTC.</p>
    <div className="card"><h2>Base de données</h2>
      <p><span className="tag ok">Réelle</span> Connexion : opérationnelle.</p>
      <p>Migrations appliquées : {result.migrationsApplied} (comptage réel, pas estimation).</p>
    </div>
    <div className="card"><h2>File de tâches</h2>
      <p>Indisponible — le worker n’est pas encore livré. Aucun état « OK » n’est simulé.</p>
    </div>
  </main>;
}
