import type { Application } from 'pixi.js';
import { Game } from '@wr/sim';
import { buildGameSetup, type MatchConfig } from '@wr/content';
import { themeById } from '@wr/render';
import { FixedLoop } from './loop';
import { Input } from './input';
import { GameScene } from './scene';

export interface MatchHooks {
  onMessage(text: string): void;
  onTogglePanel(): void;
}

/** One running match: simulation, scene, input and loop, torn down together. */
export class Match {
  readonly game: Game;
  readonly scene: GameScene;
  readonly input: Input;
  private loop: FixedLoop;
  private abort = new AbortController();

  constructor(
    app: Application,
    readonly config: MatchConfig,
    hooks: MatchHooks,
  ) {
    const game = new Game(buildGameSetup(config));
    this.game = game;
    const scene = new GameScene(app, game, themeById(config.themeId), config.seed);
    this.scene = scene;
    scene.camera.zoom = 1.4;
    scene.onMessage = hooks.onMessage;
    const signal = this.abort.signal;
    const input = new Input(() => game, app.canvas, signal);
    this.input = input;
    input.toWorld = (x, y) => scene.camera.toWorld(x, y);

    // Camera: drag with the mouse to look around, wheel to zoom; right click opens the panel.
    let dragging = false;
    const canvas = app.canvas;
    canvas.addEventListener(
      'pointerdown',
      (e) => {
        if (e.button === 2) {
          hooks.onTogglePanel();
          return;
        }
        if (e.button === 1 || game.weapon?.aim !== 'target') dragging = true;
      },
      { signal },
    );
    canvas.addEventListener('contextmenu', (e) => e.preventDefault(), { signal });
    window.addEventListener('pointerup', () => (dragging = false), { signal });
    window.addEventListener(
      'pointermove',
      (e) => {
        if (!dragging) return;
        scene.camera.pan(-e.movementX, -e.movementY);
        scene.userScrolled = true;
      },
      { signal },
    );
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        scene.camera.zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.offsetX, e.offsetY);
      },
      { passive: false, signal },
    );

    let lastFocus = game.focusId;
    this.loop = new FixedLoop(
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
        scene.mouseWorld = input.mouseWorld;
        scene.render(alpha, dt);
        app.render();
      },
    );
    this.loop.start();
    (window as unknown as { __game: unknown }).__game = { game, scene };
  }

  destroy(): void {
    this.loop.stop();
    this.abort.abort();
    this.scene.destroy();
  }
}
