import { Application } from 'pixi.js';
import { FixedLoop } from './loop';

async function boot() {
  const app = new Application();
  await app.init({
    resizeTo: window,
    background: '#1a2a4a',
    antialias: false,
    preference: 'webgl',
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  document.getElementById('game')!.appendChild(app.canvas);
  app.ticker.stop();

  const loop = new FixedLoop(
    () => {},
    () => app.render(),
  );
  loop.start();
}

void boot();
