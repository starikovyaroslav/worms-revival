import { TPS, type Game } from '@wr/sim';
import { TEAM_COLORS } from '@wr/render';
import { WORMPOT, weaponInfo } from '@wr/content';

export interface TeamBar {
  name: string;
  hp: number;
  color: string;
  active: boolean;
}

export interface HudState {
  /** Seconds left in the turn, or null between turns. */
  timer: number | null;
  /** Hot-seat: the timer has not started yet. */
  waiting: boolean;
  round: number;
  wind: number;
  suddenDeath: boolean;
  teams: TeamBar[];
  maxHp: number;
  weapon: { name: string; fuse: number | null; bounce: string | null } | null;
  /** Active Wormpot modifiers (icons). */
  mods: { icon: string; name: string }[];
  /** Set when the match is over. */
  over: { winner: string | null; color: string } | null;
}

const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

export function hudState(game: Game, wormpot: readonly string[] = []): HudState {
  const def = game.weapon;
  const winner = game.winner !== null && game.winner >= 0 ? game.teams[game.winner] : undefined;
  const timed = game.phase === 'turn' || game.phase === 'retreat' || game.phase === 'ready';
  return {
    timer: timed ? Math.ceil(game.timer / TPS) : null,
    waiting: game.phase === 'ready',
    round: Math.ceil(game.roundTimer / TPS),
    wind: Math.round(game.world.wind * 10) / 10,
    suddenDeath: game.suddenDeath,
    teams: game.teams
      .filter((t) => game.teamAlive(t))
      .map((t) => ({
        name: t.name,
        hp: game.teamHealth(t),
        color: hex(TEAM_COLORS[t.index % TEAM_COLORS.length] as number),
        active: t.index === game.activeTeam,
      }))
      .sort((a, b) => b.hp - a.hp),
    maxHp: game.scheme.wormHealth * game.scheme.wormsPerTeam,
    weapon: def
      ? {
          name: weaponInfo(def.id).name,
          fuse: def.fuse ? game.fuseSeconds : null,
          bounce: def.bounce ? (game.bounceHigh ? 'Макс' : 'Мин') : null,
        }
      : null,
    mods: wormpot
      .map((id) => WORMPOT.find((m) => m.id === id))
      .filter((m) => !!m)
      .map((m) => ({ icon: m.icon, name: m.name })),
    over:
      game.phase === 'gameover'
        ? {
            winner: winner?.name ?? null,
            color: winner
              ? hex(TEAM_COLORS[winner.index % TEAM_COLORS.length] as number)
              : '#ffffff',
          }
        : null,
  };
}
