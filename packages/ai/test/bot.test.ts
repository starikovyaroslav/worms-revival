import { describe, expect, it } from 'vitest';
import { Game, Material, Terrain, NO_UPGRADES, type Scheme, type Worm } from '@wr/sim';
import { Bot, type Plan } from '../src/bot';

function scheme(): Scheme {
  return {
    id: 't',
    name: 't',
    turnTime: 60,
    retreatTime: 3,
    hotSeatTime: 0,
    roundTime: 900,
    wormHealth: 100,
    wormsPerTeam: 1,
    fallDamage: true,
    wormSelect: false,
    artillery: false,
    suddenDeath: 'health1',
    waterRise: 0,
    wind: 0,
    mines: 0,
    mineFuse: 3,
    duds: false,
    barrels: 0,
    crateChance: 0,
    healthCrate: 25,
    weapons: {
      bazooka: { ammo: -1, power: 3, delay: 0, crate: 0 },
      grenade: { ammo: -1, power: 3, delay: 0, crate: 0 },
      skipgo: { ammo: -1, power: 3, delay: 0, crate: 0 },
    },
    upgrades: NO_UPGRADES,
  };
}

function game(): Game {
  const t = new Terrain(900, 400);
  for (let y = 250; y < 400; y++) for (let x = 0; x < 900; x++) t.set(x, y, Material.Soil);
  const g = new Game({
    seed: 4,
    scheme: scheme(),
    teams: [
      { name: 'Bot', worms: ['B'] },
      { name: 'Human', worms: ['H'] },
    ],
    terrain: t,
    waterLevel: 390,
    spawns: [
      { x: 200, y: 249 },
      { x: 600, y: 249 },
    ],
  });
  while (!g.worms.every((w) => w.grounded)) g.step();
  return g;
}

function run(gen: Generator<void, Plan>): Plan {
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
  }
}

describe('Bot', () => {
  it('finds and executes a shot that hurts the enemy', () => {
    const g = game();
    const me = g.activeWorm!;
    const enemy = g.worms.find((w) => w.team !== me.team) as Worm;
    const plan = run(new Bot(g, 5, 1).think());
    expect(plan.length).toBeGreaterThan(5);
    for (const batch of plan) g.step(batch);
    for (let i = 0; i < 800 && g.phase !== 'ready'; i++) g.step();
    expect(enemy.health).toBeLessThan(100);
    expect(me.health).toBe(100);
  });
});
