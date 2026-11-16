/** Choix confirmé pour l'organisation ; aucun taux ou conversion automatique. */
export const REFERENCE_CURRENCIES = ['XOF'] as const;
export type ReferenceCurrency = typeof REFERENCE_CURRENCIES[number];
