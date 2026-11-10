import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { decodeSeed } from '../src/core/seed.ts';
import { SEED_B64 } from '../src/client/seed-data.ts';
import { buildMeals } from '../src/core/meals.ts';
import { evidence, evaluateItem } from '../src/core/engine.ts';
import { defaultProfile, type PatternId } from '../src/core/profile.ts';

const days = decodeSeed(JSON.parse(gunzipSync(Buffer.from(SEED_B64, 'base64')).toString('utf8')));
const withMenu = days.filter(d => !d.noMenuPosted);

test('seed: 28 Chase days with menus, 4 "no menu posted" days (Nov 25-28)', () => {
  assert.equal(days.length, 32);
  assert.equal(withMenu.length, 28);
  assert.deepEqual(days.filter(d => d.noMenuPosted).map(d => d.date), ['2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28']);
  for (const d of withMenu) { const n = Object.keys(d.items).length; assert.ok(n >= 261 && n <= 311, `${d.date} has ${n} items`); }
});
test('seed: every built-in item has ingredient text and provenance with a saved time', () => {
  for (const d of withMenu) {
    assert.ok(d.provenance.retrievedAt, d.date);
    for (const it of Object.values(d.items)) assert.ok(it.ingredients, it.name);
  }
});

const PATTERNS: PatternId[] = ['vegetarian', 'pescatarian', 'vegan', 'animal_based', 'carnivore'];
test('PRESET AUDIT: each preset returns a meal for every day with a menu', () => {
  for (const pat of PATTERNS) for (const d of withMenu) {
    const r = buildMeals(d, d.periods.find(p => p.name === 'Dinner')?.name ?? d.periods[0].name, defaultProfile(pat));
    assert.ok(r.meals.length > 0, `${pat} ${d.date}`);
  }
});
test('PRESET AUDIT: no meal part contradicts its preset', () => {
  const AN = ['meat', 'poultry', 'fish', 'shellfish', 'dairy', 'egg', 'honey'] as const;
  for (const pat of PATTERNS) for (const d of withMenu) for (const per of d.periods) {
    const prof = defaultProfile(pat);
    const r = buildMeals(d, per.name, prof);
    for (const m of r.meals) for (const part of m.parts) {
      const it = part.item;
      assert.notEqual(evaluateItem(it, prof).status, 'excluded', `${pat} ${d.date} ${it.name}`);
      if (pat === 'vegan') {
        for (const f of ['milk', 'egg', 'fish', 'shellfish']) assert.ok(!it.allergens.includes(f), `vegan ${d.date} ${it.name} has ${f}`);
        for (const c of AN) assert.notEqual(evidence(it, c, { vegan: true }).state, 'yes', `vegan ${d.date} ${it.name} ${c}`);
      }
      if (pat === 'vegetarian') for (const c of ['meat', 'poultry', 'fish', 'shellfish'] as const) assert.notEqual(evidence(it, c).state, 'yes', `veg ${it.name}`);
      if (pat === 'pescatarian') for (const c of ['meat', 'poultry'] as const) assert.notEqual(evidence(it, c).state, 'yes', `pesc ${it.name}`);
      if (pat === 'carnivore') {
        const animal = (['meat', 'poultry', 'fish', 'shellfish', 'egg', 'dairy'] as const).some(c => evidence(it, c, { ignoreSeasonings: true }).state === 'yes');
        assert.ok(animal, `carnivore ${d.date} ${it.name} is not an animal food`);
        for (const c of ['grains', 'legumes', 'vegetables', 'fruit', 'nuts_seeds', 'honey'] as const) assert.notEqual(evidence(it, c, { ignoreSeasonings: true }).state, 'yes', `carnivore ${it.name} ${c}`);
      }
    }
  }
});
test('STRICT AUDIT: with each Big 9 allergen selected, no recommended part carries that flag', () => {
  const A = ['milk', 'egg', 'wheat', 'soy', 'sesame', 'fish', 'shellfish', 'peanut', 'tree_nut'] as const;
  const sample = withMenu.filter((_, i) => i % 4 === 0);
  for (const a of A) for (const d of sample) {
    const prof = { ...defaultProfile('none'), allergens: [a] };
    for (const per of d.periods) for (const m of buildMeals(d, per.name, prof).meals) for (const p of m.parts) assert.ok(!p.item.allergens.includes(a), `${a} ${d.date} ${p.item.name}`);
  }
});
