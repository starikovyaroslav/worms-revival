import { describe, expect, it } from 'vitest';
import '../src/weapons/defs';
import { Flame } from '../src/weapons/fire';
import { Gas } from '../src/weapons/gas';
import { Mine } from '../src/weapons/mine';
import { Projectile } from '../src/weapons/projectile';
import { Worm } from '../src/worm/worm';
import { makeGame, stepUntil } from './helpers';

const IDS = [
  'petrol',
  'skunk',
  'flamethrower',
  'napalm',
  'mail',
  'minestrike',
  'carpet',
  'frenchsheep',
];
const WEAPONS = Object.fromEntries(
  IDS.map((id) => [id, { ammo: -1, power: 3, delay: 0, crate: 0 }]),
);

function ready() {
  const g = makeGame({ weapons: WEAPONS, wind: 0, turnTime: 60 });
  stepUntil(g, () => g.worms.every((w) => w.grounded));
  const me = g.activeWorm!;
  me.facing = 1;
  me.aim = 0.5;
  return { g, me };
}

function shoot(g: ReturnType<typeof ready>['g'], weapon: string, charge = 20) {
  g.step([{ t: 'select', weapon }]);
  g.step([{ t: 'fire', down: true }]);
  for (let i = 0; i < charge; i++) g.step();
  g.step([{ t: 'fire', down: false }]);
}

function strike(weapon: string) {
  const { g, me } = ready();
  g.step([{ t: 'select', weapon }]);
  g.step([{ t: 'target', x: me.x + 200, y: 199 }]);
  g.step([{ t: 'fire', down: true }]);
  return g;
}

describe('fire and gas', () => {
  it('petrol bomb leaves burning petrol', () => {
    const { g } = ready();
    shoot(g, 'petrol');
    stepUntil(g, () => g.world.ofKind<Flame>('flame').length > 0, 400);
    expect(g.world.ofKind<Flame>('flame').length).toBeGreaterThan(20);
  });

  it('skunk releases gas that poisons worms it reaches', () => {
    const { g } = ready();
    const enemy = g.worms.find((w) => w.team !== g.activeWorm!.team) as Worm;
    shoot(g, 'skunk');
    stepUntil(g, () => g.world.ofKind<Gas>('gas').length > 0, 400);
    expect(g.world.ofKind<Gas>('gas').length).toBeGreaterThan(10);
    // Put a worm into the cloud.
    const puff = g.world.ofKind<Gas>('gas')[0]!;
    enemy.x = puff.x;
    enemy.y = puff.y + 8;
    g.step();
    expect(enemy.poisoned).toBe(true);
  });

  it('flamethrower sprays a burst of flames', () => {
    const { g } = ready();
    shoot(g, 'flamethrower', 0);
    expect(g.world.ofKind<Flame>('flame').length).toBe(36);
  });
});

describe('air strikes', () => {
  const count = (g: ReturnType<typeof ready>['g'], look: string) =>
    g.world.ofKind<Projectile>('projectile').filter((p) => p.look === look).length;

  it('napalm strike drops five bombs that burst into flames', () => {
    const g = strike('napalm');
    expect(count(g, 'napalm')).toBe(5);
    stepUntil(g, () => g.world.ofKind<Flame>('flame').length > 0, 600);
    expect(g.world.ofKind<Flame>('flame').length).toBeGreaterThan(20);
  });

  it('mail strike drops five letters', () => {
    expect(count(strike('mail'), 'letter')).toBe(5);
  });

  it('mine strike drops five mines', () => {
    expect(strike('minestrike').world.ofKind<Mine>('mine').length).toBe(5);
  });

  it('carpet bomb drops a dozen bombs, French sheep five sheep', () => {
    expect(count(strike('carpet'), 'carpet')).toBe(12);
    expect(count(strike('frenchsheep'), 'frenchsheep')).toBe(5);
  });
});

describe('melee specials', () => {
  const ids = ['axe', 'dragonball', 'kamikaze', 'suicide'];
  const W = Object.fromEntries(ids.map((id) => [id, { ammo: -1, power: 3, delay: 0, crate: 0 }]));
  const setup = () => {
    const g = makeGame({ weapons: W, wind: 0, turnTime: 60 });
    stepUntil(g, () => g.worms.every((w) => w.grounded));
    const me = g.activeWorm!;
    const enemy = g.worms.find((w) => w.team !== me.team) as Worm;
    me.facing = 1;
    enemy.x = me.x + 12;
    enemy.y = me.y;
    return { g, me, enemy };
  };

  it('battle axe halves current health, even down to the last hit point', () => {
    const { g, enemy } = setup();
    enemy.health = 60;
    g.step([{ t: 'select', weapon: 'axe' }]);
    g.step([{ t: 'fire', down: true }]);
    expect(enemy.health).toBe(30);
    const g2 = setup();
    g2.enemy.health = 1;
    g2.g.step([{ t: 'select', weapon: 'axe' }]);
    g2.g.step([{ t: 'fire', down: true }]);
    expect(g2.enemy.health).toBe(0);
  });

  it('dragon ball burns a worm right in front', () => {
    const { g, enemy } = setup();
    g.step([{ t: 'select', weapon: 'dragonball' }]);
    g.step([{ t: 'fire', down: true }]);
    stepUntil(g, () => g.world.ofKind('projectile').length === 0, 200);
    expect(enemy.health).toBeLessThan(100);
  });

  it('kamikaze flies into the enemy and explodes', () => {
    const { g, me, enemy } = setup();
    enemy.x = me.x + 60;
    me.aim = 0;
    g.step([{ t: 'select', weapon: 'kamikaze' }]);
    g.step([{ t: 'fire', down: true }]);
    stepUntil(g, () => g.world.ofKind('kamikaze').length === 0, 200);
    expect(enemy.health).toBeLessThan(100);
  });

  it('suicide bomber takes the bomber and hurts those near', () => {
    const { g, me, enemy } = setup();
    g.step([{ t: 'select', weapon: 'suicide' }]);
    g.step([{ t: 'fire', down: true }]);
    expect(me.health).toBe(0);
    expect(enemy.health).toBeLessThan(100);
  });
});

describe('animals', () => {
  const ids = [
    'sheeplauncher',
    'molebomb',
    'molesquad',
    'oldwoman',
    'madcows',
    'salvation',
    'donkey',
    'mbbomb',
  ];
  const W = Object.fromEntries(ids.map((id) => [id, { ammo: -1, power: 3, delay: 0, crate: 0 }]));
  const setup = () => {
    const g = makeGame({ weapons: W, wind: 0, turnTime: 60 });
    stepUntil(g, () => g.worms.every((w) => w.grounded));
    const me = g.activeWorm!;
    const enemy = g.worms.find((w) => w.team !== me.team) as Worm;
    me.facing = 1;
    me.aim = 0.5;
    return { g, me, enemy };
  };
  const use = (g: ReturnType<typeof setup>['g'], id: string, target?: { x: number; y: number }) => {
    g.step([{ t: 'select', weapon: id }]);
    if (target) g.step([{ t: 'target', x: target.x, y: target.y }]);
    g.step([{ t: 'fire', down: true }]);
  };

  it('mad cows: as many as the power level, and they blow up on contact', () => {
    const { g, me, enemy } = setup();
    enemy.x = me.x + 80;
    enemy.y = me.y;
    use(g, 'madcows');
    expect(g.world.ofKind('sheep').length).toBe(3);
    stepUntil(g, () => g.world.ofKind('sheep').length === 0, 800);
    expect(enemy.health).toBeLessThan(100);
  });

  it('old woman cannot be set off by hand but goes off after five seconds', () => {
    const { g } = setup();
    use(g, 'oldwoman');
    const nan = g.world.ofKind('sheep')[0]!;
    g.step([{ t: 'fire', down: true }]);
    expect(nan.removed).toBe(false);
    stepUntil(g, () => nan.removed, 400);
    expect(nan.removed).toBe(true);
  });

  it('mole squadron drops five moles', () => {
    const { g, me } = setup();
    use(g, 'molesquad', { x: me.x + 200, y: 199 });
    expect(g.world.ofKind('sheep').length).toBe(5);
  });

  it('sheep launcher shoots a sheep that lands and walks', () => {
    const { g } = setup();
    use(g, 'sheeplauncher');
    for (let i = 0; i < 20; i++) g.step();
    g.step([{ t: 'fire', down: false }]);
    expect(g.world.ofKind('sheep').length).toBe(1);
  });

  it('concrete donkey bores through the land down to the water', () => {
    const { g, me } = setup();
    use(g, 'donkey', { x: me.x + 300, y: 199 });
    const d = g.world.ofKind('donkey')[0]!;
    stepUntil(g, () => d.removed, 600);
    expect(g.world.terrain.isSolid(me.x + 300, 300)).toBe(false);
  });
});

describe('disasters and specials', () => {
  const ids = ['earthquake', 'armageddon', 'nuke', 'vase', 'magicbullet', 'superbanana'];
  const W = Object.fromEntries(ids.map((id) => [id, { ammo: -1, power: 3, delay: 0, crate: 0 }]));
  const setup = () => {
    const g = makeGame({ weapons: W, wind: 0, turnTime: 60 });
    stepUntil(g, () => g.worms.every((w) => w.grounded));
    const me = g.activeWorm!;
    me.facing = 1;
    me.aim = 0.5;
    return { g, me, enemy: g.worms.find((w) => w.team !== me.team) as Worm };
  };

  it('earthquake tosses worms without hurting them', () => {
    const { g, enemy } = setup();
    g.step([{ t: 'select', weapon: 'earthquake' }]);
    g.step([{ t: 'fire', down: true }]);
    let hopped = false;
    for (let i = 0; i < 100; i++) {
      g.step();
      if (enemy.state === 'airborne') hopped = true;
    }
    expect(hopped).toBe(true);
    stepUntil(g, () => g.world.ofKind('earthquake').length === 0, 400);
    expect(enemy.health).toBe(100);
  });

  it('armageddon rains meteors', () => {
    const { g } = setup();
    g.step([{ t: 'select', weapon: 'armageddon' }]);
    g.step([{ t: 'fire', down: true }]);
    for (let i = 0; i < 60; i++) g.step();
    expect(g.world.ofKind('projectile').length).toBeGreaterThan(3);
  });

  it('nuclear test poisons everyone and raises the water', () => {
    const { g } = setup();
    const water = g.world.waterLevel;
    g.step([{ t: 'select', weapon: 'nuke' }]);
    g.step([{ t: 'fire', down: true }]);
    expect(g.worms.every((w) => w.poisoned)).toBe(true);
    expect(g.world.waterLevel).toBe(water - 30);
  });

  it('ming vase breaks into twelve shards', () => {
    const { g } = setup();
    g.step([{ t: 'select', weapon: 'vase' }]);
    g.step([{ t: 'fire', down: true }]);
    for (let i = 0; i < 20; i++) g.step();
    g.step([{ t: 'fire', down: false }]);
    const vase = g.world.ofKind('projectile')[0]!;
    stepUntil(g, () => vase.removed, 400);
    g.step();
    expect(g.world.ofKind('projectile').length).toBe(12);
  });

  it("patsy's bullet homes in on the marked worm", () => {
    const { g, me, enemy } = setup();
    me.aim = 1.2;
    g.step([{ t: 'select', weapon: 'magicbullet' }]);
    g.step([{ t: 'target', x: enemy.cx, y: enemy.cy }]);
    g.step([{ t: 'fire', down: true }]);
    stepUntil(g, () => g.world.ofKind('projectile').length === 0, 700);
    expect(enemy.health).toBeLessThan(100);
  });
});
