import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, dateRange, nyNow, servingNow } from '../src/core/schedule.ts';
import { computeMissing } from '../src/core/validate.ts';
import type { MenuDay } from '../src/core/types.ts';

const d = (periods: any[], date = '2026-11-10'): MenuDay => ({ hall: 'chase', date, periods, items: {}, noMenuPosted: false, notes: [], provenance: { source: 't', kind: 'official', retrievedAt: null, verification: 'user_saved_page' } });
const per = (name: string, s: number | null, e: number | null) => ({ name, hours: s === null ? null : 'x', startMin: s, endMin: e, stations: [] });

test('America/New_York date and minutes (DST aware)', () => {
  assert.deepEqual(nyNow(new Date('2026-11-10T15:30:00Z')), { date: '2026-11-10', minutes: 10 * 60 + 30 });
  assert.deepEqual(nyNow(new Date('2026-07-01T03:30:00Z')), { date: '2026-06-30', minutes: 23 * 60 + 30 });
});
test('serving now / next / closed', () => {
  const day = d([per('Lunch', 660, 900), per('Dinner', 1020, 1200)]);
  assert.equal(servingNow(day, { date: '2026-11-10', minutes: 700 }).state, 'serving');
  assert.equal(servingNow(day, { date: '2026-11-10', minutes: 950 }).state, 'next');
  assert.equal(servingNow(day, { date: '2026-11-10', minutes: 1300 }).state, 'closed');
  assert.equal(servingNow(day, { date: '2026-11-11', minutes: 700 }).state, 'not_today');
});
test('"Serving time unverified" when a period has no published hours', () => {
  const day = d([per('Lunch', 660, 900), per('Brunch', null, null)]);
  assert.equal(servingNow(day, { date: '2026-11-10', minutes: 1300 }).state, 'unverified');
});
test('date helpers and coverage (imported / no menu / missing)', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(dateRange('2026-11-09', '2026-11-11').length, 3);
  const a = d([per('L', 1, 2)], '2026-11-09'); const b = { ...d([], '2026-11-10'), noMenuPosted: true };
  const c = computeMissing([a, b], 'chase', '2026-11-09', '2026-11-11');
  assert.deepEqual([c.imported, c.noMenu, c.missing], [1, 1, 1]);
  assert.equal(computeMissing([a], 'top-of-lenoir', '2026-11-09', '2026-11-09').missing, 1);
});

// Bug fixed Nov 11: the Today page said "Today's meal" while showing another day's menu.
test('BUG: the meal heading names the date unless it really is today (America/New_York)', async () => {
  const { mealHeading } = await import('../src/core/schedule.ts');
  assert.equal(mealHeading('2026-11-10', '2026-11-10'), 'Today’s meal');
  assert.equal(mealHeading('2026-11-11', '2026-11-10'), 'Tomorrow’s meal · Wed, Nov 11');
  assert.equal(mealHeading('2026-11-16', '2026-11-10'), 'Meal for Mon, Nov 16');
  assert.equal(mealHeading('2026-11-09', '2026-11-10'), 'Meal for Mon, Nov 9');
});
