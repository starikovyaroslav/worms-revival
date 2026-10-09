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
