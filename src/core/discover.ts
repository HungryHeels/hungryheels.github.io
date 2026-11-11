// Discovery helpers: what is serving now (including late periods that run past midnight), countdowns,
// comparing halls for the same meal, variety from the student's own history, and a plate as plain text.
import type { HallId, MenuDay, Period } from './types.ts';
import { HALL_NAMES } from './types.ts';
import { addDays, formatDate, type NYNow } from './schedule.ts';
import { buildMeals, type BuildResult, type Meal } from './meals.ts';
import type { Profile } from './profile.ts';
import { totalText, gapReadout } from './plan.ts';

export type LiveState =
  | { state: 'serving'; period: Period; date: string; minutesLeft: number }
  | { state: 'next'; period: Period; date: string; minutesUntil: number }
  | { state: 'closed' }
  | { state: 'unverified'; period: Period | null; why: string }
  | { state: 'no_menu' };

/** Serving state for a hall at `now`, looking at today's page and yesterday's (a "9pm-1am" period runs past midnight).
 *  Periods without published hours are never guessed. */
export function liveState(today: MenuDay | null, yesterday: MenuDay | null, now: NYNow): LiveState {
  if (yesterday && yesterday.date === addDays(now.date, -1)) {
    for (const p of yesterday.periods) {
      if (p.startMin !== null && p.endMin !== null && p.endMin > 1440 && now.minutes + 1440 < p.endMin && now.minutes + 1440 >= p.startMin) {
        return { state: 'serving', period: p, date: yesterday.date, minutesLeft: p.endMin - (now.minutes + 1440) };
      }
    }
  }
  if (!today || today.noMenuPosted || !today.periods.length) return { state: 'no_menu' };
  let next: Period | null = null;
  for (const p of today.periods) {
    if (p.startMin === null || p.endMin === null) continue;
    if (now.minutes >= p.startMin && now.minutes < p.endMin) return { state: 'serving', period: p, date: today.date, minutesLeft: p.endMin - now.minutes };
    if (p.startMin > now.minutes && (!next || p.startMin < next.startMin!)) next = p;
  }
  const noHours = today.periods.find(p => p.startMin === null || p.endMin === null);
  if (noHours) return { state: 'unverified', period: noHours, why: `${noHours.name} has no published hours, so we can't tell if it is being served.` };
  if (next) return { state: 'next', period: next, date: today.date, minutesUntil: next.startMin! - now.minutes };
  return { state: 'closed' };
}

export function duration(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}
/** "Dinner: serving now, ends in 1 h 5 min (5pm-8pm)". */
export function liveText(s: LiveState): string {
  switch (s.state) {
    case 'serving': return `${s.period.name}: serving now, ends in ${duration(s.minutesLeft)} (${s.period.hours})`;
    case 'next': return `Next up: ${s.period.name} starts in ${duration(s.minutesUntil)} (${s.period.hours})`;
    case 'closed': return 'All published meal periods have ended for today.';
    case 'unverified': return `Serving time unverified. ${s.why}`;
    case 'no_menu': return 'No menu saved for today.';
  }
}

export interface HallPick { hall: HallId; day: MenuDay | null; period: string | null; result: BuildResult | null; best: Meal | null; live: LiveState | null; why: string }
/** Compare halls for the same date and meal period ("best fit right now"). Each hall uses the period of the same
 *  name when it has one; otherwise what it is serving now / next. Never mixes up halls' hours. */
export function compareHalls(days: Array<{ hall: HallId; today: MenuDay | null; yesterday: MenuDay | null }>, periodName: string | null, p: Profile, now: NYNow, opts: { recentMains?: Set<string> } = {}): HallPick[] {
  const out: HallPick[] = days.map(({ hall, today, yesterday }) => {
    const live = today && today.date === now.date ? liveState(today, yesterday, now) : null;
    if (!today || today.noMenuPosted) return { hall, day: today, period: null, result: null, best: null, live, why: today ? 'No menu posted.' : 'No saved page for this day.' };
    let period = periodName && today.periods.some(x => x.name === periodName) ? periodName : null;
    if (!period && live && (live.state === 'serving' || live.state === 'next') && live.date === today.date) period = live.period.name;
    if (!period) return { hall, day: today, period: null, result: null, best: null, live, why: periodName ? `${HALL_NAMES[hall]} has no ${periodName} on this day.` : 'Nothing serving now or next.' };
    const result = buildMeals(today, period, p, { max: 6, recentMains: opts.recentMains });
    const best = result.meals[0] ?? null;
    return { hall, day: today, period, result, best, live, why: best ? '' : 'No meal fits your rules here.' };
  });
  return out;
}
/** Order halls best fit first: has a meal > no fallback > confirmed > closer to targets. */
export function rankHalls(picks: HallPick[]): HallPick[] {
  const key = (x: HallPick) => (x.best ? 0 : 1e6) + (x.result?.fallback ? 1e3 : 0) + (x.best?.tier === 'confirmed' ? 0 : 100) + (x.best?.score ?? 0);
  return picks.slice().sort((a, b) => key(a) - key(b));
}

// ---------------- History & variety ----------------
export interface HistoryEntry { date: string; hall: HallId; period: string; main: string; items: string[]; at: string }
/** Mains the student chose in the `days` days before `date` (lowercased), for gentle variety. */
export function recentMains(history: HistoryEntry[], date: string, days = 7): Set<string> {
  const from = addDays(date, -days);
  return new Set(history.filter(h => h.date >= from && h.date < date).map(h => h.main.toLowerCase()));
}

// ---------------- Share a plate ----------------
export function plateText(m: Meal, day: MenuDay, p: Profile, disclaimer: string): string {
  const lines = [`${m.period} at ${HALL_NAMES[day.hall]}, ${formatDate(day.date)}`];
  for (const x of m.parts) lines.push(`• ${x.item.name}${x.portions > 1 ? ` ×${x.portions}` : ''} (${x.station})`);
  const est = p.useEstimates !== false;
  lines.push(`Calories ${totalText(m.totals.calories, 'calories', est)} · Protein ${totalText(m.totals.protein, 'protein', est)}${m.totals.calories.estParts && est && !m.totals.calories.complete ? ' (~ = includes estimates)' : ''}`);
  for (const g of gapReadout(m.totals, p.targets, null, est)) lines.push(g.text);
  if (m.tier !== 'confirmed') lines.push('Not fully confirmed: ' + m.unconfirmed.map(u => u.name).join(', '));
  lines.push('', 'From Hungry Heels (unofficial, not affiliated with UNC). ' + disclaimer);
  return lines.join('\n');
}
