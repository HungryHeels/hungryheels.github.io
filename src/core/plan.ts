// Macro planning on top of the meal builder: honest gap readouts, a whole-day planner, and re-checking
// saved meals. Ranking uses known values only; unknown parts are reported as minimum totals ("280+ cal").
import type { MenuDay } from './types.ts';
import { buildMeals, totalsFor, type BuildResult, type MacroTotal, type Meal, type MealTotals } from './meals.ts';
import { evaluateItem } from './engine.ts';
import type { MacroTargets, Profile } from './profile.ts';

export type MacroKey = 'calories' | 'protein' | 'fat' | 'carbs';
export const MACRO_KEYS: MacroKey[] = ['calories', 'protein', 'fat', 'carbs'];
export const MACRO_NAME: Record<MacroKey, string> = { calories: 'Calories', protein: 'Protein', fat: 'Fat', carbs: 'Carbs' };
const unitOf = (k: MacroKey) => (k === 'calories' ? ' cal' : ' g');
const r = (n: number) => Math.round(n);

/** "640 cal", "280+ cal" (some parts unknown), or "unknown". */
export function totalText(t: MacroTotal, k: MacroKey): string {
  if (t.complete && t.value !== null) return `${r(t.value)}${unitOf(k)}`;
  return t.min > 0 ? `${r(t.min)}+${unitOf(k)}` : 'unknown';
}

export type GapStatus = 'on_target' | 'under' | 'over' | 'at_least_target' | 'cannot_tell' | 'within_cap' | 'over_cap';
export interface GapRow { key: MacroKey; target: number; value: number | null; min: number; complete: boolean; status: GapStatus; text: string }
const TOL = 0.1;

/** One row per macro the student set a target for (plus the calorie cap). Plain language; never pretends to know. */
export function gapReadout(t: MealTotals, targets: MacroTargets, cap?: number | null): GapRow[] {
  const rows: GapRow[] = [];
  for (const k of MACRO_KEYS) {
    const goal = targets[k];
    if (!goal) continue;
    const x = t[k], u = unitOf(k);
    let status: GapStatus, text: string;
    if (x.complete && x.value !== null) {
      const v = x.value, diff = v - goal;
      if (Math.abs(diff) / goal <= TOL) { status = 'on_target'; text = `${MACRO_NAME[k]} ${r(v)}${u} of ${goal}${u}: on target`; }
      else if (diff < 0) { status = 'under'; text = `${MACRO_NAME[k]} ${r(v)}${u} of ${goal}${u}: ${r(-diff)}${u} short`; }
      else { status = 'over'; text = `${MACRO_NAME[k]} ${r(v)}${u} of ${goal}${u}: ${r(diff)}${u} over`; }
    } else if (x.min >= goal * (1 - TOL)) {
      status = k === 'protein' ? 'at_least_target' : x.min > goal * (1 + TOL) ? 'over' : 'cannot_tell';
      text = `${MACRO_NAME[k]} at least ${r(x.min)}${u} of ${goal}${u}: ${status === 'at_least_target' ? 'reaches the target even before the unknown parts' : status === 'over' ? 'already over, before counting the unknown parts' : 'some parts unknown, so the total could be higher'}`;
    } else {
      status = 'cannot_tell';
      text = `${MACRO_NAME[k]} at least ${r(x.min)}${u} of ${goal}${u}: can't tell if it reaches the target (some parts have no published value)`;
    }
    rows.push({ key: k, target: goal, value: x.complete ? x.value : null, min: x.min, complete: x.complete, status, text });
  }
  if (cap && !targets.calories) {
    const c = t.calories;
    const over = c.min > cap;
    rows.push({ key: 'calories', target: cap, value: c.complete ? c.value : null, min: c.min, complete: c.complete, status: over ? 'over_cap' : c.complete ? 'within_cap' : 'cannot_tell',
      text: over ? `Calories ${totalText(c, 'calories')} is over your ${cap} cap` : c.complete ? `Calories ${totalText(c, 'calories')}, within your ${cap} cap` : `Calories ${totalText(c, 'calories')}; can't confirm it is within your ${cap} cap` });
  }
  return rows;
}
/** True when every target is known and within 10%. */
export function hitsTargets(t: MealTotals, targets: MacroTargets): boolean {
  const rows = gapReadout(t, targets);
  return rows.length > 0 && rows.every(x => x.status === 'on_target');
}

/** Error score for ranking against targets. Known values only; an unknown part costs a fixed penalty. Lower is better. */
export function targetError(t: MealTotals, targets: MacroTargets): number {
  let s = 0;
  for (const k of MACRO_KEYS) {
    const goal = targets[k]; if (!goal) continue;
    const x = t[k];
    if (x.complete && x.value !== null) s += Math.abs(x.value - goal) / goal;
    else { s += 0.75; if (x.min > goal * 1.1) s += 1; }
  }
  return s;
}

// ---------------- Day planner ----------------
export interface DayPlanSlot { slot: 'Breakfast' | 'Lunch' | 'Dinner'; period: string; result: BuildResult; meal: Meal | null }
export interface DayPlan { slots: DayPlanSlot[]; totals: MealTotals; gaps: GapRow[]; notes: string[] }

/** Which of the day's published periods to plan. Never invents a period the page does not have. */
export function planPeriods(day: MenuDay): Array<{ slot: DayPlanSlot['slot']; period: string }> {
  const names = day.periods.map(p => p.name);
  const used = new Set<string>();
  const take = (slot: DayPlanSlot['slot'], prefs: string[]) => { const n = prefs.find(x => names.includes(x) && !used.has(x)); if (n) { used.add(n); return [{ slot, period: n }]; } return []; };
  return [...take('Breakfast', ['Breakfast', 'Continental', 'Brunch']), ...take('Lunch', ['Lunch', 'Brunch']), ...take('Dinner', ['Dinner', 'Late Night'])];
}

/** Plan breakfast + lunch + dinner against DAILY targets. Diet rules are the same as for single meals (never loosened). */
export function planDay(day: MenuDay, p: Profile, daily: MacroTargets, opts: { recentMains?: Set<string>; perSlot?: number } = {}): DayPlan {
  const picks = planPeriods(day);
  const notes: string[] = [];
  if (!picks.length) return { slots: [], totals: totalsFor([]), gaps: [], notes: ['This day has no meal periods to plan.'] };
  const k = picks.length;
  const per: MacroTargets = {};
  for (const m of MACRO_KEYS) if (daily[m]) per[m] = Math.round(daily[m]! / k);
  const slotProfile: Profile = { ...p, targets: per, calorieCap: daily.calories ? Math.round((daily.calories / k) * 1.4) : p.calorieCap };
  const n = opts.perSlot ?? 6;
  const results = picks.map(x => ({ ...x, result: buildMeals(day, x.period, slotProfile, { max: n, recentMains: opts.recentMains }) }));
  const hasTargets = MACRO_KEYS.some(m => daily[m]);
  // Search every combination (at most n^3) for the closest day; known values only.
  let best: { idx: number[]; score: number } | null = null;
  const rec = (i: number, idx: number[]) => {
    if (i === results.length) {
      const meals = idx.map((j, s) => (j < 0 ? null : results[s].result.meals[j]));
      const parts = meals.flatMap(m => (m ? m.parts.map(x => ({ item: x.item, portions: x.portions })) : []));
      const tot = totalsFor(parts);
      let score = hasTargets ? targetError(tot, daily) : 0;
      const mains = meals.filter(Boolean).map(m => m!.parts[0].item.name.toLowerCase());
      score += (mains.length - new Set(mains).size) * 0.3;                            // variety inside the day
      score += meals.reduce((a, m) => a + (m ? (m.tier === 'confirmed' ? 0 : 0.05) + m.score * 0.01 : 0), 0);
      if (!best || score < best.score) best = { idx: idx.slice(), score };
      return;
    }
    const ms = results[i].result.meals;
    if (!ms.length) { idx.push(-1); rec(i + 1, idx); idx.pop(); return; }
    for (let j = 0; j < ms.length; j++) { idx.push(j); rec(i + 1, idx); idx.pop(); }
  };
  rec(0, []);
  const chosen = (best as { idx: number[] } | null)?.idx ?? results.map(() => -1);
  const slots: DayPlanSlot[] = results.map((x, s) => ({ slot: x.slot, period: x.period, result: x.result, meal: chosen[s] >= 0 ? x.result.meals[chosen[s]] : null }));
  for (const s of slots) {
    if (!s.meal) notes.push(`No ${s.slot.toLowerCase()} fits your rules at ${s.period}. Your rules were not loosened.`);
    else if (s.result.banner) notes.push(`${s.slot}: ${s.result.banner}`);
  }
  if (k < 3) notes.push(`This day's saved page has ${k === 1 ? 'only one meal period' : 'only two meal periods'} (${picks.map(x => x.period).join(', ')}), so the plan has ${k} meal${k === 1 ? '' : 's'}.`);
  const totals = totalsFor(slots.flatMap(s => (s.meal ? s.meal.parts.map(x => ({ item: x.item, portions: x.portions })) : [])));
  return { slots, totals, gaps: gapReadout(totals, daily), notes };
}

// ---------------- Saved meals ----------------
export interface SavedMeal { id: string; hall: MenuDay['hall']; date: string; period: string; parts: Array<{ id: string; name: string; portions: number }>; savedAt: string }
export function toSaved(m: Meal, day: MenuDay, now = new Date()): SavedMeal {
  return { id: `${day.hall}:${day.date}:${m.id}`, hall: day.hall, date: day.date, period: m.period, parts: m.parts.map(x => ({ id: x.item.id, name: x.item.name, portions: x.portions })), savedAt: now.toISOString() };
}
/** Re-check a saved meal against the CURRENT menu data and profile. A saved meal never bypasses the rules. */
export function recheckSaved(s: SavedMeal, day: MenuDay | null, p: Profile): { ok: boolean; problems: string[]; notes: string[] } {
  const problems: string[] = [], notes: string[] = [];
  if (!day || day.noMenuPosted) return { ok: false, problems: ['That day’s menu is no longer available here.'], notes };
  const per = day.periods.find(x => x.name === s.period);
  if (!per) problems.push(`${s.period} is not on this day’s saved menu any more.`);
  for (const part of s.parts) {
    const it = day.items[part.id];
    if (!it) { problems.push(`${part.name} is not on this day’s menu any more.`); continue; }
    if (per && !per.stations.some(st => st.itemIds.includes(part.id))) problems.push(`${part.name} is no longer listed at ${s.period}.`);
    const ev = evaluateItem(it, p);
    if (ev.status === 'excluded') problems.push(`${part.name} no longer fits your rules: ${(ev.excludedBy ?? '').replace(/^Excluded: |^Not [a-z-]+: /, '')}`);
    else if (ev.status !== 'match') notes.push(`${part.name} can't be fully confirmed for your diet.`);
  }
  return { ok: problems.length === 0, problems, notes };
}
