import { describe, expect, it } from 'vitest';
import {
  MoneyError,
  allocate,
  format,
  fromApiAmount,
  money,
  sum,
  type CurrencyCode,
} from '@/core/money/money';

describe('fromApiAmount — conversion depuis les nombres JSON de l’API (F-01, F-02)', () => {
  it('arrondit half-up sans artefact binaire : 0.145 USD → 15 cents', () => {
    expect(fromApiAmount(0.145, 'USD').minor).toBe(15n);
  });

  it('arrondit half-up sur une devise sans sous-unité : 1234.565 XOF → 1235', () => {
    expect(fromApiAmount(1234.565, 'XOF').minor).toBe(1235n);
  });

  it('gère une devise à trois décimales (TND, millimes)', () => {
    expect(fromApiAmount('12.3456', 'TND').minor).toBe(12346n);
    expect(fromApiAmount('12.3444', 'TND').minor).toBe(12344n);
  });

  it('gère les montants négatifs et les notations exponentielles', () => {
    expect(fromApiAmount(-12.5, 'EUR').minor).toBe(-1250n);
    expect(fromApiAmount(1e-7, 'USD').minor).toBe(0n);
    expect(fromApiAmount(1.5e3, 'XOF').minor).toBe(1500n);
  });

  it('refuse une devise inconnue au lieu de deviner', () => {
    expect(() => fromApiAmount(10, 'BRL')).toThrow(MoneyError);
  });

  it('rejette un montant illisible', () => {
    expect(() => fromApiAmount('12,50', 'EUR')).toThrow(MoneyError);
  });

  it('ne perd jamais l’unité mineure sur 10 000 valeurs aléatoires de la forme x.yz', () => {
    let seed = 42;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let i = 0; i < 10_000; i += 1) {
      const value = Math.round(next() * 10_000_000) / 100;
      const { minor } = fromApiAmount(value, 'USD');
      expect(minor - BigInt(Math.round(value * 100))).toBeLessThanOrEqual(1n);
      expect(BigInt(Math.round(value * 100)) - minor).toBeLessThanOrEqual(1n);
    }
  });
});

describe('opérations typées', () => {
  it('additionne deux montants de même devise', () => {
    expect(sum([money(1000n, 'XOF'), money(2500n, 'XOF')], 'XOF').minor).toBe(3500n);
  });

  it('refuse d’additionner deux devises différentes (R3)', () => {
    expect(() => sum([money(1000n, 'XOF'), money(1000n, 'NGN')], 'XOF')).toThrow(
      /sans taux de conversion explicite/,
    );
  });
});

describe('allocate — répartition au plus fort reste (F-03, F-04, F-17)', () => {
  it('répartit 100 sur 3 lignes de poids égaux : [34, 33, 33]', () => {
    const parts = allocate(money(100n, 'XOF'), [1n, 1n, 1n]).map((p) => p.minor);
    expect(parts).toEqual([34n, 33n, 33n]);
    expect(parts.reduce((a, b) => a + b, 0n)).toBe(100n);
  });

  it('répartit 7 sur 5 lignes : somme exacte, ordre reproductible', () => {
    const parts = allocate(money(7n, 'XOF'), [1n, 1n, 1n, 1n, 1n]).map((p) => p.minor);
    expect(parts).toEqual([2n, 2n, 1n, 1n, 1n]);
    expect(parts.reduce((a, b) => a + b, 0n)).toBe(7n);
  });

  it('respecte des poids inégaux et conserve le total', () => {
    const parts = allocate(money(1000n, 'XOF'), [5n, 3n, 2n]).map((p) => p.minor);
    expect(parts).toEqual([500n, 300n, 200n]);
  });

  it('gère un total négatif sans changer la répartition', () => {
    const parts = allocate(money(-100n, 'XOF'), [1n, 1n, 1n]).map((p) => p.minor);
    expect(parts.reduce((a, b) => a + b, 0n)).toBe(-100n);
  });

  it('propriété : la somme des parts égale toujours le total (10 000 tirages)', () => {
    let seed = 7;
    const rand = (max: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return Math.floor((seed / 2147483648) * max) + 1;
    };
    const currencies: CurrencyCode[] = ['XOF', 'NGN', 'TND', 'USD'];
    for (let i = 0; i < 10_000; i += 1) {
      const total = BigInt(rand(1_000_000));
      const lineCount = rand(12);
      const weights = Array.from({ length: lineCount }, () => BigInt(rand(50)));
      if (weights.every((w) => w === 0n)) continue;
      const currency = currencies[i % currencies.length] as CurrencyCode;
      const parts = allocate(money(total, currency), weights);
      expect(parts.reduce((a, part) => a + part.minor, 0n)).toBe(total);
      for (const part of parts) expect(part.currency).toBe(currency);
    }
  });

  it('refuse une allocation sans ligne ou à poids nuls', () => {
    expect(() => allocate(money(10n, 'XOF'), [])).toThrow(MoneyError);
    expect(() => allocate(money(10n, 'XOF'), [0n, 0n])).toThrow(MoneyError);
  });
});

describe('format — affichage français', () => {
  it('groupe les milliers avec une espace insécable et la devise', () => {
    expect(format(money(2_500_000n, 'XOF'))).toBe('2\u00A0500\u00A0000 XOF');
  });

  it('affiche deux décimales hors exposant zéro et une virgule décimale', () => {
    expect(format(money(1_245_050n, 'NGN'))).toBe('12\u00A0450,50 NGN');
  });

  it('affiche proprement les montants négatifs', () => {
    expect(format(money(-3200n, 'XOF'))).toBe('-3\u00A0200 XOF');
  });
});
