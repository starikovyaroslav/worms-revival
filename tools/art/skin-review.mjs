/** Offline native-atlas animation review. Uses the exact shipped painted frames, not mockups. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root } from './ingest.mjs';
import { SKINS, SKIN_POSES, CHARACTER_CLASSES } from '../../packages/render/src/skins.ts';
const manifest = JSON.parse(
  readFileSync(resolve(root, 'apps/client/public/assets/skins/manifest.json')),
);
const available = SKINS.filter((s) => manifest.assets[`skins/${s.id}/idle`]);
const groups = CHARACTER_CLASSES.map((family) => {
  const variants = available.filter((s) => s.profile === family.id);
  return `<section><h2>${family.name} — ${variants.length} вариантов</h2>${variants.length ? `<div class="grid">${variants.map((s) => `<article><h3>${s.name}</h3><div class="stage"><div class="sprite" data-id="${s.id}" style="background-image:url('../../../apps/client/public/assets/skins/${s.id}.png')"></div></div></article>`).join('')}</div>` : '<p>Нет готового анимационного набора. Концепт не подставляется вместо анимации.</p>'}</section>`;
}).join('\n');
writeFileSync(
  resolve(root, 'docs/design/concepts/worm-skins-animated.html'),
  `<!doctype html>
<html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Worms revival — игровые позы и анимации</title><style>
*{box-sizing:border-box}body{margin:24px;background:#172127;color:#eee;font:16px system-ui}h1{font-size:24px}h2{font-size:20px;margin-top:32px}h3{font-size:16px}p{max-width:1000px;line-height:1.5;color:#b9c8cd}.controls{position:sticky;top:0;padding:12px;background:#24323a;display:flex;gap:16px;flex-wrap:wrap;z-index:1}select,button{font:inherit;padding:6px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}article{padding:12px;border:1px solid #4b5b64}.stage{height:160px;display:flex;justify-content:center;align-items:end;background:#3d5148;padding-bottom:8px}.sprite{width:96px;height:96px;background-size:400% 400%;image-rendering:pixelated;transform-origin:center 91%}
</style><h1>Игровые персонажи: ${available.length} вариантов / ${new Set(available.map((s) => s.profile)).size} доступных классов</h1>
<p>Это реальные кадры публичных атласов: по 16 поз на персонажа. Просмотр не симулирует физику и не показывает оружие; позы с оружием проверяются в игровом стенде. При составе больше числа вариантов класса персонажи повторяются.</p>
<div class="controls"><label>Поза <select id="mode"><option value="walk">Ходьба — цикл</option><option value="idle">Ожидание и моргание</option>${SKIN_POSES.filter(
    (p) => !p.startsWith('walk') && p !== 'idle',
  )
    .map((p) => `<option value="${p}">${p}</option>`)
    .join('')}</select></label>
<label>Холст, CSS px <select id="size"><option>32</option><option>48</option><option selected>96</option><option>128</option></select></label><button id="pause">Пауза</button><button id="flip">Повернуть</button></div>
${groups}<script>
const poses=${JSON.stringify(SKIN_POSES)}, nodes=[...document.querySelectorAll('.sprite')];
let running=true, facing=1, elapsed=0, previous=performance.now();
document.getElementById('pause').onclick=()=>{running=!running;document.getElementById('pause').textContent=running?'Пауза':'Продолжить'};
document.getElementById('flip').onclick=()=>{facing=-facing;nodes.forEach(n=>n.style.transform='scaleX('+facing+')')};
document.getElementById('size').onchange=e=>nodes.forEach(n=>{n.style.width=e.target.value+'px';n.style.height=e.target.value+'px'});
function tick(now){if(running)elapsed+=(now-previous)/1000;previous=now;const mode=document.getElementById('mode').value;const frame=mode==='walk'?2+Math.floor(elapsed*6)%4:mode==='idle'?(elapsed%3.7>3.58?1:0):poses.indexOf(mode);for(const n of nodes)n.style.backgroundPosition=(frame%4*100/3)+'% '+(Math.floor(frame/4)*100/3)+'%';requestAnimationFrame(tick)}requestAnimationFrame(tick);
</script></html>`,
);
console.log(`Saved actual-atlas animation review for ${available.length} painted identities`);
