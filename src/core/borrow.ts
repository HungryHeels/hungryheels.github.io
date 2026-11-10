import type { HallId, MenuDay, MenuItem } from './types.ts';

export interface SnapshotEntry { hall: HallId; name: string; calories: number | null; protein: number | null }
export interface SnapshotMeta { source: string; kind: 'third_party'; asOf: string }

export function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[™®©]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
}

export interface BorrowResult { borrowed: number; ambiguous: number }

/** Borrow calories/protein ONLY when hall matches, normalized name matches exactly, and every entry with that name agrees. */
export function borrowNutrition(day: MenuDay, entries: SnapshotEntry[], meta: SnapshotMeta): BorrowResult {
  const by = new Map<string, SnapshotEntry[]>();
  for (const e of entries) {
    if (e.hall !== day.hall) continue;
    const k = normalizeName(e.name);
    (by.get(k) ?? by.set(k, []).get(k)!).push(e);
  }
  let borrowed = 0, ambiguous = 0;
  for (const it of Object.values(day.items)) {
    if (it.nutrition.calories !== null && it.nutrition.protein !== null) continue;
    const list = by.get(normalizeName(it.name));
    if (!list) continue;
    const first = list[0];
    if (!list.every(e => e.calories === first.calories && e.protein === first.protein)) { ambiguous++; continue; }
    let did = false;
    if (it.nutrition.calories === null && first.calories !== null) { it.nutrition.calories = first.calories; did = true; }
    if (it.nutrition.protein === null && first.protein !== null) { it.nutrition.protein = first.protein; did = true; }
    if (did) {
      it.nutrition.borrowed = true;
      it.warnings.push(`Calories and protein were borrowed from ${meta.source} (${meta.asOf}); check UNC's item panel if it matters.`);
      borrowed++;
    }
  }
  return { borrowed, ambiguous };
}

/** Parse a hand-transcribed list: one item per line, fields split by tab, pipe or comma: hall, name, calories, protein. */
export function parseSnapshotText(text: string): SnapshotEntry[] {
  const out: SnapshotEntry[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const f = line.split(/\t|\|/).map(s => s.trim());
    if (f.length < 4) continue;
    const hall: HallId | null = /lenoir/i.test(f[0]) ? 'top-of-lenoir' : /chase/i.test(f[0]) ? 'chase' : null;
    if (!hall) continue;
    const num = (s: string) => (s === '' || !isFinite(Number(s)) ? null : Number(s));
    out.push({ hall, name: f[1], calories: num(f[2]), protein: num(f[3]) });
  }
  return out;
}
export type { MenuItem };
