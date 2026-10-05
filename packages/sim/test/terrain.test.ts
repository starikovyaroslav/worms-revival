import { describe, expect, it } from 'vitest';
import { Material, Terrain } from '../src/terrain/terrain';

function slab(): Terrain {
  const t = new Terrain(100, 100);
  for (let y = 50; y < 100; y++) for (let x = 0; x < 100; x++) t.set(x, y, Material.Soil);
  return t;
}

describe('Terrain', () => {
  it('treats out of bounds as air', () => {
    const t = slab();
    expect(t.isSolid(-1, 60)).toBe(false);
    expect(t.isSolid(50, 100)).toBe(false);
    expect(t.isSolid(50, 60)).toBe(true);
  });

  it('carves a crater and scorches its rim', () => {
    const t = slab();
    const removed = t.carveCircle(50, 50, 10);
    expect(removed).toBeGreaterThan(100);
    expect(t.get(50, 55)).toBe(Material.Air);
    expect(t.get(50, 61)).toBe(Material.Scorched);
    expect(t.get(50, 70)).toBe(Material.Soil);
    expect(t.dirty.length).toBe(1);
  });

  it('never carves rock', () => {
    const t = slab();
    t.set(50, 55, Material.Rock);
    t.carveCircle(50, 55, 8);
    expect(t.get(50, 55)).toBe(Material.Rock);
  });

  it('computes an upward normal on flat ground', () => {
    const n = slab().normalAt(50, 49);
    expect(n).not.toBeNull();
    expect(n!.y).toBeLessThan(-0.99);
    expect(Math.abs(n!.x)).toBeLessThan(1e-9);
  });

  it('detects circle collisions and raycasts', () => {
    const t = slab();
    expect(t.circleCollides(50, 45, 4)).toBe(false);
    expect(t.circleCollides(50, 47, 4)).toBe(true);
    expect(t.raycast(50, 10, 0, 1, 100)).toBe(40);
    expect(t.raycast(50, 10, 0, -1, 100)).toBe(-1);
  });

  it('fills a rotated girder', () => {
    const t = new Terrain(100, 100);
    t.fillRotatedRect(50, 50, 20, 3, 1, 0, Material.Girder);
    expect(t.get(35, 50)).toBe(Material.Girder);
    expect(t.get(50, 55)).toBe(Material.Air);
  });
});
