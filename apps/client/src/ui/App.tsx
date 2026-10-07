import { useEffect, useState } from 'preact/hooks';
import type { Game } from '@wr/sim';
import { Hud, type Announcement } from './Hud';
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
}

export function App({ game, api, onPick }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [panel, setPanel] = useState(false);

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
      <Hud game={game} announcements={announcements} />
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
