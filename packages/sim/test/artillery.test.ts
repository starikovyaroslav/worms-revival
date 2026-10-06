import { describe, expect, it } from 'vitest';
import '../src/weapons/defs';
import { Projectile } from '../src/weapons/projectile';
import { makeGame, stepUntil } from './helpers';
import type { Game } from '../src/game/game';

const ALL = {
  bazooka: { ammo: -1, power: 3, delay: 0, crate: 0 },
  grenade: { ammo: -1, power: 3, delay: 0, crate: 0 },
  cluster: { ammo: 3, power: 3, delay: 0, crate: 0 },
};

function ready(over = {}): Game {
  const g = makeGame({ weapons: ALL, wind: 0, ...over });
  stepUntil(g, () => g.worms.every((w) => w.grounded));
  return g;
}

/** Aims 45° up towards the enemy and fires with a given power (charge ticks). */
function fireAt45(g: Game, weapon: string, chargeTicks: number) {
  const me = g.activeWorm!;
  me.facing = 1;
  me.aim = Math.PI / 4;
  g.step([{ t: 'select', weapon }]);
  g.step([{ t: 'fire', down: true }]);
  for (let i = 0; i < chargeTicks; i++) g.step();
  g.step([{ t: 'fire', down: false }]);
}

describe('artillery', () => {
  it('bazooka flies further with more power and explodes on impact', () => {
    const range = (charge: number) => {
      const g = ready();
      fireAt45(g, 'bazooka', charge);
      let last = { x: 0, y: 0 };
      stepUntil(g, () => {
        const p = g.world.ofKind<Projectile>('projectile')[0];
        if (p) last = { x: p.x, y: p.y };
        return !p;
      });
      return last.x - g.worms[0]!.x;
    };
    expect(range(40)).toBeGreaterThan(range(15));
  });

  it('bazooka drifts with the wind, grenade does not', () => {
    const landing = (weapon: string, wind: number) => {
      const g = ready();
      g.world.wind = wind;
      fireAt45(g, weapon, 20);
      let x = 0;
      stepUntil(g, () => {
        const p = g.world.ofKind<Projectile>('projectile')[0];
        if (p) x = p.x;
        return !p || p.resting || (p.vy > 0 && p.y > 180);
      });
      return x;
    };
    expect(landing('bazooka', 1)).toBeGreaterThan(landing('bazooka', -1) + 20);
    expect(landing('grenade', 1)).toBeCloseTo(landing('grenade', -1), 5);
  });

  it('grenade explodes when the fuse runs out', () => {
    const g = ready();
    g.step([{ t: 'fuse', seconds: 2 }]);
    fireAt45(g, 'grenade', 10);
    const p = g.world.ofKind<Projectile>('projectile')[0]!;
    expect(p.fuseLeft).toBeLessThanOrEqual(100);
    const ticks = stepUntil(g, () => p.removed);
    expect(ticks).toBeLessThanOrEqual(100);
  });

  it('cluster bomb splits into bomblets and uses up ammo', () => {
    const g = ready();
    const team = g.teams[g.activeTeam]!;
    fireAt45(g, 'cluster', 10);
    expect(team.ammo.cluster).toBe(2);
    const main = g.world.ofKind<Projectile>('projectile')[0]!;
    stepUntil(g, () => main.removed);
    g.step();
    expect(g.world.ofKind<Projectile>('projectile').length).toBe(5);
  });
});
