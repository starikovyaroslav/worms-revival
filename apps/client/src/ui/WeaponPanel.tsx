import { useEffect, useRef, useState } from 'preact/hooks';
import type { Game } from '@wr/sim';
import { PANEL_ROWS, weaponInfo } from '@wr/content';
import { assets } from '@wr/render';
import { turnsWord, weaponStatus } from './weaponStatus';

const iconUrl = (id: string) => assets.url(`weapons/icon/${id}`);

/** How long a slot shakes after a click on it was refused, ms. */
const SHAKE_MS = 300;

interface Props {
  game: Game;
  onPick: (id: string) => void;
  /** A click on an unavailable slot (plays the refusal sound). */
  onDenied?: () => void;
  onClose: () => void;
}

/** A 5x6 pixel padlock (no emoji): body and shackle. */
export function Lock() {
  return (
    <svg class="lock" width="5" height="6" viewBox="0 0 5 6" shape-rendering="crispEdges">
      <path d="M1 0h3v1h1v2H0V1h1z" fill="#cbdbfc" />
      <rect x="1" y="1" width="3" height="2" fill="#323c39" />
      <rect x="0" y="3" width="5" height="3" fill="#fbf236" />
    </svg>
  );
}

/** The W:A weapon panel: one row per F-key, five slots each, and a card for the hovered slot. */
export function WeaponPanel({ game, onPick, onDenied, onClose }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const [shake, setShake] = useState<string | null>(null);
  const shakeTimer = useRef(0);
  useEffect(() => () => clearTimeout(shakeTimer.current), []);
  const weapons = game.rules.weapons;
  // Five slots per row as in W:A; the Util row grows for the crate-only utilities.
  const cols = Array.from(
    { length: Math.max(5, ...weapons.map((w) => w.spec.ui.col + 1)) },
    (_, i) => i,
  );

  const deny = (id: string) => {
    onDenied?.();
    setShake(id);
    clearTimeout(shakeTimer.current);
    shakeTimer.current = window.setTimeout(() => setShake(null), SHAKE_MS);
  };

  const card = hover ? weaponInfo(hover) : null;
  const cardStatus = hover ? weaponStatus(game, hover) : null;

  return (
    <div class="panel-backdrop" onPointerDown={onClose} onContextMenu={(e) => e.preventDefault()}>
      <div class="panel-stack" onPointerDown={(e) => e.stopPropagation()}>
        {card && cardStatus && (
          <div class="weapon-card px-panel">
            <b>{card.name}</b>
            <span class="card-hint">{card.hint}</span>
            <span class="card-stat">
              Боезапас: {cardStatus.ammo < 0 ? '∞' : cardStatus.ammo}
              {cardStatus.delayTotal > 0 && ` · ждать ${turnsWord(cardStatus.delayTotal)}`}
            </span>
            {cardStatus.reason && <span class="card-reason">{cardStatus.reason}</span>}
          </div>
        )}
        <div class="weapon-panel px-panel">
          {PANEL_ROWS.map((label, row) => (
            <div class="panel-row" key={label}>
              <div class="panel-key">{label}</div>
              {cols.map((col) => {
                const def = weapons.find((w) => w.spec.ui.row === row && w.spec.ui.col === col);
                if (!def || !(def.id in game.scheme.weapons))
                  return <div class="slot empty" key={col} />;
                const st = weaponStatus(game, def.id);
                const info = weaponInfo(def.id);
                return (
                  <button
                    key={col}
                    class={`slot ${st.usable ? '' : 'disabled'} ${game.weaponId === def.id ? 'selected' : ''} ${shake === def.id ? 'shake' : ''}`}
                    aria-label={info.name}
                    onPointerEnter={() => setHover(def.id)}
                    onPointerLeave={() => setHover(null)}
                    onClick={() => (st.usable ? onPick(def.id) : deny(def.id))}
                  >
                    <span class="slot-tile">
                      {iconUrl(def.id) ? (
                        <img class="slot-img" src={iconUrl(def.id)} alt="" draggable={false} />
                      ) : (
                        <span class="slot-icon">{info.icon}</span>
                      )}
                    </span>
                    {st.ammo > 0 && <span class="slot-ammo">{st.ammo}</span>}
                    {st.delay > 0 && (
                      <span class="slot-delay">
                        <Lock />
                        {st.delay}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          <div class="panel-legend">
            <span class="slot-delay sample">
              <Lock />2
            </span>
            ждать
            <span class="slot-ammo sample">3</span>
            боезапас
          </div>
        </div>
      </div>
    </div>
  );
}
