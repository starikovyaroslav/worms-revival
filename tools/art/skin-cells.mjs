/** Separate painted poses by connected silhouettes, not a grid that can slice a raised hand. */
export function skinCells(im, grid = 4) {
  const size = im.w * im.h,
    labels = new Int32Array(size),
    queue = new Int32Array(size);
  const components = [];
  for (let start = 0; start < size; start++) {
    if (labels[start] || im.data[start * 4 + 3] < 128) continue;
    const id = components.length + 1;
    let head = 0,
      tail = 1,
      left = im.w,
      top = im.h,
      right = 0,
      bottom = 0;
    queue[0] = start;
    labels[start] = id;
    while (head < tail) {
      const p = queue[head++],
        x = p % im.w,
        y = Math.floor(p / im.w);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      for (const next of [
        x > 0 ? p - 1 : -1,
        x + 1 < im.w ? p + 1 : -1,
        y > 0 ? p - im.w : -1,
        y + 1 < im.h ? p + im.w : -1,
      ]) {
        if (next < 0 || labels[next] || im.data[next * 4 + 3] < 128) continue;
        labels[next] = id;
        queue[tail++] = next;
      }
    }
    components.push({ id, count: tail, x: left, y: top, w: right - left + 1, h: bottom - top + 1 });
  }
  const main = [...components].sort((a, b) => b.count - a.count).slice(0, grid * grid);
  if (main.length !== grid * grid)
    throw new Error(`Expected ${grid * grid} separate painted silhouettes`);
  const slots = new Map();
  const ownerByComponent = new Int32Array(components.length + 1);
  const boxes = Array(grid * grid);
  for (const c of main) {
    const col = Math.min(grid - 1, Math.floor(((c.x + c.w / 2) / im.w) * grid));
    const row = Math.min(grid - 1, Math.floor(((c.y + c.h / 2) / im.h) * grid));
    const slot = row * grid + col;
    if (slots.has(slot))
      throw new Error(`Ambiguous silhouettes in cell ${slot}; review native sheet`);
    slots.set(slot, c);
    boxes[slot] = { ...c };
    ownerByComponent[c.id] = slot + 1;
  }
  const distance = (a, b) =>
    Math.hypot(
      Math.max(a.x - b.x - b.w, b.x - a.x - a.w, 0),
      Math.max(a.y - b.y - b.h, b.y - a.y - a.h, 0),
    );
  for (const c of components) {
    if (ownerByComponent[c.id]) continue;
    let best = -1,
      d = Infinity;
    for (const [slot, m] of slots) {
      const dist = distance(c, m);
      if (dist < d) {
        d = dist;
        best = slot;
      }
    }
    if (d > (c.count >= 64 ? Math.min(im.w, im.h) / 16 : 4)) continue;
    ownerByComponent[c.id] = best + 1;
    const b = boxes[best],
      right = Math.max(b.x + b.w, c.x + c.w),
      bottom = Math.max(b.y + b.h, c.y + c.h);
    b.x = Math.min(b.x, c.x);
    b.y = Math.min(b.y, c.y);
    b.w = right - b.x;
    b.h = bottom - b.y;
  }
  const owners = new Uint8Array(size),
    depth = new Uint8Array(size);
  let head = 0,
    tail = 0;
  for (let p = 0; p < size; p++) {
    const owner = ownerByComponent[labels[p]];
    if (owner) {
      owners[p] = owner;
      queue[tail++] = p;
    }
  }
  // Grow ownership into graded-alpha edges; copy original RGBA unchanged, never binary alpha.
  while (head < tail) {
    const p = queue[head++];
    if (depth[p] >= 8) continue;
    const x = p % im.w,
      y = Math.floor(p / im.w);
    for (const next of [
      x > 0 ? p - 1 : -1,
      x + 1 < im.w ? p + 1 : -1,
      y > 0 ? p - im.w : -1,
      y + 1 < im.h ? p + im.w : -1,
    ]) {
      if (
        next < 0 ||
        owners[next] ||
        !im.data[next * 4 + 3] ||
        (labels[next] && !ownerByComponent[labels[next]])
      )
        continue;
      owners[next] = owners[p];
      depth[next] = depth[p] + 1;
      queue[tail++] = next;
    }
  }
  return boxes.map((b, slot) => {
    const x = Math.max(0, b.x - 8),
      y = Math.max(0, b.y - 8);
    const w = Math.min(im.w, b.x + b.w + 8) - x,
      h = Math.min(im.h, b.y + b.h + 8) - y;
    const data = Buffer.alloc(w * h * 4);
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) {
        const src = (y + yy) * im.w + x + xx;
        if (owners[src] === slot + 1) im.data.copy(data, (yy * w + xx) * 4, src * 4, src * 4 + 4);
      }
    return {
      art: { w, h, data },
      box: b,
      touchesSourceEdge: b.x === 0 || b.y === 0 || b.x + b.w >= im.w || b.y + b.h >= im.h,
    };
  });
}
