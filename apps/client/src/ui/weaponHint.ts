import { TPS, type Game } from '@wr/sim';
import { clicksFire, selfDangerWorm } from '@wr/render';
import { weaponInfo } from '@wr/content';

export interface WeaponHint {
  text: string;
  /** Shown in the warning colour (own-goal strike, nothing to do but wait...). */
  warn: boolean;
}

/** The thing the player is steering after the shot (rope, sheep, jet pack, torch...), if any. */
function controlled(game: Game): { kind?: string; state?: string; mode?: string } | null {
  if (!game.controlledId) return null;
  return (game.world.byId(game.controlledId) as { kind?: string } | undefined) ?? null;
}

/**
 * One line that says what the keys do with the selected weapon right now. The base is the spec's
 * `ui.hint`; weapons with states (rope, sheep, jet pack...) and click-to-fire weapons get their own
 * wording. `mouse` is the map point under the cursor (own-goal warning for click-to-fire strikes).
 */
export function weaponHint(game: Game, mouse: { x: number; y: number } | null): WeaponHint | null {
  const def = game.weapon;
  if (!def) return null;
  if (game.phase === 'retreat')
    return { text: `Отходи! Ход закончится через ${Math.ceil(game.timer / TPS)} с`, warn: true };
  const id = def.id;
  const c = controlled(game);
  const say = (text: string, warn = false): WeaponHint => ({ text, warn });

  switch (id) {
    case 'rope':
    case 'bungee':
      if (c?.kind === 'rope' && c.state === 'attached')
        return say('Пробел — отпустить, ↑↓ — длина, ←→ — раскачка');
      if (c?.kind === 'rope') return say('Пробел — выстрелить ещё раз, ←→ — раскачка');
      return say('↑↓ — прицел, Пробел — выстрелить верёвкой');
    case 'sheep':
      return say(c ? 'Пробел — взорвать овцу' : 'Пробел — выпустить овцу, она бежит вперёд');
    case 'supersheep':
      if (c?.mode === 'fly') return say('←→ — руль, Пробел — взорвать');
      return say(c ? 'Пробел — взлёт' : 'Пробел — выпустить, ещё раз — взлёт');
    case 'jetpack':
      return say(c ? '↑ — тяга, ←→ — в стороны, Пробел — выключить' : 'Пробел — включить ранец');
    case 'blowtorch':
      return say(c ? 'Пробел — остановить' : '↑↓ — угол, Пробел — зажечь горелку');
    case 'drill':
      return say(c ? 'Пробел — остановить' : 'Пробел — начать бурить вниз');
    case 'girder':
    case 'girderpack': {
      const left = game.shotsLeft < (def.shots ?? 1) ? ` · осталось ${game.shotsLeft}` : '';
      return say(`Клик по карте — поставить балку, ↑↓ — наклон${left}`);
    }
    case 'dynamite':
      return say('Пробел — положить динамит и отойти');
    default:
  }

  if (clicksFire(game)) {
    const own = selfDangerWorm(game, mouse);
    if (own) return say('Осторожно: цель рядом с вашим червём!', true);
    if (id === 'teleport') return say('Клик по карте — телепорт сюда');
    if (id === 'selectworm') return say('Клик по своему червю — ходит он');
    return say('Клик по карте — запуск сюда');
  }
  if (def.needsTarget)
    return say(
      game.target
        ? 'Цель отмечена: зажми Пробел — выстрел'
        : 'Клик по карте — отметить цель, затем Пробел',
    );
  if (game.charging) return say('Отпусти Пробел — выстрел');
  const base = weaponInfo(id).hint;
  return base ? say(base) : null;
}
