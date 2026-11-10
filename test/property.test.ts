// Property-style audit: many random profiles × every built-in day. No item the engine excludes for a profile
// may ever appear in a meal (or a day plan) built for that profile, whatever fallback was used.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { decodeSeed } from '../src/core/seed.ts';
import { SEED_B64 } from '../src/client/seed-data.ts';
import { buildMeals } from '../src/core/meals.ts';
import { planDay } from '../src/core/plan.ts';
import { customEvidence, evaluateItem, evidence } from '../src/core/engine.ts';
import { ALLERGEN_IDS, defaultProfile, type PatternId, type Profile } from '../src/core/profile.ts';

const days = decodeSeed(JSON.parse(gunzipSync(Buffer.from(SEED_B64, 'base64')).toString('utf8'))).filter(d => !d.noMenuPosted);
let seed = 12345;
const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32);
const pick = <T>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const AVOIDS = ['mushroom', 'garlic', 'onion', 'cilantro', 'pork', 'tomato', 'peanut', 'coconut', 'sesame', 'corn', 'shrimp', 'cinnamon', 'beef', 'cheese', 'pepper', 'honey', 'rice'];
const PATS: PatternId[] = ['none', 'vegetarian', 'pescatarian', 'vegan', 'animal_based', 'carnivore'];

function randomProfile(): Profile {
  const p = defaultProfile(pick(PATS));
  p.allergens = ALLERGEN_IDS.filter(() => rnd() < 0.15);
  p.avoidGluten = rnd() < 0.15; p.avoidDairy = rnd() < 0.1; p.avoidEgg = rnd() < 0.1; p.halalStyle = rnd() < 0.15;
  p.avoidIngredients = AVOIDS.filter(() => rnd() < 0.08);
  if (rnd() < 0.4) p.targets = { protein: 20 + Math.floor(rnd() * 40) };
  p.maxPortion = pick([1, 2, 3] as const);
  return p;
}

test('PROPERTY: 60 random profiles × all built-in days: no excluded item is ever recommended', () => {
  let meals = 0;
  for (let i = 0; i < 60; i++) {
    const p = randomProfile();
    for (const d of days.filter((_, j) => (j + i) % 6 === 0)) {
      for (const per of d.periods) for (const m of buildMeals(d, per.name, p).meals) for (const part of m.parts) {
        meals++;
        const ev = evaluateItem(part.item, p);
        assert.notEqual(ev.status, 'excluded', `${JSON.stringify(p)} ${d.date} ${per.name}: ${part.item.name} ${ev.excludedBy}`);
        assert.notEqual(ev.status, 'insufficient');
        for (const a of p.allergens) assert.ok(!part.item.allergens.includes(a), `${a} in ${part.item.name}`);
        for (const t of p.avoidIngredients) assert.equal(customEvidence(part.item, t).state, 'no', `${t} in ${part.item.name}`);
        if (p.avoidGluten) assert.equal(evidence(part.item, 'gluten').state, 'no', part.item.name);
        if (p.halalStyle) { assert.equal(evidence(part.item, 'pork').state, 'no'); assert.equal(evidence(part.item, 'alcohol').state, 'no'); }
      }
    }
  }
  assert.ok(meals > 1000, `only ${meals} meal parts checked`);
});
test('PROPERTY: day plans obey the same rules', () => {
  for (let i = 0; i < 12; i++) {
    const p = randomProfile();
    const d = days[(i * 7) % days.length];
    const plan = planDay(d, p, { protein: 120, calories: 2200 });
    for (const s of plan.slots) if (s.meal) for (const part of s.meal.parts) assert.notEqual(evaluateItem(part.item, p).status, 'excluded', part.item.name);
  }
});
test('STRICT AUDIT: gluten, dairy, egg and a sample of custom avoids on every built-in day', () => {
  const profiles: Profile[] = [
    { ...defaultProfile('none'), avoidGluten: true }, { ...defaultProfile('none'), avoidDairy: true }, { ...defaultProfile('none'), avoidEgg: true },
    { ...defaultProfile('none'), avoidIngredients: ['mushroom', 'garlic', 'pork'] }, { ...defaultProfile('none'), halalStyle: true },
  ];
  for (const p of profiles) for (const d of days) for (const per of d.periods) for (const m of buildMeals(d, per.name, p).meals) for (const part of m.parts) {
    if (p.avoidGluten) { assert.equal(evidence(part.item, 'gluten').state, 'no', part.item.name); assert.ok(!part.item.allergens.includes('wheat')); }
    if (p.avoidDairy) { assert.equal(evidence(part.item, 'dairy').state, 'no', part.item.name); assert.ok(!part.item.allergens.includes('milk')); }
    if (p.avoidEgg) { assert.equal(evidence(part.item, 'egg').state, 'no', part.item.name); assert.ok(!part.item.allergens.includes('egg')); }
    for (const t of p.avoidIngredients) assert.equal(customEvidence(part.item, t).state, 'no', `${t}: ${part.item.name}`);
  }
});
