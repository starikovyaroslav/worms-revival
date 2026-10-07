import { generateMap, type MapStyle } from '@wr/mapgen';
import { THEMES } from '@wr/render';

/** Draws a small picture of the map for the setup screen. */
export function drawMapPreview(
  canvas: HTMLCanvasElement,
  seed: number,
  style: MapStyle,
  themeId: string,
): void {
  const map = generateMap({ seed, style });
  const t = map.terrain;
  const theme = THEMES.find((x) => x.id === themeId) ?? THEMES[0]!;
  const scale = Math.ceil(t.width / canvas.width);
  const w = Math.floor(t.width / scale);
  const h = Math.floor(t.height / scale);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const rgb = (c: number) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
  const sky = rgb(theme.skyBottom);
  const skyTop = rgb(theme.skyTop);
  const soil = rgb(theme.soil.base);
  const grass = rgb(theme.surface);
  const water = rgb(theme.water);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const wx = x * scale;
      const wy = y * scale;
      let c: number[];
      if (t.isSolid(wx, wy)) c = t.isSolid(wx, wy - scale * 2) ? soil : grass;
      else if (wy >= map.waterLevel) c = water;
      else {
        const k = y / h;
        c = skyTop.map((v, i) => v + ((sky[i] as number) - v) * k);
      }
      const o = (y * w + x) * 4;
      img.data[o] = c[0]!;
      img.data[o + 1] = c[1]!;
      img.data[o + 2] = c[2]!;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}
