// Bundles the client into one self-contained HungryHeels.html (also copied to index.html for GitHub Pages)
// and a multi-file build in web/. Also writes the offline-cache files (manifest, icon, service worker) next to
// index.html; the page only uses them when served over http(s). No network access is needed or used.
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { writeRestaurantData } from './build-restaurants.ts';
import { iconDataUri, iconSvg } from '../src/pwa/icon.ts';

writeRestaurantData();   // data/restaurants/ -> src/client/restaurant-data.ts (fails the build on invalid files)

const result = await build({ entryPoints: ['src/client/standalone.ts'], bundle: true, minify: true, format: 'iife', target: ['es2020', 'safari15'], write: false, legalComments: 'none' });
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('src/client/style.css', 'utf8');
const tpl = readFileSync('src/client/index.template.html', 'utf8').replace('/*ICON*/', () => iconDataUri());
const single = tpl.replace('/*CSS*/', () => css).replace('/*JS*/', () => js);
const version = createHash('sha256').update(single).digest('hex').slice(0, 12);
const sw = readFileSync('src/pwa/sw.template.js', 'utf8').replace('/*VERSION*/', version);
const manifest = readFileSync('src/pwa/manifest.webmanifest', 'utf8');
const icon = iconSvg();   // the mascot, from src/pwa/icon.ts
writeFileSync('HungryHeels.html', single);
writeFileSync('index.html', single);
mkdirSync('web', { recursive: true });
writeFileSync('web/app.js', js);
writeFileSync('web/style.css', css);
writeFileSync('web/index.html', tpl.replace('<style>/*CSS*/</style>', '<link rel="stylesheet" href="style.css">').replace('<script>/*JS*/</script>', '<script src="app.js" defer></script>'));
for (const dir of ['.', 'web']) { writeFileSync(`${dir}/sw.js`, sw); writeFileSync(`${dir}/manifest.webmanifest`, manifest); writeFileSync(`${dir}/icon.svg`, icon); }
console.log(`HungryHeels.html ${(single.length / 1024).toFixed(0)} KB, build ${version}`);
