/**
 * Collecteur d'incidents minimal : écrit dans `system_events`, il ne fabrique rien d'autre.
 *
 * Règles non négociables :
 *   - aucune donnée personnelle : ni adresse, ni jeton, ni corps de requête, ni en-tête ;
 *   - aucune trace d'exception brute en base (une trace contient souvent des valeurs métier) ;
 *   - le message est rédigé par l'application, pas recopié de l'erreur reçue ;
 *   - l'écriture est silencieuse en cas d'échec : un incident non journalisé ne casse pas
 *     la requête qui l'a produit, et ne masque pas l'erreur d'origine.
 *
 * Écriture : la policy 0007 exige un contexte boutique, or un incident système survient
 * justement quand ce contexte n'existe pas (panne de base, export qui casse, erreur de route
 * avant toute identification). La migration **0019** accorde donc au seul rôle applicatif
 * l'INSERTION d'un incident global, et uniquement si son code appartient au catalogue ci-dessous,
 * sa sévérité et sa catégorie sont connues, et l'incident n'est pas créé déjà acquitté.
 * Rien d'autre n'est accordé : ni lecture, ni modification, ni suppression.
 */
import { withIdentityTransaction } from '@/core/db/client';
import { createLogger } from '@/core/logger/logger';

export type IncidentCategory = 'export' | 'database' | 'authentification' | 'route' | 'application';

/** Incidents connus : un code par situation, jamais un message libre venu de l'extérieur. */
export const INCIDENT_CODES = {
  export_failure: { severity: 'warning', category: 'export', message: 'Un export a échoué côté serveur.' },
  database_failure: { severity: 'critical', category: 'database', message: 'Une opération de base de données a échoué.' },
  route_failure: { severity: 'warning', category: 'route', message: 'Une route API a répondu en erreur serveur.' },
  application_failure: { severity: 'critical', category: 'application',
    message: 'Une erreur applicative non prévue a été interceptée.' },
} as const satisfies Record<string, { severity: 'warning' | 'critical'; category: IncidentCategory; message: string }>;

export type IncidentCode = keyof typeof INCIDENT_CODES;

/**
 * Enregistre un incident. Le `code` doit appartenir au catalogue ci-dessus : un appelant ne
 * peut donc pas écrire un message arbitraire dans le journal système.
 */
const journal = createLogger();

export async function recordIncident(code: IncidentCode): Promise<void> {
  const spec = INCIDENT_CODES[code];
  try {
    await withIdentityTransaction(async (db) => {
      await db.query(`INSERT INTO system_events (severity, category, code, message, shop_id)
        VALUES ($1, $2, $3, $4, NULL)`, [spec.severity, spec.category, code, spec.message]);
    });
    // Depuis la policy 0019, cette insertion passe avec le rôle applicatif : le code, la
    // sévérité et la catégorie sont vérifiés par la base elle-même, pas seulement ici.
  } catch {
    // Jamais de propagation : le journal système ne doit pas devenir une panne.
    journal.warn('incident non enregistré', { code });
  }
}

/** Compteur lisible pour l'écran Système : ce que le collecteur sait faire, et rien de plus. */
export const COLLECTOR_SCOPE = 'Collecteur d’incidents applicatifs : erreurs serveur des routes API et exports. '
  + 'Aucun message d’erreur client, aucun suivi navigateur, aucune remontée d’identité. '
  + 'Quatre codes seulement sont enregistrés (export, base de données, route, application) ; '
  + 'l’application peut ajouter un incident global, jamais le modifier ni l’effacer.';
