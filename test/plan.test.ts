import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gapReadout, hitsTargets, planDay, planPeriods, recheckSaved, toSaved, totalText } from '../src/core/plan.ts';
import { buildMeals, totalsFor } from '../src/core/meals.ts';
import { defaultProfile } from '../src/core/profile.ts';
import type { MenuDay, MenuItem } from '../src/core/types.ts';
import { mkItem } from './fixtures.ts';

const nut = (c: number | null, p: number | null, f: number | null = null, cb: number | null = null) => ({ calories: c, protein: p, fat: f, carbs: cb });
function day(periods: Array<[string, Array<[string, MenuItem[]]>]>): MenuDay {
  const items: Record<string, MenuItem> = {};
  for (const [, sts] of periods) for (const [, l] of sts) for (const i of l) items[i.id] = i;
  return { hall: 'chase', date: '2026-11-12', noMenuPosted: false, notes: [], items, provenance: { source: 't', kind: 'official', retrievedAt: null, verification: 'user_saved_page' },
    periods: periods.map(([name, sts]) => ({ name, hours: null, startMin: null, endMin: null, stations: sts.map(([n, l]) => ({ name: n, itemIds: l.map(i => i.id) })) })) };
}

test('totalText shows minimums for unknown parts ("280+ cal") and never 0', () => {
  const t = totalsFor([{ item: mkItem('A', { nutrition: nut(280, 20) }), portions: 1 }, { item: mkItem('B'), portions: 1 }]);
  assert.equal(totalText(t.calories, 'calories'), '280+ cal');
  assert.equal(totalText(totalsFor([{ item: mkItem('B'), portions: 1 }]).calories, 'calories'), 'unknown');
  assert.equal(totalText(totalsFor([{ item: mkItem('A', { nutrition: nut(280, 20) }), portions: 2 }]).protein, 'protein'), '40 g');
});
test('gapReadout: honest gap text for known, partial and unknown totals', () => {
  const known = totalsFor([{ item: mkItem('A', { nutrition: nut(500, 32, 10, 50) }), portions: 1 }]);
  const g = gapReadout(known, { protein: 40, fat: 10 });
  assert.equal(g[0].status, 'under'); assert.match(g[0].text, /32 g of 40 g: 8 g short/);
  assert.equal(g[1].status, 'on_target');
  const part = totalsFor([{ item: mkItem('A', { nutrition: nut(500, 45) }), portions: 1 }, { item: mkItem('B'), portions: 1 }]);
  assert.equal(gapReadout(part, { protein: 40 })[0].status, 'at_least_target');
  assert.equal(gapReadout(part, { fat: 20 })[0].status, 'cannot_tell');
  assert.match(gapReadout(part, {}, 1000)[0].text, /500\+ cal; can't confirm/);
  assert.equal(hitsTargets(known, { protein: 32 }), true);
  assert.equal(hitsTargets(part, { protein: 45 }), false, 'unknown parts never count as on target');
});
test('closest possible: when no meal can hit the target, the closest one is returned with its gap', () => {
  const d = day([['Dinner', [['Grill', [mkItem('Grilled Chicken', { ing: 'chicken', nutrition: nut(200, 30, 5, 0) })]], ['Sides', [mkItem('Steamed Broccoli', { ing: 'broccoli', nutrition: nut(30, 3, 0, 6) }), mkItem('Brown Rice', { ing: 'rice', nutrition: nut(200, 4, 2, 44) })]]]]]);
  const p = { ...defaultProfile('none'), targets: { protein: 200 }, maxPortion: 3 as const, calorieCap: 3000 };
  const m = buildMeals(d, 'Dinner', p).meals[0];
  assert.ok(m, 'a closest meal is still shown');
  const g = gapReadout(m.totals, p.targets)[0];
  assert.equal(g.status, 'under');
  assert.match(g.text, /short/);
});
test('planPeriods uses only periods the page has', () => {
  const it = mkItem('Grilled Chicken', { ing: 'chicken' });
  assert.deepEqual(planPeriods(day([['Continental', [['G', [it]]]], ['Brunch', [['G', [it]]]]])).map(x => x.slot + ':' + x.period), ['Breakfast:Continental', 'Lunch:Brunch']);
  assert.deepEqual(planPeriods(day([['Breakfast', [['G', [it]]]], ['Lunch', [['G', [it]]]], ['Dinner', [['G', [it]]]]])).map(x => x.period), ['Breakfast', 'Lunch', 'Dinner']);
});
test('planDay picks one meal per period against daily targets, varies mains, and keeps rules', () => {
  const chicken = mkItem('Grilled Chicken', { ing: 'chicken', nutrition: nut(300, 45, 8, 0) });
  const tofu = mkItem('Tofu Stir Fry', { ing: 'tofu, peppers', nutrition: nut(350, 20, 12, 30) });
  const eggs = mkItem('Scrambled Eggs Bowl', { ing: 'eggs', allergens: ['egg'], nutrition: nut(250, 18, 15, 2) });
  const broc = mkItem('Steamed Broccoli', { ing: 'broccoli', nutrition: nut(30, 3, 0, 6) });
  const st = (...x: MenuItem[]): Array<[string, MenuItem[]]> => [['Grill', x.slice(0, -1)], ['Sides', [x[x.length - 1]]]];
  const d = day([['Breakfast', st(eggs, chicken, broc)], ['Lunch', st(chicken, tofu, broc)], ['Dinner', st(chicken, tofu, broc)]]);
  const p = { ...defaultProfile('none'), allergens: ['egg' as const] };
  const plan = planDay(d, p, { protein: 120 });
  assert.equal(plan.slots.length, 3);
  for (const s of plan.slots) if (s.meal) for (const part of s.meal.parts) assert.ok(!part.item.allergens.includes('egg'));
  const mains = plan.slots.filter(s => s.meal).map(s => s.meal!.parts[0].item.name);
  assert.ok(new Set(mains).size >= 2, 'varies mains across the day: ' + mains.join(', '));
  assert.equal(plan.gaps[0].key, 'protein');
});
test('saved meals are re-checked against current rules and data', () => {
  const chicken = mkItem('Grilled Chicken', { ing: 'chicken, soy sauce', allergens: ['soy'] });
  const broc = mkItem('Steamed Broccoli', { ing: 'broccoli' });
  const d = day([['Dinner', [['Grill', [chicken]], ['Sides', [broc]]]]]);
  const m = buildMeals(d, 'Dinner', defaultProfile('none')).meals[0];
  const saved = toSaved(m, d, new Date('2026-11-12T12:00:00Z'));
  assert.equal(recheckSaved(saved, d, defaultProfile('none')).ok, true);
  const r = recheckSaved(saved, d, { ...defaultProfile('none'), allergens: ['soy'] });
  assert.equal(r.ok, false); assert.match(r.problems[0], /no longer fits/);
  assert.equal(recheckSaved(saved, null, defaultProfile('none')).ok, false);
});
