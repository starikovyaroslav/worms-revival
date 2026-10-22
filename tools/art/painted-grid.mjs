import { bbox, cut } from './ingest.mjs';

/** Multi-part inventory symbols need transparent gutters, not "one component = one icon". */
export function paintedGrid(im, grid = 4) {
  const boundaries = (axis, lo, hi) => {
    const length = axis === 'y' ? im.h : im.w,
      result = [0];
    for (let n = 1; n < grid; n++) {
      const target = (length * n) / grid,
        margin = (length / grid) * 0.42;
      let best = -1,
        cost = Infinity;
      for (let p = Math.ceil(target - margin); p < target + margin; p++) {
        let occupied = 0;
        for (let q = lo; q < hi; q++) {
          const x = axis === 'y' ? q : p,
            y = axis === 'y' ? p : q;
          if (im.data[(y * im.w + x) * 4 + 3] >= 128) occupied++;
        }
        const score = occupied * 10000 + Math.abs(p - target);
        if (score < cost) {
          cost = score;
          best = p;
        }
      }
      if (cost >= 10000) throw new Error(`No transparent ${axis} gutter ${n}: repair required`);
      result.push(best);
    }
    return [...result, length];
  };
  const rows = boundaries('y', 0, im.w),
    cells = [];
  for (let row = 0; row < grid; row++) {
    const columns = boundaries('x', rows[row], rows[row + 1]);
    for (let col = 0; col < grid; col++) {
      const cell = cut(
        im,
        columns[col],
        rows[row],
        columns[col + 1] - columns[col],
        rows[row + 1] - rows[row],
      );
      const b = bbox(cell);
      const core = bbox({
        ...cell,
        data: Buffer.from(cell.data.map((v, i) => (i % 4 === 3 && v < 128 ? 0 : v))),
      });
      cells.push({
        art: cut(cell, b.x, b.y, b.w, b.h),
        touchesSourceEdge:
          (col === 0 && core.x === 0) ||
          (row === 0 && core.y === 0) ||
          (col === grid - 1 && core.x + core.w >= cell.w) ||
          (row === grid - 1 && core.y + core.h >= cell.h),
      });
    }
  }
  return cells;
}
