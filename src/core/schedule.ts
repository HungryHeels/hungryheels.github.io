import type { MenuDay, Period } from './types.ts';

export const TZ = 'America/New_York';
export interface NYNow { date: string; minutes: number }

export function nyNow(d: Date = new Date()): NYNow {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const g = (t: string) => parts.find(p => p.type === t)!.value;
  return { date: `${g('year')}-${g('month')}-${g('day')}`, minutes: parseInt(g('hour'), 10) * 60 + parseInt(g('minute'), 10) };
}

export type ServingState =
  | { state: 'serving'; period: Period }
  | { state: 'next'; period: Period }
  | { state: 'closed' }              // all published periods are over today
  | { state: 'unverified'; period: Period | null; why: string }
  | { state: 'not_today' };

/** What is being served at `now`? Periods without published hours are reported as unverified, never guessed. */
export function servingNow(day: MenuDay, now: NYNow = nyNow()): ServingState {
  if (day.date !== now.date) return { state: 'not_today' };
  const noHours = day.periods.filter(p => p.startMin === null || p.endMin === null);
  let next: Period | null = null;
  for (const p of day.periods) {
    if (p.startMin === null || p.endMin === null) continue;
    if (now.minutes >= p.startMin && now.minutes < p.endMin) return { state: 'serving', period: p };
    if (p.startMin > now.minutes && (!next || p.startMin < next.startMin!)) next = p;
  }
  if (noHours.length) return { state: 'unverified', period: noHours[0], why: `${noHours[0].name} has no published hours, so we cannot tell if it is being served.` };
  if (next) return { state: 'next', period: next };
  return { state: 'closed' };
}

/** Period pill to preselect. */
export function defaultPeriod(day: MenuDay, now: NYNow = nyNow()): string | null {
  if (!day.periods.length) return null;
  const s = servingNow(day, now);
  if ((s.state === 'serving' || s.state === 'next') ) return s.period.name;
  if (s.state === 'unverified' && s.period) return s.period.name;
  const dinner = day.periods.find(p => p.name === 'Dinner');
  return (dinner ?? day.periods[0]).name;
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
export function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}
export function formatSaved(iso: string | null): string {
  if (!iso) return 'unknown time';
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) + ' ET';
}
