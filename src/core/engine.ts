import type { MenuItem } from './types.ts';
import { ANIMAL_CATS, CAT_LABELS, PLANT_CATS, findTerms, hasVague, norm, stripSafe, stripSeasonings, type FoodCat } from './foods.ts';
import type { AllergenId, Profile } from './profile.ts';

export type EvState = 'yes' | 'no' | 'unknown';
export interface Evidence { state: EvState; why: string }
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

/** Does this item contain food category `cat`? Order: label > allergen declaration > ingredients > name. */
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
  if (flag && item.allergens.includes(flag)) {
    return { state: 'yes', why: labelNo ? `UNC lists ${flag.replace('_', ' ')} as an allergen even though it is ${labelNo}` : `UNC lists ${flag.replace('_', ' ')} as an allergen` };
  }
  // 2. Ingredient list also overrides a label.
  let ingText = item.ingredients ? stripSafe(norm(item.ingredients)) : '';
  let nameText = stripSafe(norm(item.name));
  if (opts.ignoreSeasonings) { ingText = stripSeasonings(ingText); nameText = stripSeasonings(nameText); }
  const ingHits = ingText ? findTerms(ingText, cat) : [];
  if (ingHits.length) {
    return { state: 'yes', why: labelNo ? `ingredients include ${ingHits[0]} even though it is ${labelNo}` : `ingredients include ${ingHits[0]}` };
  }
  // 3. Published label says no, and nothing contradicts it.
  if (labelNo) return { state: 'no', why: labelNo };
  // 4. Name.
  const nameHits = findTerms(nameText, cat);
  if (nameHits.length) {
    // A plant-based name ("Impossible Sausage Patty") with a full ingredient list that names no such food is plant-based.
    if (item.ingredients && PLANT_QUALIFIER.test(norm(item.name)) && ANIMAL_CATS.includes(cat)) {
      return { state: 'no', why: `name says plant-based and ingredients list no ${CAT_LABELS[cat]}` };
    }
    return { state: 'yes', why: `name includes ${nameHits[0]}` };
  }
  // 5. Cannot tell?
  if (!item.ingredients) return { state: 'unknown', why: 'no ingredient list published' };
  const animalSource = cat === 'meat' || cat === 'poultry' || cat === 'fish' || cat === 'shellfish' || cat === 'pork';
  if (animalSource && BROTH_VAGUE.test(ingText)) return { state: 'unknown', why: 'ingredients mention broth, stock or gravy without naming the source' };
  if (opts.vegan && ANIMAL_CATS.includes(cat) && FLAVOR_VAGUE.test(ingText) && !flag) return { state: 'unknown', why: 'ingredients mention flavors or seasonings without naming their source' };
  return { state: 'no', why: 'not found in the ingredient list' };
}

/** Free-text avoid term: matches name or ingredients. Missing ingredient list => unknown. */
export function customEvidence(item: MenuItem, term: string): Evidence {
  const t = norm(term).trim();
  if (!t) return { state: 'no', why: '' };
  const re = new RegExp('(?:^|\\s)' + t.replace(/ /g, '\\s+') + '(?:s|es)?(?=\\s|$)');
  const nameT = stripSafe(norm(item.name));
  if (re.test(nameT)) return { state: 'yes', why: `name includes "${term}"` };
  if (!item.ingredients) return { state: 'unknown', why: 'no ingredient list published' };
  if (re.test(stripSafe(norm(item.ingredients)))) return { state: 'yes', why: `ingredients include "${term}"` };
  return { state: 'no', why: `"${term}" not found in the ingredient list` };
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
  if (p.pattern === 'vegan' && item.labels.vegan) reasons.push('Labeled vegan by UNC.');
  else if (p.pattern === 'vegetarian' && (item.labels.vegetarian || item.labels.vegan)) reasons.push('Labeled vegetarian by UNC.');
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

export interface CheckRow { group: 'strict' | 'diet'; label: string; state: EvState; why: string; outcome: 'pass' | 'fail' | 'unconfirmed' }

/** Every check applied to an item, in the order the engine applies them, with the evidence for each. */
export function explainChecks(item: MenuItem, p: Profile): CheckRow[] {
  const rows: CheckRow[] = [];
  const strict = (label: string, ev: Evidence) => rows.push({ group: 'strict', label, state: ev.state, why: ev.why, outcome: ev.state === 'no' ? 'pass' : 'fail' });
  for (const a of p.allergens) strict(`${a.replace('_', ' ')} allergy`, evidence(item, ALLERGEN_CAT[a]));
  if (p.avoidGluten) strict('gluten', evidence(item, 'gluten'));
  if (p.avoidDairy) strict('dairy', evidence(item, 'dairy'));
  if (p.avoidEgg) strict('egg', evidence(item, 'egg'));
  for (const t of p.avoidIngredients) strict(`"${t}"`, customEvidence(item, t));
  if (p.halalStyle) { strict('pork', evidence(item, 'pork')); strict('alcohol', evidence(item, 'alcohol')); }
  const opts: EvidenceOpts = { vegan: p.pattern === 'vegan', ignoreSeasonings: p.pattern === 'carnivore' || p.pattern === 'animal_based' };
  for (const cat of forbiddenCats(p)) {
    const ev = evidence(item, cat, opts);
    rows.push({ group: 'diet', label: `no ${CAT_LABELS[cat]}`, state: ev.state, why: ev.why, outcome: ev.state === 'no' ? 'pass' : ev.state === 'yes' ? 'fail' : 'unconfirmed' });
  }
  return rows;
}
