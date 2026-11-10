import type { MenuDay, MenuItem, Period } from './types.ts';
import { animalEvidence, evaluateItem, evidence, type Evaluation } from './engine.ts';
import { findTerms, norm, stripSafe } from './foods.ts';
import type { Profile } from './profile.ts';

export type Course = 'main' | 'side' | 'skip';
export type SideKind = 'veg' | 'fruit' | 'starch' | 'protein' | 'other';

const SKIP_STATIONS = new Set(['Beverages', 'Condiments and Spreads', 'Ice Cream', 'Ice Cream Bar', 'Cereal', 'Bakery', 'Specialty Bakery', 'Bagels and Breads', 'Breads and Bagels', 'Hummus Bar', 'Stress Less Cabinet', 'Waffle Bar']);
const SKIP_NAME = /\b(dressing|sauce|gravy|syrup|ketchup|mustard|mayo|mayonnaise|aioli|vinaigrette|ranch|salsa verde|jam|jelly|jellies|topping|toppings|whipped|sprinkles|creamer|bun|buns|roll|rolls|bread|bagel|muffin|cookie|cookies|brownie|cake|pie|donut|donuts|danish|scone|croissant|biscuit|smoothie|juice|soda|tea|coffee|lemonade|water|cocoa|latte|spread|buttery|butter|margarine|honey|sugar|sweetener|seasoning|croutons?|chips|tortilla|wrap|wraps|pita|naan|cornbread|stuffing|glaze|compote|marinade|dip|hummus|syrup|pancakes?|waffles?|french toast|dessert|candy|gummy|cereal|granola|oatmeal|grits|creme|custard|pudding|frosting|icing|relish|pickle chips|olives?|bacon bits|pieces|crumbles?|shredded cheese|sliced cheese|american cheese|cheddar cheese|sour cream|cream cheese|queso|guacamole|pico de gallo)\b/;
const MAIN_NAME = /\b(chicken|turkey|beef|pork|steak|brisket|lamb|ham|sausage|meatball|meatballs|shrimp|fish|salmon|cod|catfish|tuna|tilapia|tofu|tempeh|seitan|nuggets|tenders|patty|burger|sandwich|sub|quesadilla|taco|tacos|burrito|bowl|curry|stir fry|stir-fry|fried rice|pad thai|lasagna|casserole|bake|pizza|omelet|omelette|scramble|mac and cheese|mac cheese|gumbo|chili|stew|chowder|soup|falafel|gyro|carne|kielbasa|chorizo|roast|loin|ribs|wings|cheesesteak|slider|po boy|pasta|penne|linguine|spaghetti|noodles?|lentil|jerk|teriyaki|bites|chik n|chik'n|impossible|beyond|sushi|poke|burger patty|manicotti|tortellini|cavatappi)\b/;
const PROTEIN_SIDE = /^\s*(bacon|turkey bacon|diced ham|diced chicken|hot diced chicken|bacon pieces|hard boiled eggs?|boiled eggs?|scrambled eggs?|cottage cheese|plain greek yogurt|greek yogurt|nonfat yogurt.*|vanilla yogurt|sliced ham|sliced turkey|sliced roast beef|edamame|tofu|hard cooked eggs?)\s*$/;
const FRUIT_NAME = /\b(apple|apples|banana|bananas|orange|oranges|berries|blueberries|strawberries|grapes|melon|cantaloupe|watermelon|honeydew|pineapple|pineapples|mango|peach|peaches|pear|pears|kiwi|fruit|applesauce|grapefruit|cherries|raspberries|blackberries|plums?|papaya)\b/;
const VEG_NAME = /\b(broccoli|cauliflower|carrots?|spinach|kale|lettuce|cabbage|zucchini|squash|cucumbers?|tomato|tomatoes|peppers?|onions?|mushrooms?|celery|asparagus|green beans|brussels|beets?|radish|eggplant|arugula|collards?|chard|okra|vegetables?|veggies?|slaw|salad|greens|medley|snap peas|peas|corn|plantains?|artichoke|cilantro|caponata)\b/;
const STARCH_NAME = /\b(rice|potato|potatoes|yams?|fries|quinoa|pasta|noodles?|couscous|polenta|yuca|hash|tots|barley|bulgur|farro|beans?|lentils?|chickpeas?)\b/;

export interface Classified { course: Course; kind: SideKind | null }

const PLAIN_STARCH = /^\s*(plain |steamed |white |brown |sushi |jasmine |basmati |yellow |cilantro lime |egg )?(rice|pasta|pasta noodles|noodles|spaghetti|spaghetti noodles|penne|penne pasta|rotini|linguine|fettuccine|cavatappi|quinoa|couscous|orzo|grits|polenta)\s*$/;

export function courseOf(item: MenuItem, station: string): Classified {
  if (SKIP_STATIONS.has(station)) return { course: 'skip', kind: null };
  if (/\bcatering\b/i.test(item.name)) return { course: 'skip', kind: null };
  const n = norm(item.name);
  if (PLAIN_STARCH.test(n)) return { course: 'side', kind: 'starch' };
  if (PROTEIN_SIDE.test(item.name.toLowerCase())) return { course: 'side', kind: 'protein' };
  if (/\b(dressing|sauce|gravy|syrup|ketchup|vinaigrette|marinade|dip|broth)\b/.test(n)) return { course: 'skip', kind: null };
  if (SKIP_NAME.test(n) && !MAIN_NAME.test(n)) return { course: 'skip', kind: null };
  if (station === 'Deli' || station === 'Made Without Gluten Deli') {
    return /\b(sandwich|sub|wrap)\b/.test(n) && MAIN_NAME.test(n) ? { course: 'main', kind: null } : { course: 'skip', kind: null };
  }
  if (station === 'Pasta' || station === 'Pasta Bar' || station === 'Pizza') {
    return MAIN_NAME.test(n) && !/\bsauce\b/.test(n) ? { course: 'main', kind: null } : { course: 'skip', kind: null };
  }
  if (station === 'Sushi/Create' || station === 'Made-to-Order') {
    return /\b(roll|sushi|poke|smoothie)\b/.test(n) && !/smoothie/.test(n) ? { course: 'main', kind: null } : { course: 'side', kind: classifySide(n) };
  }
  if (MAIN_NAME.test(n) && !STARCH_ONLY(n)) return { course: 'main', kind: null };
  return { course: 'side', kind: classifySide(n) };
}
function STARCH_ONLY(n: string): boolean { return /^\s*(rice|pasta|noodles?)\b/.test(n) && !/\b(chicken|beef|pork|shrimp|tofu|bowl|curry)\b/.test(n); }
function classifySide(n: string): SideKind {
  if (FRUIT_NAME.test(n)) return 'fruit';
  if (VEG_NAME.test(n) && !/\b(rice|pasta|potato)\b/.test(n)) return 'veg';
  if (STARCH_NAME.test(n)) return 'starch';
  return 'other';
}

// Common-sense quality of an item as a SIDE: 0 = a real side dish, 1 = acceptable but not ideal
// (deli slices, salad-bar proteins), 2 = a garnish or topping, never a side on its own.
const TOPPING_STATIONS = new Set(['Salad Bar', 'Build Your Own!', 'Made-to-Order', 'Sushi/Create', 'Deli', 'Made Without Gluten Deli', 'Hummus Bar', 'Pasta Bar']);
const GARNISH = /\b(seeds?|nuts?|almonds?|walnuts?|pecans?|peanuts?|cashews?|scallions?|green onions?|croutons?|raisins|craisins|dried cranberries|bits|pieces|crumbles?|jalapenos?|olives?|pickles?|pickled|banana peppers|capers|cilantro|parsley|chives|wonton strips|tortilla strips|crispy onions|fried onions|sprinkles|shredded|grated|sauerkraut|kimchi|salsa|pico|guacamole|lemon wedges?|lime wedges?|nori|ginger)\b/;
const SIDE_DISH = /\b(salad|slaw|medley|mix|roasted|steamed|sauteed|grilled|baked|mashed|fries|tots|potatoes|rice|beans|greens|soup|yogurt|cottage cheese|hard (boiled|cooked) eggs?|scrambled|edamame|fruit|cup)\b/;
const PROTEIN_TOPPING = /\b(diced|chopped|sliced|grilled)?\s*(chicken|ham|turkey|roast beef|egg|eggs|tofu|black beans|chickpeas|garbanzo|kidney beans|tuna|salami|pepperoni)\b/;
export function sideTier(item: MenuItem, station: string, kind: SideKind | null): 0 | 1 | 2 {
  const n = norm(item.name);
  if (GARNISH.test(n) && !/\b(salad|slaw)\b/.test(n)) return 2;
  if (kind === 'fruit') return /\b(dried|raisins?)\b/.test(n) ? 2 : 0;
  if (!TOPPING_STATIONS.has(station)) return 0;
  if (/\b(yogurt|cottage cheese|salad|slaw|medley|soup)\b/.test(n) || /\bhard (boiled|cooked) eggs?\b/.test(n) && !/chopped/.test(n)) return 0;
  if (PROTEIN_TOPPING.test(n) || /^\s*(bacon|sausage|edamame)\b/.test(n)) return 1;
  if (SIDE_DISH.test(n)) return 1;
  return 2; // raw single toppings: Red Onions, Diced Tomatoes, Spinach, Mushrooms...
}

/** Two sides of the same kind (two yogurts, two potatoes, two fruits) don't make a sensible plate. */
export function sideFamily(c: { item: MenuItem; kind: SideKind | null }): string {
  const n = norm(c.item.name);
  if (/\b(yogurt|cottage cheese|parfait)\b/.test(n)) return 'dairy-cup';
  if (/\b(potato|potatoes|fries|tots|hash|hashbrown|hash brown)\b/.test(n)) return 'potato';
  if (/\brice\b/.test(n)) return 'rice';
  if (/\b(pasta|noodles?|macaroni|penne|spaghetti|orzo)\b/.test(n)) return 'pasta';
  if (/\beggs?\b/.test(n)) return 'egg';
  if (/\b(salad|slaw)\b/.test(n)) return 'salad';
  if (/\b(ham|turkey|roast beef|salami)\b/.test(n) && /\b(sliced|diced|deli)\b/.test(n)) return 'deli-meat';
  if (c.kind === 'fruit') return 'fruit';
  return 'id:' + c.item.id;
}
function sameFamily(a: Candidate, b: Candidate): boolean { return sideFamily(a) === sideFamily(b); }

export interface MealPart { item: MenuItem; station: string; role: 'main' | 'side'; kind: SideKind | null; portions: number; evaluation: Evaluation }
export interface MacroTotal { value: number | null; min: number; complete: boolean }
export interface MealTotals { calories: MacroTotal; protein: MacroTotal; fat: MacroTotal; carbs: MacroTotal }
export type Simplified = null | 'fewer_sides' | 'main_only' | 'animal_plate';
export interface Meal {
  id: string;
  period: string;
  parts: MealPart[];
  tier: 'confirmed' | 'possible';
  unconfirmed: Array<{ name: string; why: string }>;
  totals: MealTotals;
  unknownNutrition: string[];       // names of parts missing calories/protein/fat/carbs
  simplified: Simplified;
  targetNotes: string[];            // what could / could not be matched to targets
  score: number;
}

const MACROS = ['calories', 'protein', 'fat', 'carbs'] as const;
type Macro = typeof MACROS[number];

export function totalsFor(parts: Array<{ item: MenuItem; portions: number }>): MealTotals {
  const t = {} as MealTotals;
  for (const m of MACROS) {
    let sum = 0, complete = true;
    for (const p of parts) {
      const v = p.item.nutrition[m];
      if (v === null || v === undefined) complete = false; else sum += v * p.portions;
    }
    t[m] = { value: complete ? round(sum) : null, min: round(sum), complete };
  }
  return t;
}
const round = (n: number) => Math.round(n * 10) / 10;

function unknownNames(parts: Array<{ item: MenuItem }>, p: Profile): string[] {
  // Calories and protein are always reported; fat/carbs only matter when the student set a target for them.
  const need = MACROS.filter(m => m === 'calories' || m === 'protein' || !!p.targets[m]);
  const out: string[] = [];
  for (const x of parts) if (need.some(m => x.item.nutrition[m] === null || x.item.nutrition[m] === undefined)) out.push(x.item.name);
  return out;
}

export interface Candidate { item: MenuItem; station: string; course: Course; kind: SideKind | null; evaluation: Evaluation; animal: boolean; tier: 0 | 1 | 2 }

export function candidatesFor(day: MenuDay, period: Period, p: Profile): { mains: Candidate[]; sides: Candidate[] } {
  const mains: Candidate[] = [], sides: Candidate[] = [];
  const seen = new Set<string>();
  const animalDiet = p.pattern === 'carnivore' || p.pattern === 'animal_based';
  for (const st of period.stations) {
    for (const id of st.itemIds) {
      if (seen.has(id)) continue;
      const item = day.items[id];
      if (!item) continue;
      const ev = evaluateItem(item, p);
      if (ev.status !== 'match' && ev.status !== 'potential') continue;
      const { course, kind } = courseOf(item, st.name);
      if (course === 'skip') continue;
      const animal = animalDiet ? animalEvidence(item, ['meat', 'poultry', 'fish', 'shellfish', 'egg', 'dairy']).state === 'yes' : false;
      if (p.pattern === 'carnivore' && !animal) continue;
      if (p.pattern === 'animal_based') {
        const fruitOk = kind === 'fruit' && evidence(item, 'fruit').state !== 'no' && !p.animalBasedExcluded.includes('fruit');
        if (!animal && !fruitOk) continue;
      }
      const tier = course === 'side' ? sideTier(item, st.name, kind) : 0;
      if (tier === 2) continue;
      seen.add(id);
      const c: Candidate = { item, station: st.name, course, kind, evaluation: ev, animal, tier };
      if (course === 'main') {
        if (animalDiet && !(animalEvidence(item, ['meat', 'poultry', 'fish', 'shellfish', 'egg']).state === 'yes')) { const t = sideTier(item, st.name, 'protein'); if (t < 2) sides.push({ ...c, course: 'side', kind: 'protein', tier: t }); continue; }
        mains.push(c);
      } else sides.push(c);
    }
  }
  return { mains, sides };
}

function nutScore(item: MenuItem, p: Profile): number {
  // Higher is better; unknown nutrition gets a neutral value.
  const n = item.nutrition;
  if (p.targets.protein && n.protein !== null) return n.protein;
  return n.protein ?? 0;
}

function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

function proteinish(c: Candidate): number {
  const ev = (cat: any) => evidence(c.item, cat, { ignoreSeasonings: true }).state === 'yes';
  let s = 0;
  if (ev('meat') || ev('poultry') || ev('fish') || ev('shellfish')) s += 3;
  else if (ev('egg')) s += 2;
  else if (ev('legumes')) s += 2;
  return s;
}

interface Slot { cand: Candidate; portions: number }

function evalCombo(slots: Slot[], p: Profile): { score: number; totals: MealTotals; notes: string[]; ok: boolean } {
  const totals = totalsFor(slots.map(s => ({ item: s.cand.item, portions: s.portions })));
  if (totals.calories.min > p.calorieCap) return { score: Infinity, totals, notes: [], ok: false };
  let score = 0;
  const notes: string[] = [];
  for (const m of MACROS) {
    const target = p.targets[m];
    if (!target) continue;
    const t = totals[m];
    if (t.complete && t.value !== null) {
      const err = Math.abs(t.value - target) / target;
      score += err;
      notes.push(`${cap(m)} ${Math.round(t.value)}${m === 'calories' ? '' : ' g'} vs target ${target}${m === 'calories' ? '' : ' g'}`);
    } else {
      score += 0.75; // unknown: ranks below meals whose values are known
      if (t.min > target * 1.1) score += 1;
      notes.push(`${cap(m)} could not be fully checked (some parts have no published value)`);
    }
  }
  return { score, totals, notes, ok: true };
}
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Extra portions only where they make sense: the main (up to the user's limit) and protein sides (up to 2x).
 *  Fruit, vegetables and starches are always one portion. */
function portionLimit(c: Candidate, role: 'main' | 'side', max: number): number {
  if (role === 'main') return max;
  if (c.kind === 'protein' || c.animal) return Math.min(2, max);
  return 1;
}
function portionOptions(cands: Candidate[], max: number, hasTargets: boolean, plate = false): number[][] {
  const lim = cands.map((c, i) => (!hasTargets || max <= 1 ? 1 : portionLimit(c, i === 0 && !plate ? 'main' : 'side', max)));
  const out: number[][] = [];
  const rec = (i: number, cur: number[]) => {
    if (i === cands.length) { out.push(cur.slice()); return; }
    for (let k = 1; k <= lim[i]; k++) { cur.push(k); rec(i + 1, cur); cur.pop(); }
  };
  rec(0, []);
  return out;
}

function makeMeal(period: string, slots: Slot[], p: Profile, simplified: Simplified, base: ReturnType<typeof evalCombo>): Meal {
  const parts: MealPart[] = slots.map((s, i) => ({ item: s.cand.item, station: s.cand.station, role: i === 0 && simplified !== 'animal_plate' ? 'main' : 'side', kind: s.cand.kind, portions: s.portions, evaluation: s.cand.evaluation }));
  const unconfirmed = parts.filter(x => x.evaluation.status !== 'match').map(x => ({ name: x.item.name, why: x.evaluation.unconfirmed.join('; ') }));
  return {
    id: period + '|' + parts.map(x => x.item.id + 'x' + x.portions).join('+'),
    period, parts, tier: unconfirmed.length ? 'possible' : 'confirmed', unconfirmed,
    totals: base.totals, unknownNutrition: unknownNames(parts, p), simplified, targetNotes: base.notes, score: base.score,
  };
}

export interface BuildOptions { max?: number }
export type FallbackReason = null | 'fewer_sides' | 'main_only' | 'other_period' | 'animal_plate';
export interface BuildResult {
  meals: Meal[];
  period: string | null;       // period actually used
  requestedPeriod: string;
  fallback: FallbackReason;
  banner: string | null;       // plain-language explanation shown to the user
  noMealToday: boolean;
}

/** Build ranked meal ideas for one period at a given structure level. */
function buildPlate(day: MenuDay, period: Period, p: Profile, max: number): Meal[] {
  // Last resort for animal-based and carnivore when no main dish fits: a plate of the animal foods that do fit.
  if (p.pattern !== 'carnivore' && p.pattern !== 'animal_based') return [];
  const { mains, sides } = candidatesFor(day, period, p);
  const pool = [...mains, ...sides].filter(c => c.animal);
  if (!pool.length) return [];
  const rankKey = (c: Candidate) => -proteinish(c) * 1e6 + (c.evaluation.status === 'match' ? 0 : 5e5) + (hash(day.date + c.item.id) % 1000);
  const top = pool.slice().sort((a, b) => rankKey(a) - rankKey(b)).slice(0, 7);
  const hasTargets = Object.values(p.targets).some(v => !!v);
  const sets: Candidate[][] = top.length === 1 ? [[top[0]]] : [];
  for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) sets.push([top[i], top[j]]);
  const out: Meal[] = [];
  for (const set of sets) {
    let best: { slots: Slot[]; r: ReturnType<typeof evalCombo> } | null = null;
    for (const ports of portionOptions(set, p.maxPortion, hasTargets, true)) {
      const slots = set.map((c, i) => ({ cand: c, portions: ports[i] }));
      const r = evalCombo(slots, p);
      if (!r.ok) continue;
      const adj = r.score + slots.reduce((a, s) => a + (s.cand.evaluation.status === 'match' ? 0 : 0.05), 0) + slots.reduce((a, s) => a + s.portions - 1, 0) * 0.04;
      if (!best || adj < best.r.score) best = { slots, r: { ...r, score: adj } };
    }
    if (best) out.push(makeMeal(period.name, best.slots, p, 'animal_plate', best.r));
  }
  out.sort((a, b) => a.score - b.score);
  const conf = out.filter(m => m.tier === 'confirmed'), poss = out.filter(m => m.tier !== 'confirmed');
  return [...conf, ...poss].slice(0, max);
}

function buildForPeriod(day: MenuDay, period: Period, p: Profile, level: 'full' | 'fewer' | 'main', max: number): Meal[] {
  const { mains, sides } = candidatesFor(day, period, p);
  if (!mains.length) return [];
  const carn = p.pattern === 'carnivore';
  const animalDiet = carn || p.pattern === 'animal_based';
  const needPlant = !animalDiet;                 // need a vegetable or fruit
  const vegFruit = sides.filter(s => s.kind === 'veg' || s.kind === 'fruit');
  const fruitOnly = sides.filter(s => s.kind === 'fruit');
  const others = sides.filter(s => s.kind !== 'veg' && s.kind !== 'fruit');
  const sortKey = (c: Candidate) => (c.evaluation.status === 'match' ? 0 : 1) * 1e6 + c.tier * 2e5 + (hash(day.date + c.item.id) % 1000);
  const rank = (arr: Candidate[]) => arr.slice().sort((a, b) => sortKey(a) - sortKey(b));
  const mainsR = rank(mains).sort((a, b) => (a.evaluation.status === b.evaluation.status ? proteinish(b) - proteinish(a) : 0));
  const hasTargets = Object.values(p.targets).some(v => !!v);
  const meals: Meal[] = [];
  const usedMainNames = new Set<string>();
  const sideUse = new Map<string, number>();
  const nSides = level === 'full' ? 2 : level === 'fewer' ? 1 : 0;

  for (const main of mainsR.slice(0, 60)) {
    const key = main.item.name.toLowerCase();
    if (usedMainNames.has(key)) continue;
    // Side pools.
    let pools: Candidate[][];
    if (nSides === 0) pools = [];
    else if (needPlant) {
      const vf = rank(vegFruit).filter(s => s.item.id !== main.item.id);
      const ot = rank(others).filter(s => s.item.id !== main.item.id);
      pools = nSides === 2 ? [vf.slice(0, 6), ot.slice(0, 6)] : [vf.slice(0, 6)];
      if (pools.some(x => !x.length)) { if (nSides === 2 && vf.length >= 2) pools = [vf.slice(0, 6), vf.slice(0, 6)]; else if (nSides === 2 && vf.length && !ot.length) continue; else if (!vf.length) continue; }
    } else {
      const pool = rank(sides.filter(s => s.item.id !== main.item.id && s.item.name !== main.item.name));
      const prot = pool.filter(s => s.kind === 'protein' || s.animal);
      const fr = fruitOnly.filter(s => s.item.id !== main.item.id);
      const first = carn ? prot : rank([...prot.slice(0, 5), ...fr.slice(0, 3)]);
      pools = nSides === 2 ? [first.slice(0, 6), prot.slice(0, 6)] : [first.slice(0, 6)];
      if (pools.some(x => !x.length)) continue;
    }
    // Enumerate side combinations.
    let combos: Candidate[][] = [[]];
    for (const pool of pools) {
      const next: Candidate[][] = [];
      for (const c of combos) for (const s of pool) if (!c.some(x => x.item.id === s.item.id || sameFamily(x, s))) next.push([...c, s]);
      combos = next;
    }
    const scored: Array<{ slots: Slot[]; r: ReturnType<typeof evalCombo> }> = [];
    let tie = 0;
    for (const combo of combos) {
      const cands = [main, ...combo];
      let bestForCombo: { slots: Slot[]; r: ReturnType<typeof evalCombo> } | null = null;
      for (const ports of portionOptions(cands, p.maxPortion, hasTargets)) {
        const slots = cands.map((c, i) => ({ cand: c, portions: ports[i] }));
        const r = evalCombo(slots, p);
        if (!r.ok) continue;
        const adj = r.score + slots.reduce((a, s) => a + (s.cand.evaluation.status === 'match' ? 0 : 0.05) + s.cand.tier * 0.3, 0) + (slots.reduce((a, s) => a + s.portions - 1, 0)) * 0.04 + (tie++ % 7) * 1e-6;
        if (!bestForCombo || adj < bestForCombo.r.score) bestForCombo = { slots, r: { ...r, score: adj } };
      }
      if (bestForCombo) scored.push(bestForCombo);
    }
    if (!scored.length) continue;
    // Variety: sides already used in earlier ideas cost a little, so ideas don't all share the same sides.
    const withUse = (x: { slots: Slot[]; r: ReturnType<typeof evalCombo> }) => x.r.score + x.slots.slice(1).reduce((a, y) => a + (sideUse.get(y.cand.item.id) ?? 0) * 0.12, 0);
    scored.sort((a, b) => withUse(a) - withUse(b));
    usedMainNames.add(key);
    const first = scored[0];
    for (const y of first.slots.slice(1)) sideUse.set(y.cand.item.id, (sideUse.get(y.cand.item.id) ?? 0) + 1);
    const mainPenalty = /\b(soup|chowder|bisque)\b/i.test(main.item.name) ? 0.2 : 0;
    meals.push(makeMeal(period.name, first.slots, p, level === 'full' ? null : level === 'fewer' ? 'fewer_sides' : 'main_only', { ...first.r, score: withUse(first) + mainPenalty }));
    // A second idea for the same main with entirely different sides (only when sides exist).
    const firstSides = new Set(first.slots.slice(1).map(x => x.cand.item.id));
    const alt = firstSides.size ? scored.find(x => x.slots.slice(1).every(y => !firstSides.has(y.cand.item.id))) : undefined;
    if (alt) {
      meals.push(makeMeal(period.name, alt.slots, p, level === 'full' ? null : level === 'fewer' ? 'fewer_sides' : 'main_only', { ...alt.r, score: withUse(alt) + mainPenalty + 0.02 }));
      for (const y of alt.slots.slice(1)) sideUse.set(y.cand.item.id, (sideUse.get(y.cand.item.id) ?? 0) + 1);
    }
    if (meals.length >= max * 3) break;
  }
  meals.sort((a, b) => a.score - b.score || (a.tier === b.tier ? 0 : a.tier === 'confirmed' ? -1 : 1));
  // Prefer confirmed meals first without breaking score order inside each tier.
  const conf = meals.filter(m => m.tier === 'confirmed'), poss = meals.filter(m => m.tier !== 'confirmed');
  return [...conf, ...poss].slice(0, max);
}

/** Main entry point. Fallbacks change meal structure or period, NEVER the diet rules. */
export function buildMeals(day: MenuDay, periodName: string, p: Profile, opts: BuildOptions = {}): BuildResult {
  const max = opts.max ?? 12;
  const req = day.periods.find(x => x.name === periodName) ?? day.periods[0];
  const res: BuildResult = { meals: [], period: null, requestedPeriod: req?.name ?? periodName, fallback: null, banner: null, noMealToday: false };
  if (!req) { res.noMealToday = true; res.banner = 'No meal periods are published for this day.'; return res; }
  const tries: Array<['full' | 'fewer' | 'main', FallbackReason]> = [['full', null], ['fewer', 'fewer_sides'], ['main', 'main_only']];
  for (const [level, fb] of tries) {
    const m = buildForPeriod(day, req, p, level, max);
    if (m.length) {
      res.meals = m; res.period = req.name; res.fallback = fb;
      if (fb === 'fewer_sides') res.banner = `No full meal (main plus 2 sides) fits your rules at ${req.name}, so these have fewer sides. Your diet rules were not changed.`;
      if (fb === 'main_only') res.banner = `Only single dishes fit your rules at ${req.name}, so these are a main with no sides. Your diet rules were not changed.`;
      return res;
    }
  }
  // Other periods of the same day, nearest first, full structure first.
  const idx = day.periods.indexOf(req);
  const others = day.periods.filter(x => x !== req).sort((a, b) => Math.abs(day.periods.indexOf(a) - idx) - Math.abs(day.periods.indexOf(b) - idx));
  for (const [level, fb] of tries) {
    for (const per of others) {
      const m = buildForPeriod(day, per, p, level, max);
      if (m.length) {
        res.meals = m; res.period = per.name; res.fallback = 'other_period';
        res.banner = `Nothing at ${req.name} fits your rules, so this is the closest meal from ${per.name} the same day${fb ? ' (with fewer sides)' : ''}. Your diet rules were not changed.`;
        return res;
      }
    }
  }
  // Animal diets with no main dish anywhere today: a plate of the animal foods that fit (rules unchanged).
  for (const per of [req, ...others]) {
    const m = buildPlate(day, per, p, max);
    if (m.length) {
      res.meals = m; res.period = per.name; res.fallback = 'animal_plate';
      res.banner = `No main dish fits your rules ${per === req ? `at ${req.name}` : `today at ${req.name}, so this uses ${per.name}`}. This is a plate of the animal foods that do fit. Your diet rules were not changed.`;
      return res;
    }
  }
  res.noMealToday = true;
  res.banner = 'No meal fits your rules today. Your rules were not loosened. You can browse all items to see what is available.';
  return res;
}

export function periodItems(day: MenuDay, period: Period): Array<{ item: MenuItem; station: string }> {
  const out: Array<{ item: MenuItem; station: string }> = [];
  const seen = new Set<string>();
  for (const st of period.stations) for (const id of st.itemIds) if (!seen.has(id)) { seen.add(id); out.push({ item: day.items[id], station: st.name }); }
  return out;
}
void findTerms; void stripSafe; void nutScore;
