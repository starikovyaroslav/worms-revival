import { useEffect, useRef, useState } from 'preact/hooks';
import { SCHEMES, SCHEME_INFO, TEAM_PRESETS, type MatchConfig, type Replay } from '@wr/content';
import { THEMES, TEAM_COLORS } from '@wr/render';
import { drawMapPreview } from './mapPreview';
import { Wormpot } from './Wormpot';

const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
const randomSeed = () => Math.floor(Math.random() * 1e9);

export function defaultConfig(): MatchConfig {
  return {
    seed: randomSeed(),
    style: 'island',
    themeId: THEMES[Math.floor(Math.random() * THEMES.length)]!.id,
    schemeId: 'intermediate',
    teams: [0, 1].map((i) => ({ ...TEAM_PRESETS[i]!, cpu: 0 })),
  };
}

interface Props {
  initial: MatchConfig;
  onStart: (cfg: MatchConfig) => void;
  onReplay: (replay: Replay) => void;
}

export function Menu({ initial, onStart, onReplay }: Props) {
  const openReplay = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      onReplay(JSON.parse(await file.text()) as Replay);
    } catch {
      alert('Не удалось прочитать файл повтора');
    }
  };
  const [cfg, setCfg] = useState<MatchConfig>(initial);
  const preview = useRef<HTMLCanvasElement>(null);
  const set = (patch: Partial<MatchConfig>) => setCfg((c) => ({ ...c, ...patch }));

  useEffect(() => {
    // Let the UI paint before the (slightly slow) map generation.
    const id = setTimeout(() => {
      if (preview.current) drawMapPreview(preview.current, cfg.seed, cfg.style, cfg.themeId);
    }, 30);
    return () => clearTimeout(id);
  }, [cfg.seed, cfg.style, cfg.themeId]);

  const setTeam = (i: number, presetIdx: number) => {
    const teams = cfg.teams.slice();
    teams[i] = { ...TEAM_PRESETS[presetIdx]!, cpu: teams[i]?.cpu ?? 0 };
    set({ teams });
  };
  const addTeam = () => {
    const used = new Set(cfg.teams.map((t) => t.name));
    const preset = TEAM_PRESETS.find((p) => !used.has(p.name)) ?? TEAM_PRESETS[0]!;
    set({ teams: [...cfg.teams, { ...preset, cpu: 0 }] });
  };

  return (
    <div class="menu">
      <h1 class="logo">
        WORMS <span>REVIVAL</span>
      </h1>
      <div class="menu-body">
        <section class="menu-card">
          <h2>Команды</h2>
          {cfg.teams.map((t, i) => (
            <div class="team-row" key={i}>
              <span
                class="team-dot"
                style={{ background: hex(TEAM_COLORS[i % TEAM_COLORS.length]!) }}
              />
              <select
                value={TEAM_PRESETS.findIndex((p) => p.name === t.name)}
                onChange={(e) => setTeam(i, Number((e.target as HTMLSelectElement).value))}
              >
                {TEAM_PRESETS.map((p, pi) => (
                  <option value={pi} key={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                value={t.cpu}
                onChange={(e) => {
                  const teams = cfg.teams.slice();
                  teams[i] = { ...t, cpu: Number((e.target as HTMLSelectElement).value) };
                  set({ teams });
                }}
              >
                <option value={0}>Человек</option>
                {[1, 2, 3, 4, 5].map((d) => (
                  <option value={d} key={d}>
                    CPU {'★'.repeat(d)}
                  </option>
                ))}
              </select>
              {cfg.teams.length > 2 && (
                <button
                  class="icon-btn"
                  onClick={() => set({ teams: cfg.teams.filter((_, j) => j !== i) })}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {cfg.teams.length < 4 && (
            <button class="btn small" onClick={addTeam}>
              + команда
            </button>
          )}
        </section>

        <section class="menu-card">
          <h2>Карта</h2>
          <canvas ref={preview} class="map-preview" width={320} height={140} />
          <div class="row">
            <label>
              Тип
              <select
                value={cfg.style}
                onChange={(e) =>
                  set({ style: (e.target as HTMLSelectElement).value as MatchConfig['style'] })
                }
              >
                <option value="island">Острова</option>
                <option value="cavern">Пещера</option>
              </select>
            </label>
            <label>
              Тема
              <select
                value={cfg.themeId}
                onChange={(e) => set({ themeId: (e.target as HTMLSelectElement).value })}
              >
                {THEMES.map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div class="row">
            <label>
              Seed
              <input
                type="number"
                value={cfg.seed}
                onChange={(e) => set({ seed: Number((e.target as HTMLInputElement).value) || 0 })}
              />
            </label>
            <button
              class="btn small"
              title="Случайная карта"
              onClick={() => set({ seed: randomSeed() })}
            >
              🎲
            </button>
          </div>
          <label>
            Схема
            <select
              value={cfg.schemeId}
              onChange={(e) => {
                const schemeId = (e.target as HTMLSelectElement).value;
                const style = SCHEME_INFO[schemeId]?.style;
                set(style ? { schemeId, style } : { schemeId });
              }}
            >
              {SCHEMES.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <p class="scheme-desc">{SCHEME_INFO[cfg.schemeId]?.description}</p>
        </section>

        <section class="menu-card">
          <h2>Wormpot</h2>
          <Wormpot value={cfg.wormpot ?? []} onChange={(wormpot) => set({ wormpot })} />
        </section>
      </div>
      <button class="btn big" onClick={() => onStart(cfg)}>
        В бой!
      </button>
      <label class="btn small secondary file-btn">
        Открыть повтор…
        <input type="file" accept=".wrr,application/json" onChange={openReplay} hidden />
      </label>
      <p class="controls-help">
        ←→ ходьба · ↑↓ прицел · Enter прыжок (×2 сальто) · Пробел огонь · 1–5 фитиль · ПКМ оружие ·
        F1–F12 ряды оружия
      </p>
    </div>
  );
}
