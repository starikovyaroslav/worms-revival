import { useEffect, useRef } from 'preact/hooks';
import type { Settings, SettingsStore } from '../settings';
import type { Dialog } from './escFlow';

interface Props {
  dialog: Dialog;
  settings: SettingsStore;
  state: Settings;
  /** Replay playback: the menu says "Выйти" instead of warning about a lost match. */
  isReplay: boolean;
  onDialog: (d: Dialog | null) => void;
  onQuit: () => void;
  onSurrender: () => void;
}

const CONTROLS: [string, string][] = [
  ['Влево/вправо', 'ходьба'],
  ['Вверх/вниз', 'прицел'],
  ['Enter', 'прыжок (2х: сальто)'],
  ['Пробел', 'огонь, держать: сила'],
  ['1-5', 'фитиль гранаты'],
  ['+ / -', 'отскок гранаты'],
  ['ПКМ', 'панель оружия'],
  ['F1-F12', 'ряды оружия'],
  ['ЛКМ', 'цель / запуск'],
  ['C, Home', 'камера на червя'],
  ['Колесо', 'масштаб'],
  ['Перетащить', 'обзор карты'],
  ['Esc', 'меню и пауза'],
];

/** Focus walks the buttons with the up/down arrows; Enter and Space press the focused one (native). */
function useArrowFocus(root: { current: HTMLDivElement | null }) {
  return (e: KeyboardEvent) => {
    const isTab = e.code === 'Tab';
    if (e.code !== 'ArrowDown' && e.code !== 'ArrowUp' && !isTab) return;
    const items = [...(root.current?.querySelectorAll<HTMLElement>('button, input') ?? [])];
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (isTab) {
      // Trap: Tab cycles inside the menu.
      const t = (i + (e.shiftKey ? -1 : 1) + items.length) % items.length;
      items[t]?.focus();
      e.preventDefault();
      return;
    }
    const next = (i + (e.code === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
    e.preventDefault();
  };
}

export function EscMenu({
  dialog,
  settings,
  state,
  isReplay,
  onDialog,
  onQuit,
  onSurrender,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const onKeyDown = useArrowFocus(root);
  // Give focus back to whatever had it (the game) when the menu closes.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    return () => {
      if (before && before !== document.body && before.isConnected) before.focus();
      else (document.activeElement as HTMLElement | null)?.blur();
    };
  }, []);
  // Focus the first control of every screen so the keyboard works at once.
  useEffect(() => {
    root.current?.querySelector<HTMLElement>('button, input')?.focus();
  }, [dialog]);

  const volumePct = Math.round(state.sfxVolume * 100);
  return (
    <div class="panel-backdrop esc-backdrop" onContextMenu={(e) => e.preventDefault()}>
      <div
        class="esc-menu"
        ref={root}
        onKeyDown={onKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="esc-title"
      >
        {dialog === 'menu' && (
          <>
            <h2 id="esc-title">Пауза</h2>
            <button class="btn" onClick={() => onDialog(null)}>
              Продолжить
            </button>
            <button class="btn secondary" onClick={() => onDialog('controls')}>
              Управление
            </button>
            <button class="btn secondary" onClick={() => onDialog('sound')}>
              Звук
            </button>
            <button class="btn secondary" onClick={() => onDialog('quit')}>
              Выйти в меню
            </button>
          </>
        )}
        {dialog === 'controls' && (
          <>
            <h2 id="esc-title">Управление</h2>
            <dl class="esc-controls">
              {CONTROLS.map(([key, what]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{what}</dd>
                </div>
              ))}
            </dl>
            <button class="btn" onClick={() => onDialog('menu')}>
              Назад
            </button>
          </>
        )}
        {dialog === 'sound' && (
          <>
            <h2 id="esc-title">Звук</h2>
            <label class="esc-row">
              <span>Громкость {volumePct}%</span>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={volumePct}
                onInput={(e) =>
                  settings.update({ sfxVolume: Number((e.target as HTMLInputElement).value) / 100 })
                }
              />
            </label>
            <button class="btn secondary" onClick={() => settings.update({ muted: !state.muted })}>
              Звук: {state.muted ? 'выкл' : 'вкл'}
            </button>
            <button
              class="btn secondary"
              onClick={() => settings.update({ musicOn: !state.musicOn })}
            >
              Музыка: {state.musicOn ? 'вкл' : 'выкл'}
            </button>
            <p class="esc-note">Музыки в игре пока нет: переключатель сохраняется на будущее.</p>
            <button class="btn" onClick={() => onDialog('menu')}>
              Назад
            </button>
          </>
        )}
        {dialog === 'quit' && (
          <>
            <h2 id="esc-title">Выйти в меню?</h2>
            <p class="esc-note">
              {isReplay ? 'Просмотр повтора будет прерван.' : 'Текущий матч будет потерян.'}
            </p>
            <button class="btn secondary" onClick={() => onDialog('menu')}>
              Нет, назад
            </button>
            <button class="btn" onClick={onQuit}>
              Да, выйти
            </button>
          </>
        )}
        {dialog === 'surrender' && (
          <>
            <h2 id="esc-title">Сдаться?</h2>
            <p class="esc-note">Вся ваша команда выбывает из матча.</p>
            <button class="btn secondary" onClick={() => onDialog(null)}>
              Нет, играть
            </button>
            <button class="btn" onClick={onSurrender}>
              Да, сдаться
            </button>
          </>
        )}
      </div>
    </div>
  );
}
