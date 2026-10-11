// Rewrites the built index.html so the page also opens by double-click (file://).
// Chromium refuses module scripts and CORS-tagged assets from file:// URLs, so:
//  - <script type="module" crossorigin src=...> becomes one classic <script defer src=...>
//  - crossorigin attributes are removed from stylesheets and scripts
//  - modulepreload links are dropped
// The script then fails the build if anything that would break file:// (or the "no download" rule) remains.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'dist-standalone';
const file = join(dir, 'index.html');
let html = readFileSync(file, 'utf8');

html = html.replace(/<link rel="modulepreload"[^>]*>\s*/g, '');
html = html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>');
html = html.replace(/<script type="module" src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>');
html = html.replace(/ crossorigin(?=[ >])/g, '');
// Put the stylesheet before the script so styles are requested first.
const css = html.match(/\s*<link rel="stylesheet" href="[^"]+">/);
if (css) {
  html = html.replace(css[0], '');
  html = html.replace(/(\s*)<script defer src=/, `${css[0]}$1<script defer src=`);
}

const fail = (msg) => {
  throw new Error(`standalone-html: ${msg} (${file})`);
};
if (/type="module"/.test(html)) fail('a module script is still present');
if (/\scrossorigin\b/.test(html)) fail('a crossorigin attribute is still present');
if (/modulepreload/.test(html)) fail('a modulepreload link is still present');
const external = html.match(/<script\b[^>]*\bsrc="[^"]+"[^>]*><\/script>/g) ?? [];
if (external.length !== 1 || !/^<script defer src="\.\/assets\/[^"]+\.js"><\/script>$/.test(external[0])) {
  fail(`expected exactly one classic <script defer src="./assets/…js">, found: ${external.join(' | ') || 'none'}`);
}
if (/\sdownload(=|\s|>)/i.test(html)) fail('a download attribute is present');
if (/\.zip\b/i.test(html)) fail('a .zip reference is present');

writeFileSync(file, html);
console.log('standalone index.html ready:', file);
