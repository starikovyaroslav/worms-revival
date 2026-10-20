import { describe, expect, it } from 'vitest';
import '../src/weapons/defs';
import { Game, type TeamSetup } from '../src/game/game';
import { TPS } from '../src/core/time';
import { flatTerrain, testScheme } from './helpers';
import type { Scheme } from '../src/game/scheme';

const W = (ammo = -1, delay = 0) => ({ ammo, power: 3, delay, crate: 0 });

function game(teams: TeamSetup[], over: Partial<Scheme> = {}): Game {
  return new Game({
    seed: 1,
    scheme: testScheme({ weapons: { bazooka: W(), grenade: W() }, ...over }),
    teams,
    terrain: flatTerrain(),
    waterLevel: 390,
    spawns: [
      { x: 100, y: 199 },
      { x: 300, y: 199 },
      { x: 600, y: 199 },
      { x: 900, y: 199 },
      { x: 700, y: 199 },
      { x: 800, y: 199 },
    ],
  });
}

const human = (name: string): TeamSetup => ({ name, worms: [`${name}1`, `${name}2`] });
const cpu = (name: string): TeamSetup => ({ ...human(name), cpu: true });

/** Skips the active turn and runs until the next one has begun. */
function nextTurn(g: Game): void {
  const turn = g.turn;
  g.step([{ t: 'skip' }]);
  for (let i = 0; i < 3000 && g.turn === turn; i++) g.step();
  for (let i = 0; i < 3000 && g.phase === 'crate'; i++) g.step();
}

describe('default weapon', () => {
  it('the first turn starts with the bazooka in hand, so the first Space fires', () => {
    const g = game([human('A'), human('B')], { hotSeatTime: 0 });
    expect(g.weaponId).toBe('bazooka');
    expect(g.phase).toBe('turn');
    for (let i = 0; i < 60; i++) g.step(); // let the worms land
    g.step([{ t: 'fire', down: true }]);
    expect(g.charging).toBe(true);
    for (let i = 0; i < 70 && !g.firedThisTurn; i++) g.step();
    expect(g.firedThisTurn).toBe(true);
  });

  it('remembers the last weapon of the team over the bazooka', () => {
    const g = game([human('A'), human('B')], { hotSeatTime: 0 });
    const first = g.activeTeam;
    g.step([{ t: 'select', weapon: 'grenade' }]);
    expect(g.weaponId).toBe('grenade');
    nextTurn(g); // other team: its own default
    expect(g.activeTeam).not.toBe(first);
    expect(g.weaponId).toBe('bazooka');
    nextTurn(g);
    expect(g.activeTeam).toBe(first);
    expect(g.weaponId).toBe('grenade');
  });

  it('falls back to the first usable attack when the bazooka is unavailable', () => {
    const g = game([human('A'), human('B')], { weapons: { grenade: W() }, hotSeatTime: 0 });
    expect(g.weaponId).toBe('grenade');
    const none = game([human('A'), human('B')], { weapons: {}, hotSeatTime: 0 });
    expect(none.weaponId).toBe('');
  });

  it('skips a bazooka that is out of ammo or still delayed', () => {
    const g = game([human('A'), human('B')], {
      weapons: { bazooka: W(0), grenade: W() },
      hotSeatTime: 0,
    });
    expect(g.weaponId).toBe('grenade');
    const delayed = game([human('A'), human('B')], {
      weapons: { bazooka: W(-1, 2), grenade: W() },
      hotSeatTime: 0,
    });
    expect(delayed.weaponId).toBe('grenade');
  });
});

describe('hot-seat hand-over', () => {
  it('two human teams wait for a key, which starts the turn', () => {
    const g = game([human('A'), human('B')], { hotSeatTime: 5 });
    expect(g.waitsForHandOver).toBe(true);
    expect(g.phase).toBe('ready');
    expect(g.timer).toBe(5 * TPS);
    g.step([{ t: 'ready' }]);
    expect(g.phase).toBe('turn');
    expect(g.timer).toBeGreaterThan(5 * TPS);
  });

  it('the wait also runs out on its own', () => {
    const g = game([human('A'), human('B')], { hotSeatTime: 2 });
    for (let i = 0; i < 2 * TPS + 1; i++) g.step();
    expect(g.phase).toBe('turn');
  });

  it('a computer turn starts at once, a human turn after it waits again', () => {
    const g = game([human('A'), cpu('C'), human('B')], { hotSeatTime: 5 });
    const seen: Record<string, string> = {};
    for (let n = 0; n < 6; n++) {
      const team = g.teams[g.activeTeam]!;
      seen[team.name] = g.phase;
      if (g.phase === 'ready') g.step([{ t: 'ready' }]);
      nextTurn(g);
    }
    expect(seen.C).toBe('turn');
    expect(seen.A).toBe('ready');
    expect(seen.B).toBe('ready');
  });

  it('one human against computers never waits', () => {
    const g = game([human('A'), cpu('C1'), cpu('C2')], { hotSeatTime: 5 });
    expect(g.hotSeat).toBe(false);
    for (let n = 0; n < 6; n++) {
      expect(g.phase).toBe('turn');
      nextTurn(g);
    }
  });

  it('the ready command changes nothing but the phase', () => {
    const a = game([human('A'), human('B')], { hotSeatTime: 5 });
    const b = game([human('A'), human('B')], { hotSeatTime: 5 });
    a.step([{ t: 'ready' }]);
    b.step([{ t: 'jump' }]);
    expect(a.phase).toBe(b.phase);
    expect(a.weaponId).toBe(b.weaponId);
  });
});
