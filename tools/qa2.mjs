import { open, st } from './qa_lib.mjs';
const { browser, page, logs } = await open('http://localhost:5231/');
await page.screenshot({ path: '/tmp/qa_m2/menu.png' });
console.log(await page.evaluate(()=>document.body.innerText));
console.log(await page.evaluate(()=>[...document.querySelectorAll('button,select,input')].map(e=>e.tagName+':'+(e.innerText||e.value||e.className)).join('\n')));
await browser.close();
