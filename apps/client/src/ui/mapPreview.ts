import { generateMap, type MapStyle } from '@wr/mapgen';
import { THEMES, assets, artPixel, bridgeColor, bridgeRuns } from '@wr/render';
import { Material } from '@wr/sim';

/** Draws a small picture of the map for the setup screen. */
export function drawMapPreview(
  canvas: HTMLCanvasElement,
  seed: number,
  style: MapStyle,
  themeId: string,
  version: 1 | 2 = 2,
): void {
  const map = generateMap({ seed, style, version });
  const t = map.terrain;
  const theme = THEMES.find((x) => x.id === themeId) ?? THEMES[0]!;
  const painted = !!assets.variantPrefix;
  const target = painted
    ? Math.max(
        320,
        Math.min(1280, Math.round(canvas.getBoundingClientRect().width * window.devicePixelRatio)),
      )
    : canvas.width;
  const scale = painted ? t.width / target : Math.ceil(t.width / target);
  const w = Math.floor(t.width / scale);
  // Fit the complete map width into a taller comic panel by revealing sky/water,
  // never by stretching or cropping the generated terrain silhouette.
  const mapHeight = Math.floor(t.height / scale);
  const panelAspect =
    Number.parseFloat(getComputedStyle(canvas).getPropertyValue('--preview-aspect')) || 1.45;
  const h = painted ? Math.max(mapHeight, Math.round(w / panelAspect)) : mapHeight;
  const verticalPadding = painted ? Math.round((h - mapHeight) * 0.45) : 0;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  if (painted) {
    ctx.imageSmoothingEnabled = true;
    for (const layer of ['sky', 'far', 'mid', 'near']) {
      const texture = assets.get(`bg/${theme.id}/${layer}`);
      if (texture) {
        const f = texture.frame;
        ctx.drawImage(
          texture.source.resource as CanvasImageSource,
          f.x,
          f.y,
          f.width,
          f.height,
          0,
          0,
          w,
          h,
        );
      }
    }
  }
  const backdrop = painted ? ctx.getImageData(0, 0, w, h).data : null;
  const img = ctx.createImageData(w, h);
  const rgb = (c: number) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
  const sky = rgb(theme.skyBottom);
  const skyTop = rgb(theme.skyTop);
  const soil = rgb(theme.soil.base);
  const grass = rgb(theme.surface);
  const water = rgb(theme.water);
  const fill = assets.pixels(`terrain/${theme.id}/fill`);
  const rim = assets.pixels(`terrain/${theme.id}/rim`);
  const skyArt = assets.pixels(`bg/${theme.id}/sky`);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const wx = x * scale;
      const wy = (y - verticalPadding) * scale;
      let c: number[];
      if (wy >= map.waterLevel) c = water;
      else if (t.get(wx, wy) === Material.Bridge) c = rgb(bridgeColor(wx, wy));
      else if (t.isSolid(wx, wy)) {
        const surface = !t.isSolid(wx, wy - scale * (painted ? 4 : 2));
        const sampled =
          surface && rim ? artPixel(rim, wx, painted ? 4 : 5) : fill ? artPixel(fill, wx, wy) : -1;
        c = sampled >= 0 ? rgb(sampled) : surface ? grass : soil;
      } else {
        if (backdrop && backdrop[(y * w + x) * 4 + 3]) {
          const offset = (y * w + x) * 4;
          c = [backdrop[offset]!, backdrop[offset + 1]!, backdrop[offset + 2]!];
        } else if (skyArt)
          c = rgb(
            artPixel(
              skyArt,
              (x / w) * ((skyArt.logicalW ?? skyArt.w) - 1),
              (y / h) * ((skyArt.logicalH ?? skyArt.h) - 1),
            ),
          );
        else {
          const k = y / h;
          c = skyTop.map((v, i) => v + ((sky[i] as number) - v) * k);
        }
      }
      const o = (y * w + x) * 4;
      img.data[o] = c[0]!;
      img.data[o + 1] = c[1]!;
      img.data[o + 2] = c[2]!;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  for (const run of bridgeRuns(t)) {
    ctx.beginPath();
    for (const [i, p] of run.entries()) {
      const x = p.x / scale,
        y = verticalPadding + (p.y - 14) / scale;
      if (!i) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#65462c';
    ctx.lineWidth = Math.max(0.8, 2 / scale);
    ctx.stroke();
    for (let i = 0; i < run.length; i += 30) {
      const p = run[i]!;
      ctx.beginPath();
      ctx.moveTo(p.x / scale, verticalPadding + p.y / scale);
      ctx.lineTo(p.x / scale, verticalPadding + (p.y - 17) / scale);
      ctx.stroke();
    }
  }
  if (painted) {
    const texture = assets.get(`painted/water/${theme.id}`);
    if (texture) {
      const f = texture.frame;
      const waterTop = verticalPadding + map.waterLevel / scale;
      // The native water sheet has transparent sky above its crest (same offset as WaterView).
      const waterHeight = Math.max(1, (h - waterTop) / 0.65);
      ctx.drawImage(
        texture.source.resource as CanvasImageSource,
        f.x,
        f.y,
        f.width,
        f.height,
        0,
        waterTop - waterHeight * 0.35,
        w,
        waterHeight,
      );
    }
  }
  canvas.dataset.previewKey = `${seed}/${style}/${themeId}`;
}
