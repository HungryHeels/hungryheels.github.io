import type { HallId, MenuDay, MenuItem } from './types.ts';

export interface SnapshotEntry { hall: HallId; name: string; calories: number | null; protein: number | null }
export interface SnapshotMeta { source: string; kind: 'third_party'; asOf: string }

export function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[™®©]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
}

export interface BorrowResult { borrowed: number; ambiguous: number; rejected: number }

/** Borrow calories/protein ONLY when hall matches, normalized name matches exactly, and every entry with that name agrees. */
export function borrowNutrition(day: MenuDay, entries: SnapshotEntry[], meta: SnapshotMeta): BorrowResult {
  const by = new Map<string, SnapshotEntry[]>();
  for (const e of entries) {
    if (e.hall !== day.hall) continue;
    const k = normalizeName(e.name);
    (by.get(k) ?? by.set(k, []).get(k)!).push(e);
  }
  let borrowed = 0, ambiguous = 0, rejected = 0;
  for (const it of Object.values(day.items)) {
    if (it.nutrition.calories !== null && it.nutrition.protein !== null) continue;
    const list = by.get(normalizeName(it.name));
    if (!list) continue;
    const first = list[0];
    if (!list.every(e => e.calories === first.calories && e.protein === first.protein)) { ambiguous++; continue; }
    const bad = implausible(first);
    if (bad) {
      it.warnings.push(`Eat UNC listed ${first.calories ?? '?'} kcal and ${first.protein ?? '?'} g protein for this name, which is not plausible for one serving (${bad}). Those values were ignored, so nutrition is unknown.`);
      rejected++;
      continue;
    }
    let did = false;
    if (it.nutrition.calories === null && first.calories !== null) { it.nutrition.calories = first.calories; did = true; }
    if (it.nutrition.protein === null && first.protein !== null) { it.nutrition.protein = first.protein; did = true; }
    if (did) {
      it.nutrition.borrowed = true;
      it.nutrition.source = 'third_party';
      it.nutrition.sourceLabel = `${meta.source} (third party)`;
      it.warnings.push(`Calories and protein were borrowed from ${meta.source} (${meta.asOf}); check UNC's item panel if it matters.`);
      borrowed++;
    }
  }
  return { borrowed, ambiguous, rejected };
}

/** Common-sense limits for ONE dining-hall serving. Values outside them are ignored, never corrected. */
export function implausible(e: { name: string; calories: number | null; protein: number | null; fat?: number | null; carbs?: number | null }): string | null {
  const c = e.calories, p = e.protein, f = e.fat ?? null, cb = e.carbs ?? null;
  if (/\bcatering\b/i.test(e.name)) return 'it is a bulk catering item';
  if (c !== null && c > 1500) return 'over 1,500 kcal';
  if (p !== null && p > 100) return 'over 100 g protein';
  if (c !== null && p !== null && p * 4 > c + 10) return 'the protein alone has more calories than the total';
  if (c !== null && c < 0) return 'negative calories';
  if ([p, f, cb].some(v => v !== null && v < 0)) return 'a negative value';
  if (f !== null && f > 150) return 'over 150 g fat';
  if (cb !== null && cb > 300) return 'over 300 g carbs';
  if (c !== null && p !== null && f !== null && cb !== null && p * 4 + f * 9 + cb * 4 > c * 1.3 + 30) return 'protein, fat and carbs add up to far more calories than the total';
  return null;
}

/** Parse a hand-transcribed list: one item per line, fields split by tab or pipe: hall, name, calories, protein. */
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
