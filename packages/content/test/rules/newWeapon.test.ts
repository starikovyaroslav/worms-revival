import { describe, expect, it } from 'vitest';
import { Game, Ruleset, type Projectile, type WeaponSpec } from '@wr/sim';
import { LOOKS, WEAPONS } from '../../src/weapons';
import { flatTerrain, stepUntil, testScheme } from './helpers';

/** A weapon that exists only as a data entry: the proof that adding one needs no sim code. */
const PROBE: WeaponSpec = {
  id: 'probe',
  sim: {
    archetype: 'launcher',
    aim: 'angle',
    charge: true,
    speed: 10,
    projectile: {
      look: 'missile',
      radius: 2,
      wind: 0,
      impact: 'explode',
      blast: { damage: 40 },
    },
  },
  ui: { name: 'Проба', hint: 'Проверка реестра.', icon: '🧪', row: 12, col: 4 },
  ai: { usable: false },
  view: { look: 'missile', sound: 'launch' },
  listing: 'unlisted',
};

describe('a weapon added as data', () => {
  it('can be selected and fired in a game built from the extended ruleset', () => {
    const rules = new Ruleset([...WEAPONS, PROBE], LOOKS);
    const g = new Game({
      seed: 1,
      scheme: testScheme({
        weapons: { probe: { ammo: -1, power: 3, delay: 0, crate: 0 } },
        wind: 0,
      }),
      rules,
      teams: [
        { name: 'Red', worms: ['R1'] },
        { name: 'Blue', worms: ['B1'] },
      ],
      terrain: flatTerrain(),
      waterLevel: 390,
      spawns: [
        { x: 100, y: 199 },
        { x: 600, y: 199 },
      ],
    });
    stepUntil(g, () => g.worms.every((w) => w.grounded));
    g.step([{ t: 'select', weapon: 'probe' }]);
    g.step([{ t: 'fire', down: true }]);
    for (let i = 0; i < 20; i++) g.step();
    g.step([{ t: 'fire', down: false }]);
    const shell = g.world.ofKind<Projectile>('projectile')[0]!;
    expect(shell.look).toBe('missile');
    expect(shell.spec.blast.damage).toBe(40);
    expect(shell.vx !== 0 || shell.vy !== 0).toBe(true);
    expect(rules.get('probe')?.spec.ui.name).toBe('Проба');
  });

  it('rejects a second weapon with the same id', () => {
    expect(() => new Ruleset([PROBE, PROBE])).toThrow(/duplicate weapon id/);
  });
});
