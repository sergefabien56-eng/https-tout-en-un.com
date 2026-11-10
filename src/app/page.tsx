import { appConfig } from '@/core/config/app.config';

/**
 * Page de démarrage du socle (lot L1). Elle sera remplacée par la coquille de navigation (L8).
 * Elle ne présente AUCUNE donnée métier : il n'existe encore ni boutique connectée ni commande.
 */
export default function BootstrapPage() {
  return (
    <main>
      <span className="tag">Phase 1 · socle technique</span>
      <h1>{appConfig.name}</h1>
      <p>
        Version {appConfig.version} · environnement <code>{appConfig.environment}</code> · fuseau{' '}
        <code>{appConfig.timezone}</code> · devise de référence <code>{appConfig.referenceCurrency}</code>
      </p>

      <h2>Ce qui fonctionne aujourd’hui</h2>
      <div className="card">
        <ul>
          <li>
            <span className="tag ok">Prêt</span> Migrations versionnées et réversibles (6 migrations, RLS comprise)
          </li>
          <li>
            <span className="tag ok">Prêt</span> Module argent : unités mineures, conversion depuis l’API, allocation au plus fort reste
          </li>
          <li>
            <span className="tag ok">Prêt</span> Chiffrement des secrets (AES-256-GCM, ring de clés, données associées)
          </li>
          <li>
            <span className="tag ok">Prêt</span> Périmètre de boutiques (isolation serveur) et journalisation avec rédaction des secrets
          </li>
          <li>
            <span className="tag ok">Prêt</span> Endpoint de santé <a href="/api/health">/api/health</a>
          </li>
        </ul>
      </div>

      <h2>Ce qui n’existe pas encore</h2>
      <div className="card">
        <ul>
          <li>
            <span className="tag soon">Bientôt</span> Connexion à Jumia, produits, commandes, stocks, finances : <strong>rien n’est simulé</strong>
          </li>
          <li>
            <span className="tag soon">Bientôt</span> Interface de navigation, authentification, rôles (lots L5 à L8)
          </li>
        </ul>
        <p className="muted" style={{ marginTop: 12 }}>
          Aucun indicateur n’est affiché sur cette page : sans boutique connectée, un chiffre serait une invention.
        </p>
      </div>
    </main>
  );
}
