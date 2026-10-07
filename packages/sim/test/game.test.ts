import { describe, expect, it } from 'vitest';
import { registerWeapon } from '../src/weapons/weapon';
import { explode } from '../src/weapons/explosion';
import { makeGame, stepUntil } from './helpers';
import type { Game } from '../src/game/game';

const landed = (g: Game) => stepUntil(g, () => g.worms.every((w) => w.grounded));

// A weapon that blows up the target point instantly — enough to drive the rules.
registerWeapon({
  id: 'test-boom',
  name: 'Test boom',
  row: 12,
  col: 4,
  aim: 'target',
  charge: false,
  fire: (ctx) => {
    if (ctx.target)
      explode(ctx.world, ctx.target.x, ctx.target.y, { crater: 10, radius: 30, damage: 60 });
  },
});
const WEAPONS = { 'test-boom': { ammo: -1, power: 3, delay: 0, crate: 0 } };

describe('Game turns', () => {
  it('alternates teams and cycles worms within a team', () => {
    const g = makeGame();
    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      order.push(`${g.activeTeam}:${g.activeWorm!.name}`);
      g.step([{ t: 'skip' }]);
      stepUntil(g, () => g.phase === 'ready' || g.phase === 'turn');
    }
    const teams = order.map((o) => o.split(':')[0]);
    expect(teams[0]).not.toBe(teams[1]);
    expect(teams[0]).toBe(teams[2]);
    const firstTeamWorms = [order[0], order[2]].map((o) => o!.split(':')[1]);
    expect(new Set(firstTeamWorms).size).toBe(2);
  });

  it('ends the turn when the timer runs out', () => {
    const g = makeGame();
    const team = g.activeTeam;
    stepUntil(g, () => g.activeTeam !== team, 11 * 50 + 200);
  });

  it('shows damage on health labels only at the end of the turn', () => {
    const g = makeGame({ weapons: WEAPONS });
    landed(g);
    const enemyTeam = g.teams[1 - g.activeTeam]!;
    const victim = g.teamWorms(enemyTeam)[0]!;
    g.step([{ t: 'select', weapon: 'test-boom' }]);
    g.step([{ t: 'target', x: victim.cx, y: victim.cy }]);
    g.step([{ t: 'fire', down: true }]);
    expect(victim.health).toBe(40);
    expect(victim.shownHealth).toBe(100);
    expect(g.phase).toBe('retreat');
    stepUntil(g, () => g.phase === 'ready' || g.phase === 'turn');
    expect(victim.shownHealth).toBe(40);
  });

  it('blows up dead worms, leaves gravestones and declares a winner', () => {
    const g = makeGame({ weapons: WEAPONS, wormsPerTeam: 1 });
    landed(g);
    const enemy = g.teamWorms(g.teams[1 - g.activeTeam]!)[0]!;
    const shooter = g.activeTeam;
    enemy.health = 10;
    g.step([
      { t: 'select', weapon: 'test-boom' },
      { t: 'target', x: enemy.cx, y: enemy.cy },
    ]);
    g.step([{ t: 'fire', down: true }]);
    stepUntil(g, () => g.phase === 'gameover');
    expect(enemy.alive).toBe(false);
    expect(g.world.ofKind('gravestone').length).toBe(1);
    expect(g.winner).toBe(shooter);
  });

  it('ends the turn immediately when the active worm gets hurt', () => {
    const g = makeGame({ weapons: WEAPONS });
    landed(g);
    const me = g.activeWorm!;
    g.step([
      { t: 'select', weapon: 'test-boom' },
      { t: 'target', x: me.cx + 20, y: me.cy },
    ]);
    g.step([{ t: 'fire', down: true }]);
    expect(['settling', 'dying']).toContain(g.phase);
  });

  it('starts Sudden Death after the round time', () => {
    const g = makeGame({ roundTime: 1, suddenDeath: 'health1' });
    stepUntil(g, () => g.suddenDeath, 2000);
    for (const w of g.worms) expect(w.health).toBe(1);
  });

  it('raises water every turn in Sudden Death', () => {
    const g = makeGame({ roundTime: 0, suddenDeath: 'water', waterRise: 20 });
    const before = g.world.waterLevel;
    g.step([{ t: 'skip' }]);
    stepUntil(g, () => g.turn === 2);
    g.step([{ t: 'skip' }]);
    stepUntil(g, () => g.turn === 3);
    expect(g.world.waterLevel).toBeLessThan(before);
  });

  it('is deterministic', () => {
    const run = () => {
      const g = makeGame({ weapons: WEAPONS }, 42);
      landed(g);
      g.step([{ t: 'move', left: false, right: true, up: true, down: false }]);
      for (let i = 0; i < 100; i++) g.step();
      g.step([
        { t: 'select', weapon: 'test-boom' },
        { t: 'target', x: 600, y: 190 },
      ]);
      g.step([{ t: 'fire', down: true }]);
      for (let i = 0; i < 600; i++) g.step();
      return g.hash();
    };
    expect(run()).toBe(run());
  });
});

describe('scheme options', () => {
  it('indestructible land survives explosions', () => {
    const g = makeGame({ indestructible: true });
    explode(g.world, 500, 205, { crater: 30, radius: 40, damage: 50 });
    expect(g.world.terrain.isSolid(500, 205)).toBe(true);
  });
});
