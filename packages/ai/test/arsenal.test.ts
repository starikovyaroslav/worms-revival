import { RULESET } from '@wr/content';
import { describe, expect, it } from 'vitest';
import { Game, Material, Terrain, NO_UPGRADES, type Scheme, type WeaponSetting } from '@wr/sim';
import { Bot, type Plan } from '../src/bot';

const NEW = [
  'petrol',
  'skunk',
  'sheeplauncher',
  'flamethrower',
  'superbanana',
  'mbbomb',
  'vase',
  'napalm',
  'mail',
  'minestrike',
  'carpet',
  'frenchsheep',
  'molesquad',
  'donkey',
  'axe',
  'dragonball',
  'madcows',
  'oldwoman',
];

function scheme(weapons: Record<string, WeaponSetting>): Scheme {
  return {
    id: 't',
    name: 't',
    turnTime: 30,
    retreatTime: 3,
    hotSeatTime: 0,
    roundTime: 900,
    wormHealth: 100,
    wormsPerTeam: 2,
    fallDamage: true,
    wormSelect: false,
    artillery: false,
    suddenDeath: 'health1',
    waterRise: 0,
    wind: 1,
    mines: 0,
    mineFuse: 3,
    duds: false,
    barrels: 0,
    crateChance: 0,
    healthCrateShare: 0.4,
    healthCrate: 25,
    indestructible: false,
    weapons,
    upgrades: NO_UPGRADES,
  };
}

function newGame(seed: number, weapons: Record<string, WeaponSetting>): Game {
  const t = new Terrain(1000, 400);
  for (let y = 250; y < 400; y++) for (let x = 0; x < 1000; x++) t.set(x, y, Material.Soil);
  const g = new Game({
    seed,
    scheme: scheme(weapons),
    rules: RULESET,
    teams: [
      { name: 'A', worms: ['A1', 'A2'] },
      { name: 'B', worms: ['B1', 'B2'] },
    ],
    terrain: t,
    waterLevel: 390,
    spawns: [
      { x: 150, y: 249 },
      { x: 420, y: 249 },
      { x: 560, y: 249 },
      { x: 850, y: 249 },
    ],
  });
  while (!g.worms.every((w) => w.grounded)) g.step();
  return g;
}

function think(bot: Bot): Plan {
  const gen = bot.think();
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
  }
}

describe('Bot with the Phase W arsenal', () => {
  it('plays cpu-vs-cpu matches to the end and uses the new weapons', () => {
    const weapons: Record<string, WeaponSetting> = {
      grenade: { ammo: -1, power: 3, delay: 0, crate: 0 },
      skipgo: { ammo: -1, power: 3, delay: 0, crate: 0 },
    };
    for (const id of NEW) weapons[id] = { ammo: 3, power: 3, delay: 0, crate: 0 };
    const used = new Map<string, number>();
    for (const seed of [1, 2, 3, 4, 5]) {
      const g = newGame(seed, weapons);
      let planTurn = -1;
      let plan: Plan = [];
      let ticks = 0;
      for (; ticks < 60000 && g.phase !== 'gameover'; ticks++) {
        if ((g.phase === 'ready' || g.phase === 'turn') && planTurn !== g.turn) {
          planTurn = g.turn;
          plan = think(new Bot(g, 5, seed * 100 + g.turn));
          for (const batch of plan)
            for (const c of batch)
              if (c.t === 'select' && NEW.includes(c.weapon))
                used.set(c.weapon, (used.get(c.weapon) ?? 0) + 1);
        }
        g.step(plan.shift() ?? []);
      }
      expect(g.phase).toBe('gameover');
      // Only what the scheme allows: every finite-ammo weapon stays within its stock.
      for (const team of g.teams)
        for (const id of NEW) expect(team.ammo[id]).toBeGreaterThanOrEqual(0);
    }
    expect([...used.values()].reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(used.size).toBeGreaterThanOrEqual(2);
  }, 280_000);

  it('does not use weapons the scheme leaves out', () => {
    const g = newGame(1, {
      bazooka: { ammo: -1, power: 3, delay: 0, crate: 0 },
      skipgo: { ammo: -1, power: 3, delay: 0, crate: 0 },
    });
    for (let i = 0; i < 3; i++) {
      const plan = think(new Bot(g, 5, i));
      for (const batch of plan)
        for (const c of batch)
          if (c.t === 'select') expect(['bazooka', 'skipgo']).toContain(c.weapon);
    }
  });
});

describe('each new weapon', () => {
  // Weapons whose payoff the probe sees clearly with one enemy in range. Missing on purpose: sheep
  // launcher, mole squad, donkey and old woman, which depend on how far the animals wander.
  const REACHABLE: Record<string, number> = {
    petrol: 110,
    skunk: 110,
    flamethrower: 110,
    superbanana: 110,
    mbbomb: 110,
    vase: 110,
    napalm: 110,
    mail: 110,
    minestrike: 110,
    carpet: 110,
    frenchsheep: 110,
    axe: 30,
    dragonball: 70,
    madcows: 110,
  };
  for (const [id, dist] of Object.entries(REACHABLE)) {
    it(`${id} gets picked when it is the only option`, () => {
      const g = newGame(2, {
        [id]: { ammo: 1, power: 3, delay: 0, crate: 0 },
        skipgo: { ammo: -1, power: 3, delay: 0, crate: 0 },
      });
      const me = g.activeWorm!;
      for (const w of g.worms) if (w.team !== me.team) w.x = me.x + dist;
      for (let i = 0; i < 60; i++) g.step();
      const plan = think(new Bot(g, 5, 1));
      const picked = plan.flat().flatMap((c) => (c.t === 'select' ? [c.weapon] : []));
      expect(picked).toContain(id);
    }, 60_000);
  }
});
