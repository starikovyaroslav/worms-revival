import '@fontsource/pixelify-sans/latin-600.css';
import '@fontsource/pixelify-sans/cyrillic-600.css';
import '@fontsource/pixelify-sans/latin-700.css';
import '@fontsource/pixelify-sans/cyrillic-700.css';
import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/press-start-2p/cyrillic-400.css';
import { Application, TextureStyle } from 'pixi.js';
import { render } from 'preact';
import type { MatchConfig, Replay } from '@wr/content';
import { App, type UiApi } from './ui/App';
import { Menu, defaultConfig } from './ui/Menu';
import { ManifestError, ZOOM_LEVELS, assets } from '@wr/render';
import { installGlobalHandlers, showFatal, showWarning } from './fatal';
import { Match } from './match';
import { settingsStore } from './settings';
import { ViewportController, menuScale, parseKOverride, type Viewport } from './viewport';

/** Publishes the viewport to CSS: `--k` (css px per logical px), `--km` (same for the menu), etc. */
function applyCssVars(vp: Viewport): void {
  const st = document.documentElement.style;
  st.setProperty('--k', String(vp.cssScale));
  st.setProperty('--kd', String(vp.kd));
  st.setProperty('--dpr', String(vp.dpr));
  st.setProperty('--lw', String(vp.logicalW));
  st.setProperty('--lh', String(vp.logicalH));
  st.setProperty('--km', String(menuScale(vp.cssW, vp.cssH, vp.dpr) / vp.dpr));
}

async function boot() {
  // Pixel art: every texture is sampled with nearest unless it opts into linear (glows, lights).
  TextureStyle.defaultOptions.scaleMode = 'nearest';
  // One module decides the integer scale; this controller only reports changes (see viewport.ts).
  const viewport: ViewportController = new ViewportController(
    window,
    parseKOverride(location.search),
    () => requestAnimationFrame(() => viewport.flush()),
  );
  const vp0 = viewport.current;
  const app = new Application();
  try {
    await app.init({
      width: vp0.cssW,
      height: vp0.cssH,
      background: '#0b1020',
      antialias: false,
      roundPixels: true,
      preference: 'webgl',
      autoDensity: true,
      resolution: vp0.dpr,
    });
  } catch (err) {
    showFatal('webgl', err);
    return;
  }
  applyCssVars(vp0);
  viewport.onChange((vp) => {
    app.renderer.resize(vp.cssW, vp.cssH, vp.dpr);
    applyCssVars(vp);
    app.render();
  });
  document.getElementById('game')!.appendChild(app.canvas);
  app.ticker.stop();
  // Pixel fonts must be ready before any text is drawn.
  await Promise.all([
    document.fonts.load('700 14px "Pixelify Sans"', 'Аб Ab'),
    document.fonts.load('600 14px "Pixelify Sans"', 'Аб Ab'),
    document.fonts.load('16px "Press Start 2P"', 'Аб Ab'),
  ]);
  // `fonts.load` never rejects, so check that the faces really arrived; the game still runs without.
  if (
    !document.fonts.check('16px "Press Start 2P"') ||
    !document.fonts.check('700 14px "Pixelify Sans"')
  )
    showWarning('Не удалось загрузить шрифты: текст может выглядеть иначе.');
  // Artwork is optional: anything missing falls back to the built-in drawing. A broken manifest is fatal.
  try {
    await assets.load(`${import.meta.env.BASE_URL}assets`.replace(/\/\//g, '/'), __BUILD_ID__);
  } catch (err) {
    showFatal(err instanceof ManifestError ? 'manifest' : 'startup', err);
    return;
  }
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
      viewport,
      cfg,
      {
        onMessage: (text) => ui.announce?.(text),
        onTogglePanel: () => ui.togglePanel?.(),
        onSurrender: () => ui.askSurrender?.(),
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
        onDenied={() => m.scene.sfx.ui('nope')}
        mouse={() => m.input.mouseWorld}
        onRematch={() => start({ ...cfg, seed: Math.floor(Math.random() * 1e9) })}
        onMenu={showMenu}
        onWatch={() => {
          const r = currentReplay();
          start(r.config, r);
        }}
        onDownload={() => download(currentReplay())}
        replay={replay ? { onSpeed: (x) => m.setSpeed(x) } : undefined}
        wormpot={cfg.wormpot}
        settings={settingsStore}
        onPause={(paused) => m.setPaused(paused)}
        onSurrender={() => m.input.push({ t: 'surrender' })}
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
    // ?zoom= keeps the old scale (2 = default view); map it to the nearest zoom level.
    if (zoom && match) {
      const want = Number(zoom) / 2;
      (match as Match).scene.camera.level = ZOOM_LEVELS.reduce((a, b) =>
        Math.abs(b - want) < Math.abs(a - want) ? b : a,
      );
    }
  } else {
    showMenu();
  }
}

installGlobalHandlers();
boot().catch((err) => showFatal('startup', err));
