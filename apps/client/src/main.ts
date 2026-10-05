import { Application, Container, FillGradient, Graphics } from 'pixi.js';
import { generateMap } from '@wr/mapgen';
import { TerrainView, themeById } from '@wr/render';
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

  const sky = new Graphics();
  app.stage.addChild(sky);
  const world = new Container();
  app.stage.addChild(world);
  const terrainView = new TerrainView(terrain, theme);
  world.addChild(terrainView.container);
  const water = new Graphics()
    .rect(-4000, map.waterLevel, terrain.width + 8000, 4000)
    .fill({ color: theme.water, alpha: 0.85 });
  world.addChild(water);

  const layout = () => {
    const scale = Math.min(app.screen.width / terrain.width, app.screen.height / terrain.height);
    world.scale.set(scale);
    world.position.set(
      (app.screen.width - terrain.width * scale) / 2,
      (app.screen.height - terrain.height * scale) / 2,
    );
    const gradient = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: theme.skyTop },
        { offset: 1, color: theme.skyBottom },
      ],
    });
    sky.clear().rect(0, 0, app.screen.width, app.screen.height).fill(gradient);
  };
  layout();
  window.addEventListener('resize', layout);

  // Debug: click to blow a hole.
  app.canvas.addEventListener('pointerdown', (e) => {
    const p = world.toLocal({ x: e.offsetX, y: e.offsetY });
    terrain.carveCircle(p.x, p.y, 40);
  });

  const loop = new FixedLoop(
    () => {},
    () => {
      terrainView.update();
      app.render();
    },
  );
  loop.start();
}

void boot();
