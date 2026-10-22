/** Real-client character/arsenal matrix and class-roster acceptance, with review screenshots. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { SKINS, CHARACTER_CLASSES } from '../../packages/render/src/skins.ts';

const base = process.argv[2] ?? 'http://127.0.0.1:5174/';
const output = 'assets-in/previews/skin-game';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base);
  assert.equal(
    await page.getByLabel('Класс команды 2').locator('option[value="dominant"]').isDisabled(),
    false,
  );
  await page.getByLabel('Класс команды 1').selectOption('heavy');
  await page.getByLabel('Класс команды 2').selectOption('elder');
  await page.locator('.character-roster').first().locator('summary').click();
  await page.getByLabel('Персонаж 1 команды 1').selectOption('commando-femme');
  await page.getByLabel('Персонаж 2 команды 1').selectOption('brutal');
  await page.screenshot({ path: `${output}/class-roster-menu.png` });
  await page.getByRole('button', { name: 'В бой!' }).click();
  await page.waitForFunction(() => window.__game?.scene.worms.size > 0);
  const result = await page.evaluate(async () => {
    const urls = window.performance.getEntriesByType('resource').map((e) => e.name);
    const sim = await import(urls.find((s) => /\/packages\/sim\/src\/index\.ts(?:\?|$)/.test(s)));
    const render = await import(
      urls.find((s) => /\/packages\/render\/src\/index\.ts(?:\?|$)/.test(s))
    );
    const pixi = await import(urls.find((s) => /\/pixi__js\.js(?:\?|$)/.test(s)));
    const { scene, game, match } = window.__game;
    match.setPaused(true);
    match.loop.stop();
    scene.setCrt('off');
    const before = game.hash();
    const skins = render.SKINS.filter((s) => render.assets.has(`skins/${s.id}/idle`));
    const roster = [...scene.worms.values()].map((view) => ({
      team: view.worm.team,
      skin: view.skinActor?.id,
    }));
    const recordedRoster = match.recorder.config.teams.flatMap((team, index) =>
      team.characterVariants.map((skin) => ({ team: index, skin })),
    );
    const problems = [];
    let combinations = 0;
    for (const skin of skins) {
      const worm = new sim.Worm(0, 0, skin.name, 0, 100);
      const view = new render.WormView(worm, skin.id),
        actor = view.skinActor;
      if (!actor) {
        problems.push(`${skin.id}: missing actor`);
        continue;
      }
      for (const weapon of game.rules.weapons)
        for (const facing of [-1, 1])
          for (const aim of [-1.3, 0, 1.3]) {
            worm.facing = facing;
            worm.aim = aim;
            view.update(1, 0, true, (x, y) => ({ x, y }), weapon.id);
            const spec = render.WEAPON_MOUNTS.get(weapon.id);
            if (actor.body.texture !== render.assets.get(`skins/${skin.id}/${actor.pose}`))
              problems.push(`${skin.id}/${weapon.id}: wrong identity`);
            if (actor.weapon.visible && Math.abs(actor.weapon.width - spec.width) > 1e-6)
              problems.push(`${skin.id}/${weapon.id}: size drift`);
            const expectedHeld =
              spec.width > 0 && !['grounded', 'none', 'backpack'].includes(spec.mode);
            if (actor.weapon.visible !== expectedHeld)
              problems.push(`${skin.id}/${weapon.id}: equipment visibility`);
            if (![actor.weapon.x, actor.weapon.y, actor.weapon.rotation].every(Number.isFinite))
              problems.push(`${skin.id}/${weapon.id}: invalid mount transform`);
            if (weapon.id === 'mortar' && (!actor.ground.visible || actor.pose !== 'land'))
              problems.push(`${skin.id}: mortar not grounded`);
            if (weapon.id === 'mortar') {
              const y = actor.mortarBase.y;
              view.update(1, 90, true, (x, y) => ({ x, y }), weapon.id);
              if (actor.mortarBase.y !== y || actor.ground.y !== 0)
                problems.push(`${skin.id}: base bobs with body`);
            }
            combinations++;
          }
      for (const frame of [0, 4, 8, 12]) {
        worm.state = 'walking';
        worm.walkFrame = frame;
        view.update(1, 0, true, (x, y) => ({ x, y }));
        if (actor.pose !== `walk_${Math.floor((frame / 15) * 4)}`)
          problems.push(`${skin.id}: walk clip`);
      }
      worm.state = 'airborne';
      worm.vy = -2;
      view.update(1, 16, true, (x, y) => ({ x, y }), 'bazooka');
      if (actor.pose !== 'jump') problems.push(`${skin.id}: jump`);
      worm.vy = 2;
      worm.chute = true;
      view.update(1, 16, true, (x, y) => ({ x, y }));
      if (actor.pose !== 'fall' || !actor.canopy.visible) problems.push(`${skin.id}: parachute`);
      worm.chute = false;
      worm.state = 'roped';
      view.update(1, 16, true, (x, y) => ({ x, y }));
      if (actor.pose !== 'rope') problems.push(`${skin.id}: rope`);
      worm.state = 'idle';
      view.update(1, 1000, true, (x, y) => ({ x, y }));
      for (const weapon of ['grenade', 'firepunch', 'mortar', 'bazooka', 'sheep', 'mine']) {
        view.playAct(weapon);
        view.update(1, 16, true, (x, y) => ({ x, y }));
        const expected =
          weapon === 'grenade'
            ? 'throw'
            : weapon === 'firepunch'
              ? 'melee'
              : ['mortar', 'sheep', 'mine'].includes(weapon)
                ? 'land'
                : 'aim';
        if (actor.pose !== expected) problems.push(`${skin.id}/${weapon}: action pose`);
        if (weapon === 'grenade' && actor.weapon.visible)
          problems.push(`${skin.id}: duplicate thrown object`);
        if (['sheep', 'mine'].includes(weapon) && actor.weapon.visible)
          problems.push(`${skin.id}: duplicate placed object`);
        view.update(1, 1000, true, (x, y) => ({ x, y }));
      }
      view.update(1, 16, true, (x, y) => ({ x, y }), '', false, 'win');
      if (actor.pose !== 'win') problems.push(`${skin.id}: victory`);
      worm.health = 99;
      view.update(1, 16, true, (x, y) => ({ x, y }));
      if (actor.pose !== 'hurt') problems.push(`${skin.id}: hurt`);
      worm.invulnerable = true;
      view.update(1, 16, true, (x, y) => ({ x, y }));
      if (actor.body.tint !== 0xb4e4ff) problems.push(`${skin.id}: frozen tint`);
      worm.invulnerable = false;
      worm.state = 'dead';
      view.update(1, 16, false, (x, y) => ({ x, y }));
      if (actor.pose !== 'defeat') problems.push(`${skin.id}: defeat`);
      view.update(1, 1000, false, (x, y) => ({ x, y }));
      if (view.container.visible) problems.push(`${skin.id}: corpse lifetime`);
      view.container.destroy({ children: true });
      view.label.destroy({ children: true });
    }
    window.__skinReview = { sim, render, pixi, scene, skins, game };
    return {
      skins: skins.length,
      combinations,
      roster,
      recordedRoster,
      problems,
      hashUnchanged: before === game.hash(),
    };
  });
  assert.equal(result.skins, 36);
  assert.equal(result.combinations, 36 * 67 * 2 * 3);
  assert.deepEqual(result.problems, []);
  assert.ok(result.hashUnchanged);
  assert.deepEqual(
    result.recordedRoster,
    [...result.roster].sort((a, b) => a.team - b.team),
    'Replay freezes visible member identities',
  );
  assert.deepEqual(
    result.roster
      .filter((r) => r.team === 0)
      .slice(0, 2)
      .map((r) => r.skin),
    ['commando-femme', 'brutal'],
  );
  assert.ok(
    result.roster
      .filter((r) => r.team === 1)
      .every((r) => SKINS.find((skin) => skin.id === r.skin)?.profile === 'elder'),
  );
  await page.screenshot({ path: `${output}/match-classes.png` });
  await page.addStyleTag({ content: '#ui {display:none !important}' });
  const galleryStarts = Array.from(
    { length: Math.ceil(result.skins / 5) },
    (_, index) => index * 5,
  );
  galleryStarts.push(result.skins - 4);
  for (const start of galleryStarts) {
    await page.evaluate((start) => {
      const { sim, render, pixi, scene, skins } = window.__skinReview;
      for (const child of scene.app.stage.children) child.visible = false;
      const gallery = new pixi.Container();
      scene.app.stage.addChild(gallery);
      gallery.addChild(new pixi.Graphics().rect(0, 0, 1920, 1080).fill(0x29373c));
      const weapons = ['handgun', 'bazooka', 'minigun', 'mortar'];
      weapons.forEach((weapon, col) => {
        const text = new pixi.Text({
          text: weapon,
          style: { fontFamily: 'monospace', fontSize: 24, fill: 0xffffff },
        });
        text.position.set(340 + col * 370, 25);
        gallery.addChild(text);
      });
      const rows = start === skins.length - 4 ? 4 : 5;
      skins.slice(start, start + rows).forEach((skin, row) => {
        const label = new pixi.Text({
          text: skin.name,
          style: { fontFamily: 'monospace', fontSize: 18, fill: 0xffffff },
        });
        label.position.set(10, 130 + row * 190);
        gallery.addChild(label);
        weapons.forEach((weapon, col) => {
          const worm = new sim.Worm(0, 0, skin.name, 0, 100);
          worm.aim = 0.65;
          const view = new render.WormView(worm, skin.id);
          view.update(1, 0, true, (x, y) => ({ x, y }), weapon);
          const wrap = new pixi.Container();
          wrap.position.set(350 + col * 370, 190 + row * 190);
          wrap.scale.set(4);
          wrap.addChild(view.container);
          gallery.addChild(wrap);
        });
      });
      scene.app.render();
    }, start);
    await page.screenshot({
      path:
        start === result.skins - 4
          ? `${output}/nocturne-equipment.png`
          : `${output}/equipment-matrix-${start / 5 + 1}.png`,
    });
  }
  assert.deepEqual(errors, []);
  result.classRosters = {};
  for (const family of CHARACTER_CLASSES) {
    const teamPage = await browser.newPage();
    teamPage.on('pageerror', (error) => errors.push(error.message));
    await teamPage.goto(base);
    await teamPage.getByLabel('Класс команды 1').selectOption(family.id);
    await teamPage.getByRole('button', { name: 'В бой!' }).click();
    await teamPage.waitForFunction(() => window.__game?.scene.worms.size > 0);
    const roster = await teamPage.evaluate(() => {
      const { scene, match } = window.__game;
      match.setPaused(true);
      return {
        visible: [...scene.worms.values()]
          .filter((view) => view.worm.team === 0)
          .map((view) => view.skinActor?.id),
        recorded: match.recorder.config.teams[0].characterVariants,
      };
    });
    const expected = SKINS.filter(
      (skin) => skin.profile === family.id && skin.id !== 'dominatrix',
    ).map((skin) => skin.id);
    assert.deepEqual(roster.visible, expected, `${family.id}: four distinct playable members`);
    assert.deepEqual(roster.recorded, expected, `${family.id}: replay identity snapshot`);
    result.classRosters[family.id] = roster.visible;
    await teamPage.close();
  }
  result.nocturneReplays = {};
  for (const manual of [false, true]) {
    const name = manual ? 'manual-repeated' : 'automatic';
    const expected = manual
      ? ['nocturne-violet', 'nocturne-velvet', 'nocturne-violet', 'nocturne-crimson']
      : SKINS.filter((skin) => skin.profile === 'nocturne').map((skin) => skin.id);
    const teamPage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    teamPage.on('pageerror', (error) => errors.push(error.message));
    await teamPage.goto(base);
    await teamPage.getByLabel('Класс команды 1').selectOption('nocturne');
    await teamPage.locator('.character-roster').first().locator('summary').click();
    if (manual)
      for (const [member, id] of expected.entries())
        await teamPage.getByLabel(`Персонаж ${member + 1} команды 1`).selectOption(id);
    await teamPage.screenshot({ path: `${output}/nocturne-${name}-menu.png` });
    await teamPage.getByRole('button', { name: 'В бой!' }).click();
    await teamPage.waitForFunction(() => window.__game?.scene.worms.size > 0);
    const recorded = await teamPage.evaluate(async () => {
      const { game, scene, match } = window.__game;
      match.setPaused(true);
      match.loop.stop();
      const urls = window.performance.getEntriesByType('resource').map((entry) => entry.name);
      const sim = await import(
        urls.find((url) => /\/packages\/sim\/src\/index\.ts(?:\?|$)/.test(url))
      );
      const content = await import(
        urls.find((url) => /\/packages\/content\/src\/index\.ts(?:\?|$)/.test(url))
      );
      const config = match.recorder.config;
      const plain = new sim.Game(
        content.buildGameSetup({
          ...config,
          teams: config.teams.map(
            ({ characterClass: _class, characterVariants: _variants, skin: _skin, ...team }) =>
              team,
          ),
        }),
      );
      while (plain.world.tick < game.world.tick) plain.step();
      let hashUnchanged = plain.hash() === game.hash();
      // Real walk, aim and shot commands, recorded using the running match's recorder.
      for (let tick = 0; tick < 600; tick++) {
        const commands =
          tick === 300
            ? [{ t: 'move', left: false, right: true, up: true, down: false }]
            : tick === 330
              ? [{ t: 'move', left: false, right: false, up: false, down: false }]
              : tick === 340
                ? [{ t: 'select', weapon: 'bazooka' }]
                : tick === 345
                  ? [{ t: 'fire', down: true }]
                  : tick === 375
                    ? [{ t: 'fire', down: false }]
                    : [];
        match.recorder.record(game.world.tick, commands);
        game.step(commands);
        plain.step(commands);
        if ([0, 300, 330, 375, 599].includes(tick)) hashUnchanged &&= plain.hash() === game.hash();
      }
      const replay = JSON.parse(JSON.stringify(match.replay()));
      return {
        visible: [...scene.worms.values()]
          .filter((view) => view.worm.team === 0)
          .map((view) => view.skinActor?.id),
        replay,
        verified: new content.ReplayPlayer(replay).verify(),
        hashUnchanged,
      };
    });
    assert.deepEqual(recorded.visible, expected);
    assert.deepEqual(recorded.replay.config.teams[0].characterVariants, expected);
    assert.ok(recorded.verified && recorded.hashUnchanged, `${name}: deterministic replay`);
    await teamPage.close();

    const replayPage = await browser.newPage();
    replayPage.on('pageerror', (error) => errors.push(error.message));
    await replayPage.goto(base);
    await replayPage.locator('input[type="file"]').setInputFiles({
      name: `nocturne-${name}.wrr`,
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(recorded.replay)),
    });
    await replayPage.waitForFunction(() => !!window.__game?.match.player);
    const playback = await replayPage.evaluate(() => {
      const { scene, match } = window.__game;
      match.setPaused(true);
      match.loop.stop();
      return {
        visible: [...scene.worms.values()]
          .filter((view) => view.worm.team === 0)
          .map((view) => view.skinActor?.id),
        verified: match.player.verify(),
      };
    });
    assert.deepEqual(playback.visible, expected, `${name}: identities after UI replay import`);
    assert.ok(playback.verified, `${name}: imported replay final hash`);
    writeFileSync(
      `${output}/nocturne-${name}.wrr`,
      JSON.stringify(recorded.replay, null, 2) + '\n',
    );
    result.nocturneReplays[name] = {
      identities: playback.visible,
      ticks: 600,
      verified: true,
      hashUnchanged: true,
    };
    await replayPage.close();
  }
  const fallback = await browser.newPage();
  fallback.on('pageerror', (error) => errors.push(error.message));
  await fallback.route('**/assets/skins/manifest.json*', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await fallback.goto(base);
  await fallback.getByRole('button', { name: 'В бой!' }).click();
  await fallback.waitForFunction(() => window.__game?.scene.worms.size > 0);
  assert.ok(
    await fallback.evaluate(() =>
      [...window.__game.scene.worms.values()].every((view) => !view.skinActor && !!view.pixel),
    ),
    'Missing skin pack retains the legacy renderer',
  );
  await fallback.close();

  const preview = await browser.newPage();
  preview.on('pageerror', (error) => errors.push(error.message));
  await preview.goto(pathToFileURL(resolve('docs/design/concepts/worm-skins-animated.html')).href);
  assert.equal(await preview.locator('.sprite').count(), 36);
  await preview.locator('#mode').selectOption('win');
  await preview.waitForFunction(
    () => document.querySelector('.sprite').style.backgroundPosition === '100% 100%',
  );
  await preview.locator('#flip').click();
  assert.equal(
    await preview
      .locator('.sprite')
      .first()
      .evaluate((node) => node.style.transform),
    'scaleX(-1)',
  );
  await preview.locator('#size').selectOption('48');
  assert.equal(
    await preview
      .locator('.sprite')
      .first()
      .evaluate((node) => node.style.width),
    '48px',
  );
  await preview.locator('#pause').click();
  assert.equal(await preview.locator('#pause').textContent(), 'Продолжить');
  assert.ok(
    await preview.locator('.sprite').evaluateAll(async (nodes) => {
      const loaded = await Promise.all(
        nodes.map(
          (node) =>
            new Promise((done) => {
              const image = new Image();
              image.onload = () => done(image.naturalWidth === 768);
              image.onerror = () => done(false);
              image.src = node.style.backgroundImage.slice(5, -2);
            }),
        ),
      );
      return loaded.every(Boolean);
    }),
    'Offline preview loads actual atlases',
  );
  await preview.close();
  assert.deepEqual(errors, []);
  result.legacyFallback = true;
  result.offlinePreview = true;
  writeFileSync(`${output}/report.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ ...result, screenshots: output }, null, 2));
} finally {
  await browser.close();
}
