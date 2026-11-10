import Link from 'next/link';
import { cookies } from 'next/headers';
import { listOwnShops } from '@/modules/identity/shop-catalog';
import { appConfig } from '@/core/config/app.config';
import { LogoutButton } from './logout-button';

/** Aucune donnée Jumia n'existe encore : pas de KPI inventé. */
export default async function PrivateSpace() {
  const { shops } = await listOwnShops((await cookies()).get('toutenun_session')?.value);
  return <main className="workspace-main">
    <span className="tag">Espace privé</span>
    <h1>{appConfig.shortName}</h1>
    <p>Votre espace de gestion est prêt à accueillir de vraies données.</p>
    <div className="card">
      <h2>Vos données</h2>
      <p>{shops.length === 0 ? 'Aucune boutique accessible à ce compte.' : 'Des boutiques sont accessibles à ce compte.'} Les ventes, commandes et finances restent indisponibles — pas à zéro.</p>
      <span className="tag soon">Connexion Jumia · Phase 2</span>
    </div>
    <p><Link href="/espace/sessions">Consulter mes sessions actives</Link></p>
    <LogoutButton />
  </main>;
}
