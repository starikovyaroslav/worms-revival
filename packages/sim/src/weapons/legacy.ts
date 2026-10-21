import type { WeaponRules } from './weapon';

/**
 * Transitional: weapons not yet migrated to a spec archetype still register their code here (a
 * spec with `archetype: 'legacy'` picks it up by id). Shrinks with every migrated group and goes
 * away with the last one.
 */
export type LegacyRules = WeaponRules & { id: string };

const legacy = new Map<string, LegacyRules>();

export function registerLegacy(def: LegacyRules): LegacyRules {
  legacy.set(def.id, def);
  return def;
}

export function legacyRules(id: string): LegacyRules | undefined {
  return legacy.get(id);
}
