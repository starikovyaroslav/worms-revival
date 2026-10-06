import { describe, expect, it } from 'vitest';
import '../src/weapons/defs';
import { Mine } from '../src/weapons/mine';
import { Worm } from '../src/worm/worm';
import { World } from '../src/world/world';
import { flatTerrain, makeGame, stepUntil } from './helpers';

const WEAPONS = Object.fromEntries(
  ['dynamite', 'mine', 'airstrike'].map((id) => [id, { ammo: -1, power: 3, delay: 0, crate: 0 }]),
);

function ready() {
  const g = makeGame({ weapons: WEAPONS, wind: 0 });
  stepUntil(g, () => g.worms.every((w) => w.grounded));
  return g;
}

describe('placed weapons and strikes', () => {
  it('dynamite blows up after 5 seconds with a big crater', () => {
    const g = ready();
    const me = g.activeWorm!;
    g.step([{ t: 'select', weapon: 'dynamite' }]);
    g.step([{ t: 'fire', down: true }]);
    // Walk away during retreat.
    g.step([{ t: 'move', left: me.facing > 0, right: me.facing < 0, up: false, down: false }]);
    const stick = g.world.ofKind('projectile')[0]!;
    const ticks = stepUntil(g, () => stick.removed);
    expect(ticks).toBeGreaterThan(240);
    expect(ticks).toBeLessThan(260);
  });

  it('armed mines trigger when a worm comes close and explode after their fuse', () => {
    const w = new World({ seed: 1, terrain: flatTerrain(), waterLevel: 390 });
    const mine = w.spawn(new Mine(200, 196, { armTicks: 0, fuseTicks: 50, dudsAllowed: false }));
    const worm = w.spawn(new Worm(260, 199, 'A', 0, 100));
    for (let i = 0; i < 20; i++) w.step();
    expect(mine.triggered).toBe(false);
    worm.x = 215;
    w.step();
    expect(mine.triggered).toBe(true);
    for (let i = 0; i < 52; i++) w.step();
    expect(mine.removed).toBe(true);
    expect(worm.health).toBeLessThan(100);
  });

  it('air strike drops five missiles around the target', () => {
    const g = ready();
    g.step([
      { t: 'select', weapon: 'airstrike' },
      { t: 'target', x: 500, y: 199 },
    ]);
    g.step([{ t: 'fire', down: true }]);
    const missiles = g.world.ofKind('projectile');
    expect(missiles.length).toBe(5);
    const hits: number[] = [];
    stepUntil(g, () => {
      for (const ev of g.world.events) if (ev.type === 'explosion') hits.push(ev.x);
      return g.world.ofKind('projectile').length === 0;
    });
    const mid = hits.sort((a, b) => a - b)[2]!;
    expect(Math.abs(mid - 500)).toBeLessThan(40);
  });

  it('air strike is not available in caverns', () => {
    const g = ready();
    (g as unknown as { cavern: boolean }).cavern = true;
    expect(g.canUse('airstrike')).toBe(false);
  });
});
