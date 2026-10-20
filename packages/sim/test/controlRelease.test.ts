import { describe, expect, it } from 'vitest';
import '../src/weapons/defs';
import { TPS, type Game } from '../src/game/game';
import { makeGame, stepUntil } from './helpers';

const WEAPONS = Object.fromEntries(
  ['rope', 'bungee', 'jetpack', 'handgun'].map((id) => [
    id,
    { ammo: -1, power: 3, delay: 0, crate: 0 },
  ]),
);

function ready(): Game {
  const g = makeGame({ weapons: WEAPONS, wind: 0, turnTime: 60 });
  stepUntil(g, () => g.worms.every((w) => w.grounded) && g.phase === 'turn');
  return g;
}

const use = (g: Game, weapon: string) => {
  g.step([{ t: 'select', weapon }]);
  g.step([{ t: 'fire', down: true }]);
  g.step([{ t: 'fire', down: false }]);
};

const tools = (g: Game) =>
  g.world.all().filter((e) => !e.removed && ['jetpack', 'rope'].includes(e.kind));

/** Ends the turn and returns how many ticks the settling took. */
function endAndSettle(g: Game): number {
  g.step([{ t: 'skip' }]);
  expect(g.phase).toBe('settling');
  const n = stepUntil(g, () => g.phase !== 'settling');
  return n;
}

describe('replacing a controlled movement tool', () => {
  it('jet pack then rope: the jet pack is released', () => {
    const g = ready();
    use(g, 'jetpack');
    const jet = g.world.ofKind('jetpack')[0]!;
    use(g, 'rope');
    expect(jet.removed).toBe(true);
    expect(g.world.byId(g.controlledId)?.kind).toBe('rope');
    expect(tools(g).map((e) => e.kind)).toEqual(['rope']);
  });

  it('bungee then jet pack: the cord is released, the worm is free', () => {
    const g = ready();
    use(g, 'bungee');
    const cord = g.world.ofKind('rope')[0]!;
    use(g, 'jetpack');
    expect(cord.removed).toBe(true);
    expect(g.world.byId(g.controlledId)?.kind).toBe('jetpack');
    expect(g.activeWorm!.state).not.toBe('roped');
  });

  it('leaves no tools behind and the settling does not run to its limit', () => {
    for (const [a, b] of [
      ['jetpack', 'rope'],
      ['bungee', 'jetpack'],
      ['rope', 'jetpack'],
    ] as const) {
      const g = ready();
      use(g, a);
      use(g, b);
      const ticks = endAndSettle(g);
      expect(tools(g)).toEqual([]);
      expect(ticks).toBeLessThan(10 * TPS);
      // The next turn starts normally and its crate/ready phases are not held up either.
      const next = stepUntil(g, () => g.phase === 'turn');
      expect(next).toBeLessThan(10 * TPS);
    }
  });

  it('a rope under a gun burst is let go when the turn ends', () => {
    const g = ready();
    use(g, 'rope');
    g.step([{ t: 'select', weapon: 'handgun' }]);
    g.step([{ t: 'fire', down: true }]);
    g.step([{ t: 'fire', down: false }]);
    endAndSettle(g);
    expect(tools(g)).toEqual([]);
  });
});
