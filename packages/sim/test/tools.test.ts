import { describe, expect, it } from 'vitest';
import '../src/weapons/defs';
import { Material } from '../src/terrain/terrain';
import { makeGame, stepUntil } from './helpers';

const WEAPONS = Object.fromEntries(
  ['girder', 'teleport', 'skipgo', 'surrender'].map((id) => [
    id,
    { ammo: -1, power: 3, delay: 0, crate: 0 },
  ]),
);

function ready() {
  const g = makeGame({ weapons: WEAPONS, wind: 0 });
  stepUntil(g, () => g.worms.every((w) => w.grounded));
  return g;
}

describe('tools', () => {
  it('girder places solid steel near the worm, but not too far away', () => {
    const g = ready();
    const me = g.activeWorm!;
    g.step([
      { t: 'select', weapon: 'girder' },
      { t: 'target', x: me.x + 2000, y: 120 },
    ]);
    g.step([{ t: 'fire', down: true }]);
    expect(g.phase).toBe('turn');
    const x = me.x + (me.x < 500 ? 80 : -80);
    g.step([{ t: 'target', x, y: 120 }]);
    g.step([{ t: 'fire', down: true }]);
    expect(g.world.terrain.get(x, 120)).toBe(Material.Girder);
    expect(g.phase).toBe('retreat');
  });

  it('teleport moves the worm to a free spot only', () => {
    const g = ready();
    const me = g.activeWorm!;
    g.step([
      { t: 'select', weapon: 'teleport' },
      { t: 'target', x: 500, y: 300 },
    ]);
    g.step([{ t: 'fire', down: true }]);
    expect(g.phase).toBe('turn');
    g.step([{ t: 'target', x: 500, y: 100 }]);
    g.step([{ t: 'fire', down: true }]);
    expect(Math.abs(me.x - 500)).toBeLessThan(2);
    stepUntil(g, () => me.grounded);
    expect(me.y).toBe(199);
  });

  it('skip go ends the turn and surrender removes the team', () => {
    const g = ready();
    const first = g.activeTeam;
    g.step([{ t: 'select', weapon: 'skipgo' }]);
    g.step([{ t: 'fire', down: true }]);
    stepUntil(g, () => g.activeTeam !== first);
    g.step([{ t: 'select', weapon: 'surrender' }]);
    g.step([{ t: 'fire', down: true }]);
    stepUntil(g, () => g.phase === 'gameover');
    expect(g.winner).toBe(first);
  });
});
