/**
 * Labels 4-connected regions where `data[i] !== 0 === solid` and clears those smaller than
 * `minSize`. Used both for removing tiny floating specks (solid) and filling tiny holes (air).
 */
export function removeSmallRegions(
  data: Uint8Array,
  width: number,
  height: number,
  solid: boolean,
  minSize: number,
  replaceWith: number,
): void {
  const seen = new Uint8Array(data.length);
  const stack = new Int32Array(data.length);
  const region: number[] = [];
  const matches = (i: number) => (data[i] !== 0) === solid;

  for (let start = 0; start < data.length; start++) {
    if (seen[start] || !matches(start)) continue;
    let sp = 0;
    stack[sp++] = start;
    seen[start] = 1;
    region.length = 0;
    let touchesEdge = false;
    while (sp > 0) {
      const i = stack[--sp] as number;
      region.push(i);
      const x = i % width;
      const y = (i - x) / width;
      if (x === 0 || x === width - 1 || y === 0) touchesEdge = true;
      const neighbours = [
        x > 0 ? i - 1 : -1,
        x < width - 1 ? i + 1 : -1,
        y > 0 ? i - width : -1,
        y < height - 1 ? i + width : -1,
      ];
      for (const n of neighbours) {
        if (n >= 0 && !seen[n] && matches(n)) {
          seen[n] = 1;
          stack[sp++] = n;
        }
      }
    }
    // Open air connected to the map border is the sky, never a "hole".
    if (region.length < minSize && (solid || !touchesEdge)) {
      for (const i of region) data[i] = replaceWith;
    }
  }
}
