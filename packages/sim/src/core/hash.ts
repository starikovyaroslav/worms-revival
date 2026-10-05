// Incremental FNV-1a (32 bit) over simulation state, used for golden tests and desync detection.

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

const f64 = new Float64Array(1);
const f64Bytes = new Uint8Array(f64.buffer);

export class Hasher {
  h = FNV_OFFSET;

  byte(b: number): this {
    this.h = Math.imul(this.h ^ (b & 0xff), FNV_PRIME) >>> 0;
    return this;
  }

  bytes(data: Uint8Array): this {
    let h = this.h;
    for (let i = 0; i < data.length; i++) {
      h = Math.imul(h ^ (data[i] as number), FNV_PRIME);
    }
    this.h = h >>> 0;
    return this;
  }

  u32(v: number): this {
    return this.byte(v)
      .byte(v >>> 8)
      .byte(v >>> 16)
      .byte(v >>> 24);
  }

  /** Hashes the exact bit pattern of a float64. */
  f64(v: number): this {
    f64[0] = v;
    return this.bytes(f64Bytes);
  }

  bool(v: boolean): this {
    return this.byte(v ? 1 : 0);
  }

  str(s: string): this {
    for (let i = 0; i < s.length; i++) this.u32(s.charCodeAt(i));
    return this;
  }

  digest(): number {
    return this.h >>> 0;
  }
}
