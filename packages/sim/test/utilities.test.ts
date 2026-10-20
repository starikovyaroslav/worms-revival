import { describe, expect, it } from 'vitest';
import '../src/weapons/defs';
import type { Game } from '../src/game/game';
import { makeGame, stepUntil } from './helpers';

const IDS = ['doubledamage', 'lowgravity', 'fastwalk', 'laser', 'invisible', 'cratespy'];
const WEAPONS = Object.fromEntries(
  IDS.map((id) => [id, { ammo: 3, power: 3, delay: 0, crate: 0 }]),
);

function ready(): Game {
  const g = makeGame({ weapons: WEAPONS, wind: 0, turnTime: 60 });
  stepUntil(g, () => g.worms.every((w) => w.grounded) && g.phase === 'turn');
  return g;
}

const ammo = (g: Game, id: string) => g.teams[g.activeTeam]!.ammo[id];

/** Select + fire; returns whether the utility actually went off. */
function use(g: Game, id: string): boolean {
  const before = ammo(g, id);
  g.step([{ t: 'select', weapon: id }]);
  g.step([{ t: 'fire', down: true }]);
  g.step([{ t: 'fire', down: false }]);
  return ammo(g, id) !== before;
}

describe('per-turn utilities', () => {
  it('Double Damage does not stack and is charged once', () => {
    const g = ready();
    expect(use(g, 'doubledamage')).toBe(true);
    expect(g.world.physics.damageScale).toBe(2);
    expect(use(g, 'doubledamage')).toBe(false);
    expect(use(g, 'doubledamage')).toBe(false);
    expect(g.world.physics.damageScale).toBe(2);
    expect(ammo(g, 'doubledamage')).toBe(2);
    expect(g.phase).toBe('turn'); // utilities never use the turn up
  });

  it('Double Damage doubles the match scale, not the current one', () => {
    // The base is taken when the game starts: emulate a match with that scale from the start.
    const h = makeGame({ weapons: WEAPONS, wind: 0, turnTime: 60 });
    h.world.physics.damageScale = 1.5;
    (h as unknown as { baseDamageScale: number }).baseDamageScale = 1.5;
    stepUntil(h, () => h.phase === 'turn');
    use(h, 'doubledamage');
    use(h, 'doubledamage');
    expect(h.world.physics.damageScale).toBe(3);
  });

  it('every utility is usable once per turn and charged once', () => {
    for (const id of IDS) {
      const g = ready();
      expect(use(g, id), id).toBe(true);
      expect(use(g, id), id).toBe(false);
      expect(ammo(g, id), id).toBe(2);
    }
  });

  it('is available again on the next turn of the team and the scale resets', () => {
    const g = ready();
    const team = g.activeTeam;
    use(g, 'doubledamage');
    g.step([{ t: 'skip' }]);
    stepUntil(g, () => g.phase === 'turn' && g.activeTeam !== team, 5000);
    expect(g.world.physics.damageScale).toBe(1);
    g.step([{ t: 'skip' }]);
    stepUntil(g, () => g.phase === 'turn' && g.activeTeam === team, 5000);
    expect(use(g, 'doubledamage')).toBe(true);
    expect(ammo(g, 'doubledamage')).toBe(1);
    expect(g.world.physics.damageScale).toBe(2);
  });
});
