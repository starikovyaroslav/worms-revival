import { useEffect, useState } from 'preact/hooks';
import type { Game } from '@wr/sim';
import { hudState, type HudState } from './hudState';

export interface Announcement {
  id: number;
  text: string;
}

function Wind({ wind }: { wind: number }) {
  const pct = Math.abs(wind) * 50;
  return (
    <div class="wind" title="Ветер">
      <div class="wind-half left">
        {wind < 0 && <div class="wind-bar" style={{ width: `${pct * 2}%` }} />}
      </div>
      <div class="wind-half right">
        {wind > 0 && <div class="wind-bar" style={{ width: `${pct * 2}%` }} />}
      </div>
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
}: {
  game: Game;
  announcements: Announcement[];
  wormpot?: string[];
  onOver?: (over: HudState['over']) => void;
}) {
  const [s, setS] = useState<HudState>(() => hudState(game, wormpot));

  useEffect(() => {
    let raf = 0;
    let last = '';
    const tick = () => {
      const next = hudState(game, wormpot);
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
  }, [game, onOver, wormpot]);

  return (
    <div class="hud">
      <div class="announcements">
        {announcements.map((a) => (
          <div key={a.id} class="announcement">
            {a.text}
          </div>
        ))}
      </div>

      {s.mods.length > 0 && (
        <div class="hud-mods">
          {s.mods.map((m) => (
            <span key={m.name} title={m.name}>
              {m.icon}
            </span>
          ))}
        </div>
      )}
      <div class="hud-bottom">
        <div class="timer-box">
          <div
            class={`timer ${s.timer !== null && s.timer <= 5 && !s.waiting ? 'urgent' : ''} ${s.waiting ? 'waiting' : ''}`}
          >
            {s.timer ?? '—'}
          </div>
          <div class={`round ${s.suddenDeath ? 'sd' : ''}`}>
            {s.suddenDeath ? 'SD' : formatClock(s.round)}
          </div>
        </div>

        <div class="teams">
          {s.teams.map((t) => (
            <div class={`team ${t.active ? 'active' : ''}`} key={t.name}>
              <span class="team-name" style={{ color: t.color }}>
                {t.name}
              </span>
              <div
                class="team-bar"
                style={{ width: `${(t.hp / s.maxHp) * 260}px`, background: t.color }}
              />
            </div>
          ))}
        </div>

        <div class="right-box">
          {s.weapon && (
            <div class="weapon">
              <b>{s.weapon.name}</b>
              {s.weapon.fuse !== null && <span> · {s.weapon.fuse} с</span>}
              {s.weapon.bounce && <span> · {s.weapon.bounce}</span>}
              {s.weapon.hint && <div class="weapon-hint">{s.weapon.hint}</div>}
            </div>
          )}
          <Wind wind={s.wind} />
        </div>
      </div>
    </div>
  );
}
