import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyNutritionLayers, checkManual, nutritionBadge, parseAmount, parseOfficial, type ManualEntry } from '../src/sources/nutrition-import.ts';
import { borrowNutrition } from '../src/core/borrow.ts';
import type { MenuDay, MenuItem } from '../src/core/types.ts';
import { mkItem } from './fixtures.ts';

function day(items: MenuItem[], hall: 'chase' | 'top-of-lenoir' = 'chase'): MenuDay {
  const rec: Record<string, MenuItem> = {}; for (const i of items) rec[i.id] = i;
  return { hall, date: '2026-11-12', noMenuPosted: false, notes: [], items: rec, provenance: { source: 't', kind: 'official', retrievedAt: null, verification: 'user_saved_page' },
    periods: [{ name: 'Dinner', hours: null, startMin: null, endMin: null, stations: [{ name: 'Grill', itemIds: items.map(i => i.id) }] }] };
}

test('parseOfficial: CSV with unit suffixes and odd headers; semicolons; JSON', () => {
  const csv = 'Recipe Name,Recipe ID,Location,Calories (kcal),Protein (g),Total Fat (g),Total Carbohydrate (g)\n"Grilled Chicken, Herb",123,Chase,250,38g,9 g,1\nRice,,Chase,200,4,,44\n';
  const r = parseOfficial(csv);
  assert.deepEqual(r.errors, []);
  assert.equal(r.rows.length, 2);
  assert.deepEqual(r.rows[0], { hall: 'chase', name: 'Grilled Chicken, Herb', recipeId: '123', calories: 250, protein: 38, fat: 9, carbs: 1 });
  assert.equal(r.rows[1].fat, null, 'blank stays unknown, never 0');
  assert.equal(parseOfficial('name;calories\nRice;200').rows[0].calories, 200);
  const j = parseOfficial(JSON.stringify({ items: [{ name: 'Tofu', calories: 150, protein: '12 g', fat: null }] }));
  assert.equal(j.rows[0].protein, 12); assert.equal(j.rows[0].fat, null);
  assert.ok(parseOfficial('foo,bar\n1,2').errors.length);
  assert.ok(parseOfficial('[oops').errors.length);
});
test('parseAmount never guesses: "<1", "NA", "-" are unknown', () => {
  assert.equal(parseAmount('<1'), null); assert.equal(parseAmount('NA'), null); assert.equal(parseAmount('-'), null); assert.equal(parseAmount('1,200 kcal'), 1200); assert.equal(parseAmount(''), null);
});
test('parseOfficial skips implausible rows instead of correcting them', () => {
  const r = parseOfficial('name,calories,protein,fat,carbs\nBig Thing,4750,10,5,5\nSalad,100,2,30,40\nRice,200,4,1,44');
  assert.deepEqual(r.rows.map(x => x.name), ['Rice']);
  assert.equal(r.skipped.length, 2);
});

test('layers: official > entered by you > Eat UNC; removing a layer restores the one below', () => {
  const chicken = mkItem('Grilled Chicken', { id: '1' }), rice = mkItem('Rice', { id: '2' }), tofu = mkItem('Tofu', { id: '3' });
  const d = day([chicken, rice, tofu]);
  borrowNutrition(d, [{ hall: 'chase', name: 'Rice', calories: 210, protein: 4 }, { hall: 'chase', name: 'Tofu', calories: 140, protein: 11 }], { source: 'Eat UNC', kind: 'third_party', asOf: '2026-11-05' });
  assert.equal(nutritionBadge(rice.nutrition).text, 'Eat UNC (3rd party)');
  const manual: ManualEntry[] = [{ hall: 'chase', recipeId: '2', name: 'Rice', calories: 205, protein: 4, fat: null, carbs: 45, enteredAt: '2026-11-12T12:00:00Z' }];
  const official = { rows: parseOfficial('recipe_id,name,calories,protein,fat,carbs\n1,Grilled Chicken,250,38,9,1').rows, label: 'official export' };
  const n = applyNutritionLayers([d], { official, manual });
  assert.deepEqual(n, { official: 1, manual: 1 });
  assert.equal(d.items['1'].nutrition.source, 'official'); assert.equal(d.items['1'].nutrition.fat, 9);
  assert.equal(d.items['2'].nutrition.source, 'user'); assert.equal(d.items['2'].nutrition.calories, 205); assert.equal(d.items['2'].nutrition.fat, null);
  assert.ok(d.items['2'].warnings.some(w => /entered by you/.test(w)));
  assert.ok(!d.items['2'].warnings.some(w => /borrowed from/.test(w)));
  assert.equal(d.items['3'].nutrition.source, 'third_party');
  // Re-applying is idempotent; removing the manual entry restores the Eat UNC value.
  applyNutritionLayers([d], { official, manual });
  assert.equal(d.items['2'].warnings.filter(w => /entered by you/.test(w)).length, 1);
  applyNutritionLayers([d], { official: null, manual: [] });
  assert.equal(d.items['2'].nutrition.calories, 210); assert.equal(d.items['2'].nutrition.source, 'third_party');
  assert.equal(d.items['1'].nutrition.calories, null, 'chicken back to unknown');
});
test('official rows for another hall are not applied; disagreeing duplicate names stay unknown', () => {
  const d = day([mkItem('Rice', { id: '9' }), mkItem('Quinoa', { id: '8' })], 'top-of-lenoir');
  const rows = parseOfficial('hall,name,calories\nChase,Rice,200\nLenoir,Quinoa,100\nLenoir,Quinoa,180').rows;
  applyNutritionLayers([d], { official: { rows, label: 'x' }, manual: [] });
  assert.equal(d.items['9'].nutrition.calories, null);
  assert.equal(d.items['8'].nutrition.calories, null);
});
test('manual entry validation', () => {
  assert.match(checkManual({ name: 'x', calories: null, protein: null, fat: null, carbs: null })!, /at least one/);
  assert.match(checkManual({ name: 'x', calories: 100, protein: 40, fat: null, carbs: null })!, /don't look like one serving/);
  assert.equal(checkManual({ name: 'x', calories: 300, protein: 20, fat: 10, carbs: 30 }), null);
});
