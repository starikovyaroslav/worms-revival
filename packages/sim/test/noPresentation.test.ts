/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? sources(join(dir, e.name))
      : e.name.endsWith('.ts')
        ? [join(dir, e.name)]
        : [],
  );
}

describe('sim stays free of presentation data', () => {
  it('has no Russian text (names, hints and panel cells live in the content specs)', () => {
    for (const file of sources(join(import.meta.dirname, '../src')))
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/[А-Яа-яЁё]/);
  });
});
