import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareHalls, liveState, liveText, plateText, rankHalls, recentMains } from '../src/core/discover.ts';
import { buildMeals } from '../src/core/meals.ts';
import { defaultProfile } from '../src/core/profile.ts';
import type { MenuDay, MenuItem, Period } from '../src/core/types.ts';
import { mkItem } from './fixtures.ts';

const P = (name: string, s: number | null, e: number | null, ids: string[]): Period => ({ name, hours: s === null ? null : 'x', startMin: s, endMin: e, stations: [{ name: 'Grill', itemIds: ids }] });
function day(date: string, periods: Period[], items: MenuItem[], hall: 'chase' | 'top-of-lenoir' = 'chase'): MenuDay {
  const rec: Record<string, MenuItem> = {}; for (const i of items) rec[i.id] = i;
  return { hall, date, noMenuPosted: false, notes: [], items: rec, periods, provenance: { source: 't', kind: 'official', retrievedAt: null, verification: 'user_saved_page' } };
}
const ch = mkItem('Grilled Chicken', { ing: 'chicken' }), br = mkItem('Steamed Broccoli', { ing: 'broccoli' }), gr = mkItem('Red Grapes', { ing: 'grapes' });
const ids = [ch.id, br.id, gr.id];

test('liveState: serving with countdown, next up, and late night past midnight from yesterday', () => {
  const t = day('2026-12-03', [P('Lunch', 660, 840, ids), P('Dinner', 1020, 1200, ids), P('Late Night', 1260, 1500, ids)], [ch, br, gr]);
  const s = liveState(t, null, { date: '2026-12-03', minutes: 1100 });
  assert.equal(s.state, 'serving'); assert.match(liveText(s), /Dinner: serving now, ends in 1 h 40 min/);
  const n = liveState(t, null, { date: '2026-12-03', minutes: 600 });
  assert.equal(n.state, 'next'); assert.match(liveText(n), /Lunch starts in 1 h/);
  const tomorrow = day('2026-12-04', [P('Breakfast', 450, 600, ids)], [ch, br, gr]);
  const late = liveState(tomorrow, t, { date: '2026-12-04', minutes: 30 });
  assert.equal(late.state, 'serving'); assert.equal((late as any).period.name, 'Late Night'); assert.equal((late as any).minutesLeft, 30);
  assert.equal(liveState(day('2026-12-03', [P('Brunch', null, null, ids)], [ch]), null, { date: '2026-12-03', minutes: 600 }).state, 'unverified');
});
test('compareHalls ranks halls by best fit for the same period and says when a hall lacks it', () => {
  const a = day('2026-11-13', [P('Dinner', 1020, 1200, ids)], [ch, br, gr]);
  const b = day('2026-11-13', [P('Lunch', 660, 840, ids)], [ch, br, gr], 'top-of-lenoir');
  const picks = compareHalls([{ hall: 'chase', today: a, yesterday: null }, { hall: 'top-of-lenoir', today: b, yesterday: null }], 'Dinner', defaultProfile('none'), { date: '2026-11-10', minutes: 0 });
  const r = rankHalls(picks);
  assert.equal(r[0].hall, 'chase'); assert.ok(r[0].best);
  assert.match(r[1].why, /no Dinner/);
});
test('recentMains + variety: a main eaten this week is ranked lower, never excluded', () => {
  const tofu = mkItem('Tofu Curry Bowl', { ing: 'tofu, rice' });
  const d = day('2026-11-13', [P('Dinner', 1020, 1200, [ch.id, tofu.id, br.id, gr.id])], [ch, tofu, br, gr]);
  const base = buildMeals(d, 'Dinner', defaultProfile('none')).meals[0].parts[0].item.name;
  const recent = recentMains([{ date: '2026-11-11', hall: 'chase', period: 'Dinner', main: base, items: [], at: '' }], '2026-11-13');
  const r = buildMeals(d, 'Dinner', defaultProfile('none'), { recentMains: recent });
  assert.notEqual(r.meals[0].parts[0].item.name, base);
  assert.ok(r.meals.some(m => m.parts[0].item.name === base), 'still available');
  assert.equal(recentMains([{ date: '2026-11-01', hall: 'chase', period: 'x', main: 'X', items: [], at: '' }], '2026-11-13').size, 0);
});
test('plateText: plain text with totals, gaps and the disclaimer', () => {
  const d = day('2026-11-13', [P('Dinner', 1020, 1200, ids)], [ch, br, gr]);
  const m = buildMeals(d, 'Dinner', defaultProfile('none')).meals[0];
  const t = plateText(m, d, { ...defaultProfile('none'), targets: { protein: 40 } }, 'Not medical advice.');
  assert.match(t, /^Dinner at Chase, Fri, Nov 13/); assert.match(t, /• Grilled Chicken/); assert.match(t, /Calories unknown/); assert.match(t, /Protein .*can't tell/); assert.match(t, /unofficial.*Not medical advice\./);
});
