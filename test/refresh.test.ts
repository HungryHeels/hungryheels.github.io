import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffDays, staleness, refreshChecklist, checklistCounts, dedupeBatch, isMenuFile } from '../src/core/refresh.ts';
import type { MenuDay, MenuItem } from '../src/core/types.ts';
import { mkItem } from './fixtures.ts';

function mk(date: string, items: MenuItem[], opts: { saved?: string | null; hours?: string; periods?: string[]; hall?: 'chase' | 'top-of-lenoir' } = {}): MenuDay {
  const rec: Record<string, MenuItem> = {}; for (const i of items) rec[i.id] = i;
  return { hall: opts.hall ?? 'chase', date, noMenuPosted: items.length === 0, notes: [], items: rec,
    provenance: { source: 't', kind: 'official', retrievedAt: opts.saved === undefined ? '2026-11-10T15:00:00Z' : opts.saved, verification: 'user_saved_page' },
    periods: items.length ? (opts.periods ?? ['Dinner']).map(n => ({ name: n, hours: opts.hours ?? '5pm-8pm', startMin: 1020, endMin: 1200, stations: [{ name: 'Grill', itemIds: items.map(i => i.id) }] })) : [] };
}

test('diffDays: added, removed, changed ingredients and allergens, period and hours changes', () => {
  const a = mkItem('Grilled Chicken', { ing: 'chicken, salt' }), b = mkItem('Rice', { ing: 'rice' }), c = mkItem('Tofu', { ing: 'tofu' });
  const a2 = { ...a, ingredients: 'chicken, salt, soy sauce', allergens: ['soy', 'wheat'] };
  const before = mk('2026-11-12', [a, b]);
  const after = mk('2026-11-12', [a2, c], { hours: '5pm-9pm', periods: ['Dinner', 'Late Night'] });
  const d = diffDays(before, after);
  assert.equal(d.same, false);
  assert.deepEqual(d.added, ['Tofu']);
  assert.deepEqual(d.removed, ['Rice']);
  assert.equal(d.changed.length, 1);
  assert.ok(d.changed[0].what.includes('ingredients changed'));
  assert.ok(d.changed[0].what.some(w => /allergens \+soy, wheat/.test(w)));
  assert.deepEqual(d.periodsAdded, ['Late Night']);
  assert.deepEqual(d.hoursChanged, [{ period: 'Dinner', from: '5pm-8pm', to: '5pm-9pm' }]);
  assert.match(d.summary, /1 new item.*1 item gone.*1 item changed/);
  assert.equal(diffDays(before, before).same, true);
  assert.equal(diffDays(mk('2026-11-25', []), before).menuStatus, 'now_posted');
});
test('staleness: future days saved 7+ days ago are stale; past days never are; unknown save time is flagged', () => {
  const d = mk('2026-11-20', [mkItem('X')], { saved: '2026-11-10T15:00:00Z' });
  assert.equal(staleness(d, '2026-11-12').stale, false);
  const s = staleness(d, '2026-11-19');
  assert.equal(s.stale, true); assert.equal(s.ageDays, 9); assert.match(s.text, /Menu page saved 9 days ago; menus can change/);
  assert.equal(staleness(mk('2026-11-12', [mkItem('X')], { saved: '2026-11-01T15:00:00Z' }), '2026-11-19').stale, false, 'past day');
  assert.equal(staleness(mk('2026-11-20', [mkItem('X')], { saved: null }), '2026-11-19').stale, true);
  // America/New_York: 03:30Z on Nov 11 is still Nov 10 in New York.
  assert.equal(staleness(mk('2026-11-20', [mkItem('X')], { saved: '2026-11-11T03:30:00Z' }), '2026-11-11').ageDays, 1);
});
test('refreshChecklist: one row per hall per day for the next 14 days', () => {
  const days = [mk('2026-11-10', [mkItem('X')]), mk('2026-11-11', [], {}), mk('2026-11-12', [mkItem('X')], { hall: 'top-of-lenoir' })];
  const rows = refreshChecklist(days, '2026-11-10', 14);
  assert.equal(rows.length, 28);
  assert.equal(rows[0].status, 'ok');
  assert.equal(rows.find(r => r.date === '2026-11-11' && r.hall === 'chase')!.status, 'no_menu');
  assert.equal(rows.find(r => r.date === '2026-11-12' && r.hall === 'top-of-lenoir')!.status, 'ok');
  assert.equal(rows[rows.length - 1].date, '2026-11-23');
  const c = checklistCounts(rows);
  assert.equal(c.ok + c.stale + c.no_menu + c.missing, 28);
  assert.equal(c.missing, 25);
});
test('dedupeBatch keeps the most recent save of the same hall and date', () => {
  const old = { file: 'a', day: mk('2026-11-12', [mkItem('X')], { saved: '2026-11-01T00:00:00Z' }) };
  const nu = { file: 'b', day: mk('2026-11-12', [mkItem('Y')], { saved: '2026-11-09T00:00:00Z' }) };
  const other = { file: 'c', day: mk('2026-11-13', [mkItem('Y')]) };
  const r = dedupeBatch([nu, old, other]);
  assert.deepEqual(r.keep.map(x => x.file).sort(), ['b', 'c']);
  assert.equal(r.dropped[0].entry.file, 'a');
});
test('isMenuFile accepts saved pages only and skips macOS resource forks', () => {
  assert.ok(isMenuFile('Chase.webarchive')); assert.ok(isMenuFile('menus/Lenoir.HTML'));
  assert.ok(!isMenuFile('notes.txt')); assert.ok(!isMenuFile('._Chase.webarchive')); assert.ok(!isMenuFile('menus/._x.html'));
});
