/**
 * Configuration unique de l'application.
 * Le nom officiel est défini ICI et nulle part ailleurs (un test le vérifie).
 */
export const APP_NAME = 'TOUT EN UN BUSINESS MANAGER' as const;
export const APP_SHORT_NAME = 'TOUT EN UN' as const;
export const APP_VERSION = '0.1.0' as const;

/**
 * Couleurs de marque — définies ici et nulle part ailleurs, puis exposées en variables CSS.
 * Un composant qui écrit un code hexadécimal échoue au lint (règle no-restricted-syntax).
 */
export const BRAND_COLORS = {
  navy: '#101C39',
  blue: '#1765F5',
  orange: '#F57C1F',
  green: '#12855B',
  red: '#C4342B',
} as const;

export type Environment = 'development' | 'staging' | 'production';

export interface AppConfig {
  readonly name: string;
  readonly shortName: string;
  readonly version: string;
  readonly environment: Environment;
  readonly timezone: string;
  readonly referenceCurrency: 'XOF';
  readonly densityDefault: 'confort' | 'compact';
  readonly sidebarDefault: 'complete' | 'rail';
  /** Paliers de largeur validés en Phase 0 (cible principale : portables 1366 px). */
  readonly breakpoints: {
    readonly railForcedBelow: number;
    readonly drawerPanelBelow: number;
    readonly maxContentWidth: number;
  };
}

function readEnvironment(): Environment {
  const raw = process.env.APP_ENV ?? 'development';
  if (raw === 'development' || raw === 'staging' || raw === 'production') return raw;
  throw new Error(`APP_ENV invalide : "${raw}" (attendu development | staging | production)`);
}

export const appConfig: AppConfig = {
  name: APP_NAME,
  shortName: APP_SHORT_NAME,
  version: APP_VERSION,
  environment: readEnvironment(),
  timezone: process.env.DEFAULT_TIMEZONE ?? 'Africa/Abidjan',
  referenceCurrency: 'XOF',
  // Décisions de la Phase 0, appliquées par défaut et modifiables ici uniquement.
  densityDefault: 'confort',
  sidebarDefault: 'complete',
  breakpoints: {
    railForcedBelow: 1280,
    drawerPanelBelow: 1440,
    maxContentWidth: 1600,
  },
};

export const isProduction = (): boolean => appConfig.environment === 'production';
