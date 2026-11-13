// Importer for a restaurant's officially published nutrition and allergen information, stored as a faithful
// hand transcription in data/restaurants/<id>/ (see docs/RESTAURANTS.md):
//   source.json      provenance (official URL, publisher, document date/version, retrieved time in New York time),
//                    the restaurant's verbatim cross-contact statements, official hours (or null) and published presets
//   components.csv   one row per published component (base, protein, topping, sauce, side), values as published
// Nothing is guessed: an empty cell stays unknown (null), "<1" stays unknown, and a file that breaks a rule is refused
// with a message rather than "fixed". Pure functions (no file system, no network) so the build and tests share them.
import type { MenuItem, Nutrition } from '../core/types.ts';
import {
  RESTAURANT_DOMAINS, RESTAURANT_IDS, RESTAURANT_NAMES, ROLES,
  type ComponentRole, type CrossContact, type PlaceHours, type RestaurantComponent, type RestaurantId, type RestaurantMenu, type RestaurantPreset,
} from '../core/restaurant.ts';
import { parseAmount } from './nutrition-import.ts';

export const ALLERGEN_TOKENS = ['milk', 'egg', 'wheat', 'gluten', 'soy', 'sesame', 'fish', 'shellfish', 'peanut', 'tree_nut'] as const;
const TOKEN_ALIASES: Record<string, string> = {
  milk: 'milk', dairy: 'milk', egg: 'egg', eggs: 'egg', wheat: 'wheat', gluten: 'gluten', soy: 'soy', soya: 'soy', soybean: 'soy', soybeans: 'soy',
  sesame: 'sesame', fish: 'fish', shellfish: 'shellfish', 'crustacean shellfish': 'shellfish', crustacean: 'shellfish', crustaceans: 'shellfish',
  peanut: 'peanut', peanuts: 'peanut', 'tree nut': 'tree_nut', 'tree nuts': 'tree_nut', tree_nut: 'tree_nut', tree_nuts: 'tree_nut',
};
const ALL = [...ALLERGEN_TOKENS];
const ROLE_ALIASES: Record<string, ComponentRole> = {
  base: 'base', bases: 'base', protein: 'protein', proteins: 'protein', topping: 'topping', toppings: 'topping', 'mix-in': 'topping', mixin: 'topping',
  sauce: 'sauce', sauces: 'sauce', dressing: 'sauce', dressings: 'sauce', salsa: 'sauce', side: 'side', sides: 'side',
};
const LABEL_TOKENS: Record<string, 'vegan' | 'vegetarian' | 'gluten_free'> = {
  vegan: 'vegan', vegetarian: 'vegetarian', 'gluten free': 'gluten_free', 'gluten-free': 'gluten_free', gluten_free: 'gluten_free',
};
const REQUIRED_COLS = ['id', 'role', 'name', 'contains', 'calories', 'protein_g', 'fat_g', 'carbs_g'];
const KNOWN_COLS = new Set([...REQUIRED_COLS, 'serving', 'may_contain', 'ingredients', 'labels', 'extra_for', 'extra_kind', 'sodium_mg', 'fiber_g', 'sugar_g', 'notes']);

export interface RestaurantImport { menu: RestaurantMenu | null; errors: string[]; warnings: string[] }

/** RFC 4180 CSV: quoted fields may contain commas, quotes ("") and newlines. */
export function parseCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, '');
  const rows: string[][] = []; let row: string[] = []; let cur = ''; let q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; continue; }
    if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.map(r => r.map(s => s.trim())).filter(r => r.some(x => x !== ''));
}

/** Minutes east of UTC for America/New_York at that instant (e.g. -300 in winter, -240 in summer). */
export function nyOffsetMinutes(d: Date): number {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(d).map(x => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(d.getTime() / 1000) * 1000) / 60000);
}
/** "2026-11-13T10:05:00-05:00" with the offset New York actually had at that moment. */
export function validNyTime(s: unknown): boolean {
  if (typeof s !== 'string') return false;
  const m = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?([+-])(\d{2}):(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(s); if (isNaN(d.getTime())) return false;
  const off = (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
  return off === nyOffsetMinutes(d);
}

function tokens(cell: string, what: string, row: string, errors: string[], other?: string[]): string[] | 'all' {
  const out = new Set<string>();
  for (const raw of cell.split(/[;,|]/).map(x => x.trim().toLowerCase().replace(/\s+/g, ' ')).filter(Boolean)) {
    if (raw === 'all') return 'all';
    const t = TOKEN_ALIASES[raw];
    if (t) out.add(t);
    else if (other && /^[a-z][a-z \-]{1,30}$/.test(raw)) other.push(raw);
    else errors.push(`${row}: unknown allergen "${raw}" in ${what} (use ${ALL.join(', ')}${what === 'may_contain' ? ' or all' : ''}).`);
  }
  return [...out];
}

const isHttps = (u: unknown): u is string => { if (typeof u !== 'string') return false; try { return new URL(u).protocol === 'https:'; } catch { return false; } };
const onDomain = (u: string, domain: string) => { const h = new URL(u).hostname.toLowerCase(); return h === domain || h.endsWith('.' + domain); };

function num(cell: string | undefined, label: string, row: string, errors: string[], warnings: string[]): number | null {
  const v = (cell ?? '').trim();
  if (!v) return null;
  if (/^-\s*\d/.test(v)) { errors.push(`${row}: ${label} is negative.`); return null; }
  if (/^</.test(v)) { warnings.push(`${row}: ${label} "${v}" is a range, kept as unknown.`); return null; }
  const n = parseAmount(v.replace(/\s*mg$/i, ''));
  if (n === null) { errors.push(`${row}: ${label} "${v}" is not a number.`); return null; }
  return n;
}

/** Parse and validate one restaurant's files. Returns no menu at all when there is any error. */
export function importRestaurant(sourceJson: string, componentsCsv: string, expect?: RestaurantId): RestaurantImport {
  const errors: string[] = [], warnings: string[] = [];
  let src: Record<string, any>;
  try { src = JSON.parse(sourceJson.replace(/^﻿/, '')); } catch { return { menu: null, errors: ['source.json is not valid JSON.'], warnings }; }
  if (!src || typeof src !== 'object' || Array.isArray(src)) return { menu: null, errors: ['source.json must be an object.'], warnings };

  const id = src.restaurant as RestaurantId;
  if (!RESTAURANT_IDS.includes(id)) return { menu: null, errors: [`source.json "restaurant" must be one of ${RESTAURANT_IDS.join(', ')}.`], warnings };
  if (expect && id !== expect) errors.push(`source.json says "${id}" but it is in the ${expect} folder.`);
  const domain = RESTAURANT_DOMAINS[id];
  if (src.kind !== 'official') errors.push('source.json "kind" must be "official": only the restaurant’s own published information is accepted.');
  if (typeof src.publisher !== 'string' || !src.publisher.trim()) errors.push('source.json needs "publisher" (who published the document).');
  if (!isHttps(src.sourceUrl)) errors.push('source.json needs "sourceUrl", an https link to the official document or page.');
  else if (!onDomain(src.sourceUrl, domain)) errors.push(`source.json "sourceUrl" must be on ${domain} (the restaurant’s own site).`);
  // Both restaurants' terms of use forbid copying their content without written permission (docs/RESTAURANTS.md).
  if (typeof src.permission !== 'string' || src.permission.trim().length < 10) errors.push('source.json needs "permission": who at the restaurant gave written permission to republish this data, and when. Their terms of use forbid copying it otherwise.');
  if (typeof src.documentTitle !== 'string' || !src.documentTitle.trim()) errors.push('source.json needs "documentTitle" (as printed on the document or page).');
  if (src.documentDate !== null && typeof src.documentDate !== 'string') errors.push('source.json "documentDate" must be the date printed on the document, or null when it shows none.');
  if (src.documentDate === null) warnings.push('The document shows no date; it is listed as “date not stated”.');
  if (!validNyTime(src.retrievedAt)) errors.push('source.json "retrievedAt" must be the time you saved it, in New York time with its offset, e.g. "2026-11-13T10:05:00-05:00".');
  if (src.sha256 !== undefined && src.sha256 !== null && !/^[0-9a-f]{64}$/.test(String(src.sha256))) errors.push('source.json "sha256" must be 64 hex characters or null.');

  let hours: PlaceHours | null = null;
  if (src.hours !== null && src.hours !== undefined) {
    if (typeof src.hours?.text === 'string' && isHttps(src.hours?.sourceUrl) && onDomain(src.hours.sourceUrl, domain)) hours = { text: src.hours.text.trim(), sourceUrl: src.hours.sourceUrl };
    else errors.push(`source.json "hours" must be null, or { "text", "sourceUrl" } with an official ${domain} link for this store.`);
  }
  const crossContact: CrossContact[] = [];
  if (src.crossContact !== undefined && !Array.isArray(src.crossContact)) errors.push('source.json "crossContact" must be a list.');
  for (const [i, cc] of (Array.isArray(src.crossContact) ? src.crossContact : []).entries()) {
    if (!cc || typeof cc.text !== 'string' || !cc.text.trim()) { errors.push(`crossContact ${i + 1}: needs the statement "text", copied word for word.`); continue; }
    const list = cc.allergens === 'all' ? 'all' : Array.isArray(cc.allergens) ? tokens(cc.allergens.join(';'), 'crossContact', `crossContact ${i + 1}`, errors) : null;
    if (list === null) { errors.push(`crossContact ${i + 1}: "allergens" must be "all" or a list such as ["milk", "wheat"].`); continue; }
    crossContact.push({ text: cc.text.trim(), allergens: list === 'all' ? [...ALL] : list });
  }

  // ---- components.csv ----
  const rows = parseCsv(componentsCsv);
  if (rows.length < 2) errors.push('components.csv needs a header row and at least one component.');
  const head = (rows[0] ?? []).map(h => h.toLowerCase().replace(/\(.*?\)/g, '').trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
  for (const c of REQUIRED_COLS) if (!head.includes(c)) errors.push(`components.csv is missing the "${c}" column.`);
  for (const c of head) if (c && !KNOWN_COLS.has(c)) warnings.push(`components.csv column "${c}" is not used.`);
  const publisher = typeof src.publisher === 'string' ? src.publisher.trim() : RESTAURANT_NAMES[id];
  const shortPub = RESTAURANT_NAMES[id];
  const docLabel = `${shortPub}’s published nutrition (${typeof src.documentTitle === 'string' ? src.documentTitle.trim() : 'official document'}, ${typeof src.documentDate === 'string' ? src.documentDate : 'date not stated'})`;
  const blanket = new Set(crossContact.flatMap(c => c.allergens));

  interface Raw { line: number; id: string; role: ComponentRole; item: MenuItem; serving: string | null; extraFor: string | null; extraKind: 'added' | 'total' | null }
  const raws: Raw[] = [];
  const ids = new Set<string>();
  if (!errors.some(e => e.startsWith('components.csv is missing'))) {
    for (let r = 1; r < rows.length; r++) {
      const f = Object.fromEntries(head.map((h, i) => [h, rows[r][i] ?? '']));
      const where = `components.csv row ${r + 1}${f.name ? ` (${f.name})` : ''}`;
      const cid = f.id.trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(cid)) { errors.push(`${where}: "id" must be lowercase letters, digits and dashes.`); continue; }
      if (ids.has(cid)) { errors.push(`${where}: id "${cid}" is used twice.`); continue; }
      ids.add(cid);
      const role = ROLE_ALIASES[f.role.trim().toLowerCase()];
      if (!role) { errors.push(`${where}: role "${f.role}" must be one of ${ROLES.join(', ')}.`); continue; }
      if (!f.name.trim()) { errors.push(`${where}: "name" is empty.`); continue; }
      const other: string[] = [];
      const containsCell = f.contains.trim();
      const allergensUnknown = containsCell === '';
      const contains = allergensUnknown || /^none$/i.test(containsCell) ? [] : tokens(containsCell, 'contains', where, errors, other);
      if (contains === 'all') { errors.push(`${where}: "contains" cannot be "all"; list the declared allergens.`); continue; }
      const mc = (f.may_contain ?? '').trim();
      const may = mc === '' || /^none$/i.test(mc) ? [] : tokens(mc, 'may_contain', where, errors);
      const mayList = may === 'all' ? [...ALL] : may;
      const mayAll = [...new Set([...mayList, ...blanket])].filter(a => !contains.includes(a));
      const labels = { vegan: false, vegetarian: false, halal: false, madeWithoutGluten: false };
      for (const l of (f.labels ?? '').split(/[;,|]/).map(x => x.trim().toLowerCase()).filter(Boolean)) {
        const t = LABEL_TOKENS[l];
        if (t === 'vegan') labels.vegan = true; else if (t === 'vegetarian') labels.vegetarian = true; else if (t === 'gluten_free') labels.madeWithoutGluten = true;
        else warnings.push(`${where}: label "${l}" is not used (only vegan, vegetarian, gluten-free).`);
      }
      const nutrition: Nutrition = {
        calories: num(f.calories, 'calories', where, errors, warnings), protein: num(f.protein_g, 'protein', where, errors, warnings),
        fat: num(f.fat_g, 'fat', where, errors, warnings), carbs: num(f.carbs_g, 'carbs', where, errors, warnings),
      };
      if ('sodium_mg' in f) nutrition.sodium = num(f.sodium_mg, 'sodium', where, errors, warnings);
      if ('fiber_g' in f) nutrition.fiber = num(f.fiber_g, 'fiber', where, errors, warnings);
      if ('sugar_g' in f) nutrition.sugar = num(f.sugar_g, 'sugar', where, errors, warnings);
      const any = [nutrition.calories, nutrition.protein, nutrition.fat, nutrition.carbs].some(v => v !== null);
      if (any) { nutrition.source = 'official'; nutrition.sourceLabel = docLabel; }
      const { calories: k, protein: p, fat: fa, carbs: c } = nutrition;
      if (k !== null && k > 2500) errors.push(`${where}: ${k} calories is not plausible for one component; check the transcription.`);
      if (k !== null && p !== null && fa !== null && c !== null) {
        const atw = 4 * p + 4 * c + 9 * fa;
        if (Math.abs(atw - k) > Math.max(40, 0.25 * k)) warnings.push(`${where}: ${k} kcal does not match its protein, fat and carbs (about ${Math.round(atw)} kcal). Kept as published; check the transcription.`);
      }
      const extraFor = (f.extra_for ?? '').trim().toLowerCase() || null;
      const ek = (f.extra_kind ?? '').trim().toLowerCase();
      if (extraFor && ek !== 'added' && ek !== 'total') { errors.push(`${where}: "extra_kind" must be "added" (values of the extra amount) or "total" (values of the whole double serving).`); continue; }
      if (!extraFor && ek) warnings.push(`${where}: "extra_kind" is ignored without "extra_for".`);
      const item: MenuItem = {
        id: `${id}:${cid}`, name: f.name.trim(), ingredients: (f.ingredients ?? '').trim() || null,
        allergens: contains, labels, nutrition, warnings: [], publisher: shortPub, mayContain: mayAll,
        ...(allergensUnknown ? { allergensUnknown: true } : {}), ...(other.length ? { otherAllergens: other } : {}),
      };
      if (allergensUnknown) item.warnings.push(`${shortPub} publishes no allergen information for this item, so every allergen check treats it as unknown.`);
      if ((f.notes ?? '').trim()) item.warnings.push((f.notes ?? '').trim());
      raws.push({ line: r + 1, id: cid, role, item, serving: (f.serving ?? '').trim() || null, extraFor, extraKind: extraFor ? (ek as 'added' | 'total') : null });
    }
  }
  const components: RestaurantComponent[] = [];
  for (const x of raws) if (!x.extraFor) components.push({ item: x.item, role: x.role, serving: x.serving, extra: null });
  for (const x of raws) if (x.extraFor) {
    const parent = components.find(c => c.item.id === `${id}:${x.extraFor}`);
    if (!parent) { errors.push(`components.csv row ${x.line}: "extra_for" names "${x.extraFor}", which is not a component.`); continue; }
    if (parent.extra) { errors.push(`components.csv row ${x.line}: "${x.extraFor}" already has an extra serving.`); continue; }
    if (x.role !== parent.role) { errors.push(`components.csv row ${x.line}: an extra serving must have the same role as "${x.extraFor}".`); continue; }
    // The extra serving is the same food: if its row has no allergen cells of its own, the parent's declarations apply.
    const it = x.item;
    if (it.allergensUnknown && !parent.item.allergensUnknown) { it.allergens = [...parent.item.allergens]; delete it.allergensUnknown; it.warnings = it.warnings.filter(w => !/publishes no allergen/.test(w)); }
    it.mayContain = [...new Set([...(it.mayContain ?? []), ...(parent.item.mayContain ?? [])])].filter(a => !it.allergens.includes(a));
    it.ingredients = it.ingredients ?? parent.item.ingredients;
    parent.extra = { item: it, kind: x.extraKind!, serving: x.serving };
  }
  const names = new Map<string, number>();
  for (const c of components) names.set(c.item.name.toLowerCase(), (names.get(c.item.name.toLowerCase()) ?? 0) + 1);
  for (const [n, k] of names) if (k > 1) warnings.push(`components.csv: "${n}" appears ${k} times; check that each row is a different published component.`);
  if (!components.some(c => c.role === 'base')) warnings.push('No component has role "base", so no bowl can be built.');

  const presets: RestaurantPreset[] = [];
  if (src.presets !== undefined && !Array.isArray(src.presets)) errors.push('source.json "presets" must be a list.');
  for (const [i, ps] of (Array.isArray(src.presets) ? src.presets : []).entries()) {
    if (!ps || typeof ps.name !== 'string' || !Array.isArray(ps.components) || !ps.components.length) { errors.push(`presets ${i + 1}: needs "name" and a "components" list of component ids.`); continue; }
    const missing = ps.components.filter((c: unknown) => !components.some(x => x.item.id === `${id}:${String(c).toLowerCase()}`));
    if (missing.length) { errors.push(`presets ${i + 1} (${ps.name}): unknown component ids ${missing.join(', ')}. A preset may only use published components.`); continue; }
    let nutrition: RestaurantPreset['nutrition'] = null;
    if (ps.nutrition) {
      const g = (k: string) => { const v = ps.nutrition[k]; return v === null || v === undefined || v === '' ? null : typeof v === 'number' && v >= 0 ? v : (errors.push(`presets ${i + 1}: nutrition "${k}" must be a number or null.`), null); };
      nutrition = { calories: g('calories'), protein: g('protein'), fat: g('fat'), carbs: g('carbs') };
    }
    presets.push({ id: `${id}:preset-${i + 1}`, name: ps.name.trim(), componentIds: ps.components.map((c: unknown) => `${id}:${String(c).toLowerCase()}`), nutrition });
  }
  if (errors.length) return { menu: null, errors, warnings };
  const menu: RestaurantMenu = {
    id, name: RESTAURANT_NAMES[id],
    provenance: { kind: 'official', publisher, sourceUrl: src.sourceUrl, documentTitle: src.documentTitle.trim(), documentDate: src.documentDate ?? null,
      documentVersion: typeof src.documentVersion === 'string' ? src.documentVersion : null, retrievedAt: src.retrievedAt, sha256: src.sha256 ?? null, permission: src.permission.trim() },
    components, presets, crossContact, hours, notes: warnings.slice(),
  };
  return { menu, errors, warnings };
}
