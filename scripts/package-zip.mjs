// Packs the standalone build into downloads/pasokhban-landing-<version>.zip.
// The zip root holds index.html, assets/ and the public files, ready to upload as-is (no source files).
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { zipSync } from 'fflate';

const dir = process.argv[2] ?? 'dist-standalone';
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const out = join('downloads', `pasokhban-landing-${version}.zip`);

const files = {};
const walk = (d) => {
  for (const name of readdirSync(d).sort()) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) walk(p);
    else files[relative(dir, p).split(sep).join('/')] = [readFileSync(p), { level: 9 }];
  }
};
walk(dir);

const names = Object.keys(files);
if (!names.includes('index.html')) throw new Error('package-zip: index.html missing at the zip root');
if (!names.some((n) => n.startsWith('assets/'))) throw new Error('package-zip: assets/ missing');
const forbidden = names.filter((n) => /(^|\/)(src|node_modules)\/|\.tsx?$|package(-lock)?\.json$/.test(n));
if (forbidden.length) throw new Error('package-zip: source files must not be packaged: ' + forbidden.join(', '));

mkdirSync('downloads', { recursive: true });
writeFileSync(out, zipSync(files));
console.log(`${out} written: ${names.length} files`);
for (const n of names) console.log('  ' + n);
