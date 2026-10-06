import { Application } from 'pixi.js';
import { Game, Rng, WORM_H, WORM_HALF_W } from '@wr/sim';
import { findSurfaces, generateMap, pickSpread } from '@wr/mapgen';
import { TEAM_PRESETS, schemeById } from '@wr/content';
import { themeById } from '@wr/render';
import { FixedLoop } from './loop';
import { Input } from './input';
import { GameScene } from './scene';

async function boot() {
  const app = new Application();
  await app.init({
    resizeTo: window,
    background: '#000000',
    antialias: true,
    preference: 'webgl',
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  document.getElementById('game')!.appendChild(app.canvas);
  app.ticker.stop();

  const params = new URLSearchParams(location.search);
  const seed = Number(params.get('seed') ?? Math.floor(Math.random() * 1e9));
  const style = params.get('style') === 'cavern' ? 'cavern' : 'island';
  const theme = themeById(params.get('theme') ?? 'meadow');
  const scheme = schemeById(params.get('scheme') ?? 'intermediate');
  const map = generateMap({ seed, style });
  const teamCount = 2;
  const spawns = pickSpread(
    findSurfaces(map.terrain, {
      halfWidth: WORM_HALF_W,
      height: WORM_H,
      waterMargin: 40,
      waterLevel: map.waterLevel,
    }),
    scheme.wormsPerTeam * teamCount,
    150,
    new Rng(seed ^ 0x5eed),
  );
  const teams = new Rng(seed).shuffle(TEAM_PRESETS.slice()).slice(0, teamCount);
  const game = new Game({
    seed,
    scheme,
    teams,
    terrain: map.terrain,
    waterLevel: map.waterLevel,
    spawns,
    cavern: style === 'cavern',
  });

  const scene = new GameScene(app, game, theme, seed);
  scene.camera.zoom = Number(params.get('zoom') ?? 1.4);
  const input = new Input(() => game, app.canvas);
  input.toWorld = (x, y) => scene.camera.toWorld(x, y);

  // Camera: drag with the mouse to look around, wheel to zoom. Shift+click blows a debug hole.
  let dragging = false;
  app.canvas.addEventListener('pointerdown', (e) => {
    if (e.shiftKey) {
      const p = scene.camera.toWorld(e.offsetX, e.offsetY);
      game.world.terrain.carveCircle(p.x, p.y, 40);
      return;
    }
    if (e.button === 1 || e.button === 2 || game.weapon?.aim !== 'target') dragging = true;
  });
  app.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('pointerup', () => (dragging = false));
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    scene.camera.pan(-e.movementX, -e.movementY);
    scene.userScrolled = true;
  });
  app.canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      scene.camera.zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.offsetX, e.offsetY);
    },
    { passive: false },
  );

  (window as unknown as { __game: unknown }).__game = { game, scene };

  let lastFocus = game.focusId;
  const loop = new FixedLoop(
    () => {
      game.step(input.drain());
      scene.handleEvents();
      // New action (turn start, shot) brings the camera back.
      if (game.focusId !== lastFocus) {
        lastFocus = game.focusId;
        scene.userScrolled = false;
      }
    },
    (alpha, dt) => {
      scene.render(alpha, dt);
      app.render();
    },
  );
  loop.start();
}

void boot();
