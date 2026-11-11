// Menu refresh pipeline: what changed between two saves of the same day, which saved days are stale,
// and which of the next N days still need a saved page. Pure functions; nothing here fetches anything.
import type { HallId, MenuDay, MenuItem } from './types.ts';
import { HALL_NAMES } from './types.ts';
import { addDays, dateRange, nyNow, TZ } from './schedule.ts';

export const HALLS: HallId[] = ['chase', 'top-of-lenoir'];
/** A saved page this many days old (or older) is flagged as stale for dates that have not happened yet. */
export const STALE_DAYS = 7;

export interface ItemChange { name: string; what: string[] }
export interface DayDiff {
  same: boolean;
  added: string[];                // item names new in the newer save
  removed: string[];              // item names gone from the newer save
  changed: ItemChange[];          // same recipe id, different ingredients / allergens / labels / name
  periodsAdded: string[];
  periodsRemoved: string[];
  hoursChanged: Array<{ period: string; from: string | null; to: string | null }>;
  menuStatus: null | 'now_posted' | 'now_empty';
  summary: string;
}

function itemNames(d: MenuDay): Map<string, MenuItem> { return new Map(Object.entries(d.items)); }
const sameArr = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** Compare an earlier save of a day with a newer one (same hall and date). */
export function diffDays(before: MenuDay, after: MenuDay): DayDiff {
  const a = itemNames(before), b = itemNames(after);
  const added: string[] = [], removed: string[] = [], changed: ItemChange[] = [];
  for (const [id, it] of b) if (!a.has(id)) added.push(it.name);
  for (const [id, it] of a) if (!b.has(id)) removed.push(it.name);
  for (const [id, old] of a) {
    const nu = b.get(id); if (!nu) continue;
    const what: string[] = [];
    if (old.name !== nu.name) what.push(`renamed from "${old.name}"`);
    if ((old.ingredients ?? '') !== (nu.ingredients ?? '')) what.push(nu.ingredients ? (old.ingredients ? 'ingredients changed' : 'ingredients now published') : 'ingredients no longer published');
    if (!sameArr(old.allergens, nu.allergens)) {
      const plus = nu.allergens.filter(x => !old.allergens.includes(x)), minus = old.allergens.filter(x => !nu.allergens.includes(x));
      what.push(['allergens', plus.length ? `+${plus.join(', ').replace(/_/g, ' ')}` : '', minus.length ? `−${minus.join(', ').replace(/_/g, ' ')}` : ''].filter(Boolean).join(' '));
    }
    const lab = (x: MenuItem) => Object.entries(x.labels).filter(([, v]) => v).map(([k]) => k).sort().join(',');
    if (lab(old) !== lab(nu)) what.push('diet labels changed');
    if (what.length) changed.push({ name: nu.name, what });
  }
  const pa = new Map(before.periods.map(p => [p.name, p])), pb = new Map(after.periods.map(p => [p.name, p]));
  const periodsAdded = [...pb.keys()].filter(k => !pa.has(k));
  const periodsRemoved = [...pa.keys()].filter(k => !pb.has(k));
  const hoursChanged = [...pb.values()].filter(p => pa.has(p.name) && pa.get(p.name)!.hours !== p.hours).map(p => ({ period: p.name, from: pa.get(p.name)!.hours, to: p.hours }));
  const menuStatus = before.noMenuPosted && !after.noMenuPosted ? 'now_posted' : !before.noMenuPosted && after.noMenuPosted ? 'now_empty' : null;
  const same = !added.length && !removed.length && !changed.length && !periodsAdded.length && !periodsRemoved.length && !hoursChanged.length && !menuStatus;
  const bits: string[] = [];
  if (menuStatus === 'now_posted') bits.push('a menu is now posted');
  if (menuStatus === 'now_empty') bits.push('the newer save has no menu posted');
  if (added.length) bits.push(`${plural(added.length, 'new item')}`);
  if (removed.length) bits.push(`${plural(removed.length, 'item')} gone`);
  if (changed.length) bits.push(`${plural(changed.length, 'item')} changed`);
  if (periodsAdded.length) bits.push(`new period: ${periodsAdded.join(', ')}`);
  if (periodsRemoved.length) bits.push(`period gone: ${periodsRemoved.join(', ')}`);
  if (hoursChanged.length) bits.push(`hours changed: ${hoursChanged.map(h => `${h.period} ${h.from ?? 'unknown'} → ${h.to ?? 'unknown'}`).join('; ')}`);
  return { same, added, removed, changed, periodsAdded, periodsRemoved, hoursChanged, menuStatus, summary: same ? 'No changes since the earlier save.' : 'Changed since the earlier save: ' + bits.join(', ') + '.' };
}

/** New York calendar date of an ISO time. */
export function nyDateOf(iso: string): string { return nyNow(new Date(iso)).date; }
function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number), [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export interface Staleness { ageDays: number | null; stale: boolean; text: string }
/** How old is the save of this day, and does that matter? Only days today or later can be stale; past days are history. */
export function staleness(day: MenuDay, today: string = nyNow().date): Staleness {
  const iso = day.provenance.retrievedAt;
  if (!iso) return { ageDays: null, stale: day.date >= today, text: 'Menu page saved at an unknown time, so it may have changed' };
  const age = Math.max(0, daysBetween(nyDateOf(iso), today));
  const when = age === 0 ? 'today' : age === 1 ? 'yesterday' : `${age} days ago`;
  const stale = day.date >= today && age >= STALE_DAYS;
  return { ageDays: age, stale, text: stale ? `Menu page saved ${when}; menus can change, so re-save this day if it matters` : `Menu page saved ${when}` };
}

export type ChecklistStatus = 'ok' | 'stale' | 'no_menu' | 'missing';
export interface ChecklistRow { date: string; hall: HallId; status: ChecklistStatus; text: string }
/** "What's missing for the next N days": one row per hall per date, starting today (America/New_York). */
export function refreshChecklist(days: MenuDay[], today: string = nyNow().date, n = 14): ChecklistRow[] {
  const by = new Map(days.map(d => [`${d.hall}:${d.date}`, d]));
  const rows: ChecklistRow[] = [];
  for (const date of dateRange(today, addDays(today, n - 1))) for (const hall of HALLS) {
    const d = by.get(`${hall}:${date}`);
    if (!d) { rows.push({ date, hall, status: 'missing', text: `No saved page for ${HALL_NAMES[hall]}` }); continue; }
    if (d.noMenuPosted) { rows.push({ date, hall, status: 'no_menu', text: 'No menu was posted when it was saved; re-save later in case one appears' }); continue; }
    const st = staleness(d, today);
    rows.push({ date, hall, status: st.stale ? 'stale' : 'ok', text: st.text });
  }
  return rows;
}
export function checklistCounts(rows: ChecklistRow[]): Record<ChecklistStatus, number> {
  const c = { ok: 0, stale: 0, no_menu: 0, missing: 0 };
  for (const r of rows) c[r.status]++;
  return c;
}

/** Several files in one batch can be the same hall and date (a re-save). Keep the most recently saved one. */
export function dedupeBatch<T extends { day: MenuDay }>(entries: T[]): { keep: T[]; dropped: Array<{ entry: T; keptInstead: T }> } {
  const best = new Map<string, T>();
  const dropped: Array<{ entry: T; keptInstead: T }> = [];
  const t = (x: T) => (x.day.provenance.retrievedAt ? Date.parse(x.day.provenance.retrievedAt) : -Infinity);
  for (const e of entries) {
    const k = `${e.day.hall}:${e.day.date}`;
    const cur = best.get(k);
    if (!cur) { best.set(k, e); continue; }
    if (t(e) > t(cur)) { dropped.push({ entry: cur, keptInstead: e }); best.set(k, e); } else dropped.push({ entry: e, keptInstead: cur });
  }
  return { keep: [...best.values()], dropped };
}

/** File names that a folder drop may contain; anything else is skipped and counted. */
export function isMenuFile(name: string): boolean { return /\.(webarchive|html?)$/i.test(name) && !/^\._/.test(name.split('/').pop() ?? name); }

export { TZ };
