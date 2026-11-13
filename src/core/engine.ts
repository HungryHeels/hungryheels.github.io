import type { MenuItem } from './types.ts';
import { ANIMAL_CATS, CAT_LABELS, PLANT_CATS, findTerms, hasVague, lexiconTerms, norm, stripSafe, stripSeasonings, type FoodCat } from './foods.ts';
import type { AllergenId, Profile } from './profile.ts';

export type EvState = 'yes' | 'no' | 'unknown';
/** Which kind of evidence decided a check. Order of trust: allergen declaration > ingredient text > label > name. */
export type EvBasis = 'allergen' | 'ingredients' | 'label' | 'name' | 'missing' | 'none';
export interface Evidence { state: EvState; why: string; basis?: EvBasis }
export const BASIS_LABEL: Record<EvBasis, string> = {
  allergen: 'UNC allergen list', ingredients: 'ingredient text', label: 'UNC diet label', name: 'item name', missing: 'no ingredient list', none: 'no rule',
};
/** BASIS_LABEL with the item's own publisher (a restaurant) instead of UNC. */
export function basisLabel(b: EvBasis, publisher?: string): string {
  if (!publisher || publisher === 'UNC') return BASIS_LABEL[b];
  if (b === 'allergen') return `${publisher} allergen information`;
  if (b === 'label') return `${publisher} diet label`;
  if (b === 'missing') return 'no ingredient or allergen list';
  return BASIS_LABEL[b];
}
export type Status = 'match' | 'potential' | 'insufficient' | 'excluded';
export interface Evaluation {
  status: Status;
  reasons: string[];          // plain-language explanation
  unconfirmed: string[];      // what could not be confirmed (for "possible")
  excludedBy: string | null;  // first excluding reason
  strict: boolean;            // excluded because of an allergy/avoid rule
}

const ALLERGEN_CAT: Record<AllergenId, FoodCat> = {
  milk: 'dairy', egg: 'egg', wheat: 'wheat', soy: 'soy', sesame: 'sesame', fish: 'fish', shellfish: 'shellfish', peanut: 'peanut', tree_nut: 'tree_nut',
};
const ALLERGEN_FLAG: Partial<Record<FoodCat, string>> = {
  dairy: 'milk', egg: 'egg', wheat: 'wheat', gluten: 'wheat', soy: 'soy', sesame: 'sesame', fish: 'fish', shellfish: 'shellfish', peanut: 'peanut', tree_nut: 'tree_nut',
};
const BROTH_VAGUE = /\b(broth|stock|bouillon|gravy|base|shortening)\b/;
const FLAVOR_VAGUE = /\b(natural flavors?|natural flavoring|artificial flavors?|flavorings?|flavors?|seasonings?|spices?)\b/;
const PLANT_QUALIFIER = /\b(vegan|plant|veggie|vegetable|impossible|beyond|meatless|tofu|soy|chik n|chickpea|cauliflower|jackfruit|mushroom|lentil|bean)\b/;

export interface EvidenceOpts { vegan?: boolean; ignoreSeasonings?: boolean }

const memo = new WeakMap<MenuItem, Map<string, Evidence>>();

/** Does this item contain food category `cat`? Order: allergen declaration > ingredients > label > name. */
export function evidence(item: MenuItem, cat: FoodCat, opts: EvidenceOpts = {}): Evidence {
  const key = cat + (opts.vegan ? ':v' : '') + (opts.ignoreSeasonings ? ':s' : '');
  let m = memo.get(item);
  if (!m) memo.set(item, (m = new Map()));
  const hit = m.get(key);
  if (hit) return hit;
  const r = computeEvidence(item, cat, opts);
  m.set(key, r);
  return r;
}

function computeEvidence(item: MenuItem, cat: FoodCat, opts: EvidenceOpts): Evidence {
  const L = item.labels;
  const veganCats: FoodCat[] = ['meat', 'poultry', 'fish', 'shellfish', 'dairy', 'egg', 'honey', 'pork'];
  const vegCats: FoodCat[] = ['meat', 'poultry', 'fish', 'shellfish', 'pork'];
  const labelNo: string | null =
    L.vegan && veganCats.includes(cat) ? 'labeled vegan'
    : L.vegetarian && vegCats.includes(cat) ? 'labeled vegetarian'
    : L.madeWithoutGluten && (cat === 'gluten' || cat === 'wheat') ? 'labeled made without gluten' : null;

  // 1. Allergen declaration always counts, even against a label: if UNC's own label and allergen list
  //    disagree, we believe the one that says "contains" (the safe direction).
  const flag = ALLERGEN_FLAG[cat];
  const pub = item.publisher ?? 'UNC';
  // Restaurants may declare "gluten" on its own (e.g. barley): it counts for gluten, not for wheat.
  const flags = cat === 'gluten' ? ['wheat', 'gluten'] : flag ? [flag] : [];
  const declared = flags.find(f => item.allergens.includes(f));
  if (declared) {
    return { state: 'yes', basis: 'allergen', why: labelNo ? `${pub} lists ${declared.replace('_', ' ')} as an allergen even though it is ${labelNo}` : `${pub} lists ${declared.replace('_', ' ')} as an allergen` };
  }
  // 2. Ingredient list also overrides a label.
  let ingText = item.ingredients ? stripSafe(norm(item.ingredients), cat) : '';
  let nameText = stripSafe(norm(item.name), cat);
  if (opts.ignoreSeasonings) { ingText = stripSeasonings(ingText); nameText = stripSeasonings(nameText); }
  const ingHits = ingText ? findTerms(ingText, cat) : [];
  if (ingHits.length) {
    return { state: 'yes', basis: 'ingredients', why: labelNo ? `ingredients include ${ingHits[0]} even though it is ${labelNo}` : `ingredients include ${ingHits[0]}` };
  }
  // 2b. A published cross-contact ("may contain", shared equipment) statement, or no allergen declaration at all,
  //     means we cannot say "free of": unknown, so strict avoids exclude it. A label never overrides this.
  const may = flags.find(f => item.mayContain?.includes(f));
  if (may) return { state: 'unknown', basis: 'allergen', why: `${pub} says it may contain ${may.replace('_', ' ')} (cross-contact)` };
  if (flags.length && item.allergensUnknown) return { state: 'unknown', basis: 'missing', why: `${pub} publishes no allergen information for it` };
  // 3. Published label says no, and nothing contradicts it.
  if (labelNo) return { state: 'no', basis: 'label', why: labelNo };
  // 4. Name.
  const nameHits = findTerms(nameText, cat);
  if (nameHits.length) {
    // A plant-based name ("Impossible Sausage Patty") with a full ingredient list that names no such food is plant-based.
    if (item.ingredients && PLANT_QUALIFIER.test(norm(item.name)) && ANIMAL_CATS.includes(cat)) {
      return { state: 'no', basis: 'ingredients', why: `name says plant-based and ingredients list no ${CAT_LABELS[cat]}` };
    }
    return { state: 'yes', basis: 'name', why: `name includes ${nameHits[0]}` };
  }
  // 5. Cannot tell?
  if (!item.ingredients) return { state: 'unknown', basis: 'missing', why: 'no ingredient list published' };
  const animalSource = cat === 'meat' || cat === 'poultry' || cat === 'fish' || cat === 'shellfish' || cat === 'pork';
  if (animalSource && BROTH_VAGUE.test(ingText)) return { state: 'unknown', basis: 'ingredients', why: 'ingredients mention broth, stock or gravy without naming the source' };
  if (opts.vegan && ANIMAL_CATS.includes(cat) && FLAVOR_VAGUE.test(ingText) && !flag) return { state: 'unknown', basis: 'ingredients', why: 'ingredients mention flavors or seasonings without naming their source' };
  return { state: 'no', basis: 'ingredients', why: 'not found in the ingredient list' };
}

/** Free-text avoid term: matches name or ingredients, including its synonyms. Missing ingredient list => unknown.
 *  Safe phrases are NOT removed here: someone avoiding "garlic" also avoids "garlic powder", and someone avoiding
 *  "peanut" also avoids "peanut butter". When the term names a food group the app knows (pork, shellfish, tree nuts...),
 *  every word in that group counts too. This only ever makes the rule stricter. */
export function customEvidence(item: MenuItem, term: string): Evidence {
  const t = norm(term).trim();
  if (!t) return { state: 'no', basis: 'none', why: '' };
  const terms = expandAvoid(t);
  const res = terms.map(x => new RegExp('(?:^|\\s)' + x.replace(/ /g, '\\s+') + '(?:s|es)?(?=\\s|$)'));
  const hit = (text: string) => {
    for (let i = 0; i < res.length; i++) if (res[i].test(text)) return terms[i];
    // Run-together words ("garlicbutter"): look inside long tokens for terms of 5+ letters.
    for (const tok of text.split(' ')) if (tok.length >= 12 && /^[a-z]+$/.test(tok)) for (const x of terms) if (x.length >= 5 && !x.includes(' ') && tok.includes(x)) return x;
    return null;
  };
  const cat = AVOID_CATS[t];
  const nameT = norm(item.name);
  const n = hit(nameT);
  if (n) return { state: 'yes', basis: 'name', why: n === t ? `name includes "${term}"` : `name includes ${n} (counts as "${term}")` };
  if (cat) {
    const ev = evidence(item, cat);
    if (ev.state === 'yes' && ev.basis === 'allergen') return { ...ev, why: `${ev.why} (counts as "${term}")` };
    if (ev.state === 'unknown' && (ev.basis === 'allergen' || item.allergensUnknown)) return { ...ev, why: `${ev.why} (counts as "${term}")` };
  }
  for (const o of item.otherAllergens ?? []) { const on = norm(o); if (hit(on)) return { state: 'yes', basis: 'allergen', why: `${item.publisher ?? 'UNC'} lists ${o} as an allergen` }; }
  if (!item.ingredients) return { state: 'unknown', basis: 'missing', why: 'no ingredient list published' };
  const i = hit(norm(item.ingredients));
  if (i) return { state: 'yes', basis: 'ingredients', why: i === t ? `ingredients include "${term}"` : `ingredients include ${i} (counts as "${term}")` };
  return { state: 'no', basis: 'ingredients', why: `"${term}" not found in the ingredient list` };
}

// Synonyms for free-text avoids. Each entry is symmetric within its list.
const SYNONYM_GROUPS: string[][] = [
  ['cilantro', 'coriander leaf', 'coriander leaves'], ['chickpea', 'garbanzo', 'garbanzo bean', 'chick pea'], ['shrimp', 'prawn'],
  ['scallion', 'green onion', 'spring onion'], ['eggplant', 'aubergine'], ['zucchini', 'courgette'], ['arugula', 'rocket'],
  ['bell pepper', 'capsicum', 'sweet pepper'], ['corn', 'maize', 'cornmeal', 'corn starch', 'cornstarch', 'corn syrup', 'polenta', 'grits', 'hominy'],
  ['mushroom', 'portobello', 'portabella', 'portabello', 'shiitake', 'cremini', 'crimini', 'enoki', 'button mushroom', 'oyster mushroom', 'chanterelle'],
  ['onion', 'shallot', 'onion powder', 'red onion', 'yellow onion', 'white onion'], ['garlic', 'garlic powder', 'granulated garlic', 'garlic salt'],
  ['msg', 'monosodium glutamate'], ['tomato', 'tomatoes', 'tomato paste', 'marinara', 'ketchup'],
  ['coconut', 'coconut milk', 'coconut oil', 'coconut cream'], ['mustard', 'mustard seed', 'dijon'], ['celery', 'celery seed', 'celery salt', 'celeriac'],
  ['lactose', 'milk', 'cream', 'whey'], ['gelatin', 'gelatine'], ['caffeine', 'coffee', 'espresso', 'tea', 'cola'], ['apple', 'applesauce', 'apple juice', 'apple cider'],
  ['pepper', 'black pepper', 'peppers'], ['chili', 'chile', 'chilli', 'jalapeno', 'chipotle', 'cayenne', 'habanero', 'serrano', 'sriracha'],
];
// Free-text terms that name a whole food group: every lexicon word for that group counts.
const AVOID_CATS: Record<string, FoodCat> = {
  pork: 'pork', meat: 'meat', beef: 'meat', poultry: 'poultry', chicken: 'poultry', fish: 'fish', seafood: 'shellfish', shellfish: 'shellfish',
  dairy: 'dairy', milk: 'dairy', egg: 'egg', eggs: 'egg', gluten: 'gluten', wheat: 'wheat', soy: 'soy', sesame: 'sesame', peanut: 'peanut', peanuts: 'peanut',
  'tree nut': 'tree_nut', 'tree nuts': 'tree_nut', nuts: 'tree_nut', alcohol: 'alcohol', honey: 'honey',
};
// Group words that would make "beef" mean "all meat": narrow these to their own terms.
const NARROW: Record<string, string[]> = {
  beef: ['beef', 'steak', 'sirloin', 'brisket', 'veal', 'roast beef', 'corned beef', 'ground beef', 'pastrami', 'hamburger', 'cheeseburger', 'burger patty', 'taco meat', 'meatball', 'meatloaf', 'barbacoa', 'philly', 'sloppy joe', 'beef broth', 'beef stock', 'bone broth', 'au jus', 'tallow', 'jerky'],
  chicken: ['chicken', 'chicken broth', 'chicken stock', 'chicken fat', 'wings', 'nuggets', 'tenders', 'drumstick', 'tinga', 'poultry'],
  milk: [],
};
export function expandAvoid(t: string): string[] {
  const out = new Set<string>([t]);
  if (t.endsWith('ies')) out.add(t.slice(0, -3) + 'y');
  else if (t.endsWith('es') && t.length > 4) out.add(t.slice(0, -2));
  else if (t.endsWith('s') && t.length > 3) out.add(t.slice(0, -1));
  if (t.endsWith('y') && t.length > 3) out.add(t.slice(0, -1) + 'ies');
  for (const g of SYNONYM_GROUPS) if (g.some(x => out.has(x))) for (const x of g) out.add(x);
  const cat = AVOID_CATS[t];
  if (cat) for (const x of NARROW[t] ?? lexiconTerms(cat)) out.add(x);
  if (t === 'milk') for (const x of lexiconTerms('dairy')) out.add(x);
  return [...out].sort((a, b) => b.length - a.length);
}

export function forbiddenCats(p: Profile): FoodCat[] {
  switch (p.pattern) {
    case 'vegetarian': return ['meat', 'poultry', 'fish', 'shellfish'];
    case 'pescatarian': return ['meat', 'poultry', ...(p.allowDairy ? [] : ['dairy' as FoodCat]), ...(p.allowEgg ? [] : ['egg' as FoodCat])];
    case 'vegan': return ['meat', 'poultry', 'fish', 'shellfish', 'dairy', 'egg', 'honey'];
    case 'animal_based': return [...p.animalBasedExcluded];
    case 'carnivore': return [...PLANT_CATS, 'honey'];
    default: return [];
  }
}

const cache = new WeakMap<MenuItem, { key: string; ev: Evaluation }>();
export function profileKey(p: Profile): string {
  return JSON.stringify([p.pattern, p.allowDairy, p.allowEgg, p.animalBasedExcluded, p.allergens, p.avoidGluten, p.avoidDairy, p.avoidEgg, p.avoidIngredients, p.halalStyle]);
}

export function evaluateItem(item: MenuItem, p: Profile): Evaluation {
  const key = profileKey(p);
  const c = cache.get(item);
  if (c && c.key === key) return c.ev;
  const ev = compute(item, p);
  cache.set(item, { key, ev });
  return ev;
}

function compute(item: MenuItem, p: Profile): Evaluation {
  const reasons: string[] = [];
  const unconfirmed: string[] = [];
  const out = (status: Status, excludedBy: string | null, strict: boolean): Evaluation => ({ status, reasons, unconfirmed, excludedBy, strict });

  // Strict rules first: allergies, intolerances, custom avoid list, halal-style. Uncertain => excluded.
  const strictChecks: Array<{ label: string; ev: Evidence }> = [];
  for (const a of p.allergens) strictChecks.push({ label: `${a.replace('_', ' ')} allergy`, ev: evidence(item, ALLERGEN_CAT[a]) });
  if (p.avoidGluten) strictChecks.push({ label: 'gluten', ev: evidence(item, 'gluten') });
  if (p.avoidDairy) strictChecks.push({ label: 'dairy', ev: evidence(item, 'dairy') });
  if (p.avoidEgg) strictChecks.push({ label: 'egg', ev: evidence(item, 'egg') });
  for (const t of p.avoidIngredients) strictChecks.push({ label: t, ev: customEvidence(item, t) });
  if (p.halalStyle) {
    strictChecks.push({ label: 'pork', ev: evidence(item, 'pork') });
    strictChecks.push({ label: 'alcohol', ev: evidence(item, 'alcohol') });
  }
  for (const c of strictChecks) {
    if (c.ev.state === 'yes') {
      const why = `Excluded: contains ${c.label} (${c.ev.why}).`;
      reasons.push(why);
      return out('excluded', why, true);
    }
    if (c.ev.state === 'unknown') {
      const why = `Excluded: cannot confirm it is free of ${c.label} (${c.ev.why}).`;
      reasons.push(why);
      return out('excluded', why, true);
    }
  }
  if (strictChecks.length) reasons.push('Your allergy and avoid rules found nothing to exclude it.');

  // Diet pattern.
  const opts: EvidenceOpts = { vegan: p.pattern === 'vegan', ignoreSeasonings: p.pattern === 'carnivore' || p.pattern === 'animal_based' };
  let anyUnknown = false;
  let noData = false;
  for (const cat of forbiddenCats(p)) {
    const ev = evidence(item, cat, opts);
    if (ev.state === 'yes') {
      const why = `Not ${patternWord(p)}: contains ${CAT_LABELS[cat]} (${ev.why}).`;
      reasons.push(why);
      return out('excluded', why, false);
    }
    if (ev.state === 'unknown') {
      anyUnknown = true;
      if (!item.ingredients) noData = true;
      unconfirmed.push(`${CAT_LABELS[cat]}: ${ev.why}`);
    }
  }
  if (p.pattern === 'vegan' && item.labels.vegan) reasons.push(`Labeled vegan by ${item.publisher ?? 'UNC'}.`);
  else if (p.pattern === 'vegetarian' && (item.labels.vegetarian || item.labels.vegan)) reasons.push(`Labeled vegetarian by ${item.publisher ?? 'UNC'}.`);
  else if (p.pattern !== 'none') reasons.push(`Checked against ${patternWord(p)} rules using labels, allergens and ingredients.`);
  if (anyUnknown) return out(noData ? 'insufficient' : 'potential', null, false);
  return out('match', null, false);
}

export function patternWord(p: Profile): string {
  return ({ none: 'your rules', vegetarian: 'vegetarian', pescatarian: 'pescatarian', vegan: 'vegan', animal_based: 'animal-based', carnivore: 'carnivore' } as const)[p.pattern];
}

/** Does the item itself contain an animal food? (for animal-based / carnivore meal building) */
export function animalEvidence(item: MenuItem, cats: FoodCat[] = ['meat', 'poultry', 'fish', 'shellfish', 'egg', 'dairy']): Evidence {
  let unknown: Evidence | null = null;
  for (const c of cats) {
    const ev = evidence(item, c, { ignoreSeasonings: true });
    if (ev.state === 'yes') return { state: 'yes', why: `${CAT_LABELS[c]}: ${ev.why}` };
    if (ev.state === 'unknown') unknown = ev;
  }
  return unknown ?? { state: 'no', why: 'no animal food found' };
}

export function matchSentence(item: MenuItem, p: Profile, ev: Evaluation): string {
  const w = p.pattern === 'none' ? 'your rules' : `your ${patternWord(p)} diet`;
  if (ev.status === 'excluded') return ev.reasons[ev.reasons.length - 1] ?? 'Excluded.';
  if (ev.status === 'match') return `Fits ${w}: ${ev.reasons.filter(r => !r.startsWith('Your allergy')).join(' ') || 'nothing in its labels or ingredients conflicts.'}`;
  return `Might fit ${w}, but we could not confirm: ${ev.unconfirmed.join('; ')}.`;
}

void hasVague;

export interface CheckRow { group: 'strict' | 'diet'; label: string; state: EvState; why: string; basis: EvBasis; outcome: 'pass' | 'fail' | 'unconfirmed'; publisher?: string }

/** Every check applied to an item, in the order the engine applies them, with the evidence for each. */
export function explainChecks(item: MenuItem, p: Profile): CheckRow[] {
  const rows: CheckRow[] = [];
  const publisher = item.publisher;
  const strict = (label: string, ev: Evidence) => rows.push({ group: 'strict', label, state: ev.state, why: ev.why, basis: ev.basis ?? 'none', outcome: ev.state === 'no' ? 'pass' : 'fail', ...(publisher ? { publisher } : {}) });
  for (const a of p.allergens) strict(`${a.replace('_', ' ')} allergy`, evidence(item, ALLERGEN_CAT[a]));
  if (p.avoidGluten) strict('gluten', evidence(item, 'gluten'));
  if (p.avoidDairy) strict('dairy', evidence(item, 'dairy'));
  if (p.avoidEgg) strict('egg', evidence(item, 'egg'));
  for (const t of p.avoidIngredients) strict(`"${t}"`, customEvidence(item, t));
  if (p.halalStyle) { strict('pork', evidence(item, 'pork')); strict('alcohol', evidence(item, 'alcohol')); }
  const opts: EvidenceOpts = { vegan: p.pattern === 'vegan', ignoreSeasonings: p.pattern === 'carnivore' || p.pattern === 'animal_based' };
  for (const cat of forbiddenCats(p)) {
    const ev = evidence(item, cat, opts);
    rows.push({ group: 'diet', label: `no ${CAT_LABELS[cat]}`, state: ev.state, why: ev.why, basis: ev.basis ?? 'none', outcome: ev.state === 'no' ? 'pass' : ev.state === 'yes' ? 'fail' : 'unconfirmed', ...(publisher ? { publisher } : {}) });
  }
  return rows;
}
