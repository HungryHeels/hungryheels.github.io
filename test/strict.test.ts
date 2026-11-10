import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateItem, evidence, customEvidence, expandAvoid } from '../src/core/engine.ts';
import { defaultProfile, type AllergenId } from '../src/core/profile.ts';
import { mkItem } from './fixtures.ts';

const allergy = (a: AllergenId, ing: string) => evaluateItem(mkItem('Thing ' + ing, { ing }), { ...defaultProfile('none'), allergens: [a] }).status;
const avoid = (term: string, ing: string, name = 'Thing') => evaluateItem(mkItem(name, { ing }), { ...defaultProfile('none'), avoidIngredients: [term] }).status;

// Bug fixed Nov 10: "safe phrases" (meant to stop "peanut butter" counting as dairy) were removed for EVERY
// category, so an allergy check could not see the allergen inside them when UNC's allergen flag was missing.
test('BUG: safe phrases no longer hide the allergen they contain', () => {
  assert.equal(allergy('peanut', 'peanut butter, bread'), 'excluded');
  assert.equal(allergy('tree_nut', 'almond milk, oats'), 'excluded');
  assert.equal(allergy('tree_nut', 'almond flour, sugar'), 'excluded');
  assert.equal(allergy('soy', 'chicken, soybean oil, salt'), 'excluded');
  assert.equal(allergy('soy', 'chocolate, soy lecithin'), 'excluded');
  assert.equal(allergy('milk', 'sugar, milk chocolate'), 'excluded');
  assert.equal(allergy('egg', 'egg noodles, broth'), 'excluded');
  assert.equal(allergy('wheat', 'cream of wheat, water'), 'excluded');
  assert.equal(allergy('sesame', 'rice, sesame oil'), 'excluded');
  assert.equal(allergy('milk', 'flour, xyzbuttermilkpancakemix'), 'excluded');
});
test('safe phrases still work for the category they are safe for', () => {
  const it = mkItem('Thai Curry', { ing: 'coconut milk, tofu, peanut butter, almond flour' });
  assert.equal(evidence(it, 'dairy').state, 'no');
  assert.equal(evidence(mkItem('GF Treat', { ing: 'almond flour, rice flour, sugar' }), 'wheat').state, 'no');
  assert.equal(evidence(mkItem('Water Chestnut Stir Fry', { ing: 'water chestnuts, carrots' }), 'tree_nut').state, 'no');
});
test('carnivore: bell peppers and tomato paste are vegetables, not seasonings', () => {
  assert.equal(evaluateItem(mkItem('Beef Fajita', { ing: 'beef, bell peppers, salt' }), defaultProfile('carnivore')).status, 'excluded');
  assert.equal(evaluateItem(mkItem('Beef Stew', { ing: 'beef, tomato paste, salt' }), defaultProfile('carnivore')).status, 'excluded');
});

// Bug fixed Nov 10: custom avoids also had safe phrases removed, so "garlic" missed "garlic powder".
test('BUG: custom avoid terms catch every form of the word', () => {
  assert.equal(avoid('garlic', 'chicken, garlic powder, salt'), 'excluded');
  assert.equal(avoid('peanut', 'peanut butter, bread'), 'excluded');
  assert.equal(avoid('soy', 'soybean oil, potatoes'), 'excluded');
  assert.equal(avoid('pepper', 'eggs, black pepper'), 'excluded');
  assert.equal(avoid('mushroom', 'rice, sliced mushrooms'), 'excluded');
  assert.equal(avoid('berry', 'yogurt, mixed berries'), 'excluded');
  assert.equal(avoid('tomatoes', 'pasta, tomato, basil'), 'excluded');
  assert.equal(avoid('garlic', 'potatoes, roastedgarlicbutterblend'), 'excluded');
});
test('custom avoid synonyms and food groups', () => {
  assert.equal(avoid('cilantro', 'rice, coriander leaves, lime'), 'excluded');
  assert.equal(avoid('chickpea', 'garbanzo beans, tahini'), 'excluded');
  assert.equal(avoid('mushroom', 'portobello, onion'), 'excluded');
  assert.equal(avoid('pork', 'eggs, bacon, cheese'), 'excluded');
  assert.equal(avoid('shellfish', 'rice, shrimp, peas'), 'excluded');
  assert.equal(avoid('beef', 'brisket, salt'), 'excluded');
  assert.equal(avoid('beef', 'chicken, salt'), 'match', '"beef" must not exclude chicken');
  assert.equal(avoid('mushroom', 'rice, carrots'), 'match');
  assert.equal(avoid('mushroom', 'x', 'Mushroom Swiss Burger'), 'excluded');
  assert.ok(expandAvoid('berry').includes('berries'));
  assert.equal(customEvidence(mkItem('Soup', { ing: null }), 'garlic').state, 'unknown');
});
test('custom avoid that names an allergen also uses UNC\'s allergen list', () => {
  assert.equal(evaluateItem(mkItem('Dressing', { ing: 'oil, vinegar', allergens: ['peanut'] }), { ...defaultProfile('none'), avoidIngredients: ['peanut'] }).status, 'excluded');
});
