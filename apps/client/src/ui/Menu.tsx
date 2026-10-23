import { useEffect, useRef, useState } from 'preact/hooks';
import {
  REPLAY_VERSION,
  replayProblem,
  ReplayPlayer,
  SCHEMES,
  SCHEME_INFO,
  TEAM_PRESETS,
  type MatchConfig,
  type Replay,
  type ReplayProblem,
} from '@wr/content';
import {
  THEMES,
  TEAM_COLORS,
  CHARACTER_CLASSES,
  variantsForClass,
  appearanceClass,
  resolveTeamVariant,
  SKINS,
  assets,
} from '@wr/render';
import { drawMapPreview } from './mapPreview';
import { Wormpot } from './Wormpot';
import { teamPreviewUrl } from './teamPreviews';

const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
const randomSeed = () => Math.floor(Math.random() * 1e9);

export function defaultConfig(): MatchConfig {
  return {
    mapVersion: 2,
    seed: randomSeed(),
    style: 'island',
    themeId: THEMES[Math.floor(Math.random() * THEMES.length)]!.id,
    schemeId: 'intermediate',
    teams: [0, 2].map((preset, i) => ({
      ...TEAM_PRESETS[preset]!,
      cpu: 0,
      characterClass: i ? 'elder' : 'heavy',
    })),
  };
}

interface Props {
  initial: MatchConfig;
  onStart: (cfg: MatchConfig) => void;
  onReplay: (replay: Replay) => void;
}

function replayErrorText(problem: ReplayProblem): string {
  switch (problem.kind) {
    case 'version':
      return `Повтор записан другой версией игры (формат ${String(problem.found ?? '1')}, нужен ${REPLAY_VERSION}). Старые повторы не воспроизводятся.`;
    case 'ruleset':
      return 'Правила оружия или схем изменились после записи этого повтора: он разошёлся бы с записью.';
    case 'malformed':
      return 'Не удалось прочитать файл повтора.';
    case 'unplayable':
      return 'Повтор не удалось запустить: файл повреждён.';
  }
}

export function Menu({ initial, onStart, onReplay }: Props) {
  const [replayError, setReplayError] = useState('');
  const openReplay = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    let raw: unknown = null;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      // Falls through to the "malformed" message.
    }
    input.value = ''; // picking the same file again must fire a change event
    const problem = replayProblem(raw);
    if (problem) {
      setReplayError(replayErrorText(problem));
      return;
    }
    // Building the match can still fail on a hand-edited file: try it here, before the menu is torn down.
    try {
      new ReplayPlayer(raw as Replay);
    } catch {
      setReplayError(replayErrorText({ kind: 'unplayable' }));
      return;
    }
    setReplayError('');
    onReplay(raw as Replay);
  };
  const [cfg, setCfg] = useState<MatchConfig>(initial);
  const preview = useRef<HTMLCanvasElement>(null);
  const replayInput = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<MatchConfig>) => setCfg((c) => ({ ...c, ...patch }));

  useEffect(() => {
    // Let the UI paint before the (slightly slow) map generation.
    const id = setTimeout(() => {
      if (preview.current)
        drawMapPreview(preview.current, cfg.seed, cfg.style, cfg.themeId, cfg.mapVersion ?? 1);
    }, 30);
    return () => clearTimeout(id);
  }, [cfg.seed, cfg.style, cfg.themeId, cfg.mapVersion]);

  const setTeam = (i: number, presetIdx: number) => {
    const teams = cfg.teams.slice();
    teams[i] = {
      ...TEAM_PRESETS[presetIdx]!,
      cpu: teams[i]?.cpu ?? 0,
      characterClass: appearanceClass(teams[i] ?? {}),
      characterVariants: teams[i]?.characterVariants,
    };
    set({ teams });
  };
  const addTeam = () => {
    const used = new Set(cfg.teams.map((t) => t.name));
    const preset = TEAM_PRESETS.find((p) => !used.has(p.name)) ?? TEAM_PRESETS[0]!;
    set({ teams: [...cfg.teams, { ...preset, cpu: 0, characterClass: 'classic' }] });
  };

  const compactLogo = assets.url('ui/logo-menu');
  const availableVariants = new Set(
    SKINS.filter((skin) => assets.has(`skins/${skin.id}/idle`)).map((skin) => skin.id),
  );
  const memberCount = SCHEMES.find((s) => s.id === cfg.schemeId)?.wormsPerTeam ?? 4;
  const logo = compactLogo ?? assets.url('ui/logo');
  const layers = ['near', 'mid', 'far', 'sky'].map((name) =>
    assets.url(`bg/${cfg.themeId}/${name}`),
  );
  const hasArt = layers.every(Boolean);

  return (
    <div
      class={`menu${hasArt ? ' has-art' : ''}${cfg.teams.length > 2 ? ' large-roster' : ''}`}
      style={
        hasArt ? { backgroundImage: layers.map((url) => `url("${url}")`).join(',') } : undefined
      }
    >
      <div class="menu-stage">
        <header class="menu-header">
          <h1 class="logo" aria-label="Worms revival">
            {assets.variantPrefix && (
              <span class="comic-wordmark" aria-hidden="true">
                <img src="/assets/comic-ui/logo.png" alt="" />
              </span>
            )}
            {logo ? (
              <img
                src={logo}
                alt="Worms revival"
                width={compactLogo ? 159 : 317}
                height={compactLogo ? 74 : 147}
              />
            ) : (
              <>
                Worms <span>revival</span>
              </>
            )}
          </h1>
          <div class="menu-heading">
            <span class="menu-eyebrow">ЛОКАЛЬНАЯ ИГРА</span>
            <h2>Новый матч</h2>
            <p>Собери команды, выбери поле боя — и вперёд.</p>
          </div>
        </header>
        <div class="menu-body">
          <section class="menu-card px-panel">
            <h2>
              <span class="section-index">01</span> Команды
            </h2>
            {cfg.teams.map((t, i) => (
              <div
                class="team-row"
                key={i}
                style={{ '--team-color': hex(TEAM_COLORS[i % TEAM_COLORS.length]!) }}
              >
                <div class="team-lineup">
                  <button
                    class="team-preview"
                    disabled={appearanceClass(t) === 'legacy'}
                    aria-label={`Настроить состав команды ${i + 1}`}
                    title="Иллюстрация класса. Нажмите, чтобы настроить точный состав."
                    onClick={(event) => {
                      const roster = event.currentTarget
                        .closest('.team-row')
                        ?.querySelector<HTMLDetailsElement>('.character-roster');
                      if (roster) {
                        roster.open = true;
                        roster.querySelector('select')?.focus();
                      }
                    }}
                  >
                    <img src={teamPreviewUrl(appearanceClass(t))} alt="" />
                  </button>
                </div>
                <span
                  class="team-dot"
                  style={{ background: hex(TEAM_COLORS[i % TEAM_COLORS.length]!) }}
                />
                <select
                  aria-label={`Название команды ${i + 1}`}
                  value={TEAM_PRESETS.findIndex((p) => p.name === t.name)}
                  onChange={(e) => setTeam(i, Number((e.target as HTMLSelectElement).value))}
                >
                  {TEAM_PRESETS.map((p, pi) => (
                    <option value={pi} key={p.name}>
                      {p.name === 'Червячий спецназ' ? 'Спецназ' : p.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`Управление командой ${i + 1}`}
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
                <label class="skin-choice">
                  <span>Класс</span>
                  <select
                    aria-label={`Класс команды ${i + 1}`}
                    value={appearanceClass(t)}
                    onChange={(e) => {
                      const teams = cfg.teams.slice();
                      teams[i] = {
                        ...t,
                        characterClass: (e.target as HTMLSelectElement).value,
                        characterVariants: [],
                      };
                      set({ teams });
                    }}
                  >
                    <option value="mixed">Смешанный состав</option>
                    <option value="legacy">Прежний герой</option>
                    {CHARACTER_CLASSES.map((family) => (
                      <option
                        key={family.id}
                        value={family.id}
                        disabled={
                          !variantsForClass(family.id).some((s) => availableVariants.has(s.id))
                        }
                      >
                        {family.name} (
                        {
                          variantsForClass(family.id).filter((s) => availableVariants.has(s.id))
                            .length
                        }
                        )
                      </option>
                    ))}
                  </select>
                </label>
                {appearanceClass(t) !== 'legacy' && (
                  <details class="character-roster">
                    <summary>Состав персонажей</summary>
                    <p>
                      Автовыбор чередует варианты класса. Если вариантов меньше червей, они
                      повторяются.
                    </p>
                    {t.worms.slice(0, memberCount).map((name, member) => {
                      const variant = resolveTeamVariant(t, member, availableVariants);
                      return (
                        <label class="character-member" key={member}>
                          <span>{name}</span>
                          {variant && (
                            <span
                              class="skin-swatch"
                              style={{
                                backgroundImage: `url(${assets.url(`skins/${variant}/idle`)})`,
                              }}
                            />
                          )}
                          <select
                            aria-label={`Персонаж ${member + 1} команды ${i + 1}`}
                            value={t.characterVariants?.[member] ?? ''}
                            onChange={(e) => {
                              const teams = cfg.teams.slice(),
                                characterVariants = [...(t.characterVariants ?? [])];
                              characterVariants[member] = (e.target as HTMLSelectElement).value;
                              teams[i] = { ...t, characterVariants };
                              set({ teams });
                            }}
                          >
                            <option value="">Авто</option>
                            {variantsForClass(appearanceClass(t))
                              .filter((s) => availableVariants.has(s.id))
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                          </select>
                        </label>
                      );
                    })}
                  </details>
                )}
                {cfg.teams.length > 2 && (
                  <button
                    class="icon-btn"
                    aria-label={`Удалить команду ${i + 1}`}
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

          <section class="menu-card px-panel">
            <h2>
              <span class="section-index">02</span> Поле боя
            </h2>
            <canvas ref={preview} class="map-preview" width={320} height={140} />
            <div class="row map-toolbar">
              <label>
                <span class="map-field-label">Тема</span>
                <select
                  aria-label="Тема"
                  value={cfg.themeId}
                  onChange={(e) => set({ themeId: (e.target as HTMLSelectElement).value })}
                >
                  {THEMES.map((theme) => (
                    <option value={theme.id} key={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span class="map-field-label">Тип</span>
                <select
                  aria-label="Тип"
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
                <span class="map-field-label">Схема</span>
                <select
                  aria-label="Схема"
                  value={cfg.schemeId}
                  onChange={(e) => {
                    const schemeId = (e.target as HTMLSelectElement).value;
                    const style = SCHEME_INFO[schemeId]?.style;
                    set(style ? { schemeId, style } : { schemeId });
                  }}
                >
                  {SCHEMES.map((scheme) => (
                    <option value={scheme.id} key={scheme.id}>
                      {scheme.id === 'intermediate' ? 'Классика' : scheme.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                class="btn small"
                title="Случайная карта"
                onClick={() => set({ seed: randomSeed() })}
              >
                Другая карта
              </button>
            </div>
            <details class="map-details">
              <summary>Параметры карты</summary>
              <label>
                Seed
                <input
                  type="number"
                  value={cfg.seed}
                  onChange={(e) => set({ seed: Number((e.target as HTMLInputElement).value) || 0 })}
                />
              </label>
              <p class="scheme-desc">{SCHEME_INFO[cfg.schemeId]?.description}</p>
            </details>
          </section>

          <details class="menu-card px-panel modifiers-card">
            <summary>
              <span class="section-index">03</span> Особые правила{' '}
              <span class="optional-label">необязательно</span>
            </summary>
            <Wormpot value={cfg.wormpot ?? []} onChange={(wormpot) => set({ wormpot })} />
          </details>
        </div>
        <div class="menu-actions">
          <button class="btn big" onClick={() => onStart(cfg)}>
            В бой!
          </button>
          <button class="btn small secondary file-btn" onClick={() => replayInput.current?.click()}>
            Открыть повтор…
          </button>
          <input
            ref={replayInput}
            type="file"
            accept=".wrr,application/json"
            onChange={openReplay}
            hidden
          />
        </div>
        {replayError && (
          <p class="menu-error" role="alert">
            {replayError}
          </p>
        )}
        <p class="controls-help">
          Стрелки ходьба и прицел · Enter прыжок (×2 сальто) · Пробел огонь · 1–5 фитиль · ПКМ
          оружие · F1–F12 ряды оружия
        </p>
      </div>
    </div>
  );
}
