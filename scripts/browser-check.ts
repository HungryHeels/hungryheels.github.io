// Real-browser check of the built index.html with Playwright (dev only; not part of `npm test`).
// Usage: npm run build && npx tsx scripts/browser-check.ts [chromium|firefox|webkit ...]
// Serves the repo root on 127.0.0.1 (needed for IndexedDB persistence and the offline cache), drives the app at
// 390px and 1280px in light and dark mode, and fails on console errors, horizontal scroll or any request that is
// not to 127.0.0.1. Uses synthetic saved pages built by test/fixtures.ts (real Safari .webarchive files are not
// in the repo). Note: Playwright's WebKit is not Safari on macOS or iOS.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, existsSync, utimesSync } from 'node:fs';
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
// The app keeps the most recently saved copy, judged by file time, so make the times unambiguous.
utimesSync(join(dir, 'folder', 'sub', 'lenoir-1109-old.webarchive'), new Date('2026-11-01T12:00:00Z'), new Date('2026-11-01T12:00:00Z'));
utimesSync(join(dir, 'folder', 'lenoir-1109.webarchive'), new Date('2026-11-08T12:00:00Z'), new Date('2026-11-08T12:00:00Z'));
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
    let loads = 0;   // a unique query string forces a real page load (a new #hash alone would not reload)
    const go = async (hash: string) => { await p.goto(`${BASE}?load=${++loads}${hash}`); await ready(p); };
    const asNone = () => p.evaluate(() => { const hh = (window as any).__hh; hh.S.profile.pattern = 'none'; hh.render(); });

    // First run: one question, one tap to a meal. Three pages in the header; no app tab bar.
    await go('#/?hall=chase&date=2026-11-16&period=Dinner');
    ok(await p.locator('h1').innerText() === 'One dining-hall meal that fits how you eat.', 'first visit shows the landing headline');
    ok((await p.locator('.hero').innerText()).includes('Unofficial. Not affiliated with UNC'), 'landing says unofficial next to the main button');
    await p.getByRole('button', { name: 'Find my meal' }).click();
    ok(await p.evaluate(() => document.activeElement?.id === 'quiz-h'), '"Find my meal" moves focus to the diet question');
    ok(/\d[\d,]* of the [\d,]+ dishes/.test(await p.locator('.landing').innerText()), 'landing nutrition coverage is computed from the menus');
    await p.getByRole('button', { name: 'Vegetarian' }).click();
    await p.waitForSelector('article.meal');
    ok(await p.locator('article.meal').count() === 1, 'one tap from the first question shows a meal');
    ok(await p.locator('h1').innerText() === 'Meal for Mon, Nov 16', 'heading names the date when it is not today (review fix 1)');
    {
      const c = await p.evaluate(() => {
        const al = document.querySelector('.plate-allergen'), src = document.querySelector('.plate-row .src'), on = document.querySelector('.seg button.on')!;
        const root = getComputedStyle(document.documentElement);
        return { allergen: al ? getComputedStyle(al).color : null, source: src ? getComputedStyle(src).color : null, muted: root.getPropertyValue('--muted').trim(),
          selBg: getComputedStyle(on).backgroundColor, primaryBg: root.getPropertyValue('--accent').trim(),
          ideaPrimary: document.querySelector('[data-fk=idea-next]')!.classList.contains('primary'), selCheck: getComputedStyle(on, '::before').content };
      });
      ok(c.allergen !== null && c.source !== null && c.allergen !== c.source, 'allergen line and nutrition source no longer share a color (critique 1)');
      const hex = (rgb: string) => '#' + rgb.match(/\d+/g)!.slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join('');
      ok(hex(c.source!) === c.muted.toLowerCase(), `nutrition source is muted (${hex(c.source!)} vs ${c.muted})`);
      ok(hex(c.selBg) !== c.primaryBg.toLowerCase() && c.selCheck.includes('✓'), 'selected options are tinted with a check, not filled like a primary button (critique 2)');
      ok(!c.ideaPrimary, '"Another idea" is a secondary button (critique 2)');
    }
    ok(await p.evaluate(() => { const b = document.querySelector('[data-fk=idea-next]')!.getBoundingClientRect(); return b.bottom <= innerHeight; }), '"Another idea" is on the first screen (review fix 3)');
    await p.getByRole('link', { name: 'About Hungry Heels' }).click();
    await p.waitForSelector('.landing');
    ok((await p.evaluate(() => location.hash)).includes('about=1') && await p.locator('.quiz [aria-pressed=true]').innerText() === 'Vegetarian', 'footer About link reopens the landing with the current diet marked');
    await p.getByRole('link', { name: 'Back to my meal' }).click();
    await p.waitForSelector('article.meal');
    ok(await p.locator('.site-nav a').allInnerTexts().then((t: string[]) => t.join('|') === 'Today|Menus|Me'), 'header has exactly three pages: Today, Menus, Me');
    ok(await p.locator('.site-nav a[aria-current=page]').innerText() === 'Today', 'current page is marked with aria-current');
    ok(await p.locator('.brand-tag').innerText() === 'Unofficial', 'unofficial tag next to the name');
    ok((await p.locator('.site-footer').innerText()).includes('If you have an allergy, confirm with dining staff. Not medical advice.'), 'disclaimer in the footer');
    const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    ok(scheme === 'dark' ? bg === 'rgb(11, 19, 34)' : bg === 'rgb(244, 245, 247)', `${scheme} theme applied (${bg})`);
    ok(await p.title() === 'Today · Hungry Heels (unofficial)', 'page title names the page');

    // The address holds the hall, date and meal; switching updates it; Back and Forward restore it.
    await p.getByRole('button', { name: 'Top of Lenoir' }).first().click();
    ok(await p.getByRole('button', { name: 'Top of Lenoir' }).first().getAttribute('aria-pressed') === 'true', 'hall switch (aria-pressed="true")');
    ok((await p.evaluate(() => location.hash)).includes('hall=top-of-lenoir'), 'hall is in the address');
    await p.getByRole('button', { name: 'Next day' }).click();
    ok((await p.evaluate(() => location.hash)).includes('date=2026-11-17'), 'date is in the address');
    const pills = p.locator('.pills .pill');
    await pills.nth(0).click();
    ok(await pills.nth(0).getAttribute('aria-pressed') === 'true', 'meal switch');
    await p.locator('[data-fk=date-prev]').focus();
    await p.keyboard.press('Tab'); const stop2 = await p.evaluate(() => document.activeElement?.getAttribute('data-fk'));
    const ring2 = await p.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle !== 'none');
    const wide2 = await p.evaluate(() => document.activeElement!.getBoundingClientRect().width > 120);
    await p.keyboard.press('Tab'); const stop3 = await p.evaluate(() => document.activeElement?.getAttribute('data-fk'));
    ok(stop2 === 'date-pick-btn' && stop3 === 'date-next', `date bar has three keyboard stops: ‹, date, › (review fix 2; got ${stop2}, ${stop3})`);
    ok(ring2, 'the date button shows a focus ring');
    ok(wide2, 'the date button is laid out across the bar (not squeezed)');
    await p.getByRole('link', { name: 'Menus', exact: true }).click();
    await p.waitForSelector('.item-row');
    ok((await p.evaluate(() => location.hash)).startsWith('#/menus?hall=top-of-lenoir&date=2026-11-17'), 'Menus link keeps the hall and date');
    ok(await p.title() === 'Menus · Hungry Heels (unofficial)', 'Menus page title');
    await p.goBack(); await p.waitForSelector('article.meal');
    ok(await p.locator('.site-nav a[aria-current=page]').innerText() === 'Today', 'Back returns to Today');
    await p.goForward(); await p.waitForSelector('.item-row');
    ok(await p.locator('h1').innerText() === 'Menus', 'Forward returns to Menus');

    // A deep link opens a dish directly.
    await go('#/menus?hall=chase&date=2026-11-16&period=Dinner');
    if (w < 760) {
      ok(!(await p.locator('.menus .lede').isVisible()), 'Menus intro is hidden on phones (critique 3)');
      ok(await p.evaluate(() => { const row = document.querySelector('.pills')!; const left = row.getBoundingClientRect().left;
        return Array.from(row.querySelectorAll('.pill')).every(el => el.getBoundingClientRect().right <= left + 1 || el.getBoundingClientRect().left >= left - 1); }), 'no meal pill is sliced at the left edge (critique 3)');
    }
    ok(await p.evaluate(() => { const r = document.querySelector('.item-row')!.getBoundingClientRect(); return r.top < innerHeight; }), 'first menu item is visible on the first screen');
    const firstItem = p.locator('.item-row').first();
    const itemKey = await firstItem.getAttribute('data-fk');
    await firstItem.focus(); await p.keyboard.press('Enter');
    await p.waitForSelector('[role=dialog]');
    ok((await p.evaluate(() => location.hash)).includes('item='), 'opening a dish puts it in the address');
    ok(await p.evaluate(() => document.activeElement?.classList.contains('sheet')), 'focus moves into the dish details');
    for (let i = 0; i < 25; i++) await p.keyboard.press('Tab');
    ok(await p.evaluate(() => !!document.activeElement?.closest('[role=dialog]')), 'Tab stays inside the dish details');
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    ok(await p.locator('[role=dialog]').count() === 0, 'Escape closes the dish details');
    ok(!(await p.evaluate(() => location.hash)).includes('item='), 'closing removes the dish from the address');
    ok(await p.evaluate((k: string) => document.activeElement?.getAttribute('data-fk') === k, itemKey as string), 'focus returns to the dish that opened it');
    await firstItem.click(); await p.waitForSelector('[role=dialog]');
    await p.goBack(); await p.waitForTimeout(150);
    ok(await p.locator('[role=dialog]').count() === 0, 'browser Back closes the dish details');
    const deep = await firstItem.getAttribute('data-fk');
    await go(`#/menus?hall=chase&date=2026-11-16&period=Dinner&item=${deep!.slice(5)}`);
    ok(await p.locator('[role=dialog]').count() === 1, 'a shared link with item= opens that dish');
    await p.keyboard.press('Escape');
    await p.waitForSelector('[role=dialog]', { state: 'detached' });
    ok(await noHScroll(p), 'no horizontal scroll (Menus)');
    await p.locator('#item-search').fill('zzzz-nothing');
    ok(await p.getByText('Nothing matches these filters.').waitFor({ timeout: 5000 }).then(() => true, () => false), 'search filters the list');

    // Today details: rule checklist + report link.
    await go('#/?hall=chase&date=2026-11-16&period=Dinner');
    await p.locator('article.meal details.more summary').click();
    ok(await p.locator('.checks.rules li').count() > 0, 'rule checklist in the meal details');
    const href = await p.getByRole('link', { name: 'Report a wrong result' }).first().getAttribute('href');
    ok(href?.startsWith('https://github.com/HungryHeels/hungryheels.github.io/issues/new?title='), 'report link is a prefilled GitHub issue URL');
    ok(await noHScroll(p), 'no horizontal scroll (Today)');

    // Update menus: files, folder (with a .txt and an older duplicate), diff, persistence across reload.
    await go('#/menus?view=update');
    ok(await p.locator('.subnav a[aria-current=page]').innerText() === 'Update menus', 'Update menus view');
    ok((await p.locator('.lede').innerText()).startsWith('Add menu pages you saved'), 'Update menus has its own intro (review fix 6)');
    ok(await p.locator('h2#data-h').evaluate((e: Element) => e.getBoundingClientRect().width <= 1), 'no repeated visible "Update menus" heading (kept for screen readers only)');
    const todo = (await p.locator('#next14').innerText()).includes('To do:');
    ok(await p.locator('#next14-days').evaluate((d: HTMLDetailsElement) => d.open) === todo, 'day-by-day list is open only when something needs saving');
    await p.locator('#pick').setInputFiles(join(dir, 'chase-1112.webarchive'));
    await p.locator('.banner.info', { hasText: /Imported 1 day from 1 saved page/ }).waitFor();
    ok(await p.getByText(/Replaces the built-in copy\. Changed since the earlier save/).isVisible(), 'per-day diff against the built-in copy');
    await p.locator('#pick-dir').setInputFiles(join(dir, 'folder'));
    await p.locator('.banner.info', { hasText: /Imported 1 day from 2 saved pages\. Skipped 1 other file/ }).waitFor();
    ok(await p.getByText('Older duplicate').isVisible(), 'older duplicate in a folder is reported and not used');
    ok(await p.locator('#next14').isVisible(), '14-day checklist shown');
    ok(await noHScroll(p), 'no horizontal scroll (Update menus)');
    await go('#/?hall=chase&date=2026-11-12&period=Dinner'); await asNone();
    await p.waitForSelector('.banner.warn');
    ok(await p.getByText(/fewer sides\. Your diet rules were not changed/).isVisible(), 'imported day survives reload (IndexedDB) and the fallback banner shows');
    await go('#/?hall=top-of-lenoir&date=2026-11-09');
    const pillTxt = await p.locator('.pills .pill').allInnerTexts();
    ok(pillTxt.length === 2, 'folder import added Lenoir Nov 9 with both periods from the newest save' + (pillTxt.length === 2 ? '' : ` (saw ${JSON.stringify(pillTxt)} at ${await p.evaluate(() => location.hash)})`));

    // Nutrition: official file and an entered value, both surviving reload.
    await go('#/menus?view=update');
    await p.locator('#csv').setInputFiles(join(dir, 'official.csv'));
    await p.locator('p[role=status]', { hasText: /Applied official nutrition to \d+ menu entries/ }).waitFor();
    await go('#/?hall=chase&date=2026-11-12&period=Dinner'); await asNone();
    ok(await p.getByText('Nutrition: Official').first().isVisible(), 'official nutrition badge on the meal');
    await p.locator('.plate-row', { hasText: 'Steamed Broccoli' }).click();
    await p.getByText('Enter values from UNC’s item panel').click();
    await p.locator('.manual input[name=calories]').fill('100'); await p.locator('.manual input[name=protein]').fill('60');
    await p.getByRole('button', { name: 'Save', exact: true }).click();
    ok(await p.locator('.manual input[aria-invalid=true][aria-describedby=manual-msg]').count() === 2 && await p.evaluate(() => (document.activeElement as HTMLInputElement)?.name === 'calories'),
      'a rejected entry marks the boxes invalid, links the message and focuses the first box (review fix 7)');
    await p.locator('.manual input[name=calories]').fill(''); await p.locator('.manual input[name=protein]').fill('');
    await p.locator('.manual input[name=calories]').fill('35'); await p.locator('.manual input[name=protein]').fill('3');
    await p.getByRole('button', { name: 'Save', exact: true }).click();
    await p.getByText('Nutrition: Entered by you').first().waitFor();
    await p.keyboard.press('Escape');
    await go('#/?hall=chase&date=2026-11-12&period=Dinner'); await asNone();
    await p.waitForSelector('article.meal');
    ok(await p.getByText('Nutrition: Entered by you').first().isVisible(), 'entered value persists across reload');
    ok((await p.locator('.totals').first().innerText()).includes('285'), 'totals use official + entered values (250 + 35 kcal)');

    // Save, whole day, Me page.
    await p.getByRole('button', { name: '☆ Save' }).click();
    await p.getByRole('button', { name: 'Whole day' }).click();
    ok((await p.evaluate(() => location.hash)).includes('mode=day'), 'whole-day view is in the address');
    ok(await p.locator('.dayplan > li').count() >= 1, 'whole-day plan shows meals');
    ok(await p.locator('.dayplan .plate-row').count() >= 1, 'whole-day meals use the same dish rows as one meal (review fix 5)');
    ok(await p.locator('.card.day-total .totals').count() === 1, 'day total sits in a card (review fix 4)');
    const fc = await p.locator('.day-total').innerText();
    ok(!/unknown · unknown/.test(fc), 'no "unknown · unknown" in the day total');
    await p.getByRole('link', { name: 'Me', exact: true }).click();
    await p.waitForSelector('#me-diet');
    ok(await p.getByText(/Saved meals \(1\)/).isVisible(), 'saved meal listed on Me');
    await p.locator('[data-fk=d-pro]').fill('120'); await p.locator('[data-fk=d-pro]').press('Tab');
    await go('#/me?section=goals');
    ok(await p.evaluate(() => { const r = document.getElementById('me-goals')!.getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight; }), 'a #/me?section= link scrolls to that section');
    ok(await noHScroll(p), 'no horizontal scroll (Me)');

    // Share link (old and new forms) offers to add the profile; nothing leaves the page.
    const enc = await p.evaluate(() => { const S = (window as any).__hh.S; const json = JSON.stringify({ v: 1, name: 'Friend', profile: { ...S.profile, pattern: 'vegan', allergens: ['peanut'] } });
      return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); });
    await go('#profile=' + enc);
    await p.getByRole('button', { name: 'Add as a new profile' }).click();
    await go('#/?hall=chase&date=2026-11-16&period=Dinner');
    ok((await p.locator('#rules-h + p').innerText()).includes('Vegan · Peanut allergy'), 'shared profile (old #profile= link) added and active');

    // Display settings.
    await go('#/me?section=display');
    await p.getByRole('button', { name: 'High' }).click();
    ok(await p.evaluate(() => document.documentElement.getAttribute('data-contrast') === 'high'), 'high contrast setting applied');
    await p.getByRole('button', { name: 'Large' }).click();
    ok(await noHScroll(p), 'no horizontal scroll with large text');
    // Skip link moves focus without changing the page.
    await go('#/menus'); await p.keyboard.press('Tab'); await p.keyboard.press('Enter');
    ok(await p.evaluate(() => location.hash.startsWith('#/menus') && document.activeElement?.id === 'main'), 'skip link focuses the content and keeps the page');

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
