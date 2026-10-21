import { weaponSetting, type Game } from '@wr/sim';

export interface WeaponStatus {
  /** Remaining ammo; -1 = infinite. */
  ammo: number;
  /** Turns still to wait before the weapon unlocks (0 = none). */
  delay: number;
  /** Turns the scheme asks to wait in total (0 = none). */
  delayTotal: number;
  usable: boolean;
  /** Why it cannot be used right now (Russian); null when it can. */
  reason: string | null;
}

/** "1 ход", "2 хода", "5 ходов". */
export function turnsWord(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} ход`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} хода`;
  return `${n} ходов`;
}

/** What the weapon panel shows for one weapon, and the reason when the slot is greyed out. */
export function weaponStatus(game: Game, id: string): WeaponStatus {
  const team = game.teams[game.activeTeam];
  const def = game.rules.get(id);
  const ammo = team?.ammo[id] ?? 0;
  const delayTotal = weaponSetting(game.scheme, id).delay;
  const delay = Math.max(0, delayTotal - (team?.turnsTaken ?? 0));
  const usable = game.canUse(id);
  let reason: string | null = null;
  if (!usable) {
    if (delay > 0) reason = `Доступно через ${turnsWord(delay)}`;
    else if (ammo === 0) reason = 'Нет боезапаса';
    else if (def?.oncePerTurn) reason = 'Один раз за ход';
    else if (def?.needsSky && game.cavern) reason = 'Нужно небо: в пещере нельзя';
    else reason = 'Сейчас недоступно';
  }
  return { ammo, delay, delayTotal, usable, reason };
}
