import { describe, expect, it } from 'vitest';
import { Game, type Command } from '@wr/sim';
import { buildGameSetup, type MatchConfig } from '../src/match';
import {
  REPLAY_VERSION,
  ReplayPlayer,
  ReplayRecorder,
  replayProblem,
  rulesetHash,
} from '../src/replay';
import { TEAM_PRESETS } from '../src/teams';

const config: MatchConfig = {
  seed: 2024,
  style: 'island',
  themeId: 'meadow',
  schemeId: 'intermediate',
  teams: TEAM_PRESETS.slice(0, 2).map((t) => ({ ...t, cpu: 0 })),
};

/** A scripted bit of play: walk, aim, fire a bazooka, then skip turns. */
function script(tick: number): Command[] {
  if (tick === 300) return [{ t: 'move', left: false, right: true, up: true, down: false }];
  if (tick === 330) return [{ t: 'move', left: false, right: false, up: false, down: false }];
  if (tick === 340) return [{ t: 'select', weapon: 'bazooka' }];
  if (tick === 345) return [{ t: 'fire', down: true }];
  if (tick === 375) return [{ t: 'fire', down: false }];
  if (tick > 1200 && tick % 400 === 0) return [{ t: 'skip' }];
  return [];
}

describe('replays', () => {
  it('preserves repeated nocturne identities through JSON and leaves scripted physics unchanged', () => {
    const identities = [
      'nocturne-violet',
      'nocturne-velvet',
      'nocturne-violet',
      'nocturne-crimson',
    ];
    const styled: MatchConfig = {
      ...config,
      teams: config.teams.map((team) => ({
        ...team,
        characterClass: 'nocturne',
        characterVariants: identities,
      })),
    };
    const game = new Game(buildGameSetup(styled));
    const plain = new Game(buildGameSetup(config));
    const recorder = new ReplayRecorder(styled);
    for (let tick = 0; tick < 600; tick++) {
      const commands = script(tick);
      recorder.record(tick, commands);
      game.step(commands);
      plain.step(commands);
      if ([0, 300, 330, 375, 599].includes(tick)) expect(game.hash()).toBe(plain.hash());
    }
    const replay = JSON.parse(JSON.stringify(recorder.finish(game)));
    expect(replay.config.teams[0].characterVariants).toEqual(identities);
    expect(replayProblem(replay)).toBeNull();
    expect(new ReplayPlayer(replay).verify()).toBe(true);
  });

  it('reproduce the recorded match exactly', () => {
    const game = new Game(buildGameSetup(config));
    const rec = new ReplayRecorder(config);
    for (let i = 0; i < 2500; i++) {
      const cmds = script(game.world.tick);
      rec.record(game.world.tick, cmds);
      game.step(cmds);
    }
    const replay = JSON.parse(JSON.stringify(rec.finish(game)));
    expect(new ReplayPlayer(replay).verify()).toBe(true);
  });

  it('detects a tampered replay', () => {
    const game = new Game(buildGameSetup(config));
    const rec = new ReplayRecorder(config);
    for (let i = 0; i < 600; i++) {
      const cmds = script(game.world.tick);
      rec.record(game.world.tick, cmds);
      game.step(cmds);
    }
    const replay = rec.finish(game);
    replay.log[0]![1] = [{ t: 'move', left: true, right: false, up: false, down: false }];
    expect(new ReplayPlayer(replay).verify()).toBe(false);
  });

  it('rejects structurally broken replays instead of failing later', () => {
    const replay = JSON.parse(
      JSON.stringify(new ReplayRecorder(config).finish(new Game(buildGameSetup(config)))),
    );
    const broken = [
      { ...replay, config: { ...replay.config, teams: 5 } },
      { ...replay, config: { ...replay.config, teams: [] } },
      { ...replay, config: { ...replay.config, teams: [{ name: 'A', worms: [1] }] } },
      { ...replay, config: { ...replay.config, seed: 'x' } },
      { ...replay, finalTick: '600' },
      { ...replay, finalTick: -1 },
      { ...replay, finalHash: null },
      { ...replay, log: [[1, 'move']] },
      { ...replay, log: [5] },
    ];
    for (const r of broken) expect(replayProblem(r)).toEqual({ kind: 'malformed' });
  });

  it('rejects replays of another version, another ruleset or garbage', () => {
    const game = new Game(buildGameSetup(config));
    const replay = new ReplayRecorder(config).finish(game);
    expect(replay.version).toBe(REPLAY_VERSION);
    expect(replayProblem(JSON.parse(JSON.stringify(replay)))).toBeNull();
    expect(replayProblem({ ...replay, version: 1 })).toEqual({ kind: 'version', found: 1 });
    expect(replayProblem({ ...replay, rulesetHash: replay.rulesetHash + 1 })).toEqual({
      kind: 'ruleset',
    });
    expect(replayProblem(null)).toEqual({ kind: 'malformed' });
    expect(replayProblem({ version: REPLAY_VERSION })).toEqual({ kind: 'malformed' });
    expect(() => new ReplayPlayer({ ...replay, version: 1 })).toThrow(/version/);
    // A file as the version 1 build wrote it: no rulesetHash at all. Reported as old, not as garbage.
    const { rulesetHash: _drop, ...v1 } = { ...replay, version: 1 };
    expect(replayProblem(JSON.parse(JSON.stringify(v1)))).toEqual({ kind: 'version', found: 1 });
    expect(rulesetHash()).toBe(replay.rulesetHash);
  });
});
