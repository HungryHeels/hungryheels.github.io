// Bowl builder for build-your-own restaurants. Uses the same strict engine as the dining halls (evaluateItem):
// allergen declaration > ingredients > label > name, with cross-contact statements counted as UNKNOWN, so any
// strict avoid (allergy, gluten/dairy/egg, custom, halal-style) excludes them. Possible matches (a soft diet rule
// that could not be confirmed) are allowed but ranked after confirmed ones and marked.
// A valid bowl: exactly one base, one protein or none (animal-based and carnivore need an animal protein),
// up to three toppings, at most one sauce or dressing, and at most one side (only when you set targets).
import { animalEvidence, evaluateItem, profileKey, type Evaluation } from './engine.ts';
import { totalsFor, type Meal, type MealPart, type MealTotals } from './meals.ts';
import { targetError, type SavedMeal } from './plan.ts';
import { nyNow } from './schedule.ts';
import type { Profile } from './profile.ts';
import type { MenuItem } from './types.ts';
import { ROLE_LABELS, ROLE_PLURAL, ROLES, type ComponentRole, type RestaurantComponent, type RestaurantMenu, type RestaurantPreset } from './restaurant.ts';

export interface RCandidate { comp: RestaurantComponent; evaluation: Evaluation; animal: boolean }
export interface RoleCount { role: ComponentRole; fit: number; total: number }
export interface PresetFit { preset: RestaurantPreset; meal: Meal; publishedTotals: boolean }
export interface BowlResult {
  meals: Meal[];
  noMeal: boolean;
  banner: string | null;
  counts: RoleCount[];
  presets: PresetFit[];         // published presets whose every component fits
  presetsExcluded: number;
}

const MAX_TOPPINGS = 3;
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/** Every component that passes the profile's rules (match or potential), by role. */
export function bowlCandidates(menu: RestaurantMenu, p: Profile): Record<ComponentRole, RCandidate[]> {
  const out = Object.fromEntries(ROLES.map(r => [r, [] as RCandidate[]])) as Record<ComponentRole, RCandidate[]>;
  const animalDiet = p.pattern === 'carnivore' || p.pattern === 'animal_based';
  for (const comp of menu.components) {
    const ev = evaluateItem(comp.item, p);
    if (ev.status !== 'match' && ev.status !== 'potential') continue;
    const animal = animalDiet ? animalEvidence(comp.item).state === 'yes' : false;
    if (p.pattern === 'carnivore' && !animal) continue;
    out[comp.role].push({ comp, evaluation: ev, animal });
  }
  return out;
}

function part(item: MenuItem, role: ComponentRole, evaluation: Evaluation): MealPart & { component: ComponentRole } {
  return { item, station: ROLE_LABELS[role], role: role === 'protein' ? 'main' : 'side', kind: null, portions: 1, evaluation, component: role };
}
function unknownNames(items: MenuItem[], p: Profile): string[] {
  const need = (['calories', 'protein', 'fat', 'carbs'] as const).filter(m => m === 'calories' || m === 'protein' || !!p.targets[m]);
  return items.filter(it => need.some(m => it.nutrition[m] === null || it.nutrition[m] === undefined)).map(it => it.name);
}
function toMeal(parts: Array<MealPart & { component: ComponentRole }>, p: Profile, score: number, totals?: MealTotals): Meal {
  const unconfirmed = parts.filter(x => x.evaluation.status !== 'match').map(x => ({ name: x.item.name, why: x.evaluation.unconfirmed.join('; ') }));
  return {
    id: 'bowl|' + parts.map(x => x.item.id).join('+'), period: 'Bowl', parts, tier: unconfirmed.length ? 'possible' : 'confirmed', unconfirmed,
    totals: totals ?? totalsFor(parts.map(x => ({ item: x.item, portions: 1 }))), unknownNutrition: unknownNames(parts.map(x => x.item), p),
    simplified: null, targetNotes: [], score,
  };
}
function subsets<T>(arr: T[], maxK: number): T[][] {
  const out: T[][] = [[]];
  const rec = (start: number, cur: T[]) => { for (let i = start; i < arr.length; i++) { cur.push(arr[i]); out.push(cur.slice()); if (cur.length < maxK) rec(i + 1, cur); cur.pop(); } };
  rec(0, []);
  return out;
}

const memo = new WeakMap<RestaurantMenu, { key: string; res: BowlResult }>();

/** Ranked bowl ideas (one per base + protein pair), confirmed first. Rules are never loosened. */
export function buildBowls(menu: RestaurantMenu, p: Profile, opts: { max?: number } = {}): BowlResult {
  const key = profileKey(p) + JSON.stringify([p.targets, p.calorieCap, p.maxPortion, p.useEstimates, opts.max]);
  const hit = memo.get(menu);
  if (hit && hit.key === key) return hit.res;
  const res = compute(menu, p, opts.max ?? 12);
  memo.set(menu, { key, res });
  return res;
}

function compute(menu: RestaurantMenu, p: Profile, max: number): BowlResult {
  const cands = bowlCandidates(menu, p);
  const counts: RoleCount[] = ROLES.map(role => ({ role, fit: cands[role].length, total: menu.components.filter(c => c.role === role).length })).filter(c => c.total > 0);
  const presetsAll = menu.presets.map(pr => presetFit(menu, pr, p));
  const presets = presetsAll.filter((x): x is PresetFit => !!x);
  const res: BowlResult = { meals: [], noMeal: false, banner: null, counts, presets, presetsExcluded: presetsAll.length - presets.length };
  const animalDiet = p.pattern === 'carnivore' || p.pattern === 'animal_based';
  if (!menu.components.some(c => c.role === 'base') && menu.components.some(c => c.role === 'dish')) return dishMode(menu, p, max, cands, res);
  const rank = (arr: RCandidate[], salt: string) => arr.slice().sort((a, b) => (a.evaluation.status === 'match' ? 0 : 1) - (b.evaluation.status === 'match' ? 0 : 1) || hash(salt + a.comp.item.id) - hash(salt + b.comp.item.id));
  const bases = rank(cands.base, 'b').slice(0, 5);
  const proteinsFit = rank(cands.protein, 'p').filter(c => !animalDiet || c.animal).slice(0, 7);
  const proteinOpts: Array<RCandidate | null> = animalDiet ? proteinsFit : [...proteinsFit, null];
  const why = (role: ComponentRole) => { const c = counts.find(x => x.role === role); return c ? `${c.fit} of ${c.total} ${ROLE_PLURAL[role].toLowerCase()} fit` : `no ${ROLE_PLURAL[role].toLowerCase()} are published`; };
  if (!bases.length || !proteinOpts.length) {
    res.noMeal = true;
    const missing = !bases.length ? `No base fits your rules (${why('base')}).` : `No animal protein fits your rules (${why('protein')}).`;
    res.banner = `No bowl fits your rules at ${menu.name}. ${missing} Your rules were not loosened.`;
    return res;
  }
  const hasTargets = Object.values(p.targets).some(v => !!v);
  const useEst = p.useEstimates !== false;
  const meals: Meal[] = [];
  for (const base of bases) for (const prot of proteinOpts) {
    const salt = base.comp.item.id + (prot?.comp.item.id ?? '-');
    const tops = rank(cands.topping, salt).filter(t => !animalDiet || t.animal || p.pattern === 'animal_based').slice(0, hasTargets ? 6 : MAX_TOPPINGS);
    const sauces = rank(cands.sauce, salt).slice(0, hasTargets ? 4 : 1);
    const sides = hasTargets ? rank(cands.side, salt).slice(0, 4) : [];
    const topSets = hasTargets ? subsets(tops, MAX_TOPPINGS) : [tops];
    const extras: boolean[] = prot?.comp.extra && hasTargets && p.maxPortion >= 2 ? [false, true] : [false];
    let best: { parts: Array<MealPart & { component: ComponentRole }>; score: number; totals: MealTotals } | null = null;
    for (const ts of topSets) for (const sauce of [...sauces, null]) for (const side of [...sides, null]) for (const extra of extras) {
      if (!hasTargets && sauce === null && sauces.length) continue;
      const parts = [part(base.comp.item, 'base', base.evaluation)];
      if (prot) {
        const ex = extra ? prot.comp.extra! : null;
        if (ex?.kind === 'total') parts.push(part(ex.item, 'protein', prot.evaluation));
        else { parts.push(part(prot.comp.item, 'protein', prot.evaluation)); if (ex) parts.push(part(ex.item, 'protein', prot.evaluation)); }
      }
      for (const t of ts) parts.push(part(t.comp.item, 'topping', t.evaluation));
      if (sauce) parts.push(part(sauce.comp.item, 'sauce', sauce.evaluation));
      if (side) parts.push(part(side.comp.item, 'side', side.evaluation));
      const totals = totalsFor(parts.map(x => ({ item: x.item, portions: 1 })));
      if (totals.calories.min > p.calorieCap) continue;
      let score = hasTargets ? targetError(totals, p.targets, useEst) : 0;
      score += parts.reduce((a, x) => a + (x.evaluation.status === 'match' ? 0 : 0.05), 0);
      score += Math.max(0, Math.min(2, tops.length) - ts.length) * 0.08;   // a bowl with a couple of toppings beats a bare one
      if (!prot && proteinsFit.length) score += 0.3;                        // prefer a protein when one fits
      if (extra) score += 0.04;
      if (side) score += 0.04;
      if (!best || score < best.score) best = { parts, score, totals };
    }
    if (best) meals.push(toMeal(best.parts, p, best.score + (hash(salt) % 1000) * 1e-7, best.totals));
  }
  meals.sort((a, b) => a.score - b.score);
  const conf = meals.filter(m => m.tier === 'confirmed'), poss = meals.filter(m => m.tier !== 'confirmed');
  res.meals = [...conf, ...poss].slice(0, max);
  if (!res.meals.length) {
    res.noMeal = true;
    res.banner = `No bowl fits your rules at ${menu.name}: every combination that passes your rules is over your ${p.calorieCap} kcal cap, or has nothing to build with. Your rules were not loosened.`;
  }
  return res;
}

/** Kids' meals are listed on Menus but never suggested to a student as a meal. */
const NOT_SUGGESTED = /\bkids?\b/i;

/** Restaurants that publish nutrition only for finished menu items (e.g. Sweetgreen's store page): an idea is one
 *  published item that fits, plus at most one published side when targets are set. Nothing is recombined. */
function dishMode(menu: RestaurantMenu, p: Profile, max: number, cands: Record<ComponentRole, RCandidate[]>, res: BowlResult): BowlResult {
  const animalDiet = p.pattern === 'carnivore' || p.pattern === 'animal_based';
  const dishes = cands.dish.filter(c => !NOT_SUGGESTED.test(c.comp.category ?? '') && (!animalDiet || c.animal));
  const total = menu.components.filter(c => c.role === 'dish' && !NOT_SUGGESTED.test(c.category ?? '')).length;
  if (!dishes.length) {
    res.noMeal = true;
    res.banner = `No menu item at ${menu.name} fits your rules (0 of ${total}). Your rules were not loosened.`;
    return res;
  }
  const hasTargets = Object.values(p.targets).some(v => !!v);
  const useEst = p.useEstimates !== false;
  const sides = hasTargets ? cands.side : [];
  const meals: Meal[] = [];
  for (const d of dishes) {
    let best: { parts: Array<MealPart & { component: ComponentRole }>; score: number; totals: MealTotals } | null = null;
    for (const side of [null, ...sides]) {
      const parts = [part(d.comp.item, 'dish', d.evaluation)];
      if (side) parts.push(part(side.comp.item, 'side', side.evaluation));
      const totals = totalsFor(parts.map(x => ({ item: x.item, portions: 1 })));
      if (totals.calories.min > p.calorieCap) continue;
      let score = hasTargets ? targetError(totals, p.targets, useEst) : 0;
      score += parts.reduce((a, x) => a + (x.evaluation.status === 'match' ? 0 : 0.05), 0) + (side ? 0.04 : 0);
      if (!best || score < best.score) best = { parts, score, totals };
    }
    if (best) meals.push(toMeal(best.parts, p, best.score + (hash(d.comp.item.id) % 1000) * 1e-7, best.totals));
  }
  meals.sort((a, b) => a.score - b.score);
  const conf = meals.filter(m => m.tier === 'confirmed'), poss = meals.filter(m => m.tier !== 'confirmed');
  res.meals = [...conf, ...poss].slice(0, max);
  if (!res.meals.length) {
    res.noMeal = true;
    res.banner = `No menu item at ${menu.name} fits your rules under your ${p.calorieCap} kcal cap. Your rules were not loosened.`;
  }
  return res;
}

/** A published preset fits only if every one of its components passes the rules. */
function presetFit(menu: RestaurantMenu, pr: RestaurantPreset, p: Profile): PresetFit | null {
  const parts: Array<MealPart & { component: ComponentRole }> = [];
  for (const id of pr.componentIds) {
    const comp = menu.components.find(c => c.item.id === id);
    if (!comp) return null;
    const ev = evaluateItem(comp.item, p);
    if (ev.status !== 'match' && ev.status !== 'potential') return null;
    if (p.pattern === 'carnivore' && animalEvidence(comp.item).state !== 'yes') return null;
    parts.push(part(comp.item, comp.role, ev));
  }
  let totals: MealTotals | undefined;
  const n = pr.nutrition;
  if (n) {
    // The preset's own published totals: a macro the restaurant does not publish for the preset stays unknown.
    const one = (v: number | null) => ({ value: v, min: v ?? 0, complete: v !== null, est: v, estParts: 0 });
    totals = { calories: one(n.calories), protein: one(n.protein), fat: one(n.fat), carbs: one(n.carbs) };
  }
  const meal = toMeal(parts, p, 0, totals);
  meal.id = pr.id; meal.period = pr.name;
  return { preset: pr, meal, publishedTotals: !!n };
}

/** "Bowl at Chipotle" for build-your-own menus, "Pick at Sweetgreen" for published menu items. */
export function mealTitle(menu: RestaurantMenu): string { return menu.components.some(c => c.role === 'base') ? `Bowl at ${menu.name}` : `Pick at ${menu.name}`; }

/** Plain-text bowl for Share (copy). */
export function bowlText(m: Meal, menu: RestaurantMenu, disclaimer: string): string {
  const v = (t: MealTotals['calories']) => (t.complete ? String(Math.round(t.value!)) : t.min > 0 ? `${Math.round(t.min)}+` : 'unknown');
  const lines = [menu.scope === 'store' ? `${mealTitle(menu)} (${menu.address ?? 'Franklin Street'}; ${menu.name}'s published values)` : `${mealTitle(menu)} (national published menu; the Franklin Street store may differ)`];
  for (const x of m.parts) lines.push(`- ${(x as MealPart & { component?: ComponentRole }).component ? ROLE_LABELS[(x as MealPart & { component: ComponentRole }).component] + ': ' : ''}${x.item.name}`);
  lines.push(`About ${v(m.totals.calories)} kcal, ${v(m.totals.protein)} g protein (${menu.name}'s published values).`);
  lines.push('', `From Hungry Heels (unofficial; not affiliated with ${menu.name} or UNC). ` + disclaimer);
  return lines.join('\n');
}

/** A restaurant pick as a saved meal (no hall, date or meal period: the date is when it was saved, New York time). */
export function toSavedRestaurant(m: Meal, menu: RestaurantMenu, hall: SavedMeal['hall'], now = new Date()): SavedMeal {
  return { id: `${menu.id}:${m.id}`, place: menu.id, hall, date: nyNow(now).date, period: mealTitle(menu),
    parts: m.parts.map(x => ({ id: x.item.id, name: x.item.name, portions: x.portions })), savedAt: now.toISOString() };
}
/** Re-check a saved restaurant pick against the CURRENT restaurant data and profile. It never bypasses the rules. */
export function recheckRestaurantSaved(s: SavedMeal, menu: RestaurantMenu | null, p: Profile): { ok: boolean; problems: string[]; notes: string[] } {
  const problems: string[] = [], notes: string[] = [];
  if (!menu) return { ok: false, problems: ['This restaurant’s data is no longer available here.'], notes };
  for (const part of s.parts) {
    const it = menu.components.find(c => c.item.id === part.id)?.item ?? menu.components.find(c => c.extra?.item.id === part.id)?.extra?.item;
    if (!it) { problems.push(`${part.name} is no longer on ${menu.name}’s published menu.`); continue; }
    const ev = evaluateItem(it, p);
    if (ev.status === 'excluded') problems.push(`${part.name} no longer fits your rules: ${(ev.excludedBy ?? '').replace(/^Excluded: |^Not [a-z-]+: /, '')}`);
    else if (ev.status !== 'match') notes.push(`${part.name} can't be fully confirmed for your diet.`);
  }
  return { ok: problems.length === 0, problems, notes };
}
