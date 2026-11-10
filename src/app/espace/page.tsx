import Link from 'next/link';
import { appConfig } from '@/core/config/app.config';
import { LogoutButton } from './logout-button';

/** Aucune donnée Jumia n'existe encore : pas de KPI inventé. */
export default function PrivateSpace() {
  return <main className="workspace-main">
    <span className="tag">Espace privé</span>
    <h1>{appConfig.shortName}</h1>
    <p>Votre espace de gestion est prêt à accueillir de vraies données.</p>
    <div className="card">
      <h2>Vos données</h2>
      <p>Aucune boutique Jumia n’est connectée. Les ventes, commandes et finances sont indisponibles — pas à zéro.</p>
      <span className="tag soon">Connexion Jumia · Phase 2</span>
    </div>
    <p><Link href="/espace/sessions">Consulter mes sessions actives</Link></p>
    <LogoutButton />
  </main>;
}
