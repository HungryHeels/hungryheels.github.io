import type { HallId, MenuDay } from '../core/types.ts';
import { normalizeName } from '../core/borrow.ts';

// Importer for an official nutrition export (CSV) from Carolina Dining Services.
// Columns (header row required, any order, case-insensitive): hall, name, calories, protein, fat, carbs, recipe_id (optional).
export interface OfficialRow { hall: HallId | null; name: string; recipeId: string | null; calories: number | null; protein: number | null; fat: number | null; carbs: number | null }

function splitCsv(line: string): string[] {
  const out: string[] = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

export function parseOfficialCsv(text: string): { rows: OfficialRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const errors: string[] = [];
  if (!lines.length) return { rows: [], errors: ['The file is empty.'] };
  const head = splitCsv(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const idx = (n: string) => head.indexOf(n);
  if (idx('name') < 0) return { rows: [], errors: ['The header row needs a "name" column.'] };
  const num = (s: string | undefined) => (s === undefined || s === '' || !isFinite(Number(s)) ? null : Number(s));
  const rows: OfficialRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const f = splitCsv(lines[i]);
    const h = idx('hall') >= 0 ? f[idx('hall')] : '';
    const hall: HallId | null = /lenoir/i.test(h) ? 'top-of-lenoir' : /chase/i.test(h) ? 'chase' : null;
    rows.push({ hall, name: f[idx('name')] ?? '', recipeId: idx('recipe_id') >= 0 ? f[idx('recipe_id')] || null : null,
      calories: num(f[idx('calories')]), protein: num(f[idx('protein')]), fat: num(f[idx('fat')]), carbs: num(f[idx('carbs')]) });
  }
  return { rows, errors };
}

/** Apply official rows by recipe id, else by exact normalized name (same hall when given). Disagreeing duplicates are skipped. */
export function applyOfficial(day: MenuDay, rows: OfficialRow[], sourceLabel: string): number {
  const byId = new Map<string, OfficialRow>();
  const byName = new Map<string, OfficialRow[]>();
  for (const r of rows) {
    if (r.hall && r.hall !== day.hall) continue;
    if (r.recipeId) byId.set(r.recipeId, r);
    const k = normalizeName(r.name);
    (byName.get(k) ?? byName.set(k, []).get(k)!).push(r);
  }
  let n = 0;
  for (const it of Object.values(day.items)) {
    let r = byId.get(it.id);
    if (!r) {
      const l = byName.get(normalizeName(it.name));
      if (l && l.every(x => x.calories === l[0].calories && x.protein === l[0].protein && x.fat === l[0].fat && x.carbs === l[0].carbs)) r = l[0];
    }
    if (!r) continue;
    it.nutrition = { calories: r.calories, protein: r.protein, fat: r.fat, carbs: r.carbs };
    it.warnings = it.warnings.filter(w => !w.includes('borrowed'));
    it.warnings.push(`Nutrition from ${sourceLabel}.`);
    n++;
  }
  if (n) day.provenance = { ...day.provenance, verification: 'official_export' };
  return n;
}
