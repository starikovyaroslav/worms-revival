import { Application, Container } from 'pixi.js';
import { Rng, World, Worm, WORM_HALF_W, WORM_H, clamp, HALF_PI } from '@wr/sim';
import { findSurfaces, generateMap, pickSpread } from '@wr/mapgen';
import { Background, Camera, TerrainView, WaterView, WormView, themeById } from '@wr/render';
import { FixedLoop } from './loop';

const NAMES = [
  ['Борис', 'Глеб', 'Фёдор', 'Кузя'],
  ['Spadge', 'Clagnut', 'Boggy', 'Chuckles'],
];

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
  const map = generateMap({ seed, style });
  const { terrain } = map;
  const world = new World({ seed, terrain, waterLevel: map.waterLevel });

  const spawns = pickSpread(
    findSurfaces(terrain, {
      halfWidth: WORM_HALF_W,
      height: WORM_H,
      waterMargin: 40,
      waterLevel: map.waterLevel,
    }),
    8,
    150,
    new Rng(seed ^ 0x5eed),
  );
  const worms: Worm[] = spawns.map((p, i) => {
    const team = i % 2;
    const name = NAMES[team]![Math.floor(i / 2)]!;
    const w = world.spawn(new Worm(p.x, p.y, name, team, 100));
    w.facing = p.x < terrain.width / 2 ? 1 : -1;
    w.launch(0, 0, false);
    return w;
  });
  let active = 0;
  (window as unknown as { __game: unknown }).__game = { world, worms };

  const camera = new Camera(terrain);
  camera.zoom = Number(params.get('zoom') ?? 1.4);
  camera.lookAt(worms[0]!.x, worms[0]!.y);

  const background = new Background(theme, terrain.width, terrain.height, seed);
  const stageWorld = new Container();
  const terrainView = new TerrainView(terrain, theme);
  const water = new WaterView(theme, terrain.width);
  const wormLayer = new Container();
  const wormViews = worms.map((w) => new WormView(w));
  for (const v of wormViews) wormLayer.addChild(v.container);
  stageWorld.addChild(water.back, terrainView.container, wormLayer, water.front);
  app.stage.addChild(background.container, stageWorld);

  // Sandbox controls until the turn system lands.
  const keys = new Set<string>();
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    const w = worms[active]!;
    if (e.code === 'Enter') w.jump();
    if (e.code === 'Tab') {
      e.preventDefault();
      do active = (active + 1) % worms.length;
      while (!worms[active]!.alive && worms.some((x) => x.alive));
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));

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

  const step = () => {
    const w = worms[active]!;
    for (const x of worms) x.control = { left: false, right: false, up: false, down: false };
    w.control = {
      left: keys.has('ArrowLeft'),
      right: keys.has('ArrowRight'),
      up: keys.has('ArrowUp'),
      down: keys.has('ArrowDown'),
    };
    if (w.control.up) w.aim = clamp(w.aim + 0.035, -HALF_PI, HALF_PI);
    if (w.control.down) w.aim = clamp(w.aim - 0.035, -HALF_PI, HALF_PI);
    world.step();
    world.drainEvents();
  };

  const loop = new FixedLoop(step, (alpha, dt) => {
    const w = worms[active]!;
    if (!dragging) camera.follow(w.x, w.y - 40);
    camera.resize(app.screen.width, app.screen.height);
    camera.update(dt);
    camera.apply(stageWorld);
    background.update(camera, app.screen.width, app.screen.height);
    water.update(dt, world.waterLevel);
    terrainView.update();
    wormViews.forEach((v, i) => {
      v.update(alpha, dt, i === active);
      v.setShownHealth(v.worm.health);
    });
    app.render();
  });
  loop.start();
}

void boot();
