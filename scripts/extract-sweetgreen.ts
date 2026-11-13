// Faithful extraction of Sweetgreen's own per-store nutrition page (saved once, by hand or with permission) into
// data/restaurants/sweetgreen/components.csv. Every value is copied from the page's labeled table cells; nothing is
// computed or guessed. Empty or "not available" cells stay empty (unknown).
// Usage: npx tsx scripts/extract-sweetgreen.ts [data/restaurants/sweetgreen/source/nutrition-chapel-hill.html]
import { readFileSync, writeFileSync } from 'node:fs';

const NOT_ONLINE = /ingredient list not available online/i;
const text = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&#x27;|&rsquo;/g, '’').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const csv = (v: string) => (/[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

/** Sweetgreen's section → the app's role. Kids Meals stay dishes (category keeps the published section name). */
const ROLE: Record<string, string> = { 'Warm Plates': 'dish', Wraps: 'dish', Bowls: 'dish', Salads: 'dish', 'Kids Meals': 'dish', Sides: 'side', Dessert: 'dessert', Drinks: 'drink' };
const ALLERGEN: Record<string, string> = { dairy: 'milk', eggs: 'egg', fish: 'fish', shellfish: 'shellfish', wheat: 'wheat', peanuts: 'peanut', 'tree nuts': 'tree nuts', soy: 'soy', sesame: 'sesame' };

export interface Extracted { header: string[]; rows: string[][]; lastUpdated: string | null; address: string | null; crossContact: string | null }

export function extractSweetgreen(html: string): Extracted {
  // Ingredients: <h3>Section</h3> <dl> <dt>Item</dt><dd>list</dd> ...
  const ingredients = new Map<string, string | null>();
  const ingStart = html.indexOf('nutrition-section--ingredients');
  if (ingStart < 0) throw new Error('no Ingredients section found');
  for (const g of html.slice(ingStart).matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<dl[^>]*>([\s\S]*?)<\/dl>/g)) {
    for (const it of g[2].matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)) {
      const v = text(it[2]);
      ingredients.set(text(g[1]) + '|' + text(it[1]), NOT_ONLINE.test(v) ? null : v);
    }
  }
  const header = ['id', 'role', 'category', 'name', 'serving', 'calories', 'protein_g', 'fat_g', 'carbs_g', 'sodium_mg', 'fiber_g', 'sugar_g', 'contains', 'may_contain', 'ingredients', 'labels', 'extra_for', 'extra_kind', 'notes'];
  const rows: string[][] = [];
  const ids = new Set<string>();
  for (const sec of html.matchAll(/<section class="nutrition-table-section"[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/g)) {
    const category = text(sec[1]);
    const role = ROLE[category];
    if (!role) throw new Error(`unknown section "${category}"`);
    const cols = [...sec[2].matchAll(/<th scope="col">([\s\S]*?)<\/th>/g)].map(m => text(m[1]));
    const want = ['Menu item', 'Serving size (g)', 'Contains gluten?', 'Calories', 'Fat (g)', 'Saturated fat (g)', 'Trans fat (g)', 'Cholesterol (mg)', 'Sodium (mg)', 'Carbs (g)', 'Fiber (g)', 'Sugar (g)', 'Protein (g)', 'Allergens'];
    if (cols.join('|') !== want.join('|')) throw new Error(`${category}: unexpected columns ${cols.join(', ')}`);
    for (const tr of sec[2].matchAll(/<tr>\s*<th scope="row">([\s\S]*?)<\/th>([\s\S]*?)<\/tr>/g)) {
      const name = text(tr[1]);
      const cell: Record<string, string> = {};
      for (const td of tr[2].matchAll(/<td data-label="([^"]+)">([\s\S]*?)<\/td>/g)) cell[text(td[1])] = text(td[2]);
      const n = (k: string) => (cell[k] ?? '').replace(/,/g, '');
      const gluten = (cell['Contains gluten?'] ?? '').toLowerCase();
      const al = (cell['Allergens'] ?? '').trim();
      const tokens = /^none$/i.test(al) ? [] : al.split(',').map(x => x.trim().toLowerCase()).filter(Boolean).map(x => { if (!ALLERGEN[x]) throw new Error(`${name}: unknown allergen "${x}"`); return ALLERGEN[x]; });
      if (gluten === 'yes') tokens.push('gluten');
      else if (gluten !== 'no') throw new Error(`${name}: "Contains gluten?" is "${cell['Contains gluten?']}"`);
      const contains = !al ? '' : tokens.length ? tokens.join(';') : 'none';
      let id = slug(name); let k = 2; while (ids.has(id)) id = slug(name).slice(0, 37) + '-' + k++; ids.add(id);
      const ing = ingredients.has(category + '|' + name) ? ingredients.get(category + '|' + name) : null;
      rows.push([id, role, category, name, cell['Serving size (g)'] ? cell['Serving size (g)'] + ' g' : '', n('Calories'), n('Protein (g)'), n('Fat (g)'), n('Carbs (g)'), n('Sodium (mg)'), n('Fiber (g)'), n('Sugar (g)'),
        contains, '', ing ?? '', '', '', '', ing === null ? 'Ingredient list not available online (Sweetgreen: ask for the printed ingredient guide in store).' : '']);
    }
  }
  const lu = /Last updated ([A-Z][a-z]+ \d{1,2}, \d{4})/.exec(text(html));
  const addr = /Sweetgreen Chapel Hill nutrition[\s\S]*?<[^>]*>\s*([0-9][^<]*Chapel Hill, NC)/.exec(html);
  const cc = /(Sweetgreen kitchens are not allergen-free environments[^<]*)/.exec(html);
  return { header, rows, lastUpdated: lu?.[1] ?? null, address: addr ? text(addr[1]) : null, crossContact: cc ? text(cc[1]) : null };
}

if (process.argv[1] && /extract-sweetgreen\.ts$/.test(process.argv[1])) {
  const src = process.argv[2] ?? 'data/restaurants/sweetgreen/source/nutrition-chapel-hill.html';
  const x = extractSweetgreen(readFileSync(src, 'utf8'));
  writeFileSync('data/restaurants/sweetgreen/components.csv', [x.header, ...x.rows].map(r => r.map(csv).join(',')).join('\n') + '\n');
  console.log(`${x.rows.length} rows; last updated ${x.lastUpdated}; address ${x.address}`);
  console.log('cross-contact: ' + x.crossContact);
}
