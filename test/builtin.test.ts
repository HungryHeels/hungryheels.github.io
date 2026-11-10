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

test('seed: Chase has 28 menu days + 4 no-menu days; Top of Lenoir has 27 + 4 (Nov 9 not saved)', () => {
  const chase = days.filter(d => d.hall === 'chase'), len = days.filter(d => d.hall === 'top-of-lenoir');
  assert.equal(chase.length, 32); assert.equal(chase.filter(d => !d.noMenuPosted).length, 28);
  assert.equal(len.length, 31); assert.equal(len.filter(d => !d.noMenuPosted).length, 27);
  const noMenu = ['2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28'];
  assert.deepEqual(chase.filter(d => d.noMenuPosted).map(d => d.date), noMenu);
  assert.deepEqual(len.filter(d => d.noMenuPosted).map(d => d.date), noMenu);
  assert.ok(!len.some(d => d.date === '2026-11-09'));
  for (const d of withMenu) { const n = Object.keys(d.items).length; assert.ok(n >= 221 && n <= 325, `${d.hall} ${d.date} has ${n} items`); }
});
test('seed: Lenoir days without a Dinner tab are exactly the ones the saved pages show (not guessed)', () => {
  const noDinner = days.filter(d => d.hall === 'top-of-lenoir' && !d.noMenuPosted && !d.periods.some(p => p.name === 'Dinner')).map(d => d.date);
  assert.deepEqual(noDinner, ['2026-11-13', '2026-11-14', '2026-11-20', '2026-11-21', '2026-12-05']);
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
    assert.ok(r.meals.length > 0, `${pat} ${d.hall} ${d.date}`);
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

test('Eat UNC borrowing: real coverage, warnings attached, disagreeing names stay unknown', () => {
  for (const hall of ['chase', 'top-of-lenoir'] as const) {
    const uniq = new Map<string, { cal: boolean; borrowed: boolean; warned: boolean; name: string }>();
    for (const d of days.filter(x => x.hall === hall && !x.noMenuPosted)) for (const it of Object.values(d.items)) {
      uniq.set(it.id, { cal: it.nutrition.calories !== null && it.nutrition.protein !== null, borrowed: !!it.nutrition.borrowed, warned: it.warnings.some(w => /borrowed from Eat UNC/.test(w)), name: it.name });
    }
    const vals = [...uniq.values()];
    const have = vals.filter(v => v.cal).length;
    assert.ok(have / vals.length >= 0.25, `${hall}: only ${have}/${vals.length} items have calories+protein`);
    for (const v of vals) { if (v.borrowed) assert.ok(v.warned, `${v.name} borrowed without a warning`); if (v.cal) assert.ok(v.borrowed, `${v.name} has values from an unexpected source`); }
    // "Quinoa" appears twice in Eat UNC's Chase listing with different values, so it must stay unknown.
    if (hall === 'chase') { const q = vals.find(v => v.name === 'Quinoa'); if (q) assert.equal(q.cal, false, 'Quinoa should stay unknown (ambiguous in the snapshot)'); }
  }
});
