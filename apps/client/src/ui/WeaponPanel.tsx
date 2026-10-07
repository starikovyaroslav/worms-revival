import { useState } from 'preact/hooks';
import { allWeapons, weaponSetting, type Game } from '@wr/sim';
import { PANEL_ROWS, weaponInfo } from '@wr/content';

interface Props {
  game: Game;
  onPick: (id: string) => void;
  onClose: () => void;
}

/** The W:A weapon panel: one row per F-key, five slots each. */
export function WeaponPanel({ game, onPick, onClose }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const team = game.teams[game.activeTeam];
  const weapons = allWeapons().filter((w) => !w.id.startsWith('test-'));
  const hovered = hover ? weaponInfo(hover) : null;

  return (
    <div class="panel-backdrop" onPointerDown={onClose} onContextMenu={(e) => e.preventDefault()}>
      <div class="weapon-panel" onPointerDown={(e) => e.stopPropagation()}>
        {PANEL_ROWS.map((label, row) => (
          <div class="panel-row" key={label}>
            <div class="panel-key">{label}</div>
            {[0, 1, 2, 3, 4].map((col) => {
              const def = weapons.find((w) => w.row === row && w.col === col);
              if (!def) return <div class="slot empty" key={col} />;
              const ammo = team?.ammo[def.id] ?? 0;
              const inScheme = def.id in game.scheme.weapons;
              const delay = Math.max(
                0,
                weaponSetting(game.scheme, def.id).delay - (team?.turnsTaken ?? 0),
              );
              const usable = game.canUse(def.id);
              if (!inScheme) return <div class="slot empty" key={col} />;
              const info = weaponInfo(def.id);
              return (
                <button
                  key={col}
                  class={`slot ${usable ? '' : 'disabled'} ${game.weaponId === def.id ? 'selected' : ''}`}
                  onPointerEnter={() => setHover(def.id)}
                  onPointerLeave={() => setHover(null)}
                  onClick={() => usable && onPick(def.id)}
                >
                  <span class="slot-icon">{info.icon}</span>
                  {ammo > 0 && <span class="slot-ammo">{ammo}</span>}
                  {delay > 0 && <span class="slot-delay">{delay}</span>}
                </button>
              );
            })}
          </div>
        ))}
        <div class="panel-footer">
          {hovered ? (
            <>
              <b>{hovered.name}</b>
              <span>{hovered.hint}</span>
            </>
          ) : (
            <span>Выбери оружие</span>
          )}
        </div>
      </div>
    </div>
  );
}
