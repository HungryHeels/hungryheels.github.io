// Faithful extraction of Chipotle's own US nutrition sheet (a static PDF on chipotle.com, not the ordering app) into
// data/restaurants/chipotle/components.csv. Values are copied from the PDF's "nutrition facts" table (main menu, the
// first table: same component rows in both fountain-drink versions). Drinks and the kids' menu are left out: the
// sheet has two different fountain lists and it does not say which one the Franklin Street store has.
// Diet labels and gluten notes come only from Chipotle's own allergens page (chipotle.com/allergens), word for word
// in STATEMENTS below. Chipotle publishes no per-item allergen list outside its ordering app, so "contains" stays
// EMPTY (= not published: every allergen check is unknown). Nothing is computed or guessed.
// Needs `pdftotext` (poppler). Usage: npx tsx scripts/extract-chipotle.ts [path/to/US-Nutrition-Facts-Paper-Menu-3-2025.pdf]
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

/** Chipotle's own words (chipotle.com/allergens, saved Nov 13, 2026) that the labels below rely on. */
export const STATEMENTS = {
  vegan: 'Our Sofritas is vegan and vegetarian approved. Vegans should avoid our meats, shredded Monterey Jack cheese, queso, sour cream, and chipotle-honey vinaigrette. Our tortillas, vegetables, rice, beans, salsas, chips and guacamole, are vegetarian and vegan.',
  gluten: "If you avoid gluten, don't eat our flour tortillas. If you are highly sensitive to gluten and would like us to change our gloves, just let us know at the start of your order. You should be aware items containing corn, including corn tortillas (chips and crispy corn tortillas) and corn salsa, may have trace amounts of gluten from potentially co-mingling with gluten-containing grains in the field.",
  pork: 'FOR THOSE WHO AVOID PORK: Our carnitas are made with pork.',
};

type Row = { role: string; category: string; vegan?: true; mayGluten?: true; note?: string };
/** Every component row the extractor accepts, as printed in the PDF. Unknown or missing rows stop the extraction. */
const ROWS: Record<string, Row> = {
  'Flour Tortilla (burrito)': { role: 'tortilla', category: 'Tortillas', vegan: true, note: 'Chipotle: if you avoid gluten, don’t eat our flour tortillas.' },
  'Flour Tortilla (taco)': { role: 'tortilla', category: 'Tortillas', vegan: true, note: 'Chipotle: if you avoid gluten, don’t eat our flour tortillas.' },
  'Crispy Corn Tortilla': { role: 'tortilla', category: 'Tortillas', vegan: true, mayGluten: true },
  'Cilantro-Lime Brown Rice': { role: 'base', category: 'Rice and greens', vegan: true },
  'Cilantro-Lime White Rice': { role: 'base', category: 'Rice and greens', vegan: true },
  'Supergreens Salad Mix': { role: 'base', category: 'Rice and greens', vegan: true },
  'Black Beans': { role: 'topping', category: 'Beans and veggies', vegan: true },
  'Pinto Beans': { role: 'topping', category: 'Beans and veggies', vegan: true },
  'Fajita Vegetables': { role: 'topping', category: 'Beans and veggies', vegan: true },
  'Barbacoa': { role: 'protein', category: 'Proteins' },
  'Chicken': { role: 'protein', category: 'Proteins' },
  'Carnitas': { role: 'protein', category: 'Proteins', note: 'Chipotle: our carnitas are made with pork.' },
  'Steak': { role: 'protein', category: 'Proteins' },
  'Sofritas': { role: 'protein', category: 'Proteins', vegan: true },
  'Fresh Tomato Salsa': { role: 'topping', category: 'Salsas', vegan: true },
  'Roasted Chili-Corn Salsa': { role: 'topping', category: 'Salsas', vegan: true, mayGluten: true },
  'Tomatillo-Green Chili Salsa': { role: 'topping', category: 'Salsas', vegan: true },
  'Tomatillo-Red Chili Salsa': { role: 'topping', category: 'Salsas', vegan: true },
  'Cheese': { role: 'topping', category: 'Toppings' },
  'Sour Cream': { role: 'topping', category: 'Toppings' },
  'Guacamole (topping/side)': { role: 'topping', category: 'Toppings', vegan: true },
  'Guacamole (large)': { role: 'side', category: 'Sides', vegan: true },
  'Queso Blanco (entreé)': { role: 'topping', category: 'Toppings' },
  'Queso Blanco (side)': { role: 'side', category: 'Sides' },
  'Queso Blanco (large)': { role: 'side', category: 'Sides' },
  'Romaine Lettuce (tacos)': { role: 'topping', category: 'Toppings', vegan: true },
  'Chips (regular)': { role: 'side', category: 'Sides', vegan: true, mayGluten: true },
  'Chips (large)': { role: 'side', category: 'Sides', vegan: true, mayGluten: true },
  'Chipotle-Honey Vinaigrette': { role: 'sauce', category: 'Dressing' },
};
// Printed column order after the portion: Calories, Calories From Fat, Total Fat (g), Saturated Fats (g), Trans Fat (g),
// Cholesterol (mg), Sodium (mg), Carbohydrates (g), Dietary Fiber (g), Sugar (g), Protein (g).
const NUM = String.raw`(<1|\d+(?:\.\d+)?)`;
const LINE = new RegExp(String.raw`^\s{1,4}(\S.*?\S)\s{2,}(\d+(?:\.\d+)?\s?(?:ea|oz|fl oz))\s+` + Array(11).fill(NUM).join(String.raw`\s+`) + String.raw`\s*$`);
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const csv = (v: string) => (/[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);

export function extractChipotle(text: string): { header: string[]; rows: string[][]; code: string | null } {
  // The first "nutrition facts" table (main menu) runs until its first drink row.
  const lines = text.split('\n');
  const start = lines.findIndex(l => /^\s{1,4}Flour Tortilla \(burrito\)\s/.test(l));
  if (start < 0) throw new Error('nutrition table not found');
  const found = new Map<string, string[]>();
  for (let i = start; i < lines.length; i++) {
    const m = LINE.exec(lines[i]);
    if (!m) continue;
    const name = m[1].trim();
    if (!ROWS[name]) break;              // first row that isn't a food component (a drink): end of the food rows
    if (found.has(name)) throw new Error(`"${name}" appears twice in the table`);
    found.set(name, m.slice(2));
  }
  const missing = Object.keys(ROWS).filter(n => !found.has(n));
  if (missing.length) throw new Error('rows missing from the PDF: ' + missing.join(', '));
  const header = ['id', 'role', 'category', 'name', 'serving', 'calories', 'protein_g', 'fat_g', 'carbs_g', 'sodium_mg', 'fiber_g', 'sugar_g', 'contains', 'may_contain', 'ingredients', 'labels', 'extra_for', 'extra_kind', 'notes'];
  const rows: string[][] = [];
  for (const [name, v] of found) {
    const r = ROWS[name];
    const [portion, cal, , fat, , , , sodium, carbs, fiber, sugar, protein] = v;
    const notes = [r.vegan ? 'Vegan and vegetarian per chipotle.com/allergens.' : '', r.note ?? ''].filter(Boolean).join(' ');
    rows.push([slug(name), r.role, r.category, name, portion.replace(/\s+/g, ' '), cal, protein, fat, carbs, sodium, fiber, sugar,
      '', r.mayGluten ? 'gluten' : '', '', r.vegan ? 'vegan;vegetarian' : '', '', '', notes]);
  }
  const code = /\b([A-Z]{3}-\d{4}-US-[A-Z]+)\b/.exec(text)?.[1] ?? null;
  return { header, rows, code };
}

if (process.argv[1] && /extract-chipotle\.ts$/.test(process.argv[1])) {
  const pdf = process.argv[2] ?? 'data/restaurants/chipotle/source/US-Nutrition-Facts-Paper-Menu-3-2025.pdf';
  const x = extractChipotle(execFileSync('pdftotext', ['-layout', pdf, '-'], { encoding: 'utf8' }));
  writeFileSync('data/restaurants/chipotle/components.csv', [x.header, ...x.rows].map(r => r.map(csv).join(',')).join('\n') + '\n');
  console.log(`${x.rows.length} rows; sheet code ${x.code}`);
}
