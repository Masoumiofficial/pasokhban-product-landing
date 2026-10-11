// Headless-Chrome QA for the built landing page.
//
// Usage:  CHROME_PATH=/path/to/chrome node scripts/qa.mjs [dist-standalone]
// Optional: CHROME_LD_LIBRARY_PATH (extra shared libraries for a portable Chrome build).
//
// Chrome is launched WITHOUT --disable-web-security and WITHOUT --allow-file-access-from-files.
// Results go to qa-output/report.json plus screenshots; the process exits with code 1 when a check fails.

import { createServer } from 'node:http';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';

const require = createRequire(import.meta.url);
const CHROME = process.env.CHROME_PATH;
if (!CHROME) {
  console.error('Set CHROME_PATH to a Chrome/Chromium executable.');
  process.exit(2);
}
const DIST = resolve(process.argv[2] ?? 'dist-standalone');
const OUT = resolve('qa-output');
mkdirSync(OUT, { recursive: true });
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const BASE_ARGS = [
  '--no-sandbox',
  '--no-zygote',
  '--disable-dev-shm-usage',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
  '--font-render-hinting=none',
  '--hide-scrollbars',
];
const env = { ...process.env };
if (process.env.CHROME_LD_LIBRARY_PATH) env.LD_LIBRARY_PATH = process.env.CHROME_LD_LIBRARY_PATH;

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};
const info = (name, detail) => {
  results.push({ name, ok: true, info: true, detail });
  console.log(`INFO  ${name} — ${detail}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- static checks on files ----------
function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
check('static: no type="module" in index.html', !/type="module"/.test(html));
check('static: no crossorigin in index.html', !/\scrossorigin\b/.test(html));
const scripts = html.match(/<script\b[^>]*\bsrc="[^"]+"[^>]*><\/script>/g) ?? [];
check('static: exactly one classic <script defer src>', scripts.length === 1 && /^<script defer src="\.\/assets\//.test(scripts[0]), scripts.join(' '));
check('static: no download attribute in index.html', !/\sdownload(=|\s|>)/i.test(html));
check('static: no ".zip" in index.html', !/\.zip\b/i.test(html));
check('static: no Google Fonts / CDN font links', !/fonts\.googleapis|fonts\.gstatic|@import\s+url/i.test(html + walk(DIST).filter((f) => f.endsWith('.css')).map((f) => readFileSync(f, 'utf8')).join('')));
const FORBIDDEN = /etehadyar|etehadwp|اتحادیار|اتحاد\s*وردپرس/i;
for (const root of ['src', DIST]) {
  const hits = walk(resolve(root))
    .filter((f) => /\.(tsx?|css|html|js|json|svg|txt|md)$/.test(f))
    .filter((f) => FORBIDDEN.test(readFileSync(f, 'utf8')));
  check(`static: no forbidden brand names in ${root === 'src' ? 'src' : 'dist'}`, hits.length === 0, hits.join(', '));
}

// ---------- tiny static server: the build lives in a sub-folder ----------
const SUBDIR = '/landing/pasokhban/';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json' };
const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (!url.startsWith(SUBDIR)) {
    res.writeHead(404).end('not found');
    return;
  }
  let p = join(DIST, url.slice(SUBDIR.length));
  try {
    if (statSync(p).isDirectory()) p = join(p, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' }).end(readFileSync(p));
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const HTTP_URL = `http://127.0.0.1:${server.address().port}${SUBDIR}`;
const FILE_URL = pathToFileURL(join(DIST, 'index.html')).href;

async function withBrowser(extraArgs, fn) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: [...BASE_ARGS, ...extraArgs], env });
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

async function openPage(browser, url, { width = 1440, height = 900, reduced = false, theme = null } = {}) {
  const page = await browser.newPage();
  const problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warn' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument((t) => {
    window.__raf = 0;
    const orig = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      window.__raf++;
      return orig(cb);
    };
    try {
      if (t) localStorage.setItem('pasokhban-theme', t);
      else localStorage.removeItem('pasokhban-theme');
    } catch {}
  }, theme);
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('html[data-app="ready"]', { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await sleep(600);
  return { page, problems };
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.6);
    for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 120));
    }
  });
  // Wait for the reveal transitions to finish.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null))));
  await sleep(300);
}

async function pageChecks(page, label, opts = {}) {
  const r = await page.evaluate(() => {
    const h1 = document.querySelector('#hero-title');
    const rect = h1?.getBoundingClientRect();
    const fontsLoaded = [...document.fonts].filter((f) => f.family.replace(/"/g, '') === 'Vazirmatn Variable' && f.status === 'loaded').length;
    return {
      h1Text: h1?.textContent ?? '',
      h1Visible: Boolean(rect && rect.height > 20 && rect.width > 100),
      h1Font: h1 ? getComputedStyle(h1).fontFamily : '',
      fontCheck: document.fonts.check('700 32px "Vazirmatn Variable"', 'پاسخ‌بان'),
      fontsLoaded,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      bodyOverflow: document.body.scrollWidth - window.innerWidth,
      main: Boolean(document.querySelector('main#main')),
      skip: (() => {
        const a = document.querySelector('a.skip-link');
        return a ? { text: a.textContent?.trim(), href: a.getAttribute('href'), first: document.querySelector('a, button') === a } : null;
      })(),
      dir: document.documentElement.getAttribute('dir'),
      lang: document.documentElement.getAttribute('lang'),
      theme: document.documentElement.dataset.theme,
      sceneCanvas: Boolean(document.querySelector('canvas.site-scene')),
      heroCanvas: Boolean(document.querySelector('.core3d__canvas')),
      heroFallback: Boolean(document.querySelector('.hero__fallback-logo')),
      download: document.querySelectorAll('[download]').length,
      zipLinks: [...document.querySelectorAll('a[href]')].filter((a) => /\.zip(\b|$)/i.test(a.getAttribute('href') ?? '')).length,
      purchase: [...document.querySelectorAll('[data-cta="purchase"]')].map((a) => ({ href: a.getAttribute('href'), text: a.textContent?.trim() })),
      demoLabels: [...document.querySelectorAll('.demo-notice strong')].map((s) => s.textContent),
      sections: [...document.querySelectorAll('main > section')].map((s) => ({ id: s.id, scene: s.dataset.scene })),
    };
  });
  check(`${label}: hero h1 visible with Persian text`, r.h1Visible && /چت هوشمند/.test(r.h1Text), r.h1Text);
  check(`${label}: Vazirmatn web font loaded and used`, r.fontCheck && r.fontsLoaded > 0 && /Vazirmatn/.test(r.h1Font), `loaded faces: ${r.fontsLoaded}, h1 font: ${r.h1Font}`);
  check(`${label}: no horizontal overflow`, r.overflow <= 0 && r.bodyOverflow <= 0, `doc ${r.overflow}px, body ${r.bodyOverflow}px`);
  check(`${label}: lang=fa dir=rtl, <main id="main">, skip link first`, r.dir === 'rtl' && r.lang === 'fa' && r.main && r.skip?.first && r.skip?.text === 'پرش به محتوا' && r.skip?.href === '#main', JSON.stringify(r.skip));
  check(`${label}: no download attribute / .zip link in rendered DOM`, r.download === 0 && r.zipLinks === 0);
  const purchaseOk = r.purchase.length > 0 && r.purchase.every((p) => p.href === '#pricing' && p.text === 'مشاهده‌ی قیمت‌ها');
  check(`${label}: every purchase button → #pricing with «مشاهده‌ی قیمت‌ها»`, purchaseOk, `${r.purchase.length} buttons`);
  check(`${label}: demo label present (simulator + chat/form)`, r.demoLabels.filter((t) => t === 'دموی نمایشی؛ به هوش مصنوعی زنده وصل نیست').length >= 2, r.demoLabels.join(' | '));
  check(`${label}: every section has a data-scene`, r.sections.length === 14 && r.sections.every((s) => s.scene), r.sections.map((s) => `${s.id}:${s.scene}`).join(' '));
  if (opts.expectWebGL !== undefined) {
    if (opts.expectWebGL) check(`${label}: WebGL backdrop + hero core canvas present`, r.sceneCanvas && r.heroCanvas && !r.heroFallback);
    else check(`${label}: without WebGL only the static logo shows (no canvas)`, !r.sceneCanvas && !r.heroCanvas && r.heroFallback);
  }
  return r;
}

async function stickyAndSections(page, label) {
  await scrollThrough(page);
  const r = await page.evaluate(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight * 0.5, behavior: 'instant' });
    return new Promise((res) =>
      setTimeout(() => {
        const header = document.querySelector('.site-header').getBoundingClientRect();
        const hidden = [...document.querySelectorAll('main > section, .site-footer')]
          .filter((s) => (document.documentElement.classList.contains('motion-ok') && !s.classList.contains('hero') && !s.classList.contains('is-revealed')) || Number(getComputedStyle(s).opacity) < 0.99 || s.getBoundingClientRect().height < 50)
          .map((s) => s.id || s.className);
        res({ headerTop: header.top, headerH: header.height, hidden });
      }, 400),
    );
  });
  check(`${label}: sticky header stays at the top while scrolling`, Math.abs(r.headerTop) < 1 && r.headerH >= 60, `top ${r.headerTop}`);
  // Clipped content would not show up in scrollWidth (overflow-x: clip), so check every element's box.
  const edges = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out = [];
    for (const el of document.querySelectorAll('header *, main *, footer *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (el.closest('.sr-only, .table-wrap, .chat__body, .core3d__stage, .site-nav:not(.is-open)')) continue;
      if (r.left < -1 || r.right > vw + 1) out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} [${Math.round(r.left)}..${Math.round(r.right)}]`);
    }
    return out;
  });
  check(`${label}: no element extends past the viewport edges (nothing clipped)`, edges.length === 0, edges.slice(0, 8).join(' | '));
  check(`${label}: all sections and footer visible after scrolling`, r.hidden.length === 0, r.hidden.join(', '));
}

async function textAndTargets(page, label) {
  const r = await page.evaluate(() => {
    const small = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      if (!el || el.closest('.sr-only, script, style, noscript, [hidden], .boot')) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 13) small.add(`${el.tagName.toLowerCase()}.${el.className}:${fs}px:"${n.textContent.trim().slice(0, 30)}"`);
    }
    const tiny = [];
    document.querySelectorAll('a[href], button, input, select, textarea, summary, [role="tab"]').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      if (el.closest('.sr-only')) return;
      const inlineText = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.closest('p, li');
      if (inlineText) return; // WCAG 2.5.8 exception: links inside a sentence
      if (rect.height < 44 - 0.5 || rect.width < 44 - 0.5) tiny.push(`${el.tagName.toLowerCase()}.${el.className}:"${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}":${Math.round(rect.width)}x${Math.round(rect.height)}`);
    });
    return { small: [...small], tiny };
  });
  check(`${label}: no visible text smaller than 13px`, r.small.length === 0, r.small.slice(0, 8).join(' | '));
  check(`${label}: interactive targets ≥ 44×44px`, r.tiny.length === 0, r.tiny.slice(0, 8).join(' | '));
}

async function axe(page, label) {
  await page.evaluate(AXE);
  const r = await page.evaluate(async () => {
    const res = await window.axe.run(document, { preload: false, runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
    return {
      violations: res.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, nodes: v.nodes.slice(0, 4).map((x) => x.target.join(' ') + ' :: ' + (x.failureSummary || '').split('\n')[1]) })),
      incomplete: res.incomplete.map((v) => ({ id: v.id, n: v.nodes.length })),
    };
  });
  check(`${label}: axe-core WCAG 2.1 AA — no violations`, r.violations.length === 0, JSON.stringify(r.violations).slice(0, 900));
  if (r.incomplete.length) info(`${label}: axe-core items needing manual review`, JSON.stringify(r.incomplete));
}

async function interactions(page, label) {
  // Simulator: run, then all steps done (reduced motion completes at once).
  await page.evaluate(() => document.querySelector('#demo').scrollIntoView());
  await page.click('#demo .sim__controls .btn--primary');
  await sleep(3800);
  const sim = await page.evaluate(() => document.querySelectorAll('#demo .sim__step.is-done').length);
  check(`${label}: simulator runs all three steps`, sim === 3, `${sim} done`);
  // Chat: ask a sample question → scripted answer with sources and feedback buttons.
  await page.evaluate(() => document.querySelector('#chat').scrollIntoView());
  await page.click('#chat .chat__suggest button');
  await sleep(1400);
  const chat = await page.evaluate(() => ({
    bot: document.querySelectorAll('#chat .msg--bot').length,
    sources: document.querySelectorAll('#chat .msg__sources').length,
    feedback: document.querySelectorAll('#chat .msg__feedback button').length,
  }));
  check(`${label}: chat answers a sample question with sources and feedback`, chat.bot >= 2 && chat.sources >= 1 && chat.feedback >= 2, JSON.stringify(chat));
  // Support form: empty submit → role="alert" summary receives focus.
  await page.click('#tab-ticket');
  await page.click('#panel-ticket button[type="submit"]');
  await sleep(300);
  const form = await page.evaluate(() => {
    const a = document.activeElement;
    return {
      focusedAlert: a?.getAttribute('role') === 'alert',
      invalid: document.querySelectorAll('#panel-ticket [aria-invalid="true"]').length,
      labelInWidget: document.querySelector('#chat .chat__notice .demo-notice strong')?.textContent,
    };
  });
  check(`${label}: form errors use role="alert" and move focus`, form.focusedAlert && form.invalid === 3, JSON.stringify(form));
  await page.type('#ticket-name', 'سارا');
  await page.type('#ticket-contact', '۰۹۱۲۱۲۳۴۵۶۷');
  await page.type('#ticket-message', 'درخواست آزمایشی');
  await page.click('#panel-ticket button[type="submit"]');
  await sleep(300);
  const ok = await page.evaluate(() => document.activeElement?.classList.contains('ticket__ok'));
  check(`${label}: valid form shows the demo confirmation (focused)`, ok);
  // Theme toggle persists in localStorage.
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.click('.theme-toggle');
  await sleep(200);
  const after = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, stored: localStorage.getItem('pasokhban-theme') }));
  check(`${label}: theme toggle switches and is saved in localStorage`, before !== after.theme && after.stored === after.theme, `${before} → ${after.theme} (stored ${after.stored})`);
  await page.click('.theme-toggle');
}

async function sceneSwitching(page, label) {
  const r = await page.evaluate(async () => {
    const out = [];
    for (const el of document.querySelectorAll('[data-scene]')) {
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, top - window.innerHeight * 0.3), behavior: 'instant' });
      await new Promise((res) => setTimeout(res, 300));
      out.push({ want: el.dataset.scene, got: document.documentElement.dataset.activeScene });
    }
    return out;
  });
  const bad = r.filter((x) => x.want !== x.got);
  check(`${label}: backdrop topic follows the section under the reading line`, bad.length === 0, bad.map((b) => `${b.want}≠${b.got}`).join(' '));
}

try {
  // 1) file:// — double-click scenario, WebGL available (SwiftShader).
  await withBrowser([], async (browser) => {
    for (const [w, h] of [
      [1440, 900],
      [1280, 800],
      [390, 844],
    ]) {
      const label = `file:// ${w}px dark`;
      const { page, problems } = await openPage(browser, FILE_URL, { width: w, height: h });
      await pageChecks(page, label, { expectWebGL: true });
      await page.screenshot({ path: join(OUT, `file-${w}-dark-hero.png`) });
      await stickyAndSections(page, label);
      if (w !== 1280) await page.screenshot({ path: join(OUT, `file-${w}-dark-full.png`), fullPage: true });
      await textAndTargets(page, label);
      if (w === 1440) {
        await sceneSwitching(page, label);
        const raf = await page.evaluate(async () => {
          const a = window.__raf;
          await new Promise((r) => setTimeout(r, 1000));
          return window.__raf - a;
        });
        check(`${label}: backdrop animates when motion is allowed`, raf > 20, `${raf} frames/s`);
        await axe(page, label);
        await interactions(page, label);
      }
      check(`${label}: no console errors/warnings or failed requests`, problems.length === 0, problems.join(' | '));
      await page.close();
    }
    for (const [w, h] of [
      [1440, 900],
      [390, 844],
    ]) {
      const label = `file:// ${w}px light`;
      const { page, problems } = await openPage(browser, FILE_URL, { width: w, height: h, theme: 'light' });
      const r = await pageChecks(page, label);
      check(`${label}: saved light theme applied on load`, r.theme === 'light', r.theme);
      await page.screenshot({ path: join(OUT, `file-${w}-light-hero.png`) });
      await stickyAndSections(page, label);
      await page.screenshot({ path: join(OUT, `file-${w}-light-full.png`), fullPage: true });
      if (w === 1440) await axe(page, label);
      check(`${label}: no console errors/warnings or failed requests`, problems.length === 0, problems.join(' | '));
      await page.close();
    }
    // Reduced motion
    {
      const label = 'file:// 1440px reduced-motion';
      const { page, problems } = await openPage(browser, FILE_URL, { reduced: true });
      await pageChecks(page, label, { expectWebGL: true });
      const r = await page.evaluate(async () => {
        const hidden = [...document.querySelectorAll('main > section')].filter((s) => Number(getComputedStyle(s).opacity) < 0.99).length;
        const a = window.__raf;
        await new Promise((res) => setTimeout(res, 1500));
        const anims = document.getAnimations().length;
        return { motionOk: document.documentElement.classList.contains('motion-ok'), hidden, raf: window.__raf - a, anims };
      });
      check(`${label}: no scroll-reveal hiding (sections visible without scrolling)`, !r.motionOk && r.hidden === 0, JSON.stringify(r));
      check(`${label}: no animation loop (requestAnimationFrame idle, no CSS animations)`, r.raf === 0 && r.anims === 0, `${r.raf} frames in 1.5s, ${r.anims} animations`);
      await sceneSwitching(page, label);
      await page.screenshot({ path: join(OUT, 'file-1440-reduced-hero.png') });
      check(`${label}: no console errors/warnings or failed requests`, problems.length === 0, problems.join(' | '));
      await page.close();
    }
  });

  // 2) HTTP server, build served from a sub-folder.
  await withBrowser([], async (browser) => {
    const label = `http sub-folder ${SUBDIR} 1440px`;
    const { page, problems } = await openPage(browser, HTTP_URL);
    await pageChecks(page, label, { expectWebGL: true });
    await stickyAndSections(page, label);
    check(`${label}: no console errors/warnings or failed requests`, problems.length === 0, problems.join(' | '));
    await page.close();
    const m = await openPage(browser, HTTP_URL, { width: 390, height: 844 });
    await pageChecks(m.page, `http sub-folder ${SUBDIR} 390px`);
    check(`http sub-folder 390px: no console errors/warnings`, m.problems.length === 0, m.problems.join(' | '));
    await m.page.close();
  });

  // 3) No WebGL: only the static logo, no 2D diagram, no errors.
  await withBrowser(['--disable-webgl', '--disable-3d-apis'], async (browser) => {
    const label = 'file:// no-WebGL';
    const { page, problems } = await openPage(browser, FILE_URL);
    await pageChecks(page, label, { expectWebGL: false });
    await page.screenshot({ path: join(OUT, 'file-1440-nowebgl-hero.png') });
    check(`${label}: no console errors/warnings or failed requests`, problems.length === 0, problems.join(' | '));
    await page.close();
  });
} catch (e) {
  check('qa run completed', false, e.stack);
} finally {
  server.close();
}

const failed = results.filter((r) => !r.ok);
writeFileSync(join(OUT, 'report.json'), JSON.stringify({ date: new Date().toISOString(), dist: DIST, results }, null, 2));
console.log(`\n${results.filter((r) => r.ok && !r.info).length} passed, ${failed.length} failed. Report: qa-output/report.json`);
process.exit(failed.length ? 1 : 0);
