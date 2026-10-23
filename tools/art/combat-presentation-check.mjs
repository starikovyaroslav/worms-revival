/** Real runtime review: anatomy/weapon angles, finite reactions and seeded terrain previews. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
const output = process.argv[3] ?? 'docs/design/concepts/combat-motion-v1/live';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.argv[2] ?? 'http://127.0.0.1:5174/');
  await page.getByLabel('Тема', { exact: true }).selectOption('meadow');
  await page.locator('.map-details > summary').click();
  await page.getByLabel('Seed', { exact: true }).fill('42');
  await page.getByLabel('Seed', { exact: true }).press('Tab');
  await page.locator('.map-details > summary').click();
  await page.waitForFunction(
    () => document.querySelector('canvas.map-preview')?.dataset.previewKey === '42/island/meadow',
  );
  await page.screenshot({ path: `${output}/menu-islands-42.png` });
  await page.getByRole('button', { name: 'В бой!' }).click();
  await page.waitForFunction(() => window.__game?.scene.worms.size > 0);
  const results = await page.evaluate(async () => {
    const urls = window.performance.getEntriesByType('resource').map((e) => e.name);
    const render = await import(
      urls.find((s) => /\/packages\/render\/src\/index\.ts(?:\?|$)/.test(s))
    );
    const sim = await import(urls.find((s) => /\/packages\/sim\/src\/index\.ts(?:\?|$)/.test(s)));
    const pixi = await import(urls.find((s) => /\/pixi__js\.js(?:\?|$)/.test(s)));
    const { scene, game, match } = window.__game;
    match.setPaused(true);
    match.loop.stop();
    scene.setCrt('off');
    const before = game.hash();
    const problems = [];
    let combinations = 0;
    for (const skin of render.SKINS.filter((s) => render.assets.has(`skins/${s.id}/idle`))) {
      const w = new sim.Worm(0, 0, skin.name, 0, 100);
      const actor = new render.SkinActor(skin.id, 0xff5555);
      for (const weapon of game.rules.weapons)
        for (const facing of [-1, 1])
          for (const angle of [-Math.PI / 2, -0.8, 0, 0.8, Math.PI / 2]) {
            w.facing = facing;
            w.aim = angle;
            actor.update(w, 0, weapon.id);
            const mount = render.WEAPON_MOUNTS.get(weapon.id);
            if (
              actor.weapon.visible &&
              actor.body.texture !== render.assets.get(`rig/body/${skin.id}`)
            )
              problems.push(`${skin.id}/${weapon.id}: old arms baked into holding torso`);
            if (mount.aim && actor.weapon.visible) {
              if (Math.abs(actor.weapon.rotation + actor.aimRay.angle) > 1e-8)
                problems.push(`${skin.id}/${weapon.id}: barrel angle`);
              const ray = actor.aimRay;
              if (
                Math.abs(ray.x * facing * Math.sin(angle) + (ray.y + 6.5) * Math.cos(angle)) > 1e-7
              )
                problems.push(`${skin.id}/${weapon.id}: different simulation firing axis`);
              if (Math.abs(actor.weapon.scale.x * actor.weapon.texture.width - mount.width) > 1e-8)
                problems.push(`${skin.id}/${weapon.id}: visible size`);
              if (!actor.palmParts.visible && !actor.hands.context.instructions.length)
                problems.push(`${skin.id}/${weapon.id}: missing hands`);
            }
            combinations++;
          }
      actor.container.destroy({ children: true });
    }
    for (const clip of Object.keys(render.REACTION_CLIPS))
      for (let i = 0; i < render.REACTION_CLIPS[clip].frames; i++)
        if (!render.assets.has(`reactions/brutal/${clip}_${i}`))
          problems.push(`Missing ${clip}_${i}`);
    const reactionWorm = new sim.Worm(0, 0, '', 0, 100);
    const reactionActor = new render.SkinActor('brutal', 0xff5555);
    reactionActor.update(reactionWorm, 0, '');
    reactionWorm.state = 'airborne';
    reactionWorm.blasted = true;
    reactionWorm.vy = 6;
    const motion = (tick, sequence, detail) =>
      reactionActor.motion({
        type: 'worm-motion',
        wormId: reactionWorm.id,
        tick,
        sequence,
        x: 0,
        y: 0,
        motion: detail,
      });
    motion(0, 0, { kind: 'impulse', vx: 0, vy: 6 });
    for (let i = 0; i < 4; i++) {
      reactionActor.update(reactionWorm, 999, '', undefined, 100, i * 0.115);
      if (reactionActor.body.texture !== render.assets.get(`reactions/brutal/blast_${i}`))
        problems.push(`Blast actor playback ${i}`);
      if (Math.abs(reactionActor.rig.rotation) > 0.25) problems.push('Rigid sprite spin');
    }
    reactionWorm.state = 'idle';
    reactionWorm.vy = 0;
    motion(20, 1, { kind: 'contact', vx: 0, vy: 7, nx: 0, ny: -1, airborne: false });
    reactionActor.update(reactionWorm, 999, '', undefined, 100, 0.4);
    if (reactionActor.body.texture !== render.assets.get('reactions/brutal/land-hard_1'))
      problems.push('Landing does not start with contact squash');
    reactionActor.update(reactionWorm, 999, '', undefined, 100, 0.9);
    reactionWorm.state = 'airborne';
    reactionWorm.blasted = false;
    reactionWorm.y = 99;
    reactionActor.update(reactionWorm, 0, '', undefined, 100, 0.9);
    reactionWorm.y = 101;
    motion(50, 2, { kind: 'water-entry', vx: 0, vy: 7 });
    reactionActor.update(reactionWorm, 999, '', undefined, 100, 1);
    if (reactionActor.body.texture !== render.assets.get('reactions/brutal/water_0'))
      problems.push('Water starts below surface');
    reactionWorm.health = 0;
    reactionWorm.state = 'dead';
    reactionWorm.drowned = true;
    reactionWorm.y = 114;
    motion(65, 3, { kind: 'water-entry', vx: 0, vy: 8 });
    reactionActor.update(reactionWorm, 999, '', undefined, 100, 1.3);
    if (
      !reactionActor.container.visible ||
      reactionActor.body.texture !== render.assets.get('reactions/brutal/water_2')
    )
      problems.push('Water entry restarts/disappears on death');
    reactionActor.update(reactionWorm, 999, '', undefined, 100, 1.6);
    if (reactionActor.container.visible) problems.push('Water animation never ends');
    reactionActor.container.destroy({ children: true });
    const waterOpaque = [];
    for (const style of ['painted', undefined]) {
      const water = new render.WaterView(
        { ...render.themeById('meadow'), artStyle: style },
        new sim.Terrain(200, 160),
      );
      const target = new pixi.Container();
      target.addChild(new pixi.Graphics().rect(0, 0, 200, 160).fill(0xff00ff), water.front);
      water.update(0, 40, 100, 100);
      const sample = scene.app.renderer.extract.pixels({
        target,
        frame: new pixi.Rectangle(0, 70, 200, 10),
        resolution: 1,
      }).pixels;
      let opaque = true;
      for (let i = 0; i < sample.length; i += 4)
        if (
          sample[i + 3] !== 255 ||
          (sample[i] === 255 && sample[i + 1] === 0 && sample[i + 2] === 255)
        )
          opaque = false;
      waterOpaque.push(opaque);
      if (!opaque) problems.push(`${style ?? 'legacy'}: underwater scenery shines through`);
      target.destroy({ children: true });
      water.back.destroy({ children: true });
    }
    window.__combatReview = { render, sim, pixi, scene, game };
    return {
      combinations,
      problems,
      mapVersion: match.config.mapVersion,
      cosmetic: before === game.hash(),
      waterOpaque,
    };
  });
  assert.equal(results.combinations, 36 * 67 * 2 * 5);
  assert.deepEqual(results.problems, []);
  assert.equal(results.mapVersion, 2);
  assert.equal(results.cosmetic, true);
  await page.addStyleTag({ content: '#ui { display: none !important; }' });
  await page.evaluate(() => {
    const { scene, game } = window.__combatReview;
    for (let i = 0; i < 100; i++) game.step();
    scene.userScrolled = true;
    scene.camera.level = 0.5;
    scene.camera.lookAt(game.world.terrain.width / 2, game.world.terrain.height / 2);
    scene.sync();
    scene.render(1, 16);
    scene.app.renderer.render(scene.app.stage);
  });
  await page.screenshot({ path: `${output}/match-islands-42.png` });
  await page.setViewportSize({ width: 1920, height: 1440 });
  await page.waitForFunction(() => window.__game.scene.app.screen.height === 1440);
  await page.evaluate(() => {
    const { render, sim, pixi, scene } = window.__combatReview;
    for (const child of scene.app.stage.children) child.visible = false;
    const gallery = new pixi.Container();
    gallery.addChild(new pixi.Graphics().rect(0, 0, 1920, 1440).fill(0xf7efd9));
    scene.app.stage.addChild(gallery);
    const cases = [
      ['bazooka', -1.45],
      ['bazooka', 0],
      ['bazooka', 1.45],
      ['grenade', 0],
      ['handgun', 0.65],
      ['mortar', 0.9],
    ];
    for (const [row, skin] of [
      'brutal',
      'soft',
      'elder-femme',
      'commander-femme',
      'nocturne-velvet',
    ].entries()) {
      for (const [col, [weapon, aim]] of cases.entries()) {
        const w = new sim.Worm(0, 0, '', 0, 100);
        w.aim = aim;
        const actor = new render.SkinActor(skin, 0xd64032);
        actor.update(w, 0, weapon);
        actor.container.scale.set(3.5);
        actor.container.position.set(85 + col * 315, 155 + row * 280);
        gallery.addChild(actor.container);
        const label = new pixi.Text({
          text: `${skin}\n${weapon} ${aim}`,
          style: { fontFamily: 'Arial', fontSize: 13, fill: 0x333333 },
        });
        label.position.set(15 + col * 315, 8 + row * 280);
        gallery.addChild(label);
        if (actor.aimRay) {
          const ray = actor.aimRay;
          const x = actor.container.x + ray.x * 3.5,
            y = actor.container.y + ray.y * 3.5;
          gallery.addChild(
            new pixi.Graphics()
              .moveTo(x, y)
              .lineTo(x + Math.cos(ray.angle) * 160, y - Math.sin(ray.angle) * 160)
              .stroke({ color: 0xe05235, width: 1, alpha: 0.7 }),
          );
        }
      }
    }
    scene.app.renderer.render(scene.app.stage);
    window.__combatReview.gallery = gallery;
  });
  await page.screenshot({ path: `${output}/weapon-grips.png` });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForFunction(() => window.__game.scene.app.screen.height === 1080);
  await page.evaluate(() => {
    const { render, pixi, scene, gallery } = window.__combatReview;
    gallery.visible = false;
    const grid = new pixi.Container();
    scene.app.stage.addChild(grid);
    grid.addChild(new pixi.Graphics().rect(0, 0, 1920, 1080).fill(0xf7efd9));
    const clips = ['blast', 'land-hard', 'hit-light', 'hit-heavy', 'water'];
    for (const [row, clip] of clips.entries())
      for (let i = 0; i < 4; i++) {
        const frame = Math.min(i, render.REACTION_CLIPS[clip].frames - 1);
        const sprite = new pixi.Sprite(render.assets.get(`reactions/brutal/${clip}_${frame}`));
        sprite.anchor.set(0.5, 29 / 32);
        sprite.scale.set(0.7);
        sprite.position.set(250 + i * 465, 205 + row * 210);
        grid.addChild(sprite);
        const text = new pixi.Text({
          text: `${clip} / ${frame}`,
          style: { fontFamily: 'Arial', fontSize: 17, fill: 0x333333 },
        });
        text.position.set(40 + i * 465, 12 + row * 210);
        grid.addChild(text);
      }
    scene.app.renderer.render(scene.app.stage);
  });
  await page.screenshot({ path: `${output}/reaction-frames.png` });
  assert.deepEqual(errors, []);
  writeFileSync(
    `${output}/acceptance.json`,
    JSON.stringify({ ...results, errors }, null, 2) + '\n',
  );
  console.log(
    `Combat presentation: ${results.combinations} combinations, native reaction frames and real v2 map passed.`,
  );
} finally {
  await browser.close();
}
