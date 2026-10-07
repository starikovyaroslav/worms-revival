import { allWeapons, type Command, type Game } from '@wr/sim';

/**
 * Turns keyboard and mouse input into simulation commands, W:A style:
 * arrows walk/aim, Enter jumps (twice: backflip), Space fires (hold to charge),
 * 1-5 set the fuse, +/- the bounce, F1-F12 cycle through a weapon row, click sets a target.
 */
export class Input {
  private queue: Command[] = [];
  private held = { left: false, right: false, up: false, down: false };
  private sentHeld = '';
  /** Screen → world conversion supplied by the scene. */
  toWorld: (sx: number, sy: number) => { x: number; y: number } = (x, y) => ({ x, y });
  enabled = true;
  /** Mouse position in world coordinates, for target previews. */
  mouseWorld: { x: number; y: number } | null = null;

  constructor(
    private readonly game: () => Game,
    target: HTMLElement,
  ) {
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => {
      this.held = { left: false, right: false, up: false, down: false };
    });
    target.addEventListener('pointermove', (e) => {
      this.mouseWorld = this.toWorld(e.offsetX, e.offsetY);
    });
    target.addEventListener('pointerleave', () => (this.mouseWorld = null));
    target.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.shiftKey || !this.enabled) return;
      const def = this.game().weapon;
      if (def?.aim === 'target') {
        // Clicking a target uses the weapon right away, as in W:A.
        const p = this.toWorld(e.offsetX, e.offsetY);
        this.queue.push({ t: 'target', x: Math.round(p.x), y: Math.round(p.y) });
        this.queue.push({ t: 'fire', down: true }, { t: 'fire', down: false });
      }
    });
  }

  push(cmd: Command): void {
    this.queue.push(cmd);
  }

  /** Commands for the next tick. */
  drain(): Command[] {
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
    if (!this.enabled) return;
    const code = e.code;
    const arrows: Record<string, keyof Input['held']> = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down',
    };
    const dir = arrows[code];
    if (dir) {
      this.held[dir] = down;
      e.preventDefault();
      return;
    }
    if (code === 'Space') {
      e.preventDefault();
      if (!e.repeat) this.queue.push({ t: 'fire', down });
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
    const usable = allWeapons().filter((w) => w.row === row && game.canUse(w.id));
    if (!usable.length) return;
    // Count selections still waiting in the queue, so fast repeated presses keep cycling.
    const pending = this.queue.filter((c) => c.t === 'select').pop();
    const current = pending?.t === 'select' ? pending.weapon : game.weaponId;
    const idx = usable.findIndex((w) => w.id === current);
    const next = usable[(idx + 1) % usable.length]!;
    this.queue.push({ t: 'select', weapon: next.id });
  }
}
