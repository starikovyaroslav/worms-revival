import { Application, Container } from 'pixi.js';
import { generateMap } from '@wr/mapgen';
import { Background, Camera, TerrainView, WaterView, themeById } from '@wr/render';
import { FixedLoop } from './loop';

async function boot() {
  const app = new Application();
  await app.init({
    resizeTo: window,
    background: '#000000',
    antialias: false,
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
  const map = generateMap({ seed, style });
  const { terrain } = map;

  const camera = new Camera(terrain);
  camera.zoom = Number(params.get('zoom') ?? 1);
  camera.lookAt(terrain.width / 2, map.waterLevel - 300);

  const background = new Background(theme, terrain.width, terrain.height, seed);
  const world = new Container();
  const terrainView = new TerrainView(terrain, theme);
  const water = new WaterView(theme, terrain.width);
  world.addChild(water.back, terrainView.container, water.front);
  app.stage.addChild(background.container, world);

  // Camera controls: drag to pan, wheel to zoom. Shift+click blows a debug hole.
  let dragging = false;
  app.canvas.addEventListener('pointerdown', (e) => {
    if (e.shiftKey) {
      const p = camera.toWorld(e.offsetX, e.offsetY);
      terrain.carveCircle(p.x, p.y, 40);
      camera.shake(6);
      return;
    }
    dragging = true;
  });
  window.addEventListener('pointerup', () => (dragging = false));
  window.addEventListener('pointermove', (e) => {
    if (dragging) camera.pan(-e.movementX, -e.movementY);
  });
  app.canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      camera.zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.offsetX, e.offsetY);
    },
    { passive: false },
  );

  const loop = new FixedLoop(
    () => {},
    (_alpha, dt) => {
      camera.resize(app.screen.width, app.screen.height);
      camera.update(dt);
      camera.apply(world);
      background.update(camera, app.screen.width, app.screen.height);
      water.update(dt, map.waterLevel);
      terrainView.update();
      app.render();
    },
  );
  loop.start();
}

void boot();
