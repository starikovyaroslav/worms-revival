import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { Game } from '@wr/sim';
import { Hud, type Announcement } from './Hud';
import { GameOver } from './GameOver';
import type { HudState } from './hudState';
import { WeaponPanel } from './WeaponPanel';
import { EscMenu } from './EscMenu';
import { onEscape, type Dialog } from './escFlow';
import type { Settings, SettingsStore } from '../settings';

/** Imperative hooks the game loop uses to drive the UI. */
export interface UiApi {
  announce(text: string): void;
  togglePanel(): void;
  closePanel(): void;
  isPanelOpen(): boolean;
  /** Space on the surrender weapon: ask first. */
  askSurrender(): void;
}

interface Props {
  game: Game;
  api: Partial<UiApi>;
  onPick: (weaponId: string) => void;
  /** The player clicked a weapon that cannot be used right now. */
  onDenied?: () => void;
  onRematch: () => void;
  onMenu: () => void;
  onWatch: () => void;
  onDownload: () => void;
  wormpot?: string[];
  settings: SettingsStore;
  /** The Esc menu is open: the loop must stand still. */
  onPause: (paused: boolean) => void;
  onSurrender: () => void;
  /** Watching a replay: show the badge and speed controls. */
  replay?: { onSpeed: (speed: number) => void };
}

export function App({
  game,
  api,
  onPick,
  onDenied,
  onRematch,
  onMenu,
  onWatch,
  onDownload,
  replay,
  wormpot,
  settings,
  onPause: onPauseProp,
  onSurrender,
}: Props) {
  // Stable wrapper, so the effects below do not re-run when the parent passes a fresh closure.
  const pauseRef = useRef(onPauseProp);
  pauseRef.current = onPauseProp;
  const onPause = useCallback((p: boolean) => pauseRef.current(p), []);
  const [speed, setSpeed] = useState(1);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [panel, setPanel] = useState(false);
  const [over, setOver] = useState<HudState['over']>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [prefs, setPrefs] = useState<Settings>(() => settings.get());

  useEffect(() => settings.subscribe(setPrefs), [settings]);
  useEffect(() => onPause(dialog !== null), [dialog, onPause]);

  // Esc: weapon panel first, then the menu (and one step back inside it). The handler reads refs that
  // it updates itself, so two quick presses within one frame still step twice.
  const live = useRef({ dialog, panel });
  live.current = { dialog, panel };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape' || e.repeat) return;
      e.preventDefault();
      const r = onEscape(live.current.dialog, live.current.panel);
      live.current = { dialog: r.dialog, panel: live.current.panel && !r.closePanel };
      if (r.closePanel) setPanel(false);
      setDialog(r.dialog);
      // Pause right here, not from the effect: a tick must not run between the key and the render.
      onPause(r.dialog !== null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPause]);

  useEffect(() => {
    let next = 1;
    api.announce = (text) => {
      const a = { id: next++, text };
      setAnnouncements((list) => [...list, a]);
      setTimeout(() => setAnnouncements((list) => list.filter((x) => x !== a)), 3000);
    };
    api.togglePanel = () => setPanel((open) => !open);
    api.closePanel = () => setPanel(false);
    api.askSurrender = () => {
      live.current.dialog = 'surrender';
      onPause(true);
      setDialog('surrender');
    };
  }, [api, onPause]);
  api.isPanelOpen = () => panel;

  return (
    <>
      <Hud game={game} announcements={announcements} onOver={setOver} wormpot={wormpot} />
      {replay && (
        <div class="replay-bar px-panel">
          <span class="replay-badge">● ПОВТОР</span>
          {[1, 2, 4].map((x) => (
            <button
              key={x}
              class={`btn small ${speed === x ? '' : 'secondary'}`}
              onClick={() => {
                setSpeed(x);
                replay.onSpeed(x);
              }}
            >
              {x}×
            </button>
          ))}
          <button class="btn small secondary" onClick={onMenu}>
            Выход
          </button>
        </div>
      )}
      {over && (
        <GameOver
          winner={over.winner}
          color={over.color}
          isReplay={!!replay}
          onRematch={onRematch}
          onMenu={onMenu}
          onWatch={onWatch}
          onDownload={onDownload}
        />
      )}
      {dialog && (
        <EscMenu
          dialog={dialog}
          settings={settings}
          state={prefs}
          isReplay={!!replay}
          onDialog={setDialog}
          onQuit={onMenu}
          onSurrender={() => {
            setDialog(null);
            onSurrender();
          }}
        />
      )}
      {panel && !dialog && (
        <WeaponPanel
          game={game}
          onClose={() => setPanel(false)}
          onDenied={onDenied}
          onPick={(id) => {
            onPick(id);
            setPanel(false);
          }}
        />
      )}
    </>
  );
}
