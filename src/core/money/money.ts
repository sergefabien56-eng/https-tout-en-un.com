/**
 * Argent : entiers en unités mineures + code devise. Jamais de flottant stocké.
 * Référence : docs/formules-financieres.md §2.
 */

export type CurrencyCode =
  | 'XOF' | 'XAF' | 'UGX'      // exposant 0
  | 'NGN' | 'KES' | 'GHS' | 'ZAR' | 'MAD' | 'DZD' | 'EGP' | 'USD' | 'EUR' // exposant 2
  | 'TND';                      // exposant 3 (millimes)

export const CURRENCY_EXPONENT: Readonly<Record<CurrencyCode, number>> = {
  XOF: 0, XAF: 0, UGX: 0,
  NGN: 2, KES: 2, GHS: 2, ZAR: 2, MAD: 2, DZD: 2, EGP: 2, USD: 2, EUR: 2,
  TND: 3,
};

export interface Money {
  readonly minor: bigint;
  readonly currency: CurrencyCode;
}

export class MoneyError extends Error {
  readonly code: 'UNKNOWN_CURRENCY' | 'CURRENCY_MISMATCH' | 'INVALID_AMOUNT' | 'INVALID_ALLOCATION';
  constructor(code: MoneyError['code'], message: string) {
    super(message);
    this.name = 'MoneyError';
    this.code = code;
  }
}

export function assertCurrency(code: string): CurrencyCode {
  if (!Object.hasOwn(CURRENCY_EXPONENT, code)) {
    throw new MoneyError('UNKNOWN_CURRENCY', `Devise non prise en charge : "${code}"`);
  }
  return code as CurrencyCode;
}

export const exponentOf = (currency: CurrencyCode): number => CURRENCY_EXPONENT[currency];

/** Développe une notation exponentielle ("1e-7", "1.5E+3") en notation décimale. */
function expandExponential(input: string): string {
  const match = /^([+-]?)(\d*)(?:\.(\d*))?[eE]([+-]?\d+)$/.exec(input);
  if (!match) return input;
  const sign = match[1] === '-' ? '-' : '';
  const intPart = match[2] ?? '';
  const fracPart = match[3] ?? '';
  const exponent = Number(match[4]);
  const digits = intPart + fracPart;
  const point = intPart.length + exponent;
  let body: string;
  if (point <= 0) body = `0.${'0'.repeat(-point)}${digits}`;
  else if (point >= digits.length) body = digits + '0'.repeat(point - digits.length);
  else body = `${digits.slice(0, point)}.${digits.slice(point)}`;
  return sign + body;
}

/**
 * Convertit un montant renvoyé par l'API Jumia (nombre JSON) en unités mineures.
 * Arrondi « half-up » sur la valeur absolue, calculé sur la représentation décimale
 * (pas sur le flottant) pour éviter les artefacts binaires : 0.145 → 15 cents.
 */
export function fromApiAmount(value: number | string, currency: string): Money {
  const code = assertCurrency(currency);
  const exponent = CURRENCY_EXPONENT[code];
  const raw = typeof value === 'number' ? String(value) : value.trim();
  const expanded = expandExponential(raw);
  const match = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(expanded);
  if (!match) throw new MoneyError('INVALID_AMOUNT', `Montant illisible : "${String(value)}"`);
  const negative = match[1] === '-';
  const intPart = match[2] === '' ? '0' : match[2] ?? '0';
  const fracPart = match[3] ?? '';

  let scaled: bigint;
  if (fracPart.length <= exponent) {
    scaled = BigInt(intPart + fracPart.padEnd(exponent, '0'));
  } else {
    const kept = fracPart.slice(0, exponent).padEnd(exponent, '0');
    const dropped = fracPart.slice(exponent);
    scaled = BigInt(intPart + kept);
    const firstDropped = dropped.charCodeAt(0) - 48;
    if (firstDropped >= 5) scaled += 1n; // half-up
  }
  return { minor: negative ? -scaled : scaled, currency: code };
}

export function money(minor: bigint, currency: string): Money {
  return { minor, currency: assertCurrency(currency) };
}

export const zero = (currency: CurrencyCode): Money => ({ minor: 0n, currency });

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { minor: a.minor + b.minor, currency: a.currency };
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { minor: a.minor - b.minor, currency: a.currency };
}

export function negate(a: Money): Money {
  return { minor: -a.minor, currency: a.currency };
}

export function sum(amounts: readonly Money[], currency: CurrencyCode): Money {
  return amounts.reduce<Money>((acc, item) => add(acc, item), zero(currency));
}

export function compare(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  if (a.minor < b.minor) return -1;
  if (a.minor > b.minor) return 1;
  return 0;
}

export function isZero(a: Money): boolean {
  return a.minor === 0n;
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new MoneyError(
      'CURRENCY_MISMATCH',
      `Opération interdite entre ${a.currency} et ${b.currency} sans taux de conversion explicite.`,
    );
  }
}

/**
 * Répartit un montant total sur des lignes selon leurs poids (méthode du plus fort reste).
 * Invariant garanti : la somme des parts est égale au total, à l'unité mineure près.
 * Référence : docs/formules-financieres.md §2.2.
 */
export function allocate(total: Money, weights: readonly bigint[]): Money[] {
  if (weights.length === 0) {
    throw new MoneyError('INVALID_ALLOCATION', 'Allocation impossible : aucune ligne.');
  }
  if (weights.some((w) => w < 0n)) {
    throw new MoneyError('INVALID_ALLOCATION', 'Allocation impossible : un poids est négatif.');
  }
  const totalWeight = weights.reduce((a, b) => a + b, 0n);
  if (totalWeight === 0n) {
    throw new MoneyError('INVALID_ALLOCATION', 'Allocation impossible : somme des poids nulle.');
  }

  const sign = total.minor < 0n ? -1n : 1n;
  const abs = total.minor * sign;

  const floors: bigint[] = [];
  const remainders: bigint[] = [];
  weights.forEach((weight, index) => {
    const exact = abs * weight;
    const floor = exact / totalWeight;
    floors[index] = floor;
    remainders[index] = exact - floor * totalWeight;
  });

  let left = abs - floors.reduce((a, b) => a + b, 0n);
  const order = remainderOrder(remainders);
  for (const index of order) {
    if (left === 0n) break;
    floors[index] = (floors[index] ?? 0n) + 1n;
    left -= 1n;
  }

  return floors.map((value) => ({ minor: value * sign, currency: total.currency }));
}

/** Tri décroissant des restes, à égalité par index croissant (résultat reproductible). */
function remainderOrder(remainders: readonly bigint[]): number[] {
  return remainders
    .map((remainder, index) => ({ remainder, index }))
    .sort((a, b) => (a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1))
    .map((entry) => entry.index);
}

const GROUP_SEPARATOR = '\u00A0'; // espace insécable
const DECIMAL_SEPARATOR = ',';

/** Formatage lisible : 25 000 XOF · 12 450,50 NGN · -3 200 XOF. */
export function format(amount: Money, options: { withCurrency?: boolean } = {}): string {
  const exponent = CURRENCY_EXPONENT[amount.currency];
  const negative = amount.minor < 0n;
  const abs = (negative ? -amount.minor : amount.minor).toString().padStart(exponent + 1, '0');
  const intPart = exponent === 0 ? abs : abs.slice(0, -exponent);
  const fracPart = exponent === 0 ? '' : abs.slice(-exponent);
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
  const body = fracPart === '' ? grouped : `${grouped}${DECIMAL_SEPARATOR}${fracPart}`;
  const withCurrency = options.withCurrency ?? true;
  return `${negative ? '-' : ''}${body}${withCurrency ? ` ${amount.currency}` : ''}`;
}

/** Passerelle vers le stockage : entier en unités mineures, jamais de flottant. */
export function toDatabase(amount: Money): { minor: bigint; currency: CurrencyCode } {
  return { minor: amount.minor, currency: amount.currency };
}
