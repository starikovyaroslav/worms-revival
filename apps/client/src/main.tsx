import { Application } from 'pixi.js';
import { render } from 'preact';
import type { MatchConfig, Replay } from '@wr/content';
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
    render(
      <Menu
        initial={lastConfig}
        onStart={(cfg) => start(cfg)}
        onReplay={(r) => start(r.config, r)}
      />,
      root,
    );
  };

  const download = (replay: Replay) => {
    const blob = new Blob([JSON.stringify(replay)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `worms-replay-${replay.config.seed}.wrr`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const start = (cfg: MatchConfig, replay?: Replay) => {
    if (!replay) lastConfig = cfg;
    match?.destroy();
    root.classList.remove('interactive');
    const ui: Partial<UiApi> = {};
    const m = new Match(
      app,
      cfg,
      {
        onMessage: (text) => ui.announce?.(text),
        onTogglePanel: () => ui.togglePanel?.(),
      },
      replay,
    );
    // Keep the source replay when watching; record a new one when playing.
    const currentReplay = () => replay ?? m.replay();
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
        onWatch={() => {
          const r = currentReplay();
          start(r.config, r);
        }}
        onDownload={() => download(currentReplay())}
        replay={replay ? { onSpeed: (x) => m.setSpeed(x) } : undefined}
        wormpot={cfg.wormpot}
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
      // ?cpu=3 makes every team a computer player (watch bots fight).
      teams: lastConfig.teams.map((t) => ({ ...t, cpu: Number(params.get('cpu') ?? 0) })),
    });
    const zoom = params.get('zoom');
    if (zoom && match) (match as Match).scene.camera.zoom = Number(zoom);
  } else {
    showMenu();
  }
}

void boot();
