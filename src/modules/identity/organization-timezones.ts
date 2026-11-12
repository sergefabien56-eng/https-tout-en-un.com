/** Liste fermée partageable entre validation serveur et formulaire. */
export const TIMEZONES = ['Africa/Abidjan', 'UTC', 'Europe/Paris'] as const;
export type OrganizationTimezone = (typeof TIMEZONES)[number];
