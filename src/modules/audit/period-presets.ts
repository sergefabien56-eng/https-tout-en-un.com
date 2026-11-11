/** Journées UTC entières, aujourd'hui inclus : même convention que auditQueryParams. */
export function auditPeriodPreset(days: 7 | 30, now: Date = new Date()): { from: string; to: string } {
  if (Number.isNaN(now.getTime())) throw new RangeError('Date invalide.');
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { from: start.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
}
