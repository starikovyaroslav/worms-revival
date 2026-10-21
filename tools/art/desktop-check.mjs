// Desktop integration: source-pixel density must never leak into world/display dimensions.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:5174/';
const output = 'assets-in/previews/desktop';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [],
  results = [];
try {
  for (const [width, height, dpr] of [
    [1920, 1080, 1],
    [2560, 1440, 1],
    [1920, 1080, 2],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.goto(`${base}?seed=42&scheme=arsenal`);
    await page.waitForFunction(() => window.__game?.scene.terrainView.art);
    const result = await page.evaluate(async () => {
      const urls = window.performance.getEntriesByType('resource').map((e) => e.name);
      const sim = await import(urls.find((s) => /\/packages\/sim\/src\/index\.ts(?:\?|$)/.test(s)));
      const render = await import(
        urls.find((s) => /\/packages\/render\/src\/index\.ts(?:\?|$)/.test(s))
      );
      const { scene, game, match } = window.__game;
      match.setPaused(true);
      match.loop.stop();
      scene.setCrt('off');
      scene.effects.clear();
      scene.userScrolled = true;
      scene.camera.level = 1;
      const x = game.activeWorm.x,
        y = game.activeWorm.y;
      scene.camera.lookAt(x, y - 30);
      const fire = (power) => {
        game.rules.get('bazooka').fire({
          world: game.world,
          worm: game.activeWorm,
          dirX: 1,
          dirY: 0,
          power: 1,
          fuse: 90,
          bounceHigh: false,
          target: null,
          setting: { ...sim.weaponSetting(game.scheme, 'bazooka'), power },
          upgrades: game.scheme.upgrades,
          baseDamageScale: 1,
          focus() {},
          control() {},
          switchWorm() {},
        });
        return game.world.ofKind('projectile').at(-1);
      };
      const normal = fire(3),
        upgraded = fire(4);
      [normal, upgraded].forEach((p, i) => {
        p.x = p.prevX = x + (i ? 40 : -40);
        p.y = p.prevY = y - 40;
      });
      const flame = game.world.spawn(new sim.Flame(x + 60, y, 0, 0, 100));
      const gas = game.world.spawn(new sim.Gas(x - 55, y - 10, 0, 0, 300));
      const jet = game.world.spawn(new sim.JetPack(game.activeWormId));
      jet.thrusting = true;
      game.activeWorm.poisoned = true;
      scene.transports.play({
        type: 'airRaid',
        x,
        y: -200,
        dir: 1,
        speed: 1,
        spacing: 20,
        payloadIds: [],
        source: 'airstrike',
      });
      const before = game.hash();
      for (let i = 0; i < 9; i++) scene.render(1, 100);
      scene.effects.clear();
      scene.effects.play('explosion', x + 95, y - 25, 50, { dirt: 0x663931, wind: 0 });
      scene.effects.play('explosion-paper', x - 100, y - 25, 30, { dirt: 0x663931, wind: 0 });
      scene.effects.update(100);
      const blast = scene.effects.clips.container.children[0];
      const firstWidth = blast.width;
      scene.effects.update(100);
      scene.app.render();
      const n = scene.entities.get(normal.id).art,
        u = scene.entities.get(upgraded.id).art;
      const plane = scene.transports.flights[0].sprite;
      const fv = scene.entities.get(flame.id).art,
        gv = scene.entities.get(gas.id).art;
      const jv = scene.entities.get(jet.id).exhaust;
      const poisoned = scene.worms.get(game.activeWormId).poison;
      const paper = scene.effects.particles.filter(
        (p) =>
          p.sprite.texture === render.assets.get('vfx/letter_0') ||
          p.sprite.texture === render.assets.get('vfx/letter_1') ||
          p.sprite.texture === render.assets.get('vfx/letter_2') ||
          p.sprite.texture === render.assets.get('vfx/letter_3'),
      );
      return {
        hashStable: before === game.hash(),
        normal: {
          pixels: n.texture.width,
          world: n.width,
          variant: game.world.variantOf(normal),
          collision: normal.radius,
        },
        upgraded: {
          pixels: u.texture.width,
          world: u.width,
          variant: game.world.variantOf(upgraded),
          collision: upgraded.radius,
        },
        plane: {
          pixels: plane.texture.width,
          css: plane.width,
          expected: 128 * scene.camera.baseScale,
        },
        blast: { pixels: blast.texture.width, world: blast.width, firstWidth },
        fire: fv.width,
        gas: gv.width,
        poison: poisoned.width,
        jet: jv.width,
        paper: paper.length > 0 && paper.every((p) => p.sprite.width <= 16.001),
      };
    });
    assert.ok(result.hashStable, 'render-only operations preserve the full game hash');
    assert.deepEqual(result.normal, { pixels: 78, world: 26, variant: 'standard', collision: 2 });
    assert.deepEqual(result.upgraded, { pixels: 90, world: 30, variant: 'mk2', collision: 2 });
    assert.equal(result.plane.pixels, 384);
    assert.equal(result.plane.css, result.plane.expected);
    assert.deepEqual(result.blast, { pixels: 256, world: 100, firstWidth: 100 });
    assert.equal(result.fire, 14);
    assert.ok(result.gas >= 16 && result.gas <= 25.6);
    assert.ok(Math.abs(result.poison - 11.2) < 0.001);
    assert.ok(Math.abs(result.jet - 16.8) < 0.001);
    assert.ok(result.paper);
    // Exercise the actual WebAudio graphs offline, independent of autoplay/user-gesture policy.
    if (width === 1920 && dpr === 1) {
      const audio = await page.evaluate(async () => {
        const urls = window.performance.getEntriesByType('resource').map((e) => e.name);
        const { cinematicSound } = await import(
          urls.find((s) => /\/audio\/cinematic\.ts(?:\?|$)/.test(s))
        );
        const { AudioEngine } = await import(
          urls.find((s) => /\/audio\/engine\.ts(?:\?|$)/.test(s))
        );
        const levels = {};
        for (const id of [
          'flyby-attack',
          'flyby-gunship',
          'flyby-stealth',
          'launch-heavy',
          'impact-heavy',
        ]) {
          const ctx = new window.OfflineAudioContext(2, 44100 * 3, 44100);
          const buffer = ctx.createBuffer(1, 44100, 44100),
            data = buffer.getChannelData(0);
          let state = 17;
          for (let i = 0; i < data.length; i++) {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            data[i] = state / 2147483648 - 1;
          }
          const a = {
            ctx,
            now: 0,
            env: AudioEngine.prototype.env,
            noiseSource() {
              const s = ctx.createBufferSource();
              s.buffer = buffer;
              s.loop = true;
              return s;
            },
          };
          const out = ctx.createGain();
          out.connect(ctx.destination);
          cinematicSound(a, out, id);
          const rendered = await ctx.startRendering(),
            samples = rendered.getChannelData(0);
          let energy = 0,
            peak = 0;
          for (const sample of samples) {
            energy += sample * sample;
            peak = Math.max(peak, Math.abs(sample));
          }
          levels[id] = { rms: Math.sqrt(energy / samples.length), peak };
        }
        return levels;
      });
      assert.ok(
        Object.values(audio).every((a) => a.rms > 0.001 && a.peak < 1),
        JSON.stringify(audio),
      );
      results.push({ audio });
    }
    await page.screenshot({ path: `${output}/${width}x${height}-dpr${dpr}.png` });
    await page.evaluate(() => {
      const { scene } = window.__game;
      scene.setCrt('strong');
      scene.app.render();
    });
    await page.screenshot({ path: `${output}/${width}x${height}-dpr${dpr}-crt.png` });
    results.push({ width, height, dpr, ...result });
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ results, errors, screenshots: output }, null, 2));
} finally {
  await browser.close();
}
