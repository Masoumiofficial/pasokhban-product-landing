// Renders public/og-cover.png (1200×630) and public/apple-touch-icon.png (180×180) from the brand mark with
// headless Chrome, using the self-hosted Vazirmatn font. Usage: CHROME_PATH=/path/to/chrome node scripts/render-images.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';

const require = createRequire(import.meta.url);
const CHROME = process.env.CHROME_PATH;
if (!CHROME) throw new Error('Set CHROME_PATH');
const env = { ...process.env };
if (process.env.CHROME_LD_LIBRARY_PATH) env.LD_LIBRARY_PATH = process.env.CHROME_LD_LIBRARY_PATH;

const font = (f) => readFileSync(require.resolve(`@fontsource-variable/vazirmatn/files/${f}`)).toString('base64');
const mark = readFileSync('public/pasokhban-mark.svg', 'utf8').replace(/<title>[^<]*<\/title>/, '');
const css = `
@font-face { font-family: V; font-weight: 100 900; src: url(data:font/woff2;base64,${font('vazirmatn-arabic-wght-normal.woff2')}) format('woff2'); unicode-range: U+0600-06FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC; }
@font-face { font-family: V; font-weight: 100 900; src: url(data:font/woff2;base64,${font('vazirmatn-latin-wght-normal.woff2')}) format('woff2'); unicode-range: U+0000-00FF, U+2000-206F; }
* { margin: 0; box-sizing: border-box; }
body { font-family: V, sans-serif; direction: rtl; }`;

const og = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><style>${css}
.og { width: 1200px; height: 630px; position: relative; overflow: hidden; color: #f8fafc;
  background: radial-gradient(700px 420px at 15% 20%, rgba(34,211,238,.28), transparent 60%),
              radial-gradient(600px 420px at 95% 110%, rgba(167,139,250,.24), transparent 60%), #0b1120; }
.grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(148,163,184,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.08) 1px, transparent 1px); background-size: 48px 48px; }
.copy { position: absolute; right: 88px; top: 120px; width: 640px; }
.name { font-size: 104px; font-weight: 800; line-height: 1.2; }
.tag { margin-top: 12px; font-size: 40px; font-weight: 700; line-height: 1.5; background: linear-gradient(90deg, #67e8f9, #c4b5fd); -webkit-background-clip: text; color: transparent; }
.chips { margin-top: 36px; display: flex; flex-wrap: wrap; gap: 12px; }
.chips span { font-size: 24px; font-weight: 600; padding: 6px 18px; border: 1px solid rgba(148,163,184,.45); border-radius: 999px; color: #dbe4f0; background: rgba(17,26,46,.7); }
.mark { position: absolute; left: 110px; top: 135px; width: 360px; height: 360px; filter: drop-shadow(0 30px 60px rgba(34,211,238,.35)); }
.mark svg { width: 100%; height: 100%; }
</style></head><body><div class="og"><div class="grid"></div>
<div class="copy"><div class="name">پاسخ‌بان</div><div class="tag">چت هوشمند، پاسخ انسانی، در یک افزونه‌ی وردپرس.</div>
<div class="chips"><span>دانش سایت</span><span>اپراتور انسانی</span><span>ووکامرس</span><span>تلگرام · بله · پیامک</span></div></div>
<div class="mark">${mark}</div></div></body></html>`;

const icon = `<!doctype html><html><head><meta charset="utf-8"><style>${css}
.i { width: 180px; height: 180px; background: #22d3ee; display: grid; place-items: center; }
.i svg { width: 196px; height: 196px; }
</style></head><body><div class="i">${mark}</div></body></html>`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--no-zygote', '--font-render-hinting=none', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], env });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.setContent(og, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
// The viewport equals the image size, so a plain viewport screenshot is the image.
await page.screenshot({ path: 'public/og-cover.png' });
await page.setViewport({ width: 180, height: 180, deviceScaleFactor: 1 });
await page.setContent(icon, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'public/apple-touch-icon.png' });
await browser.close();
console.log('public/og-cover.png and public/apple-touch-icon.png rendered');
