import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMeals, courseOf, totalsFor } from '../src/core/meals.ts';
import { defaultProfile } from '../src/core/profile.ts';
import { borrowNutrition } from '../src/core/borrow.ts';
import { evaluateItem } from '../src/core/engine.ts';
import type { MenuDay, MenuItem } from '../src/core/types.ts';
import { mkItem } from './fixtures.ts';

function day(stations: Array<[string, MenuItem[]]>, periodName = 'Dinner'): MenuDay {
  const items: Record<string, MenuItem> = {};
  for (const [, list] of stations) for (const it of list) items[it.id] = it;
  return { hall: 'chase', date: '2026-11-10', noMenuPosted: false, notes: [], items,
    provenance: { source: 't', kind: 'official', retrievedAt: null, verification: 'user_saved_page' },
    periods: [{ name: periodName, hours: '5pm-8pm', startMin: 1020, endMin: 1200, stations: stations.map(([name, l]) => ({ name, itemIds: l.map(i => i.id) })) }] };
}
const nut = (c: number | null, p: number | null, f: number | null = null, cb: number | null = null) => ({ calories: c, protein: p, fat: f, carbs: cb });

test('dressings, drinks, condiments, buns and cereal are never meal parts', () => {
  for (const [n, st] of [['Ranch Dressing', 'Salad Bar'], ['Whole Milk', 'Beverages'], ['Ketchup', 'Condiments and Spreads'], ['Hamburger Bun', 'The Griddle'], ['Lucky Charms', 'Cereal'], ['BBQ Sauce', 'The Griddle'], ['Sprinkles', 'Ice Cream']]) {
    assert.equal(courseOf(mkItem(n), st).course, 'skip', n);
  }
});
test('builds main + 2 sides with a vegetable or fruit side', () => {
  const d = day([['Grill', [mkItem('Grilled Chicken', { ing: 'chicken' })]], ['Sides', [mkItem('Steamed Broccoli', { ing: 'broccoli' }), mkItem('Brown Rice', { ing: 'rice' }), mkItem('Red Grapes', { ing: 'grapes' })]]]);
  const r = buildMeals(d, 'Dinner', defaultProfile('none'));
  assert.ok(r.meals.length >= 1);
  const m = r.meals[0];
  assert.equal(m.parts.length, 3);
  assert.ok(m.parts.some(p => p.kind === 'veg' || p.kind === 'fruit'));
  assert.equal(r.fallback, null);
});
test('unknown nutrition is allowed; totals are minimums and unknown parts are named', () => {
  const d = day([['Grill', [mkItem('Grilled Chicken', { ing: 'chicken', nutrition: nut(300, 40) })]], ['Sides', [mkItem('Steamed Broccoli', { ing: 'broccoli' }), mkItem('Red Grapes', { ing: 'grapes', nutrition: nut(80, 1) })]]]);
  const m = buildMeals(d, 'Dinner', defaultProfile('none')).meals[0];
  assert.equal(m.totals.calories.complete, false);
  assert.equal(m.totals.calories.value, null);
  assert.equal(m.totals.calories.min, 380);
  assert.deepEqual(m.unknownNutrition, ['Steamed Broccoli']);
});
test('calories <= cap when known', () => {
  const d = day([['Grill', [mkItem('Huge Burger', { ing: 'beef', nutrition: nut(1200, 60) }), mkItem('Grilled Chicken', { ing: 'chicken', nutrition: nut(300, 40) })]], ['Sides', [mkItem('Steamed Broccoli', { ing: 'broccoli', nutrition: nut(30, 3) }), mkItem('Red Grapes', { ing: 'grapes', nutrition: nut(80, 1) })]]]);
  for (const m of buildMeals(d, 'Dinner', defaultProfile('none')).meals) assert.ok((m.totals.calories.value ?? 0) <= 1000);
});
test('macro targets drive portioning (2x/3x) when only some items are allowed', () => {
  const d = day([['Grill', [mkItem('Grilled Chicken', { ing: 'chicken', nutrition: nut(200, 30, 5, 0) })]], ['Sides', [mkItem('Steamed Broccoli', { ing: 'broccoli', nutrition: nut(30, 3, 0, 6) }), mkItem('Brown Rice', { ing: 'rice', nutrition: nut(200, 4, 2, 44) })]]]);
  const p = { ...defaultProfile('none'), targets: { protein: 70 }, maxPortion: 3 as const };
  const m = buildMeals(d, 'Dinner', p).meals[0];
  assert.ok(m.parts.some(x => x.portions > 1), 'should scale a portion');
  assert.ok(Math.abs((m.totals.protein.value ?? 0) - 70) <= 15);
  const one = buildMeals(d, 'Dinner', { ...p, maxPortion: 1 as const }).meals[0];
  assert.ok(one.parts.every(x => x.portions === 1));
});
test('fallback: fewer sides keeps the diet rules and says so', () => {
  const d = day([['Grill', [mkItem('Grilled Chicken', { ing: 'chicken' })]], ['Sides', [mkItem('Steamed Broccoli', { ing: 'broccoli' })]]]);
  const r = buildMeals(d, 'Dinner', defaultProfile('none'));
  assert.equal(r.fallback, 'fewer_sides');
  assert.match(r.banner!, /diet rules were not changed/);
});
test('fallback: closest meal from another period, never a looser diet', () => {
  const d = day([['Grill', [mkItem('Cheeseburger', { ing: 'beef cheese bun', allergens: ['milk'] })]]], 'Lunch');
  d.periods.push({ name: 'Dinner', hours: '5pm-8pm', startMin: 1020, endMin: 1200, stations: [{ name: 'Veg', itemIds: [] }] });
  const veg = mkItem('Tofu Bowl', { ing: 'tofu rice', labels: { vegan: true, vegetarian: true, halal: false, madeWithoutGluten: false } });
  d.items[veg.id] = veg; d.periods[1].stations[0].itemIds.push(veg.id);
  const r = buildMeals(d, 'Lunch', defaultProfile('vegan'));
  assert.equal(r.fallback, 'other_period');
  assert.equal(r.period, 'Dinner');
  assert.ok(r.meals.every(m => m.parts.every(p => p.item.id !== 'x')));
});
test('whole day with nothing: "No meal fits today", no loosening', () => {
  const d = day([['Grill', [mkItem('Cheeseburger', { ing: 'beef cheese', allergens: ['milk'] })]]]);
  const r = buildMeals(d, 'Dinner', defaultProfile('vegan'));
  assert.equal(r.noMealToday, true);
  assert.equal(r.meals.length, 0);
});
test('allergen-excluded items never appear in any meal part', () => {
  const d = day([['Grill', [mkItem('Grilled Chicken', { ing: 'chicken' }), mkItem('Mac and Cheese Bowl', { ing: 'pasta cheese milk', allergens: ['milk', 'wheat'] })]], ['Sides', [mkItem('Steamed Broccoli', { ing: 'broccoli' }), mkItem('Red Grapes', { ing: 'grapes' }), mkItem('Creamed Spinach', { ing: 'spinach cream', allergens: ['milk'] })]]]);
  const p = { ...defaultProfile('none'), allergens: ['milk' as const] };
  for (const m of buildMeals(d, 'Dinner', p).meals) for (const part of m.parts) assert.ok(!part.item.allergens.includes('milk'));
});
test('carnivore meal: every part is an animal food, no vegetable side', () => {
  const d = day([['Grill', [mkItem('Sirloin Steak', { ing: 'beef sirloin salt' })]], ['Sides', [mkItem('Scrambled Eggs', { ing: 'eggs salt', allergens: ['egg'] }), mkItem('Bacon', { ing: 'pork bacon salt' }), mkItem('Steamed Broccoli', { ing: 'broccoli' })]]]);
  const m = buildMeals(d, 'Dinner', defaultProfile('carnivore')).meals[0];
  assert.deepEqual(m.parts.map(p => p.item.name).sort(), ['Bacon', 'Scrambled Eggs', 'Sirloin Steak']);
});
test('borrowed nutrition: only same-hall exact-name matches where all entries agree', () => {
  const d = day([['Grill', [mkItem('Grilled Chicken', { ing: 'chicken' }), mkItem('Fried Rice', { ing: 'rice' }), mkItem('Meatloaf', { ing: 'beef' })]]]);
  const meta = { source: "Eat UNC's Nov 5 listing", kind: 'third_party' as const, asOf: '2026-11-05' };
  const r = borrowNutrition(d, [
    { hall: 'chase', name: 'Grilled Chicken', calories: 250, protein: 38 },
    { hall: 'top-of-lenoir', name: 'Fried Rice', calories: 300, protein: 6 },
    { hall: 'chase', name: 'Meatloaf', calories: 400, protein: 20 }, { hall: 'chase', name: 'Meatloaf', calories: 450, protein: 22 },
  ], meta);
  assert.equal(r.borrowed, 1); assert.equal(r.ambiguous, 1);
  const by = (n: string) => Object.values(d.items).find(i => i.name === n)!;
  assert.equal(by('Grilled Chicken').nutrition.calories, 250);
  assert.equal(by('Grilled Chicken').nutrition.borrowed, true);
  assert.match(by('Grilled Chicken').warnings[0], /borrowed from Eat UNC/);
  assert.equal(by('Fried Rice').nutrition.calories, null);
  assert.equal(by('Meatloaf').nutrition.calories, null);
});
test('totalsFor adds published values only', () => {
  const t = totalsFor([{ item: mkItem('A', { nutrition: nut(100, 10, 1, 5) }), portions: 2 }, { item: mkItem('B', { nutrition: nut(50, null, 1, 5) }), portions: 1 }]);
  assert.equal(t.calories.value, 250); assert.equal(t.protein.value, null); assert.equal(t.protein.min, 20);
});

test('animal diets with no main dish get a plate of animal foods (structure fallback, rules unchanged)', () => {
  const d = day([['Salad Bar', [mkItem('Plain Greek Yogurt', { ing: 'cultured milk', allergens: ['milk'] }), mkItem('Cottage Cheese', { ing: 'milk cream salt', allergens: ['milk'] }), mkItem('Orange Slices', { ing: 'oranges' }), mkItem('Brown Rice', { ing: 'rice' })]]]);
  const r = buildMeals(d, 'Dinner', defaultProfile('carnivore'));
  assert.equal(r.fallback, 'animal_plate');
  assert.match(r.banner!, /diet rules were not changed/);
  assert.ok(r.meals[0].parts.every(p => p.role === 'side'));
  assert.deepEqual(r.meals[0].parts.map(p => p.item.name).sort(), ['Cottage Cheese', 'Plain Greek Yogurt']);
});
test('ice cream, bakery and bread stations (Lenoir names) are never meal parts', () => {
  for (const st of ['Ice Cream Bar', 'Specialty Bakery', 'Breads and Bagels', 'Hummus Bar']) assert.equal(courseOf(mkItem('Vanilla Ice Cream'), st).course, 'skip', st);
});

test('common sense: garnishes are never sides; plain starch is never a main; no two sides of the same kind', async () => {
  const { sideTier } = await import('../src/core/meals.ts');
  for (const n of ['Toasted Sunflower Seeds', 'Sliced Scallions', 'Bacon Pieces', 'Raisins', 'Red Onions', 'Shredded Cheddar Cheese', 'Black Olives']) assert.equal(sideTier(mkItem(n), 'Salad Bar', null), 2, n);
  assert.equal(sideTier(mkItem('Plain Greek Yogurt'), 'Salad Bar', null), 0);
  assert.equal(sideTier(mkItem('Orange Slices'), 'Salad Bar', 'fruit'), 0);
  assert.equal(sideTier(mkItem('Sliced Turkey'), 'Deli', 'protein'), 1);
  for (const n of ['Pasta Noodles', 'Sushi Rice', 'Steamed White Rice', 'Quinoa']) assert.notEqual(courseOf(mkItem(n), 'Pasta').course, 'main', n);
  assert.equal(courseOf(mkItem('Blue Cheese Dressing - Catering'), 'Salad Bar').course, 'skip');
  const d = day([['Grill', [mkItem('Grilled Chicken', { ing: 'chicken' })]],
    ['Salad Bar', [mkItem('Plain Greek Yogurt', { ing: 'cultured milk' }), mkItem('Vanilla Yogurt', { ing: 'milk sugar vanilla' }), mkItem('Toasted Sunflower Seeds', { ing: 'sunflower seeds' }), mkItem('Steamed Broccoli', { ing: 'broccoli' })]]]);
  for (const m of buildMeals(d, 'Dinner', defaultProfile('none')).meals) {
    const names = m.parts.map(p => p.item.name);
    assert.ok(!names.includes('Toasted Sunflower Seeds'), names.join());
    assert.ok(!(names.includes('Plain Greek Yogurt') && names.includes('Vanilla Yogurt')), names.join());
  }
});
test('common sense: run-together ingredient words still reveal foods (safe direction)', async () => {
  const { evidence } = await import('../src/core/engine.ts');
  const it = mkItem('Smoked Salmon Sushi', { ing: 'fish salmon smoked sliced fresh salmon smokedcucumbercheese cream loaf cultureshredded carrotginger' });
  assert.equal(evidence(it, 'vegetables', { ignoreSeasonings: true }).state, 'yes');
  assert.equal(evaluateItem(it, defaultProfile('carnivore')).status, 'excluded');
});
test('common sense: implausible borrowed nutrition is ignored, never used', () => {
  const d = day([['Deli', [mkItem('Swiss Cheese', { ing: 'milk' }), mkItem('Grilled Chicken', { ing: 'chicken' })]]]);
  const meta = { source: "Eat UNC's Nov 5 listing", kind: 'third_party' as const, asOf: '2026-11-05' };
  const r = borrowNutrition(d, [{ hall: 'chase', name: 'Swiss Cheese', calories: 1780, protein: 136 }, { hall: 'chase', name: 'Grilled Chicken', calories: 250, protein: 38 }], meta);
  assert.equal(r.rejected, 1); assert.equal(r.borrowed, 1);
  const sw = Object.values(d.items).find(i => i.name === 'Swiss Cheese')!;
  assert.equal(sw.nutrition.calories, null);
  assert.match(sw.warnings[0], /not plausible for one serving/);
});
