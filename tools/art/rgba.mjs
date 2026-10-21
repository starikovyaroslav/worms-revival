/** Production exports preserve source RGB and continuous alpha. DB32 is art direction, not a codec. */
export function validate(im) {
  if (im.data.length !== im.w * im.h * 4) throw new Error('Invalid RGBA buffer');
  const colors = new Set(),
    alphas = new Set();
  let transparent = 0,
    partialAlpha = 0;
  for (let i = 0; i < im.data.length; i += 4) {
    const a = im.data[i + 3];
    alphas.add(a);
    if (!a) {
      transparent++;
      continue;
    }
    if (a < 255) partialAlpha++;
    colors.add(im.data.readUIntBE(i, 3));
  }
  return { colors: colors.size, transparent, partialAlpha, alphaLevels: alphas.size };
}

/** Premultiplied crossfade: matching tile edges without palette or alpha quantization. */
export function healSeam(im, axis) {
  const length = axis === 'x' ? im.w : im.h,
    count = axis === 'x' ? im.h : im.w;
  const band = Math.min(24, Math.floor(length / 4)),
    original = Buffer.from(im.data);
  for (let i = 0; i < count; i++)
    for (let j = 0; j < band; j++) {
      const a = axis === 'x' ? (i * im.w + j) * 4 : (j * im.w + i) * 4;
      const b = axis === 'x' ? (i * im.w + length - 1 - j) * 4 : ((length - 1 - j) * im.w + i) * 4;
      const t = (1 - j / band) * 0.5;
      for (const [dst, other] of [
        [a, b],
        [b, a],
      ]) {
        const alpha = original[dst + 3] * (1 - t) + original[other + 3] * t;
        for (let c = 0; c < 3; c++)
          im.data[dst + c] = alpha
            ? Math.round(
                (original[dst + c] * original[dst + 3] * (1 - t) +
                  original[other + c] * original[other + 3] * t) /
                  alpha,
              )
            : 0;
        im.data[dst + 3] = Math.round(alpha);
      }
    }
}
