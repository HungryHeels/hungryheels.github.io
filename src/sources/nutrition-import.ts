import type { HallId, MenuDay, MenuItem, Nutrition } from '../core/types.ts';
import { implausible, normalizeName } from '../core/borrow.ts';

// Nutrition from sources other than the saved page, applied in layers on top of what the page (plus the
// Eat UNC borrow) gave us. Highest wins: official export > entered by you > Eat UNC (third party).
// Nothing is ever estimated: a value is either copied from one of these sources or stays null ("unknown").

export interface OfficialRow { hall: HallId | null; name: string; recipeId: string | null; calories: number | null; protein: number | null; fat: number | null; carbs: number | null }

function splitCsv(line: string, sep: string): string[] {
  const out: string[] = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === sep) { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

// Accepted column names (lowercased, spaces/punctuation -> "_", units in brackets dropped).
const COLS: Record<keyof Omit<OfficialRow, 'hall'> | 'hall', string[]> = {
  name: ['name', 'item', 'item_name', 'recipe_name', 'menu_item', 'food', 'description'],
  recipeId: ['recipe_id', 'recipeid', 'recipe', 'id', 'recipe_number', 'item_id'],
  hall: ['hall', 'location', 'dining_hall', 'unit'],
  calories: ['calories', 'kcal', 'energy', 'calories_kcal', 'cal'],
  protein: ['protein', 'protein_g', 'proteins'],
  fat: ['fat', 'total_fat', 'fat_g', 'total_fat_g'],
  carbs: ['carbs', 'carbohydrates', 'carbohydrate', 'total_carbohydrate', 'total_carbohydrates', 'carbs_g', 'total_carbohydrate_g', 'carb'],
};
const headKey = (h: string) => h.toLowerCase().replace(/\(.*?\)|\[.*?\]/g, '').trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

/** "12", "12g", "12 g", "1,200 kcal" -> number. "", "-", "NA", "<1"? -> null (we never guess what "<1" means). */
export function parseAmount(v: unknown): number | null {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const s = v.trim().replace(/,/g, '');
  const m = /^(\d+(?:\.\d+)?)\s*(?:g|kcal|cal|grams?)?$/i.exec(s);
  return m ? Number(m[1]) : null;
}
const hallOf = (h: unknown): HallId | null => (typeof h !== 'string' ? null : /lenoir/i.test(h) ? 'top-of-lenoir' : /chase/i.test(h) ? 'chase' : null);

export interface ParsedNutrition { rows: OfficialRow[]; errors: string[]; skipped: string[] }

/** Parse an official export: CSV (comma, semicolon or tab separated, header row required) or JSON
 *  (an array of objects, or { items: [...] }). Rows with implausible values are skipped, never corrected. */
export function parseOfficial(text: string): ParsedNutrition {
  const t = text.replace(/^﻿/, '').trim();
  if (!t) return { rows: [], errors: ['The file is empty.'], skipped: [] };
  let records: Array<Record<string, unknown>>;
  if (t[0] === '[' || t[0] === '{') {
    let j: unknown;
    try { j = JSON.parse(t); } catch { return { rows: [], errors: ['The file looks like JSON but could not be read.'], skipped: [] }; }
    const arr = Array.isArray(j) ? j : (j && typeof j === 'object' && Array.isArray((j as any).items)) ? (j as any).items : null;
    if (!arr) return { rows: [], errors: ['The JSON needs to be a list of items (or an object with an "items" list).'], skipped: [] };
    records = arr.filter((x: unknown) => x && typeof x === 'object').map((x: Record<string, unknown>) => Object.fromEntries(Object.entries(x).map(([k, v]) => [headKey(k), v])));
  } else {
    const lines = t.split(/\r?\n/).filter(l => l.trim());
    const first = lines[0];
    const sep = (first.match(/\t/g)?.length ?? 0) > 0 ? '\t' : (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ';' : ',';
    const head = splitCsv(first, sep).map(headKey);
    records = lines.slice(1).map(l => { const f = splitCsv(l, sep); return Object.fromEntries(head.map((h, i) => [h, f[i] ?? ''])); });
  }
  const pick = (r: Record<string, unknown>, k: keyof typeof COLS) => { for (const c of COLS[k]) if (c in r) return r[c]; return undefined; };
  if (!records.length) return { rows: [], errors: ['No rows found under the header.'], skipped: [] };
  if (pick(records[0], 'name') === undefined && pick(records[0], 'recipeId') === undefined) return { rows: [], errors: ['The file needs a "name" column (or "recipe_id").'], skipped: [] };
  const rows: OfficialRow[] = [], skipped: string[] = [];
  for (const r of records) {
    const name = String(pick(r, 'name') ?? '').trim();
    const rid = pick(r, 'recipeId');
    const row: OfficialRow = { hall: hallOf(pick(r, 'hall')), name, recipeId: rid === undefined || rid === null || String(rid).trim() === '' ? null : String(rid).trim(),
      calories: parseAmount(pick(r, 'calories')), protein: parseAmount(pick(r, 'protein')), fat: parseAmount(pick(r, 'fat')), carbs: parseAmount(pick(r, 'carbs')) };
    if (!row.name && !row.recipeId) continue;
    const bad = implausible(row);
    if (bad) { skipped.push(`${row.name || row.recipeId}: ${bad}`); continue; }
    rows.push(row);
  }
  return { rows, errors: rows.length ? [] : ['No usable rows were found.'], skipped };
}
/** Back-compat name. */
export const parseOfficialCsv = parseOfficial;

// ---------- layering ----------
interface Base { nutrition: Nutrition; warnings: string[] }
const BASE = new WeakMap<MenuItem, Base>();
/** Remember the page (+ Eat UNC) nutrition of an item once, so layers can be re-applied or removed cleanly. */
function base(it: MenuItem): Base {
  let b = BASE.get(it);
  if (!b) { b = { nutrition: { ...it.nutrition }, warnings: [...it.warnings] }; BASE.set(it, b); }
  return b;
}
function reset(it: MenuItem) { const b = base(it); it.nutrition = { ...b.nutrition }; it.warnings = [...b.warnings]; }

/** Match rows to a day's items: recipe id first, then exact normalized name (same hall when the row names one).
 *  Duplicate names with disagreeing values are skipped (stay unknown). */
export function matchRows(day: MenuDay, rows: OfficialRow[]): Map<string, OfficialRow> {
  const byId = new Map<string, OfficialRow>();
  const byName = new Map<string, OfficialRow[]>();
  for (const r of rows) {
    if (r.hall && r.hall !== day.hall) continue;
    if (r.recipeId) byId.set(r.recipeId, r);
    if (r.name) { const k = normalizeName(r.name); (byName.get(k) ?? byName.set(k, []).get(k)!).push(r); }
  }
  const out = new Map<string, OfficialRow>();
  for (const it of Object.values(day.items)) {
    let r = byId.get(it.id);
    if (!r) {
      const l = byName.get(normalizeName(it.name));
      if (l && l.every(x => x.calories === l[0].calories && x.protein === l[0].protein && x.fat === l[0].fat && x.carbs === l[0].carbs)) r = l[0];
    }
    if (r) out.set(it.id, r);
  }
  return out;
}

export interface ManualEntry { hall: HallId; recipeId: string; name: string; calories: number | null; protein: number | null; fat: number | null; carbs: number | null; enteredAt: string }
export interface NutritionLayers { official: { rows: OfficialRow[]; label: string } | null; manual: ManualEntry[] }

/** Validate a manual entry. Returns an error message, or null when it can be saved. */
export function checkManual(e: Pick<ManualEntry, 'name' | 'calories' | 'protein' | 'fat' | 'carbs'>): string | null {
  if ([e.calories, e.protein, e.fat, e.carbs].every(v => v === null)) return 'Enter at least one value, or remove the entry.';
  const bad = implausible(e);
  return bad ? `These values don't look like one serving (${bad}). Check UNC's item panel and try again.` : null;
}

/** Re-apply all nutrition layers to the given days (idempotent). Returns how many items each layer filled. */
export function applyNutritionLayers(days: MenuDay[], layers: NutritionLayers): { official: number; manual: number } {
  let official = 0, manual = 0;
  const man = new Map(layers.manual.map(m => [`${m.hall}:${m.recipeId}`, m]));
  for (const d of days) {
    const off = layers.official ? matchRows(d, layers.official.rows) : new Map<string, OfficialRow>();
    for (const it of Object.values(d.items)) {
      reset(it);
      const m = man.get(`${d.hall}:${it.id}`);
      if (m) {
        it.nutrition = { calories: m.calories, protein: m.protein, fat: m.fat, carbs: m.carbs, source: 'user', sourceLabel: 'entered by you from UNC’s item panel' };
        it.warnings = it.warnings.filter(w => !/borrowed from/.test(w));
        it.warnings.push(`Nutrition entered by you (${m.enteredAt.slice(0, 10)}). It is stored only in this browser.`);
        manual++;
      }
      const r = off.get(it.id);
      if (r && layers.official) {
        it.nutrition = { calories: r.calories, protein: r.protein, fat: r.fat, carbs: r.carbs, source: 'official', sourceLabel: layers.official.label };
        it.warnings = it.warnings.filter(w => !/borrowed from|entered by you/.test(w));
        it.warnings.push(`Nutrition from ${layers.official.label}.`);
        official++;
      }
    }
  }
  return { official, manual };
}

/** Old single-layer entry point, kept for scripts: apply official rows to one day. */
export function applyOfficial(day: MenuDay, rows: OfficialRow[], sourceLabel: string): number {
  return applyNutritionLayers([day], { official: { rows, label: sourceLabel }, manual: [] }).official;
}

export type NutritionBadge = { text: string; kind: 'ok' | 'warn' | 'info' };
/** Per-item source badge text. */
export function nutritionBadge(n: Nutrition): NutritionBadge {
  if (n.source === 'official') return { text: 'Official', kind: 'ok' };
  if (n.source === 'user') return { text: 'Entered by you', kind: 'info' };
  if (n.source === 'third_party' || n.borrowed) return { text: 'Eat UNC (3rd party)', kind: 'warn' };
  return { text: 'Not published', kind: 'info' };
}
