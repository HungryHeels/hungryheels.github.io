import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mealChecklist, reportIssueUrl, staffFlags } from '../src/core/trust.ts';
import { buildMeals } from '../src/core/meals.ts';
import { explainChecks } from '../src/core/engine.ts';
import { defaultProfile } from '../src/core/profile.ts';
import type { MenuDay, MenuItem } from '../src/core/types.ts';
import { mkItem } from './fixtures.ts';

function day(items: Array<[string, MenuItem[]]>): MenuDay {
  const rec: Record<string, MenuItem> = {}; for (const [, l] of items) for (const i of l) rec[i.id] = i;
  return { hall: 'top-of-lenoir', date: '2026-11-12', noMenuPosted: false, notes: [], items: rec, provenance: { source: 't', kind: 'official', retrievedAt: '2026-11-10T15:00:00Z', verification: 'user_saved_page' },
    periods: [{ name: 'Dinner', hours: '5pm-8pm', startMin: 1020, endMin: 1200, stations: items.map(([n, l]) => ({ name: n, itemIds: l.map(i => i.id) })) }] };
}
const vegLab = { vegan: true, vegetarian: true, halal: false, madeWithoutGluten: false };

test('mealChecklist: one row per rule, combined over parts, naming the deciding evidence', () => {
  const d = day([['Grill', [mkItem('Black Bean Burger Bowl', { ing: 'black beans, rice, peppers', labels: vegLab })]], ['Sides', [mkItem('Steamed Broccoli', { ing: 'broccoli' }), mkItem('Red Grapes', { ing: 'grapes' })]]]);
  const p = { ...defaultProfile('vegan'), allergens: ['milk' as const] };
  const m = buildMeals(d, 'Dinner', p).meals[0];
  const rows = mealChecklist(m, p);
  const milk = rows.find(r => r.label === 'milk allergy')!;
  assert.equal(milk.outcome, 'pass'); assert.equal(milk.parts.length, m.parts.length);
  assert.match(milk.decidedBy, /Decided by: /);
  const dairy = rows.find(r => r.label === 'no dairy')!;
  assert.ok(dairy.parts.some(x => x.basis === 'label'), 'the vegan-labeled bowl passes dairy by its label');
});
test('staffFlags: allergy always asks to confirm; label conflicts and unconfirmed parts are named', () => {
  const d = day([['Grill', [mkItem('Grilled Chicken', { ing: 'chicken' })]], ['Sides', [mkItem('Veg Soup Cup', { ing: 'water carrots broth salt' }), mkItem('Red Grapes', { ing: 'grapes' })]]]);
  const plain = buildMeals(d, 'Dinner', defaultProfile('none')).meals[0];
  assert.deepEqual(staffFlags(plain, defaultProfile('none')), []);
  const p = { ...defaultProfile('none'), allergens: ['fish' as const] };
  assert.match(staffFlags(buildMeals(d, 'Dinner', p).meals[0], p)[0], /confirm with dining staff/);
  // Real case: "Wheat Bread Slice" is labeled vegan but UNC flags milk. A vegetarian allows milk, so it can be
  // recommended, but the contradiction must still be shown.
  const d2 = day([['Grill', [mkItem('Grilled Tofu Sandwich', { ing: 'tofu, wheat bread', allergens: ['milk', 'wheat', 'soy'], labels: vegLab })]], ['Sides', [mkItem('Steamed Broccoli', { ing: 'broccoli' }), mkItem('Red Grapes', { ing: 'grapes' })]]]);
  const v = defaultProfile('vegetarian');
  const m2 = buildMeals(d2, 'Dinner', v).meals[0];
  assert.equal(m2.parts[0].item.name, 'Grilled Tofu Sandwich');
  assert.ok(staffFlags(m2, v).some(f => /label contradicts/.test(f)));
});
test('reportIssueUrl: opens a prefilled GitHub issue with evidence and no personal data', () => {
  const it = mkItem('Mahi Mahi with Mango Salsa', { ing: 'mahi mahi, mango', allergens: ['fish'], labels: vegLab });
  const p = defaultProfile('vegan');
  const url = reportIssueUrl({ hall: 'chase', date: '2026-11-12', period: 'Dinner', items: [it], profileSummary: 'Vegan', checks: [{ name: it.name, rows: explainChecks(it, p) }], verdict: 'Not for you', savedAt: '2026-11-10T15:00:00Z' });
  assert.ok(url.startsWith('https://github.com/HungryHeels/hungryheels.github.io/issues/new?title='));
  const u = new URL(url);
  assert.match(u.searchParams.get('title')!, /Mahi Mahi with Mango Salsa \(Chase, 2026-11-12, Dinner\)/);
  const body = u.searchParams.get('body')!;
  assert.match(body, /UNC allergens: fish/); assert.match(body, /FAIL no fish: UNC lists fish as an allergen even though it is labeled vegan \[UNC allergen list\]/);
  assert.doesNotMatch(body, /@|email/i);
  assert.ok(url.length < 8000);
});
