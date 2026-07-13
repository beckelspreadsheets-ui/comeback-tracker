import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
const b64 = (await readFile('src/assets/game/select/char-lifoladen.png')).toString('base64');
const dataUrl = await page.evaluate(async (b) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = `data:image/png;base64,${b}`; });
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/webp', 0.9);
}, b64);
await writeFile('src/assets/game/select/char-lifoladen.webp', Buffer.from(dataUrl.split(',')[1], 'base64'));
console.log('written');
await browser.close();
