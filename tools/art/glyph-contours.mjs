/** Native alpha-mask outline tracing for original font glyphs (including counters). */
export function glyphContours(im) {
  const edges = new Map();
  const stride = im.w + 1;
  const solid = (x, y) =>
    x >= 0 && y >= 0 && x < im.w && y < im.h && im.data[(y * im.w + x) * 4 + 3] >= 128;
  const add = (x, y, xx, yy) => {
    const key = y * stride + x;
    const row = edges.get(key) ?? [];
    row.push(yy * stride + xx);
    edges.set(key, row);
  };
  for (let y = 0; y < im.h; y++)
    for (let x = 0; x < im.w; x++)
      if (solid(x, y)) {
        if (!solid(x, y - 1)) add(x, y, x + 1, y);
        if (!solid(x + 1, y)) add(x + 1, y, x + 1, y + 1);
        if (!solid(x, y + 1)) add(x + 1, y + 1, x, y + 1);
        if (!solid(x - 1, y)) add(x, y + 1, x, y);
      }
  const point = (key) => [key % stride, Math.floor(key / stride)];
  const direction = (a, b) => (b - a === 1 ? 0 : b - a === stride ? 1 : b - a === -1 ? 2 : 3);
  const loops = [];
  while (edges.size) {
    const start = edges.keys().next().value;
    let key = start,
      previous = 0;
    const points = [];
    do {
      points.push(point(key));
      const options = edges.get(key);
      if (!options?.length) throw new Error('Open font contour');
      options.sort((a, b) => {
        const rank = (target) => [1, 0, 3, 2][(direction(key, target) - previous + 4) % 4];
        return rank(a) - rank(b);
      });
      const next = options.shift();
      if (!options.length) edges.delete(key);
      previous = direction(key, next);
      key = next;
    } while (key !== start);
    const area =
      points.reduce((sum, p, i) => {
        const q = points[(i + 1) % points.length];
        return sum + p[0] * q[1] - q[0] * p[1];
      }, 0) / 2;
    if (Math.abs(area) < 6) continue;
    // Remove collinear pixel runs without changing the traced boundary.
    const corners = points.filter((p, i) => {
      const a = points[(i + points.length - 1) % points.length],
        b = points[(i + 1) % points.length];
      return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]);
    });
    loops.push(corners);
  }
  return loops;
}
