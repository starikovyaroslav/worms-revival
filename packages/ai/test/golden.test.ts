/// <reference types="node" />
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildGameSetup,
  REPLAY_VERSION,
  replayProblem,
  ReplayPlayer,
  ReplayRecorder,
  TEAM_PRESETS,
  type MatchConfig,
  type Replay,
} from '@wr/content';
import { allWeapons, Game, type Command, type WeaponDef } from '@wr/sim';
import { Bot, type Plan } from '../src/bot';

/*
 * Golden replay: a bot-vs-bot match recorded once and stored in the repository together with its
 * final state hash. Playing it back must reproduce the hash exactly. If this test fails after a change
 * to simulation logic, the change altered outcomes: bump REPLAY_VERSION (old replays are invalid now)
 * and regenerate the fixture with `UPDATE_GOLDEN=1 npx vitest run packages/ai/test/golden.test.ts`.
 * Regeneration is refused while REPLAY_VERSION still equals the version stored in the fixture.
 */

const FIXTURE = join(import.meta.dirname, 'fixtures/golden.wrr.json');
const TICKS = 12000;

type Driver = 'bot' | 'script';

// Bots stick to a handful of weapons, so two further matches are driven by a script that cycles
// through the whole arsenal. Seeds, maps and schemes differ.
const MATCHES: { driver: Driver; config: MatchConfig }[] = [
  ['bot', 'island', 'meadow', 'intermediate', 20261020],
  ['script', 'island', 'meadow', 'intermediate', 5],
  ['script', 'cavern', 'desert', 'armageddon', 11],
].map(([driver, style, themeId, schemeId, seed]) => ({
  driver: driver as Driver,
  config: {
    seed: seed as number,
    style: style as MatchConfig['style'],
    themeId: themeId as string,
    schemeId: schemeId as string,
    teams: TEAM_PRESETS.slice(0, 3).map((t) => ({ ...t, cpu: 0 })),
  },
}));

/** Per-tick commands of the scripted player: one different weapon per turn. */
function scriptedPlayer(): (game: Game) => Command[] {
  const arsenal = allWeapons().filter((w) => !w.action);
  let turn = -1;
  let start = 0;
  let weapon = 0;
  return (game) => {
    if ((game.phase === 'ready' || game.phase === 'turn') && game.turn !== turn) {
      turn = game.turn;
      start = game.world.tick;
      weapon = (weapon + 7) % arsenal.length; // 7 is coprime with the arsenal size: visits all
    }
    const worm = game.activeWorm;
    const dt = game.world.tick - start;
    if (!worm || game.turn !== turn) return [];
    const dir = worm.facing;
    switch (dt) {
      case 1:
        return [{ t: 'select', weapon: (arsenal[weapon] as WeaponDef).id }];
      case 2:
        return [{ t: 'target', x: worm.x + dir * 160, y: worm.y - 40 }];
      case 3:
        return [{ t: 'fuse', seconds: 2 + (turn % 3) }];
      case 4:
        return [{ t: 'move', left: false, right: false, up: true, down: false }];
      case 14:
        return [{ t: 'move', left: false, right: false, up: false, down: false }];
      case 16:
        return [{ t: 'fire', down: true }];
      case 16 + 25 + (turn % 20):
        return [{ t: 'fire', down: false }];
      case 120:
        return [{ t: 'move', left: dir < 0, right: dir > 0, up: false, down: false }];
      case 150:
        return [{ t: 'fire', down: true }];
      case 152:
        return [{ t: 'fire', down: false }];
      case 300:
        return [{ t: 'skip' }];
      default:
        return [];
    }
  };
}

function botPlayer(config: MatchConfig): (game: Game) => Command[] {
  let plan: Plan = [];
  let planTurn = -1;
  return (game) => {
    if ((game.phase === 'ready' || game.phase === 'turn') && planTurn !== game.turn) {
      planTurn = game.turn;
      const think = new Bot(game, 3, config.seed + game.turn).think();
      let r = think.next();
      while (!r.done) r = think.next();
      plan = r.value;
    }
    return plan.shift() ?? [];
  };
}

function record({ driver, config }: { driver: Driver; config: MatchConfig }): Replay {
  const game = new Game(buildGameSetup(config));
  const rec = new ReplayRecorder(config);
  const next = driver === 'bot' ? botPlayer(config) : scriptedPlayer();
  for (let i = 0; i < TICKS && game.phase !== 'gameover'; i++) {
    const cmds = next(game);
    rec.record(game.world.tick, cmds);
    game.step(cmds);
  }
  return JSON.parse(JSON.stringify(rec.finish(game))) as Replay;
}

describe('golden replay', () => {
  if (process.env.UPDATE_GOLDEN) {
    it('regenerates the fixture', () => {
      if (existsSync(FIXTURE)) {
        const [old] = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Replay[];
        if (old?.version === REPLAY_VERSION) {
          throw new Error(
            `Bump REPLAY_VERSION (still ${REPLAY_VERSION}) before regenerating the golden replay.`,
          );
        }
      }
      writeFileSync(FIXTURE, JSON.stringify(MATCHES.map(record)) + '\n');
    }, 120_000);
    return;
  }

  const golden = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Replay[];

  it('has one recording per configuration', () => {
    expect(golden.map((r) => r.config)).toEqual(MATCHES.map((m) => m.config));
  });

  for (const [i, replay] of golden.entries()) {
    it(`match ${i + 1}: recorded by this version of the rules`, () => {
      expect(replayProblem(replay)).toBeNull();
    });

    it(`match ${i + 1}: plays back to the recorded final hash`, () => {
      expect(
        new ReplayPlayer(replay).verify(),
        'simulation outcome changed: bump REPLAY_VERSION and regenerate',
      ).toBe(true);
      // The match is long enough to be meaningful.
      expect(replay.finalTick).toBeGreaterThan(2000);
      expect(replay.log.length).toBeGreaterThan(30);
    });
  }
});
