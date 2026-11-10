import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPageFile, parseBinaryPlist } from '../src/sources/bplist.ts';
import { PageError, parsePeriodLabel, parseUncPage } from '../src/sources/unc-page.ts';
import { page, webArchive } from './fixtures.ts';

const prov = { source: 't', retrievedAt: '2026-11-10T15:00:00.000Z' };
const basic = page({ periods: [
  { label: 'Lunch (11am-3pm)', stations: [{ name: 'Grill', items: [
    { name: 'Chicken &amp; Rice', ing: 'chicken rice salt', cls: 'allergen-has_wheat allergen-has_gluten prop-halal prop-smart_choice', id: '1' },
    { name: 'Plain Salad', ing: '', cls: 'prop-vegan prop-vegetarian prop-made_without_gluten', id: '2' },
  ] }] },
  { label: 'Dinner (5pm-8pm)', stations: [{ name: 'Pizza', items: [{ name: 'Cheese Pizza', ing: 'flour cheese', cls: 'allergen-has_milk prop-mystery', id: '3' }] }] },
] });

test('binary web archive and plain HTML parse identically', () => {
  const a = parseUncPage(readPageFile(webArchive(basic)), prov);
  const b = parseUncPage(readPageFile(new TextEncoder().encode(basic)), prov);
  assert.deepEqual(a, b);
});
test('hall and New York date', () => {
  const d = parseUncPage(basic, prov);
  assert.equal(d.hall, 'chase');
  assert.equal(d.date, '2026-11-14'); // 1794632400 = midnight EST on Nov 14
  const lenoir = parseUncPage(page({ slug: 'top-of-lenoir', epoch: 1794632400, periods: [{ label: 'Lunch', stations: [{ name: 'S', items: [{ name: 'X', ing: 'x' }] }] }] }), prov);
  assert.equal(lenoir.hall, 'top-of-lenoir');
});
test('periods, hours and tab/panel order', () => {
  const d = parseUncPage(basic, prov);
  assert.deepEqual(d.periods.map(p => p.name), ['Lunch', 'Dinner']);
  assert.equal(d.periods[1].startMin, 17 * 60);
  assert.equal(d.periods[1].endMin, 20 * 60);
  assert.equal(parsePeriodLabel('Late Night (10pm-12am)').endMin, 24 * 60);
  assert.equal(parsePeriodLabel('Brunch').hours, null);
});
test('allergen and diet flag mapping; gluten treated as wheat; entities decoded', () => {
  const d = parseUncPage(basic, prov);
  const it = d.items['1'];
  assert.equal(it.name, 'Chicken & Rice');
  assert.deepEqual(it.allergens, ['wheat']);
  assert.equal(it.labels.halal, true);
  assert.equal(d.items['2'].labels.vegan, true);
  assert.equal(d.items['2'].labels.madeWithoutGluten, true);
});
test('unknown classes are reported; decorative ones are not', () => {
  const d = parseUncPage(basic, prov);
  assert.deepEqual(d.unknownClasses, ['prop-mystery']);
});
test('empty ingredient text is null, never empty or "none"', () => {
  assert.equal(parseUncPage(basic, prov).items['2'].ingredients, null);
});
test('nutrition is unknown (null), never zero', () => {
  const n = parseUncPage(basic, prov).items['1'].nutrition;
  assert.deepEqual(n, { calories: null, protein: null, fat: null, carbs: null });
});
test('rejects non-UNC pages, unsupported halls, no date', () => {
  assert.throws(() => parseUncPage('<html><body>hi</body></html>', prov), PageError);
  assert.throws(() => parseUncPage(page({ slug: 'lenoir-hall', periods: [] }), prov), /supports Chase and Top of Lenoir/);
  assert.throws(() => parseUncPage(page({ epoch: null, periods: [] }), prov), /menu date/);
});
test('valid page with a date but no periods is "no menu posted", not an error', () => {
  const d = parseUncPage(page({ periods: [] }), prov);
  assert.equal(d.noMenuPosted, true);
  assert.equal(d.periods.length, 0);
  assert.match(d.notes.join(' '), /No menu was posted/);
});
test('bplist rejects junk', () => {
  assert.throws(() => parseBinaryPlist(new Uint8Array(64)), /bplist00/);
});
