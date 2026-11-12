import { describe, expect, it } from 'vitest';
import { parseManagedStatus } from '@/modules/identity/change-user-status';

describe('changement de statut administratif', () => {
  it('n’autorise que actif ou suspendu, jamais une invitation implicite', () => {
    expect(parseManagedStatus('active')).toBe('active');
    expect(parseManagedStatus('suspended')).toBe('suspended');
    for (const bad of ['invited', 'ACTIVE', 'active;DELETE', '', null, 0, {}]) {
      expect(() => parseManagedStatus(bad)).toThrow('Statut invalide.');
    }
  });
});
