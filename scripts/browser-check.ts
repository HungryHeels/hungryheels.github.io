// Real-browser check of the built index.html with Playwright (dev only; not part of `npm test`).
// Usage: npm run build && npx tsx scripts/browser-check.ts [chromium|firefox|webkit ...]
// Serves the repo root on 127.0.0.1 (needed for IndexedDB persistence and the offline cache), drives the app at
// 390px and 1280px in light and dark mode, and fails on console errors, horizontal scroll or any request that is
// not to 127.0.0.1. Uses synthetic saved pages built by test/fixtures.ts (real Safari .webarchive files are not
// in the repo). Note: Playwright's WebKit is not Safari on macOS or iOS.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { page as fakePage, webArchive } from '../test/fixtures.ts';

const require = createRequire(import.meta.url);
const pw = require('playwright');
const engines: string[] = process.argv.slice(2).length ? process.argv.slice(2) : ['chromium'];
const ROOT = resolve('.');
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent((req.url ?? '/').split('?')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }); res.end(readFileSync(p));
});
await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()));
const BASE = `http://127.0.0.1:${(server.address() as any).port}/`;

// ---- synthetic saved pages ----
const dir = join(process.env.HH_SCRATCH ?? tmpdir(), 'hh-browser-check');
mkdirSync(join(dir, 'folder', 'sub'), { recursive: true });
const epoch = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10), 5) / 1000; // midnight in New York (EST)
const chicken = { name: 'Grilled Chicken', ing: 'chicken breast, salt, pepper', id: '9001' };
const broc = { name: 'Steamed Broccoli', ing: 'broccoli', id: '9002' };
// One main and one side only: the meal builder must fall back to "fewer sides" and say so.
writeFileSync(join(dir, 'chase-1112.webarchive'), webArchive(fakePage({ epoch: epoch('2026-11-12'), periods: [{ label: 'Dinner (5pm-8pm)', stations: [{ name: 'Grill', items: [chicken] }, { name: 'Sides', items: [broc] }] }] })));
const lenoir = (extra: boolean) => webArchive(fakePage({ slug: 'top-of-lenoir', epoch: epoch('2026-11-09'), periods: [
  { label: 'Lunch (11am-2:30pm)', stations: [{ name: 'Entrees', items: [chicken, { name: 'Tofu Stir Fry', ing: 'tofu, broccoli, carrots, rice', id: '9003' }] }, { name: 'Sides', items: [broc, { name: 'Red Grapes', ing: 'grapes', id: '9004' }, { name: 'Brown Rice', ing: 'brown rice, water', id: '9005' }] }] },
  ...(extra ? [{ label: 'Dinner (5pm-8pm)', stations: [{ name: 'Entrees', items: [chicken] }, { name: 'Sides', items: [broc, { name: 'Red Grapes', ing: 'grapes', id: '9004' }] }] }] : []),
] }));
writeFileSync(join(dir, 'folder', 'lenoir-1109.webarchive'), lenoir(true));
writeFileSync(join(dir, 'folder', 'sub', 'lenoir-1109-old.webarchive'), lenoir(false));
writeFileSync(join(dir, 'folder', 'notes.txt'), 'not a menu');
writeFileSync(join(dir, 'official.csv'), 'recipe_id,name,location,calories,protein,total fat,total carbohydrate\n9001,Grilled Chicken,Chase,250,38 g,9,1\n');

let failures = 0;
const ok = (cond: unknown, msg: string) => { if (cond) console.log('  ok  ' + msg); else { failures++; console.log('  FAIL ' + msg); } };

async function ready(p: any) { await p.waitForFunction(() => (window as any).__hh && !(window as any).__hh.S.loading); }
async function noHScroll(p: any): Promise<boolean> { return p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1); }

for (const name of engines) {
  const type = pw[name];
  let browser;
  try { browser = await type.launch(); } catch (e: any) { console.log(`SKIP ${name}: cannot launch (${String(e.message).split('\n')[0]})`); continue; }
  console.log(`\n== ${name} ${browser.version()} ==`);
  for (const [w, hgt, scheme] of [[390, 844, 'light'], [1280, 900, 'dark']] as const) {
    console.log(`-- ${w}px, ${scheme} --`);
    const ctx = await browser.newContext({ viewport: { width: w, height: hgt }, colorScheme: scheme, timezoneId: 'America/New_York' });
    const p = await ctx.newPage();
    const errors: string[] = [], offsite: string[] = [];
    p.on('console', (m: any) => { if (m.type() === 'error') errors.push(m.text()); });
    p.on('pageerror', (e: any) => errors.push(String(e)));
    p.on('request', (r: any) => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) offsite.push(r.url()); });
    await p.goto(BASE);
    // First run: quiz, one tap to a meal.
    await p.getByRole('button', { name: 'Vegetarian' }).click();
    await p.waitForSelector('article.meal');
    ok(await p.locator('article.meal').count() === 1, 'one tap from the quiz shows a meal card');
    ok(await p.getByText('Unofficial · personal use · not affiliated with UNC').isVisible(), 'unofficial notice visible');
    ok((await p.locator('footer.legal').first().innerText()).includes('If you have an allergy, confirm with dining staff. Not medical advice.'), 'disclaimer visible');
    const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    ok(scheme === 'dark' ? bg === 'rgb(11, 19, 34)' : bg === 'rgb(242, 244, 248)', `${scheme} theme applied (${bg})`);
    // Hall / date / period switching.
    await p.goto(BASE + '#'); await ready(p); await p.waitForSelector('article.meal');
    await p.evaluate(() => { const hh = (window as any).__hh; hh.S.date = '2026-11-16'; hh.S.period = null; hh.render(); });
    await p.getByRole('button', { name: 'Top of Lenoir' }).first().click();
    ok(await p.getByRole('button', { name: 'Top of Lenoir' }).first().getAttribute('aria-pressed') === 'true', 'hall switch');
    const dateBefore = await p.locator('.date-mid strong').innerText();
    await p.getByRole('button', { name: 'Next day' }).click();
    ok((await p.locator('.date-mid strong').innerText()) !== dateBefore, 'next day');
    const pills = p.locator('.pills .pill');
    if (await pills.count() > 1) { await pills.nth(1).click(); ok(await pills.nth(1).getAttribute('aria-pressed') === 'true', 'period switch'); }
    await p.getByRole('button', { name: /Another idea/ }).click().catch(() => {});
    ok(await p.locator('article.meal').count() === 1, 'meal still shown after switching');
    // Item sheet: focus moves in, Escape closes, focus returns to the opener.
    const opener = p.locator('.plate-row').first();
    const openerKey = await opener.getAttribute('data-fk');
    await opener.focus(); await p.keyboard.press('Enter');
    await p.waitForSelector('[role=dialog]');
    ok(await p.evaluate(() => document.activeElement?.classList.contains('sheet')), 'focus moves into the item sheet');
    for (let i = 0; i < 25; i++) await p.keyboard.press('Tab');
    ok(await p.evaluate(() => !!document.activeElement?.closest('[role=dialog]')), 'Tab stays inside the sheet');
    await p.keyboard.press('Escape');
    ok(await p.locator('[role=dialog]').count() === 0, 'Escape closes the sheet');
    ok(await p.evaluate((k: string) => document.activeElement?.getAttribute('data-fk') === k, openerKey as string), 'focus returns to the item that opened the sheet');
    // Details: rule checklist + report link.
    await p.locator('details.more summary').first().click();
    ok(await p.locator('.checks.rules li').count() > 0, 'rule checklist shown in Details');
    const href = await p.getByRole('link', { name: 'Report a wrong result' }).first().getAttribute('href');
    ok(href?.startsWith('https://github.com/HungryHeels/hungryheels.github.io/issues/new?title='), 'report link is a prefilled GitHub issue URL');
    ok(await noHScroll(p), 'no horizontal scroll (menu)');

    // Import: files, folder (with a .txt and an older duplicate), diff, persistence across reload.
    await p.getByRole('button', { name: 'You', exact: true }).click();
    await p.locator('#pick').setInputFiles(join(dir, 'chase-1112.webarchive'));
    await p.getByText(/Imported 1 day from 1 saved page/).waitFor();
    ok(await p.getByText(/Replaces the built-in copy\. Changed since the earlier save/).isVisible(), 'per-day diff against the built-in copy');
    await p.locator('#pick-dir').setInputFiles(join(dir, 'folder'));
    await p.getByText(/Imported 1 day from 2 saved pages\. Skipped 1 other file/).waitFor();
    ok(await p.getByText('Older duplicate').isVisible(), 'older duplicate in a folder is reported and not used');
    ok(await p.locator('#next14').isVisible(), '14-day checklist shown');
    ok(await noHScroll(p), 'no horizontal scroll (You tab)');
    await p.reload(); await ready(p);
    await p.getByRole('button', { name: 'You', exact: true }).click().catch(() => {});
    await p.evaluate(() => { const hh = (window as any).__hh; hh.S.tab = 'menu'; hh.S.hall = 'chase'; hh.S.date = '2026-11-12'; hh.S.period = 'Dinner'; hh.S.profile.pattern = 'none'; hh.render(); });
    await p.waitForSelector('.banner.warn');
    ok(await p.getByText(/fewer sides\. Your diet rules were not changed/).isVisible(), 'imported day survives reload (IndexedDB) and the fallback banner shows');
    await p.evaluate(() => { const hh = (window as any).__hh; hh.S.hall = 'top-of-lenoir'; hh.S.date = '2026-11-09'; hh.S.period = null; hh.render(); });
    ok(await p.locator('.pills .pill').count() === 2, 'folder import added Lenoir Nov 9 with both periods from the newest save');

    // Nutrition: official file and manual entry.
    await p.getByRole('button', { name: 'You', exact: true }).click();
    await p.locator('#csv').setInputFiles(join(dir, 'official.csv'));
    await p.locator('p[role=status]', { hasText: /Applied official nutrition to \d+ menu entries/ }).waitFor();
    await p.evaluate(() => { const hh = (window as any).__hh; hh.S.tab = 'menu'; hh.S.hall = 'chase'; hh.S.date = '2026-11-12'; hh.S.period = 'Dinner'; hh.render(); });
    ok(await p.getByText('Nutrition: Official').first().isVisible(), 'official nutrition badge on the meal');
    await p.locator('.plate-row', { hasText: 'Steamed Broccoli' }).click();
    await p.getByText('Enter values from UNC’s item panel').click();
    await p.locator('.manual input[name=calories]').fill('35'); await p.locator('.manual input[name=protein]').fill('3');
    await p.getByRole('button', { name: 'Save', exact: true }).click();
    await p.getByText('Nutrition: Entered by you').first().waitFor();
    await p.keyboard.press('Escape');
    await p.reload(); await ready(p);
    await p.evaluate(() => { const hh = (window as any).__hh; hh.S.tab = 'menu'; hh.S.hall = 'chase'; hh.S.date = '2026-11-12'; hh.S.period = 'Dinner'; hh.S.profile.pattern = 'none'; hh.render(); });
    await p.waitForSelector('article.meal');
    ok(await p.getByText('Nutrition: Entered by you').first().isVisible(), 'manual entry persists across reload');
    ok((await p.locator('.total-row').first().innerText()).includes('285'), 'totals use official + entered values (250 + 35 kcal)');

    // Plan tab: best fit now, day planner with daily targets, save a meal.
    await p.getByRole('button', { name: '☆ Save' }).click();
    await p.getByRole('button', { name: 'Plan', exact: true }).click();
    ok(await p.locator('#best-h').isVisible(), 'compare halls shown');
    await p.locator('[data-fk=d-pro]').fill('120'); await p.locator('[data-fk=d-pro]').press('Tab');
    ok(await p.locator('.dayplan > li').count() >= 1, 'day planner shows meals');
    ok(await p.getByText(/Saved meals \(1\)/).isVisible(), 'saved meal listed');
    ok(await noHScroll(p), 'no horizontal scroll (Plan tab)');

    // Share link: opening it offers to add the profile; nothing leaves the page.
    const share = await p.evaluate(() => { const S = (window as any).__hh.S; const json = JSON.stringify({ v: 1, name: 'Friend', profile: { ...S.profile, pattern: 'vegan', allergens: ['peanut'] } });
      return '#profile=' + btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); });
    await p.goto(BASE + share); await p.reload(); await ready(p);
    await p.getByRole('button', { name: 'Add as a new profile' }).click();
    ok((await p.locator('.rules-line').innerText()).includes('Vegan · Peanut allergy'), 'shared profile added and active');

    // Display settings.
    await p.getByRole('button', { name: 'You', exact: true }).click();
    await p.getByRole('button', { name: 'High' }).click();
    ok(await p.evaluate(() => document.documentElement.getAttribute('data-contrast') === 'high'), 'high contrast setting applied');
    await p.getByRole('button', { name: 'Large' }).click();
    ok(await noHScroll(p), 'no horizontal scroll with large text');

    ok(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
    ok(offsite.length === 0, 'no requests outside 127.0.0.1' + (offsite.length ? ': ' + offsite.slice(0, 3).join(', ') : ''));
    await ctx.close();
  }
  // Single file from disk: works and makes no requests at all.
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const reqs: string[] = [], errors: string[] = [];
  p.on('request', (r: any) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) reqs.push(r.url()); });
  p.on('console', (m: any) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto('file://' + join(ROOT, 'HungryHeels.html'));
  await p.getByRole('button', { name: 'Vegan' }).click();
  await p.waitForSelector('article.meal');
  ok(reqs.length === 0, 'HungryHeels.html from disk: zero network requests');
  ok(errors.length === 0, 'HungryHeels.html from disk: no console errors' + (errors.length ? ': ' + errors[0] : ''));
  await ctx.close();
  await browser.close();
}
server.close();
console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll browser checks passed.');
process.exit(failures ? 1 : 0);
