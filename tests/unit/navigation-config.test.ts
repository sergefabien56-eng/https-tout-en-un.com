import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { navigation, visibleNavigation } from '@/ui/navigation.config';

describe('configuration unique de navigation', () => {
  it('contient exactement 8 sections et 44 entrées sans doublon', () => {
    expect(navigation).toHaveLength(8);
    const leaves = navigation.flatMap((group) => group.children);
    expect(leaves).toHaveLength(44);
    expect(new Set(leaves.map((l) => l.id)).size).toBe(44);
    expect(new Set(leaves.map((l) => l.href)).size).toBe(44);
  });
  it('chaque lien prêt pointe vers une vraie page ; tout lien absent est désactivé', () => {
    for (const leaf of navigation.flatMap((group) => group.children)) {
      expect(leaf.permission, leaf.id).toMatch(/^[a-z]+:[a-z:]+$/);
      if (leaf.availability === 'ready') {
        expect(existsSync(join(process.cwd(), 'src/app', leaf.href, 'page.tsx')), leaf.id).toBe(true);
      }
    }
    expect(navigation.flatMap((g) => g.children).filter((l) => l.availability === 'ready').map((l) => l.href))
      .toEqual(['/espace']);
  });
  it('aucun accès non autorisé ne reste visible, même comme « bientôt »', () => {
    expect(visibleNavigation(new Set())).toEqual([]);
    const onlyDashboard = visibleNavigation(new Set(['dashboard:read']));
    expect(onlyDashboard.map((g) => g.id)).toEqual(['dashboard', 'automation']);
    expect(onlyDashboard.flatMap((g) => g.children).some((c) => c.permission !== 'dashboard:read')).toBe(false);
    expect(visibleNavigation(new Set(['system:manage'])).flatMap((g) => g.children)
      .every((c) => c.permission === 'system:manage')).toBe(true);
  });
});
