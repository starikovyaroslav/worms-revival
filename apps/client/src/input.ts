import { type Command, type Game } from '@wr/sim';

/**
 * Turns keyboard and mouse input into simulation commands, W:A style:
 * arrows walk/aim, Enter jumps (twice: backflip), Space fires (hold to charge),
 * 1-5 set the fuse, +/- the bounce, F1-F12 cycle through a weapon row, click sets a target.
 */
const ARROWS: Record<string, 'left' | 'right' | 'up' | 'down'> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

export class Input {
  private queue: Command[] = [];
  private held = { left: false, right: false, up: false, down: false };
  private sentHeld = '';
  private lastTurn = -1;
  private on = true;
  /** Screen → world conversion supplied by the scene. */
  toWorld: (sx: number, sy: number) => { x: number; y: number } = (x, y) => ({ x, y });
  get enabled(): boolean {
    return this.on;
  }
  /** Going off forgets the held keys and what was sent, so the next drain resends the state. */
  set enabled(v: boolean) {
    if (this.on && !v) this.release();
    this.on = v;
  }
  /** Space on the surrender "weapon": asks the player instead of giving up on the spot. */
  onSurrender: (() => void) | null = null;
  /** Mouse position in world coordinates, for target previews. */
  mouseWorld: { x: number; y: number } | null = null;

  constructor(
    private readonly game: () => Game,
    target: HTMLElement,
    signal: AbortSignal,
  ) {
    const opts = { signal };
    window.addEventListener('keydown', (e) => this.onKey(e, true), opts);
    window.addEventListener('keyup', (e) => this.onKey(e, false), opts);
    window.addEventListener(
      'blur',
      () => {
        this.held = { left: false, right: false, up: false, down: false };
      },
      opts,
    );
    target.addEventListener(
      'pointermove',
      (e) => {
        this.mouseWorld = this.toWorld(e.offsetX, e.offsetY);
      },
      opts,
    );
    target.addEventListener('pointerleave', () => (this.mouseWorld = null), opts);
    target.addEventListener(
      'pointerdown',
      (e) => {
        if (e.button !== 0 || e.shiftKey || !this.enabled) return;
        if (this.game().phase === 'ready') this.queue.push({ t: 'ready' });
        const def = this.game().weapon;
        if (def?.needsTarget) {
          // Homing weapons: the click only marks the target.
          const p = this.toWorld(e.offsetX, e.offsetY);
          this.queue.push({ t: 'target', x: Math.round(p.x), y: Math.round(p.y) });
        } else if (def?.aim === 'target') {
          // Clicking a target uses the weapon right away, as in W:A.
          const p = this.toWorld(e.offsetX, e.offsetY);
          this.queue.push({ t: 'target', x: Math.round(p.x), y: Math.round(p.y) });
          this.queue.push({ t: 'fire', down: true }, { t: 'fire', down: false });
        }
      },
      opts,
    );
  }

  /** Forgets keys and queued commands (pause: key-ups would be missed while the game is frozen). */
  release(): void {
    this.held = { left: false, right: false, up: false, down: false };
    this.sentHeld = '';
    this.queue = [];
  }

  push(cmd: Command): void {
    this.queue.push(cmd);
  }

  /** Commands for the next tick. */
  drain(): Command[] {
    // A new turn starts from a clean slate: the sim forgot the held keys, so resend them.
    const turn = this.game().turn;
    if (turn !== this.lastTurn) {
      this.lastTurn = turn;
      this.sentHeld = '';
    }
    const key = `${+this.held.left}${+this.held.right}${+this.held.up}${+this.held.down}`;
    if (key !== this.sentHeld) {
      this.sentHeld = key;
      this.queue.unshift({ t: 'move', ...this.held });
    }
    const out = this.queue;
    this.queue = [];
    return out;
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const code = e.code;
    // Key-ups are tracked even while disabled, or a key released then would stay "held".
    if (!this.on) {
      const up = ARROWS[code];
      if (up && !down) this.held[up] = false;
      return;
    }
    // Hot-seat hand-over ("Team X, press any key"): any key starts the turn.
    if (
      down &&
      code !== 'Escape' &&
      this.game().phase === 'ready' &&
      !e.repeat &&
      !this.queue.some((c) => c.t === 'ready')
    )
      this.queue.push({ t: 'ready' });
    const dir = ARROWS[code];
    if (dir) {
      this.held[dir] = down;
      e.preventDefault();
      return;
    }
    if (code === 'Space') {
      e.preventDefault();
      if (e.repeat) return;
      if (down && this.onSurrender && this.game().weapon?.action === 'surrender')
        this.onSurrender();
      else this.queue.push({ t: 'fire', down });
      return;
    }
    if (!down || e.repeat) return;
    if (code === 'Enter') this.queue.push({ t: 'jump' });
    else if (/^Digit[1-5]$/.test(code))
      this.queue.push({ t: 'fuse', seconds: Number(code.slice(5)) });
    else if (code === 'Equal' || code === 'NumpadAdd') this.queue.push({ t: 'bounce', high: true });
    else if (code === 'Minus' || code === 'NumpadSubtract')
      this.queue.push({ t: 'bounce', high: false });
    else if (/^F([1-9]|1[0-2])$/.test(code)) {
      e.preventDefault();
      this.cycleRow(Number(code.slice(1)));
    } else if (code === 'Backquote') {
      // Utilities row.
      this.cycleRow(0);
    }
  }

  /** Repeated presses of an F-key walk through the usable weapons of that row. */
  private cycleRow(row: number): void {
    const game = this.game();
    const usable = game.rules.weapons.filter((w) => w.spec.ui.row === row && game.canUse(w.id));
    if (!usable.length) return;
    // Count selections still waiting in the queue, so fast repeated presses keep cycling.
    const pending = this.queue.filter((c) => c.t === 'select').pop();
    const current = pending?.t === 'select' ? pending.weapon : game.weaponId;
    const idx = usable.findIndex((w) => w.id === current);
    const next = usable[(idx + 1) % usable.length]!;
    this.queue.push({ t: 'select', weapon: next.id });
  }
}
