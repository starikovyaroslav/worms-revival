import './defs';
import { fireBurst, fireHitscan } from './archetypes/guns';
import { BEHAVIOURS } from './behaviours';
import type { Behaviour } from './behaviours/types';
import { fireLauncher } from './archetypes/launcher';
import { fireMelee } from './archetypes/melee';
import { legacyRules } from './legacy';
import type { Look, LookSpec, SimFlags, WeaponSpec } from './spec';
import type { WeaponDef, WeaponRules } from './weapon';

const FLAG_KEYS = [
  'aim',
  'charge',
  'fuse',
  'bounce',
  'shots',
  'retreat',
  'endsTurn',
  'needsSky',
  'airborne',
  'airborneOnly',
  'needsTarget',
  'oncePerTurn',
  'action',
] as const satisfies readonly (keyof SimFlags)[];

/** Only the flags that are set: the ruleset hash tells a missing flag from an undefined one. */
function flagsOf(sim: SimFlags): SimFlags {
  const out: Record<string, unknown> = {};
  for (const k of FLAG_KEYS) if (sim[k] !== undefined) out[k] = sim[k];
  return out as unknown as SimFlags;
}

/** Compiles the `sim` section of a spec into the flags and `fire` the game runs. */
function compile(spec: WeaponSpec): WeaponRules {
  const sim = spec.sim;
  switch (sim.archetype) {
    case 'legacy': {
      const rules = legacyRules(spec.id);
      if (!rules) throw new Error(`weapon ${spec.id}: no legacy code registered`);
      return rules;
    }
    case 'inline':
      return sim;
    case 'burst':
      return { ...flagsOf(sim), fire: (ctx) => fireBurst(ctx, sim, spec.view) };
    case 'hitscan':
      return { ...flagsOf(sim), fire: (ctx) => fireHitscan(ctx, sim, spec.view) };
    case 'custom': {
      const b = BEHAVIOURS[sim.behaviour] as Behaviour<unknown>;
      const rules: WeaponRules = {
        ...flagsOf(sim),
        fire: (ctx) => b.fire(ctx, sim.params, spec.view),
      };
      const check = b.validTarget;
      if (check)
        rules.validTarget = (world, worm, target, dirX, dirY) =>
          check(world, worm, target, dirX, dirY, sim.params);
      return rules;
    }
    case 'melee':
      return { ...flagsOf(sim), fire: (ctx) => fireMelee(ctx, sim, spec.view) };
    case 'launcher':
      return { ...flagsOf(sim), fire: (ctx) => fireLauncher(ctx, sim, spec.view) };
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
