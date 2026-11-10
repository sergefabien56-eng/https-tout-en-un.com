import { describe, expect, it } from 'vitest';
import { createLogger } from '@/core/logger/logger';

function capture() {
  const lines: string[] = [];
  const logger = createLogger({
    level: 'debug',
    sink: (line) => lines.push(line),
    now: () => new Date('2026-11-10T12:00:00.000Z'),
  });
  return { lines, logger };
}

const JWT =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0MiJ9.c2lnbmF0dXJlLXRyZXMtZmFrZS1tYWlzLWNvbmZvcm1l';

describe('journalisation — non-divulgation des secrets (R4)', () => {
  it('rédige les clés sensibles, y compris imbriquées', () => {
    const { lines, logger } = capture();
    logger.info('renouvellement du jeton', {
      shopId: 12,
      clientId: 'visible-client-id',
      credentials: { accessToken: 'abc', refresh_token: 'def', clientId: 'interne' },
      Authorization: 'Bearer xyz',
    });
    const parsed = JSON.parse(lines[0] ?? '{}') as Record<string, unknown>;
    expect(JSON.stringify(parsed)).not.toContain('def');
    expect(JSON.stringify(parsed)).not.toContain('abc');
    expect(JSON.stringify(parsed)).not.toContain('Bearer xyz');
    expect(parsed['Authorization']).toBe('[redacted]');
    // un objet entier sous une clé sensible est rédigé en bloc (choix le plus sûr)
    expect(parsed['credentials']).toBe('[redacted]');
    // client_id n'est pas un secret
    expect(parsed['clientId']).toBe('visible-client-id');
  });

  it('rédige une chaîne qui ressemble à un JWT même sous une clé anodine', () => {
    const { lines, logger } = capture();
    logger.error('échec', { sample: JWT });
    expect(lines[0]).not.toContain(JWT);
    expect(lines[0]).toContain('[redacted]');
  });

  it('sérialise une erreur sans exposer de secret dans la pile', () => {
    const { lines, logger } = capture();
    logger.error('échec de synchronisation', { error: new Error('token=super-secret'), shopId: 3 });
    expect(lines[0]).not.toContain('super-secret');
    expect(lines[0]).toContain('échec de synchronisation');
  });

  it('respecte le niveau de journalisation et le contexte enfant', () => {
    const { lines, logger } = capture();
    const child = logger.child({ requestId: 'req_1', shopId: 7 });
    child.debug('détail');
    logger.info('sans contexte');
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({ level: 'debug', requestId: 'req_1', shopId: 7 });
    expect(JSON.parse(lines[1] ?? '{}')).not.toHaveProperty('shopId');
  });

  it('ne lève jamais d’exception, même sur un objet circulaire', () => {
    const { lines, logger } = capture();
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    expect(() => logger.info('objet circulaire', { circular })).not.toThrow();
    expect(lines).toHaveLength(1);
  });
});
