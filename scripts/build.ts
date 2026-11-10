// Bundles the client into one self-contained HungryHeels.html (also copied to index.html for GitHub Pages)
// and a multi-file build in web/. No network access is needed or used.
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const result = await build({ entryPoints: ['src/client/standalone.ts'], bundle: true, minify: true, format: 'iife', target: ['es2020', 'safari15'], write: false, legalComments: 'none' });
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('src/client/style.css', 'utf8');
const tpl = readFileSync('src/client/index.template.html', 'utf8');
const single = tpl.replace('/*CSS*/', () => css).replace('/*JS*/', () => js);
writeFileSync('HungryHeels.html', single);
writeFileSync('index.html', single);
mkdirSync('web', { recursive: true });
writeFileSync('web/app.js', js);
writeFileSync('web/style.css', css);
writeFileSync('web/index.html', tpl.replace('<style>/*CSS*/</style>', '<link rel="stylesheet" href="style.css">').replace('<script>/*JS*/</script>', '<script src="app.js" defer></script>'));
console.log(`HungryHeels.html ${(single.length / 1024).toFixed(0)} KB`);
