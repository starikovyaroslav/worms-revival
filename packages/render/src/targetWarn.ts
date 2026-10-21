import type { Game, Worm } from '@wr/sim';

/** A click-to-fire strike whose target is closer than this (world px) to one of your own worms hurts you. */
export const SELF_DANGER_R = 40;

/** Click-to-fire weapons that harm nobody (no "own goal" warning for them). */
const HARMLESS_CLICK = new Set(['teleport', 'girder', 'selectworm']);

/** True when a click on the map uses the selected weapon right away (strikes, teleport, girder...). */
export function clicksFire(game: Game): boolean {
  const def = game.weapon;
  return !!def && def.aim === 'target' && !def.needsTarget;
}

/** The own worm closest to the point when the click would fire a harmful weapon within `SELF_DANGER_R`. */
export function selfDangerWorm(game: Game, p: { x: number; y: number } | null): Worm | null {
  const def = game.weapon;
  const team = game.teams[game.activeTeam];
  if (!p || !def || !team || !clicksFire(game) || HARMLESS_CLICK.has(def.id)) return null;
  let best: Worm | null = null;
  let bestD = SELF_DANGER_R * SELF_DANGER_R;
  for (const w of game.teamWorms(team)) {
    if (!w.alive) continue;
    const d = (w.x - p.x) ** 2 + (w.y - p.y) ** 2;
    if (d <= bestD) {
      best = w;
      bestD = d;
    }
  }
  return best;
}
