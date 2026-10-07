import { useEffect, useState } from 'preact/hooks';
import type { Game } from '@wr/sim';
import { Hud, type Announcement } from './Hud';
import { GameOver } from './GameOver';
import type { HudState } from './hudState';
import { WeaponPanel } from './WeaponPanel';

/** Imperative hooks the game loop uses to drive the UI. */
export interface UiApi {
  announce(text: string): void;
  togglePanel(): void;
  closePanel(): void;
  isPanelOpen(): boolean;
}

interface Props {
  game: Game;
  api: Partial<UiApi>;
  onPick: (weaponId: string) => void;
  onRematch: () => void;
  onMenu: () => void;
  onWatch: () => void;
  onDownload: () => void;
  /** Watching a replay: show the badge and speed controls. */
  replay?: { onSpeed: (speed: number) => void };
}

export function App({ game, api, onPick, onRematch, onMenu, onWatch, onDownload, replay }: Props) {
  const [speed, setSpeed] = useState(1);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [panel, setPanel] = useState(false);
  const [over, setOver] = useState<HudState['over']>(null);

  useEffect(() => {
    let next = 1;
    api.announce = (text) => {
      const a = { id: next++, text };
      setAnnouncements((list) => [...list, a]);
      setTimeout(() => setAnnouncements((list) => list.filter((x) => x !== a)), 3000);
    };
    api.togglePanel = () => setPanel((open) => !open);
    api.closePanel = () => setPanel(false);
  }, [api]);
  api.isPanelOpen = () => panel;

  return (
    <>
      <Hud game={game} announcements={announcements} onOver={setOver} />
      {replay && (
        <div class="replay-bar">
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
      {panel && (
        <WeaponPanel
          game={game}
          onClose={() => setPanel(false)}
          onPick={(id) => {
            onPick(id);
            setPanel(false);
          }}
        />
      )}
    </>
  );
}
