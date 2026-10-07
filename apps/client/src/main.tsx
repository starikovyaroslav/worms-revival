import { Application } from 'pixi.js';
import { render } from 'preact';
import type { MatchConfig } from '@wr/content';
import { App, type UiApi } from './ui/App';
import { Menu, defaultConfig } from './ui/Menu';
import { Match } from './match';

async function boot() {
  const app = new Application();
  await app.init({
    resizeTo: window,
    background: '#0b1020',
    antialias: true,
    preference: 'webgl',
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  document.getElementById('game')!.appendChild(app.canvas);
  app.ticker.stop();
  const root = document.getElementById('ui')!;

  let match: Match | null = null;
  let lastConfig = defaultConfig();

  const showMenu = () => {
    match?.destroy();
    match = null;
    app.render();
    root.classList.add('interactive');
    render(<Menu initial={lastConfig} onStart={start} />, root);
  };

  const start = (cfg: MatchConfig) => {
    lastConfig = cfg;
    match?.destroy();
    root.classList.remove('interactive');
    const ui: Partial<UiApi> = {};
    const m = new Match(app, cfg, {
      onMessage: (text) => ui.announce?.(text),
      onTogglePanel: () => ui.togglePanel?.(),
    });
    match = m;
    // Re-mount the UI so state (announcements, game over) starts fresh.
    render(null, root);
    render(
      <App
        game={m.game}
        api={ui}
        onPick={(weapon) => m.input.push({ t: 'select', weapon })}
        onRematch={() => start({ ...cfg, seed: Math.floor(Math.random() * 1e9) })}
        onMenu={showMenu}
      />,
      root,
    );
  };

  // ?seed=… skips the menu (handy for testing and sharing maps).
  const params = new URLSearchParams(location.search);
  if (params.has('seed')) {
    start({
      ...lastConfig,
      seed: Number(params.get('seed')),
      style: params.get('style') === 'cavern' ? 'cavern' : 'island',
      themeId: params.get('theme') ?? 'meadow',
      schemeId: params.get('scheme') ?? 'intermediate',
    });
    const zoom = params.get('zoom');
    if (zoom && match) (match as Match).scene.camera.zoom = Number(zoom);
  } else {
    showMenu();
  }
}

void boot();
