import { appConfig } from '@/core/config/app.config';

/**
 * Accueil public du socle : aucun chiffre commercial ni donnée Jumia réelle.
 * La coquille authentifiée existe sous /espace, mais nécessite un compte autorisé.
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

      <p className="muted">Développement et tests uniquement : ce lien de prévisualisation n’est pas un hébergement pour une activité réelle.</p>
      <p><a href="/connexion">Connexion à l’espace (compte autorisé requis)</a></p>

      <h2>Ce qui est implémenté et testé</h2>
      <div className="card">
        <ul>
          <li>
            <span className="tag ok">Testé en CI</span> Migrations versionnées et réversibles, isolation RLS comprise
          </li>
          <li>
            <span className="tag ok">Testé en CI</span> Primitives monétaires : unités mineures et allocation au plus fort reste, sans calcul de bénéfice livré
          </li>
          <li>
            <span className="tag ok">Testé en CI</span> Chiffrement des secrets (AES-256-GCM, clés versionnées)
          </li>
          <li>
            <span className="tag ok">Testé en CI</span> Connexion 2FA, sessions, boutiques autorisées, notifications personnelles et journal avec isolation serveur
          </li>
          <li>
            <span className="tag">Technique</span> Route de santé <a href="/api/health">/api/health</a> : sa réponse dépend de la disponibilité de la base
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
            <span className="tag soon">Bientôt</span> Invitations depuis l’interface, e-mails SMTP vérifiés, hébergement HTTPS et sauvegardes de production restaurées
          </li>
        </ul>
        <p className="muted" style={{ marginTop: 12 }}>
          Aucun indicateur n’est affiché sur cette page : sans boutique connectée, un chiffre serait une invention.
        </p>
      </div>
    </main>
  );
}
