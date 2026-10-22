// Browser validation against the running client. Requires Chrome and Playwright.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://127.0.0.1:5174/';
const output = 'assets-in/previews/integration';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.locator('.logo img').waitFor();
  assert.equal(await page.locator('.logo img').getAttribute('alt'), 'Worms revival');
  const title = await page.title();
  assert.equal(title, 'Worms revival');
  const themeSelect = page.locator('select:has(option[value="meadow"])');
  await themeSelect.selectOption('meadow');
  await page.screenshot({ path: `${output}/menu-1280x720.png` });
  for (const viewport of [
    { width: 1024, height: 768 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    const box = await page.getByRole('button', { name: 'В бой!' }).boundingBox();
    assert.ok(
      box &&
        box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= viewport.width &&
        box.y + box.height <= viewport.height,
      'Start button fits menu',
    );
    await page.screenshot({ path: `${output}/menu-${viewport.width}x${viewport.height}.png` });
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  const scenes = [];
  for (const theme of ['meadow', 'arctic', 'desert', 'hell']) {
    await page.goto(`${url}?seed=42&theme=${theme}`);
    await page.waitForFunction(
      () =>
        window.__game?.scene.background.artLayers.length === 3 &&
        window.__game.scene.terrainView.art,
    );
    const result = await page.evaluate(() => {
      const { scene, match } = window.__game;
      match.setPaused(true);
      scene.userScrolled = true;
      scene.camera.level = 0.5;
      scene.render(1, 0);
      const bg = scene.background;
      const before = bg.artLayers.map((l) => l.tile.tilePosition.x);
      scene.camera.x += 80;
      scene.render(1, 0);
      scene.app.render();
      const offsets = bg.artLayers.map((l, i) => l.tile.tilePosition.x - before[i]);
      const base = scene.camera.baseScale * scene.camera.pixelRatio;
      const art = scene.terrainView.art;
      return {
        offsets,
        base,
        fillSize: [art.fill.w, art.fill.h],
        layers: bg.artLayers.length,
      };
    });
    assert.equal(new Set(result.offsets).size, 3, 'Layers move at different parallax speeds');
    assert.ok(Number.isInteger(result.base));
    assert.deepEqual(result.fillSize, [256, 256]);
    await page.screenshot({ path: `${output}/${theme}-1280x720.png` });
    scenes.push({ theme, ...result });
  }
  await page.goto(`${url}?seed=42&theme=meadow`);
  await page.waitForFunction(() => window.__game?.scene.terrainView.art);
  const crater = await page.evaluate(() => {
    const { game, scene, match } = window.__game;
    match.setPaused(true);
    const t = game.world.terrain;
    const x = Math.round(game.activeWorm.x + 50);
    let y = Math.round(game.activeWorm.y);
    while (y < t.height - 40 && !t.isSolid(x, y)) y++;
    y += 24;
    const wasSolid = t.isSolid(x, y);
    t.carveCircle(x, y, 16, true);
    scene.terrainView.update();
    const chunks = scene.terrainView.chunks;
    const chunk = chunks.find(
      (c) => x >= c.cx * 256 && x < c.cx * 256 + c.w && y >= c.cy * 256 && y < c.cy * 256 + c.h,
    );
    const density = scene.terrainView.density;
    const offset =
      ((y - chunk.cy * 256) * density * chunk.w * density + (x - chunk.cx * 256) * density) * 4;
    return {
      wasSolid,
      nowAir: !t.isSolid(x, y),
      alpha: chunk.pixels[offset + 3],
      dirty: t.dirty.length,
    };
  });
  assert.ok(crater.wasSolid && crater.nowAir);
  assert.equal(crater.alpha, 0);
  assert.equal(crater.dirty, 0);

  const inventory = await page.evaluate(async () => {
    const urls = window.performance.getEntriesByType('resource').map((e) => e.name);
    const renderUrl = urls.find((s) => /\/packages\/render\/src\/index\.ts(?:\?|$)/.test(s));
    const { assets, ART_PACKS } = await import(renderUrl);
    const { artSprite, scaleArt } = await import(
      renderUrl.replace(/index\.ts.*$/, 'views/common.ts')
    );
    const entries = {};
    for (const pack of ART_PACKS) {
      const manifest = await (await fetch(`/${pack}/manifest.json`)).json();
      Object.assign(entries, manifest.assets);
    }
    const problems = [];
    for (const [id, a] of Object.entries(entries)) {
      const texture = assets.get(id),
        sprite = artSprite(id);
      if (!texture || !sprite) {
        problems.push(`${id}: missing loaded texture`);
        continue;
      }
      if (texture.width !== a.pixelW || texture.height !== a.pixelH)
        problems.push(`${id}: native dimensions`);
      for (const facing of [-1, 1]) {
        scaleArt(sprite, facing);
        if (Math.abs(sprite.width - a.w) > 1e-6 || Math.abs(sprite.height - a.h) > 1e-6)
          problems.push(`${id}: display size`);
      }
      if (entries[`${id}_band`] && !assets.companion(texture, '_band'))
        problems.push(`${id}: missing team layer`);
      sprite.destroy();
    }
    const { scene, game } = window.__game;
    const worm = game.activeWorm,
      view = scene.worms.get(worm.id);
    worm.grounded = true;
    for (const hold of [
      'bazooka',
      'grenade',
      'cluster',
      'banana',
      'shotgun',
      'handgun',
      'uzi',
      'minigun',
      'mortar',
    ]) {
      for (const facing of [-1, 1]) {
        worm.facing = facing;
        view.update(1, 0, true, (x, y) => ({ x, y }), hold);
        const body = view.skinActor?.body ?? view.pixel.body;
        const teamLayer = view.skinActor?.team ?? view.pixel.band;
        if (Math.abs(body.width - 32) > 1e-6 || !teamLayer.visible)
          problems.push(`${hold}: live body density/team layer`);
      }
    }
    return { textures: Object.keys(entries).length, problems };
  });
  assert.ok(inventory.textures >= 696);
  assert.deepEqual(inventory.problems, []);

  // Spawn real entities through the same sim module the running client loaded.
  const sprites = await page.evaluate(async () => {
    const simUrl = window.performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .find((n) => /\/packages\/sim\/src\/index\.ts(?:\?|$)/.test(n));
    const sim = await import(simUrl);
    const { game, scene, match } = window.__game;
    match.setPaused(true);
    const x = game.activeWorm.x,
      y = game.activeWorm.y - 60;
    scene.userScrolled = true;
    scene.camera.level = 1;
    scene.camera.lookAt(x, y - 10);
    const blast = { crater: 10, radius: 20, damage: 10 };
    const spawned = [];
    for (const [i, look] of ['sheep', 'mole', 'cow', 'oldwoman'].entries()) {
      spawned.push(
        game.world.spawn(
          new sim.Sheep(
            x - 90 + i * 35,
            y,
            1,
            { blast, fuse: 1000, canFly: true, aqua: false, look },
            0,
          ),
        ),
      );
    }
    const hero = new sim.Sheep(x + 55, y, 1, { blast, fuse: 1000, canFly: true, aqua: false }, 0);
    hero.mode = 'fly';
    spawned.push(game.world.spawn(hero));
    spawned.push(game.world.spawn(new sim.Pigeon(x + 90, y, 1, x + 100, y, blast, 0)));
    spawned.push(game.world.spawn(new sim.Donkey(x + 125, y, blast)));
    spawned.push(game.world.spawn(new sim.Crate(x - 90, y - 45, 'health', '', 25)));
    spawned.push(
      game.world.spawn(
        new sim.Mine(x - 50, y - 45, { armTicks: 0, fuseTicks: 100, dudsAllowed: false }),
      ),
    );
    for (const [i, look] of ['banana', 'skunk', 'dynamite', 'petrol'].entries())
      spawned.push(
        game.world.spawn(
          new sim.Projectile(x + i * 35, y - 45, 1, 0, {
            look,
            radius: 4,
            wind: 0,
            impact: 'bounce',
            fuse: 1000,
            blast,
          }),
        ),
      );
    spawned.push(game.world.spawn(new sim.Barrel(x - 90, y - 90)));
    game.world.spawn(new sim.Flame(x - 90, y - 90, 0, 0, 100));
    spawned.push(game.world.spawn(new sim.Crate(x - 50, y - 90, 'weapon', 'lowgravity', 1)));
    spawned.push(game.world.spawn(new sim.Gas(x, y - 90, 0, 0, 100)));
    for (let i = 0; i < 4; i++)
      spawned.push(game.world.spawn(new sim.Gravestone(x + 35 + i * 25, y - 90, i)));
    game.world.all();
    scene.render(1, 120);
    const rows = spawned.map((e) => {
      const view = scene.entities.get(e.id);
      const sprite = view?.container.children.find((c) => c.texture);
      return {
        kind: e.kind,
        look: e.opts?.look ?? e.look,
        visible: !!sprite,
        size: sprite ? [sprite.texture.width, sprite.texture.height] : [],
      };
    });
    const animated = spawned[0];
    const view = scene.entities.get(animated.id);
    const first = view.art.texture;
    view.update(1, 125);
    scene.app.render();
    return { rows, sheepAnimated: view.art.texture !== first };
  });
  assert.ok(
    sprites.rows.every((r) => r.visible),
    'All spawned entities use loaded sprites',
  );
  assert.ok(sprites.sheepAnimated);
  await page.screenshot({ path: `${output}/creatures-and-props.png` });
  assert.deepEqual(errors, []);

  // The generated pack remains optional if it is not installed.
  const fallback = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const fallbackErrors = [];
  fallback.on('pageerror', (e) => fallbackErrors.push(e.message));
  await fallback.route('**/assets/generated/manifest.json*', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await fallback.goto(`${url}?seed=42`);
  await fallback.waitForFunction(() => window.__game);
  assert.equal(
    await fallback.evaluate(
      () =>
        window.__game.scene.background.artSky === null &&
        window.__game.scene.terrainView.art === undefined,
    ),
    true,
  );
  assert.deepEqual(fallbackErrors, []);
  console.log(
    JSON.stringify(
      { scenes, crater, inventory, sprites, fallback: 'passed', screenshots: output },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
