import type { Application } from 'pixi.js';
import { Game, type Command } from '@wr/sim';
import { Bot, type Plan } from '@wr/ai';
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
  /** Computer player state for the current turn. */
  private bot: { turn: number; thinking: Generator<void, Plan> | null; plan: Plan | null } | null =
    null;

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
        game.step(this.commandsForTick());
        scene.handleEvents();
        // New action (turn start, shot) brings the camera back.
        if (game.focusId !== lastFocus) {
          lastFocus = game.focusId;
          scene.userScrolled = false;
        }
      },
      (alpha, dt) => {
        this.thinkBot();
        scene.mouseWorld = input.mouseWorld;
        scene.render(alpha, dt);
        app.render();
      },
    );
    this.loop.start();
    (window as unknown as { __game: unknown }).__game = { game, scene };
  }

  /** Difficulty of the team whose turn it is, 0 for humans. */
  private get cpuLevel(): number {
    const team = this.game.teams[this.game.activeTeam];
    return team ? (this.config.teams[team.index]?.cpu ?? 0) : 0;
  }

  /** Human input on human turns, the bot's plan on computer turns. */
  private commandsForTick(): Command[] {
    const game = this.game;
    const human = this.cpuLevel === 0;
    this.input.enabled = human;
    const fromInput = this.input.drain();
    if (human) return fromInput;
    const controllable = game.phase === 'ready' || game.phase === 'turn';
    if (!controllable) return [];
    if (!this.bot || this.bot.turn !== game.turn) {
      const bot = new Bot(game, this.cpuLevel, this.config.seed + game.turn * 7919);
      this.bot = { turn: game.turn, thinking: bot.think(), plan: null };
    }
    return this.bot.plan?.shift() ?? [];
  }

  /** Lets the bot think for a few milliseconds per frame. */
  private thinkBot(): void {
    const b = this.bot;
    if (!b?.thinking) return;
    const until = performance.now() + 8;
    while (performance.now() < until) {
      const r = b.thinking.next();
      if (r.done) {
        b.plan = r.value;
        b.thinking = null;
        return;
      }
    }
  }

  destroy(): void {
    this.loop.stop();
    this.abort.abort();
    this.scene.destroy();
  }
}
