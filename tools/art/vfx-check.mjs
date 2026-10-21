// Integration / visual review. Start Vite first; screenshots stay in ignored assets-in/.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://127.0.0.1:5174/';
const output = 'assets-in/previews/vfx';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
async function open(fallback = false, reducedMotion = 'no-preference', deviceScaleFactor = 1) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    reducedMotion,
    deviceScaleFactor,
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text());
  });
  if (fallback)
    await page.route('**/assets/vfx/manifest.json*', (route) =>
      route.fulfill({ status: 404, body: '' }),
    );
  await page.goto(`${url}?seed=42&scheme=arsenal`);
  await page.waitForFunction(() => window.__game?.scene.terrainView.art);
  await page.evaluate(async () => {
    const urls = window.performance.getEntriesByType('resource').map((e) => e.name);
    const sim = await import(urls.find((s) => /\/packages\/sim\/src\/index\.ts(?:\?|$)/.test(s)));
    const render = await import(
      urls.find((s) => /\/packages\/render\/src\/index\.ts(?:\?|$)/.test(s))
    );
    const { game, scene, match } = window.__game;
    match.setPaused(true);
    match.loop.stop();
    scene.setCrt('off');
    scene.effects.clear();
    scene.userScrolled = true;
    scene.camera.lookAt(game.activeWorm.x, game.activeWorm.y - 30);
    window.__vfx = {
      sim,
      render,
      game,
      scene,
      frame(ms = 100) {
        scene.render(1, ms);
        scene.app.render();
      },
      fire(id) {
        game.rules.get(id).fire({
          world: game.world,
          worm: game.activeWorm,
          dirX: 1,
          dirY: 0,
          power: 1,
          fuse: 90,
          bounceHigh: false,
          target: { x: game.activeWorm.x, y: game.activeWorm.y },
          setting: sim.weaponSetting(game.scheme, id),
          upgrades: game.scheme.upgrades,
          baseDamageScale: 1,
          focus() {},
          control() {},
          switchWorm() {},
        });
      },
    };
  });
  return page;
}
try {
  const page = await open();
  const coverage = await page.evaluate(() => {
    const { render, game, scene, sim, frame } = window.__vfx;
    const x = game.activeWorm.x,
      y = game.activeWorm.y - 40;
    const clips = Object.keys(render.VFX_CLIPS);
    const loaded = clips.every(
      (name) => render.clipTextures(name).length === render.VFX_CLIPS[name].frames,
    );
    const flight = ['missile', 'homing', 'letter'].map((look, i) => {
      const p = game.world.spawn(
        new sim.Projectile(x - 40 + i * 40, y, 4, 0, {
          look,
          radius: 2,
          wind: 0,
          impact: 'explode',
          blast: { damage: 0 },
        }),
      );
      frame(0);
      const v = scene.entities.get(p.id),
        first = v.art.texture;
      v.update(1, 100);
      return { look, frames: v.flightFrames.length, animated: first !== v.art.texture };
    });
    const before = game.hash();
    for (let i = 0; i < 5; i++) frame();
    return { loaded, clips: clips.length, flight, hashStable: before === game.hash() };
  });
  assert.ok(coverage.loaded && coverage.hashStable);
  assert.equal(coverage.clips, 17);
  assert.deepEqual(
    coverage.flight.map((p) => p.frames),
    [2, 2, 4],
  );
  assert.ok(coverage.flight.every((p) => p.animated));

  for (const weapon of [
    'airstrike',
    'mail',
    'napalm',
    'minestrike',
    'molesquad',
    'frenchsheep',
    'carpet',
  ]) {
    const raid = await page.evaluate((weapon) => {
      const { game, scene, fire, frame, render } = window.__vfx;
      fire(weapon);
      const events = game.world.drainEvents();
      const cue = events.find((e) => e.type === 'airRaid');
      const before = game.hash();
      scene.transports.play(cue);
      for (let i = 0; i < 8; i++) frame();
      const f = scene.transports.flights.at(-1);
      return {
        source: cue.source,
        payloads: cue.payloadIds.length,
        lineage: cue.payloadIds.every((id) => game.world.sourceOf(game.world.byId(id)) === weapon),
        open:
          f.sprite.texture ===
          render.assets.get(`vfx/${weapon === 'mail' ? 'mailplane' : 'cargo'}_3`),
        drops: scene.transports.drops.length,
        hashStable: before === game.hash(),
      };
    }, weapon);
    assert.equal(raid.source, weapon);
    assert.ok(
      raid.payloads > 0 && raid.lineage && raid.open && raid.hashStable,
      JSON.stringify(raid),
    );
    assert.ok(raid.drops > 0, `visible cosmetic drops: ${weapon}`);
    if (weapon === 'mail' || weapon === 'airstrike')
      await page.screenshot({ path: `${output}/${weapon}-in-game.png` });
    await page.evaluate(() => {
      for (let i = 0; i < 20; i++) window.__vfx.frame();
    });
  }

  await page.evaluate(() => {
    const { game, scene } = window.__vfx;
    scene.effects.clear();
    const x = game.activeWorm.x,
      y = game.activeWorm.y - 35;
    const families = [
      'explosion',
      'explosion-fragment',
      'explosion-fire',
      'explosion-banana',
      'explosion-animal',
      'explosion-energy',
      'explosion-toxic',
      'explosion-paper',
      'explosion-meteor',
    ];
    families.forEach((id, i) =>
      scene.effects.play(id, x + ((i % 3) - 1) * 120, y + (Math.floor(i / 3) - 1) * 85, 30, {
        dirt: 0x663931,
        wind: 0,
      }),
    );
    scene.effects.update(100);
    scene.app.render();
  });
  assert.ok(await page.evaluate(() => window.__vfx.scene.effects.clips.activeCount >= 9));
  await page.screenshot({ path: `${output}/blast-families-in-game.png` });
  await page.evaluate(() => {
    for (let i = 0; i < 5; i++) window.__vfx.frame();
  });
  await page.screenshot({ path: `${output}/blast-families-late.png` });

  const lifecycle = await page.evaluate(() => {
    const { game, scene, sim, frame, fire } = window.__vfx;
    scene.effects.clear();
    const x = game.activeWorm.x,
      y = game.activeWorm.y;
    game.world.emit({ type: 'death', wormId: game.activeWormId, x, y, team: 0 });
    game.world.emit({ type: 'steam', x: x + 30, y });
    scene.handleEvents();
    const ghosts = scene.effects.clips.activeCount;
    const gas = game.world.spawn(new sim.Gas(x + 45, y - 20, 0, 0, 300));
    const grave = game.world.spawn(new sim.Gravestone(x - 30, y, 0));
    frame(0);
    const gv = scene.entities.get(gas.id),
      first = gv.art.texture;
    gas.life = 40;
    frame(100);
    const gasChanged = gv.art.texture !== first;
    const tomb = scene.entities.get(grave.id),
      small = tomb.art.scale.y;
    for (let i = 0; i < 3; i++) frame();
    const grown = tomb.art.scale.y > small;
    const before = game.hash();
    for (let i = 0; i < 1000; i++) scene.effects.clips.play('blast', x, y);
    for (let i = 0; i < 40; i++) scene.burnMarks.add(x, y, 30);
    const bounded = scene.effects.clips.activeCount === 192 && scene.burnMarks.activeCount === 32;
    const stable = before === game.hash();
    scene.effects.clear();
    fire('nuke');
    scene.handleEvents();
    frame(100);
    return {
      ghosts,
      gasChanged,
      grown,
      bounded,
      stable,
      nuke: scene.effects.clips.active.some(
        (c) => c.frames[0] === window.__vfx.render.assets.get('vfx/nuke_0'),
      ),
      sensory: !!scene.post.sensoryEffect,
    };
  });
  assert.ok(
    lifecycle.ghosts >= 2 &&
      lifecycle.gasChanged &&
      lifecycle.grown &&
      lifecycle.bounded &&
      lifecycle.stable &&
      lifecycle.nuke &&
      lifecycle.sensory,
    JSON.stringify(lifecycle),
  );
  await page.screenshot({ path: `${output}/nuke-in-game.png` });

  // CRT toggling must preserve an active screen pulse, expiry must preserve CRT.
  const filters = await page.evaluate(() => {
    const { scene, frame } = window.__vfx;
    scene.setCrt('strong');
    const both = scene.picture.filters.length;
    scene.setCrt('off');
    const pulse = scene.picture.filters.length;
    scene.setCrt('strong');
    for (let i = 0; i < 16; i++) frame();
    const crtOnly = scene.picture.filters.length;
    scene.setCrt('off');
    return { both, pulse, crtOnly, none: scene.picture.filters === null };
  });
  assert.deepEqual(filters, { both: 3, pulse: 2, crtOnly: 1, none: true });
  const disposed = await page.evaluate(() => {
    const { scene, render } = window.__vfx;
    const owned = [...scene.effects.ownedTextures];
    scene.destroy();
    return {
      owned: owned.length > 0 && owned.every((t) => t.destroyed),
      shared:
        !render.assets.get('vfx/smoke_0').destroyed && !render.assets.get('vfx/blast_0').destroyed,
      containers:
        scene.effects.front.destroyed &&
        scene.burnMarks.container.destroyed &&
        scene.transports.container.destroyed,
    };
  });
  assert.deepEqual(disposed, { owned: true, shared: true, containers: true });
  await page.close();

  const fallback = await open(true);
  const fallbackResult = await fallback.evaluate(() => {
    const { scene, game, render, fire, frame } = window.__vfx;
    fire('mail');
    scene.handleEvents();
    frame();
    scene.effects.play('explosion-energy', game.activeWorm.x, game.activeWorm.y, 40, {
      dirt: 0,
      wind: 0,
    });
    scene.app.render();
    return {
      missing: render.clipTextures('blast').length === 0,
      clips: scene.effects.clips.activeCount,
      planes: scene.transports.activeCount,
      fallback: scene.effects.blasts.container.children.length > 0,
    };
  });
  assert.deepEqual(fallbackResult, { missing: true, clips: 0, planes: 0, fallback: true });
  await fallback.close();
  for (const dpr of [1.5, 2]) {
    const scaled = await open(false, 'reduce', dpr);
    const safe = await scaled.evaluate(() => {
      const { scene, frame } = window.__vfx;
      scene.setCrt('strong');
      scene.previewScreenEffect('blind');
      frame();
      return !scene.post.sensoryEffect && scene.picture.filters.length === 1;
    });
    assert.ok(safe);
    await scaled.screenshot({ path: `${output}/crt-dpr-${dpr}.png` });
    await scaled.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      { coverage, lifecycle, filters, disposed, fallbackResult, screenshots: output },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
