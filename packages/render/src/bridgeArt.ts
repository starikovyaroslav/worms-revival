import { Material, type Terrain } from '@wr/sim';

/** Live deck runs, also after explosions; decorative rails never survive a destroyed deck segment. */
export function bridgeRuns(terrain: Terrain): { x: number; y: number }[][] {
  const runs: { x: number; y: number }[][] = [];
  let run: { x: number; y: number }[] = [];
  for (let x = 0; x < terrain.width; x++) {
    let deck = -1;
    for (let y = 0; y < terrain.height; y++)
      if (terrain.data[y * terrain.width + x] === Material.Bridge) {
        deck = y;
        break;
      }
    if (deck < 0 || (run.length && Math.abs(run.at(-1)!.y - deck) > 8)) {
      if (run.length > 5) runs.push(run);
      run = [];
    }
    if (deck >= 0) run.push({ x, y: deck });
  }
  if (run.length > 5) runs.push(run);
  return runs;
}

/** Native timber surface for physically destructible bridge pixels; no grass or soil tile. */
export function bridgeColor(x: number, y: number): number {
  const col = ((Math.floor(x) % 18) + 18) % 18;
  if (col < 2) return 0x42291e;
  if ((col === 4 || col === 14) && Math.floor(y) % 7 < 2) return 0x302c2b;
  const grain = (Math.floor(y) + Math.floor(x / 43)) % 5;
  return [0xa77340, 0xc28d50, 0x986237, 0x85532d, 0xb27c43][grain]!;
}
