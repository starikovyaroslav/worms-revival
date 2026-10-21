import './defs';
import { legacyRules } from './legacy';
import type { Look, LookSpec, WeaponSpec } from './spec';
import type { WeaponDef, WeaponRules } from './weapon';

/** Compiles the `sim` section of a spec into the flags and `fire` the game runs. */
function compile(spec: WeaponSpec): WeaponRules {
  switch (spec.sim.archetype) {
    case 'legacy': {
      const rules = legacyRules(spec.id);
      if (!rules) throw new Error(`weapon ${spec.id}: no legacy code registered`);
      return rules;
    }
    case 'inline':
      return spec.sim;
  }
}

/**
 * The weapons of a match: built once from specs (data) and handed to `Game` through its setup, so
 * different rule sets can live side by side (tests, mods, future game modes). Panel order is the
 * order of `specs`.
 */
export class Ruleset {
  /** All weapons in panel order. */
  readonly weapons: readonly WeaponDef[];
  private readonly byId = new Map<string, WeaponDef>();

  constructor(
    specs: readonly WeaponSpec[],
    /** Light and trail of each projectile look (presentation). */
    readonly looks: Readonly<Partial<Record<Look, LookSpec>>> = {},
  ) {
    const defs: WeaponDef[] = [];
    for (const spec of specs) {
      if (this.byId.has(spec.id)) throw new Error(`duplicate weapon id ${spec.id}`);
      const def: WeaponDef = { ...compile(spec), id: spec.id, spec };
      this.byId.set(spec.id, def);
      defs.push(def);
    }
    this.weapons = defs;
  }

  get(id: string): WeaponDef | undefined {
    return this.byId.get(id);
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }
}
