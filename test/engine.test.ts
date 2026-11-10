import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateItem } from '../src/core/engine.ts';
import { defaultProfile } from '../src/core/profile.ts';
import { mkItem } from './fixtures.ts';

const ev = (name: string, pat: any, over: any = {}, prof: any = {}) => evaluateItem(mkItem(name, over), { ...defaultProfile(pat), ...prof });

test('vegan excludes milk, egg and meat; accepts plant items and vegan-labeled "cheese"', () => {
  assert.equal(ev('Cheddar Cheese', 'vegan', { ing: 'pasteurized milk cheese culture', allergens: ['milk'] }).status, 'excluded');
  assert.equal(ev('Scrambled Eggs', 'vegan', { ing: 'eggs', allergens: ['egg'] }).status, 'excluded');
  assert.equal(ev('Pork Sausage', 'vegan', { ing: 'pork salt' }).status, 'excluded');
  assert.equal(ev('Roasted Broccoli', 'vegan', { ing: 'broccoli olive oil salt' }).status, 'match');
  assert.equal(ev('Vegan Mac & Cheese', 'vegan', { ing: 'pasta cashew sauce', labels: { vegan: true, vegetarian: true, halal: false, madeWithoutGluten: false } }).status, 'match');
});
test('vegetarian allows dairy and egg but not gelatin or fish', () => {
  assert.equal(ev('Omelet', 'vegetarian', { ing: 'eggs cheese', allergens: ['egg', 'milk'] }).status, 'match');
  assert.equal(ev('Gummy Bears', 'vegetarian', { ing: 'sugar gelatin' }).status, 'excluded');
  assert.equal(ev('Tuna Roll', 'vegetarian', { ing: 'tuna rice nori' }).status, 'excluded');
});
test('pescatarian defaults: fish ok, meat no, dairy/egg ok; both editable', () => {
  assert.equal(ev('Salmon', 'pescatarian', { ing: 'salmon lemon' }).status, 'match');
  assert.equal(ev('Beef Steak', 'pescatarian', { ing: 'beef' }).status, 'excluded');
  assert.equal(ev('Yogurt', 'pescatarian', { ing: 'milk cultures' }).status, 'match');
  assert.equal(ev('Yogurt', 'pescatarian', { ing: 'milk cultures' }, { allowDairy: false }).status, 'excluded');
});
test('carnivore excludes rice, broccoli, apple; includes steak, eggs, cheddar', () => {
  assert.equal(ev('White Rice', 'carnivore', { ing: 'rice water' }).status, 'excluded');
  assert.equal(ev('Steamed Broccoli', 'carnivore', { ing: 'broccoli' }).status, 'excluded');
  assert.equal(ev('Apple Slices', 'carnivore', { ing: 'apples' }).status, 'excluded');
  assert.equal(ev('Sirloin Steak', 'carnivore', { ing: 'beef sirloin salt pepper garlic powder olive oil' }).status, 'match');
  assert.equal(ev('Scrambled Eggs', 'carnivore', { ing: 'eggs salt', allergens: ['egg'] }).status, 'match');
  assert.equal(ev('Cheddar Cheese', 'carnivore', { ing: 'pasteurized milk cheese culture salt enzymes', allergens: ['milk'] }).status, 'match');
});
test('animal-based defaults: dairy, eggs, honey, fruit ok; grains and plain vegetables out', () => {
  assert.equal(ev('Honey', 'animal_based', { ing: 'honey' }).status, 'match');
  assert.equal(ev('Orange Slices', 'animal_based', { ing: 'oranges' }).status, 'match');
  assert.equal(ev('Brown Rice', 'animal_based', { ing: 'brown rice' }).status, 'excluded');
  assert.equal(ev('Green Beans', 'animal_based', { ing: 'green beans' }).status, 'excluded');
});
test('safe phrases: coconut milk is not dairy, peanut butter is not butter', () => {
  assert.equal(ev('Thai Curry', 'vegan', { ing: 'coconut milk curry paste tofu', labels: { vegan: false, vegetarian: false, halal: false, madeWithoutGluten: false } }).status, 'match');
  assert.equal(ev('PB Sandwich', 'vegan', { ing: 'peanut butter bread', allergens: ['wheat'] }).status, 'match');
});
test('STRICT: allergy rule excludes uncertain items (no ingredient list)', () => {
  const r = ev('Mystery Stew', 'none', { ing: null }, { allergens: ['milk'] });
  assert.equal(r.status, 'excluded');
  assert.equal(r.strict, true);
  assert.match(r.excludedBy!, /cannot confirm/);
});
test('STRICT: every Big 9 allergen flag excludes', () => {
  for (const a of ['milk', 'egg', 'wheat', 'soy', 'sesame', 'fish', 'shellfish', 'peanut', 'tree_nut']) {
    assert.equal(ev('Thing', 'none', { ing: 'water', allergens: [a] }, { allergens: [a] }).status, 'excluded', a);
  }
});
test('STRICT: custom avoid ingredient and halal-style', () => {
  assert.equal(ev('Stir Fry', 'none', { ing: 'tofu mushroom soy sauce' }, { avoidIngredients: ['mushroom'] }).status, 'excluded');
  assert.equal(ev('Stir Fry', 'none', { ing: 'tofu carrot' }, { avoidIngredients: ['mushroom'] }).status, 'match');
  assert.equal(ev('Pizza', 'none', { ing: 'flour cheese pepperoni' }, { halalStyle: true }).status, 'excluded');
  assert.equal(ev('Coq au Vin', 'none', { ing: 'chicken red wine' }, { halalStyle: true }).status, 'excluded');
});
test('gluten avoidance respects the made-without-gluten label', () => {
  const lab = { vegan: false, vegetarian: false, halal: false, madeWithoutGluten: true };
  assert.equal(ev('GF Bread', 'none', { ing: 'rice flour tapioca', labels: lab }, { avoidGluten: true }).status, 'match');
  assert.equal(ev('Bread', 'none', { ing: 'wheat flour' }, { avoidGluten: true }).status, 'excluded');
});
test('soft diet rules: broth without a named source is "potential", not silently ok', () => {
  const r = ev('Veg Soup', 'vegetarian', { ing: 'water carrots broth salt' });
  assert.equal(r.status, 'potential');
  assert.ok(r.unconfirmed.length > 0);
});

test('labels never override an allergen declaration or ingredient list (UNC label conflicts exist in the real data)', () => {
  const vegan = { vegan: true, vegetarian: true, halal: false, madeWithoutGluten: false };
  // Real case: "Mahi Mahi with Mango Salsa" is labeled vegan but lists fish.
  assert.equal(ev('Mahi Mahi with Mango Salsa', 'vegan', { ing: 'mahi mahi fillet mango', allergens: ['fish'], labels: vegan }).status, 'excluded');
  // Real case: vegan-labeled po boy flagged for milk must not be shown to someone avoiding milk.
  assert.equal(ev('Cajun Tofu Po Boy', 'none', { ing: 'tofu bread', allergens: ['milk'], labels: vegan }, { allergens: ['milk'] }).status, 'excluded');
  assert.equal(ev('Cajun Tofu Po Boy', 'vegan', { ing: 'tofu bread', allergens: ['milk'], labels: vegan }).status, 'excluded');
});
