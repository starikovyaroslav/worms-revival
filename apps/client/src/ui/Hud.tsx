import { useEffect, useState } from 'preact/hooks';
import type { Game } from '@wr/sim';
import { assets } from '@wr/render';
import { hudState, type HudState } from './hudState';

export interface Announcement {
  id: number;
  text: string;
}

/** How long the "whose turn" banner stays, ms. */
const BANNER_MS = 1200;

function Wind({ wind }: { wind: number }) {
  const strength = Math.abs(wind);
  const bar = <div class="wind-bar" style={{ width: `${strength * 100}%` }} />;
  return (
    <div
      class="wind px-panel"
      title="Ветер"
      aria-label={`Ветер: ${wind < 0 ? 'влево' : wind > 0 ? 'вправо' : 'штиль'}, ${Math.round(strength * 10)}`}
    >
      <span class="wind-label">ВЕТЕР</span>
      <div class="wind-track">
        <div class="wind-half left">{wind < 0 && bar}</div>
        <div class="wind-tick" />
        <div class="wind-half right">{wind > 0 && bar}</div>
      </div>
      <span class="wind-num">
        {wind < 0 ? '<' : ''}
        {Math.round(strength * 10)}
        {wind > 0 ? '>' : ''}
      </span>
    </div>
  );
}

function formatClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function Hud({
  game,
  announcements,
  onOver,
  wormpot,
  mouse,
}: {
  game: Game;
  announcements: Announcement[];
  wormpot?: string[];
  /** Map point under the cursor, in world px. */
  mouse?: () => { x: number; y: number } | null;
  onOver?: (over: HudState['over']) => void;
}) {
  const [s, setS] = useState<HudState>(() => hudState(game, wormpot, mouse?.() ?? null));
  const [banner, setBanner] = useState<number | null>(null);
  const turnNumber = s.turn?.number ?? null;
  const crate = s.crate;

  // A turn banner on every new turn; it is not shown while the hot-seat prompt already says whose turn it is.
  useEffect(() => {
    if (turnNumber === null || crate) return;
    setBanner(turnNumber);
    const id = setTimeout(() => setBanner(null), BANNER_MS);
    return () => clearTimeout(id);
  }, [turnNumber, crate]);

  useEffect(() => {
    let raf = 0;
    let last = '';
    const tick = () => {
      const next = hudState(game, wormpot, mouse?.() ?? null);
      const key = JSON.stringify(next);
      if (key !== last) {
        last = key;
        setS(next);
        onOver?.(next.over);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [game, onOver, wormpot, mouse]);

  return (
    <div class="hud">
      <div class="announcements">
        {announcements.map((a) => (
          <div key={a.id} class="announcement">
            {a.text}
          </div>
        ))}
      </div>

      {s.turn && s.waiting && (
        <div class="turn-prompt">
          Команда {s.turn.team}
          <div class="turn-prompt-key">нажмите любую клавишу</div>
        </div>
      )}
      {crate && <div class="turn-banner">Падает ящик · Пробел — не ждать</div>}
      {s.turn && !s.waiting && !crate && banner === s.turn.number && (
        <div class="turn-banner" key={s.turn.number}>
          {s.turn.team} — {s.turn.worm}
        </div>
      )}

      {s.mods.length > 0 && (
        <div class="hud-mods px-panel">
          {s.mods.map((m) => (
            <span key={m.name} title={m.name}>
              {m.icon}
            </span>
          ))}
        </div>
      )}
      {s.weapon?.hint && (
        <div class={`hint-line px-panel ${s.weapon.hint.warn ? 'warn' : ''}`}>
          {s.weapon.hint.text}
        </div>
      )}
      <div class="hud-bottom">
        <div class="timer-box px-panel">
          {/* D6: the big number is the turn countdown (seconds), the small one the round clock. */}
          <div class="cap">{s.waiting ? 'ГОТОВ' : 'ХОД'}</div>
          <div
            class={`timer ${s.timer !== null && s.timer <= 5 && !s.waiting ? 'urgent' : ''} ${s.waiting ? 'waiting' : ''}`}
          >
            {s.timer ?? '--'}
          </div>
          <div class="cap">РАУНД</div>
          <div class={`round ${s.suddenDeath ? 'sd' : ''}`}>
            {s.suddenDeath ? 'SD' : formatClock(s.round)}
          </div>
        </div>

        <div class="teams">
          {s.teams.map((t) => (
            <div class={`team px-panel ${t.active ? 'active' : ''}`} key={t.name}>
              <span class="team-name" title={t.name}>
                <i class="team-flag" style={{ background: t.color }} />
                <span>{t.name}</span>
              </span>
              <div class="team-trough">
                <div
                  class="team-bar"
                  style={{
                    width: `${Math.min(100, (t.hp / s.maxHp) * 100)}%`,
                    background: t.color,
                  }}
                />
              </div>
              <span class="team-hp">{t.hp}</span>
            </div>
          ))}
        </div>

        <div class="right-box">
          {s.weapon && (
            <div class="weapon px-panel">
              <img class="hud-weapon-icon" src={assets.url(`weapons/icon/${s.weapon.id}`)} alt="" />
              <div class="hud-weapon-copy">
                <span class="hud-weapon-label">ВООРУЖЕНИЕ</span>
                <b>{s.weapon.name}</b>
                <span class="hud-weapon-details">
                  {s.weapon.fuse !== null && <span>Взрыватель · {s.weapon.fuse} с</span>}
                  {s.weapon.bounce && <span> · Отскок: {s.weapon.bounce}</span>}
                </span>
                <span class="hud-arsenal-key">ПКМ · АРСЕНАЛ</span>
              </div>
            </div>
          )}
          {s.firstTurn && <div class="weapon-hint first-hint">ПКМ / F1–F12 — выбор оружия</div>}
          <Wind wind={s.wind} />
        </div>
      </div>
    </div>
  );
}
