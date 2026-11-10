import type { HallId, MenuDay } from './types.ts';
import { dateRange } from './schedule.ts';

export type Coverage = 'imported' | 'no_menu' | 'missing';
export interface HallCoverage { hall: HallId; days: Array<{ date: string; status: Coverage; itemCount: number; periodCount: number }> ; imported: number; noMenu: number; missing: number }

export function computeMissing(days: MenuDay[], hall: HallId, from: string, to: string): HallCoverage {
  const by = new Map(days.filter(d => d.hall === hall).map(d => [d.date, d]));
  const rows = dateRange(from, to).map(date => {
    const d = by.get(date);
    const status: Coverage = !d ? 'missing' : d.noMenuPosted ? 'no_menu' : 'imported';
    return { date, status, itemCount: d ? Object.keys(d.items).length : 0, periodCount: d ? d.periods.length : 0 };
  });
  return { hall, days: rows, imported: rows.filter(r => r.status === 'imported').length, noMenu: rows.filter(r => r.status === 'no_menu').length, missing: rows.filter(r => r.status === 'missing').length };
}

export interface DayProblem { level: 'warn' | 'error'; text: string }
export function validateDay(d: MenuDay): DayProblem[] {
  const out: DayProblem[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) out.push({ level: 'error', text: 'Date is not valid.' });
  if (d.noMenuPosted) return out;
  const ids = new Set(Object.keys(d.items));
  for (const p of d.periods) {
    if (p.startMin === null) out.push({ level: 'warn', text: `${p.name} has no published hours; serving time is unverified.` });
    for (const s of p.stations) for (const id of s.itemIds) if (!ids.has(id)) out.push({ level: 'error', text: `Item ${id} in ${p.name} / ${s.name} is missing.` });
  }
  const noIng = Object.values(d.items).filter(i => !i.ingredients).length;
  if (noIng) out.push({ level: 'warn', text: `${noIng} item(s) have no ingredient text and are treated as unknown.` });
  return out;
}
