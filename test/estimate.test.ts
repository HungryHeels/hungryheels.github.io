import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { attachEstimates, effective, estimateItem } from '../src/core/estimate.ts';
import { buildMeals, totalsFor } from '../src/core/meals.ts';
import { evaluateItem } from '../src/core/engine.ts';
import { gapReadout, totalText } from '../src/core/plan.ts';
import { defaultProfile } from '../src/core/profile.ts';
import { borrowNutrition } from '../src/core/borrow.ts';
import { decodeSeed } from '../src/core/seed.ts';
import { SEED_B64 } from '../src/client/seed-data.ts';
import { EAT_UNC_META, EAT_UNC_SNAPSHOT } from '../src/sources/snapshot-data.ts';
import type { MenuDay, MenuItem } from '../src/core/types.ts';
import { mkItem } from './fixtures.ts';

test('estimates come from the dish name or main ingredient, with a plain basis sentence', () => {
  const e = estimateItem(mkItem('Roasted Lemon-Rosemary Chicken', { ing: 'chicken thighs, lemon, rosemary' }))!;
  assert.equal(e.ref, 'chicken, roasted'); assert.equal(e.matchedBy, 'name');
  assert.ok(e.calories > 100 && e.calories < 400 && e.protein > 20);
  assert.match(e.basis, /^Estimated from typical values for chicken, roasted and a \d+ g \(about [\d.]+ oz\) serving.*Not from UNC/);
  assert.equal(estimateItem(mkItem('Jerk Chicken with Pineapple Salsa'))!.ref, 'chicken, roasted', '"with salsa" is still chicken');
  assert.equal(estimateItem(mkItem('Penne Pasta with Marinara Sauce'))!.ref, 'pasta with sauce');
  assert.equal(estimateItem(mkItem('Strawberry Cheesecake Ice Cream'))!.ref, 'ice cream', 'ice cream is not a drink');
  assert.equal(estimateItem(mkItem('Hamburger Bun'))!.ref, 'bread');
  assert.equal(estimateItem(mkItem('House Special', { ing: 'tofu, broccoli, soy sauce' }))!.matchedBy, 'ingredients');
  assert.equal(estimateItem(mkItem('Unsweet Tea')), null, 'drinks get no estimate');
  assert.equal(estimateItem(mkItem('Mystery', { ing: null })), null);
});
test('estimates never replace a published value and never touch diet or allergy rules', () => {
  const it = mkItem('Grilled Chicken Breast', { ing: 'chicken', allergens: ['soy'], nutrition: { calories: 210, protein: null, fat: null, carbs: null } });
  const before = JSON.stringify(evaluateItem(it, { ...defaultProfile('vegan'), allergens: ['soy'] }));
  attachEstimates([it]);
  assert.equal(it.nutrition.calories, 210, 'published calories kept');
  assert.equal(effective(it, 'calories', true).estimated, false);
  assert.equal(effective(it, 'protein', true).estimated, true);
  assert.equal(effective(it, 'protein', false).value, null, 'estimates off: unknown stays unknown');
  assert.equal(JSON.stringify(evaluateItem(it, { ...defaultProfile('vegan'), allergens: ['soy'] })), before);
});
test('with published calories, estimated fat and carbs are scaled to agree with them', () => {
  const pizza = mkItem('Cheese Pizza', { ing: 'dough, cheese', nutrition: { calories: 180, protein: 10, fat: null, carbs: null } });
  const e = estimateItem(pizza)!;
  assert.equal(e.calories, 180);
  assert.ok(Math.abs(e.protein * 4 + e.fat * 9 + e.carbs * 4 - 180) <= 25, `${e.protein}/${e.fat}/${e.carbs}`);
  assert.match(e.basis, /scaled to its published 180 calories/);
});
test('totals: known minimum, estimate-filled total, and "~" text only when estimates are on', () => {
  const a = mkItem('Grilled Chicken', { ing: 'chicken', nutrition: { calories: 300, protein: 40, fat: null, carbs: null } });
  const b = mkItem('Steamed Broccoli', { ing: 'broccoli' });
  attachEstimates([a, b]);
  const t = totalsFor([{ item: a, portions: 1 }, { item: b, portions: 2 }]);
  assert.equal(t.calories.min, 300); assert.equal(t.calories.complete, false);
  assert.equal(t.calories.est, 300 + 2 * b.nutrition.estimate!.calories); assert.equal(t.calories.estParts, 1);
  assert.equal(totalText(t.calories, 'calories'), '300+ cal');
  assert.match(totalText(t.calories, 'calories', true), /^~\d+ cal$/);
  assert.match(gapReadout(t, { protein: 40 }, null, true)[0].text, /\(estimate\)/);
  assert.equal(gapReadout(t, { protein: 40 }, null, false)[0].estimated, undefined);
});
test('with estimates on, targets can use estimated values (e.g. double a portion); off, nothing is assumed', () => {
  const main = mkItem('Roasted Chicken', { ing: 'chicken, salt' });
  const side1 = mkItem('Steamed Broccoli', { ing: 'broccoli' }), side2 = mkItem('Red Grapes', { ing: 'grapes' });
  attachEstimates([main, side1, side2]);
  const items: Record<string, MenuItem> = {}; for (const i of [main, side1, side2]) items[i.id] = i;
  const d: MenuDay = { hall: 'chase', date: '2026-11-12', noMenuPosted: false, notes: [], items, provenance: { source: 't', kind: 'official', retrievedAt: null, verification: 'user_saved_page' },
    periods: [{ name: 'Dinner', hours: null, startMin: null, endMin: null, stations: [{ name: 'Grill', itemIds: [main.id] }, { name: 'Sides', itemIds: [side1.id, side2.id] }] }] };
  const p = { ...defaultProfile('none'), targets: { protein: 70 }, maxPortion: 2 as const, calorieCap: 2000 };
  const on = buildMeals(d, 'Dinner', p).meals[0];
  assert.equal(on.parts[0].portions, 2, 'about 33 g estimated per portion, so 2 portions get closer to 70 g');
  assert.match(on.targetNotes.join(' '), /partly estimated/);
  const off = buildMeals(d, 'Dinner', { ...p, useEstimates: false }).meals[0];
  assert.equal(off.parts[0].portions, 1, 'with estimates off, no portion is doubled on a guess');
});
test('CALIBRATION: on dishes with published Eat UNC numbers, estimates are within the stated accuracy, and nearly every dish gets one', () => {
  const days = decodeSeed(JSON.parse(gunzipSync(Buffer.from(SEED_B64, 'base64')).toString('utf8')));
  for (const d of days) borrowNutrition(d, EAT_UNC_SNAPSHOT, EAT_UNC_META);
  const items = new Map<string, MenuItem>(); for (const d of days) for (const it of Object.values(d.items)) items.set(d.hall + ':' + it.id, it);
  const all = [...items.values()];
  const errs: number[] = [], perr: number[] = [];
  for (const it of all) {
    const e = estimateItem(it, { scaleToPublished: false }); const c = it.nutrition.calories;
    if (!e || c === null || c <= 0) continue;
    errs.push(Math.abs(e.calories - c) / c);
    if (it.nutrition.protein !== null && it.nutrition.protein >= 3) perr.push(Math.abs(e.protein - it.nutrition.protein));
  }
  const med = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const within30 = errs.filter(x => x <= 0.3).length / errs.length;
  assert.ok(errs.length >= 450, `compared ${errs.length}`);
  assert.ok(med(errs) <= 0.35, `median calorie error ${Math.round(med(errs) * 100)}%`);
  assert.ok(within30 >= 0.45, `within 30%: ${Math.round(within30 * 100)}% (the site says "about half")`);
  assert.ok(med(perr) <= 3, `median protein error ${med(perr)} g (the site says "usually within 2 g")`);
  const unknown = all.filter(i => i.nutrition.calories === null);
  assert.ok(unknown.filter(i => estimateItem(i)).length / unknown.length >= 0.99, 'almost every dish without numbers gets an estimate');
});
