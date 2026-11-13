/** Liste fermée des rôles boutique, sans rôle Propriétaire. */
export const SCOPED_ROLES = ['manager', 'stock_manager', 'accountant', 'assistant'] as const;
export type ScopedRole = (typeof SCOPED_ROLES)[number];
