import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXTRA_PRESETS, exportProfiles, importProfiles, profileFromHash, profileToHash, sanitizeProfile } from '../src/core/profile-io.ts';
import { defaultProfile } from '../src/core/profile.ts';

test('share link round-trips in the URL fragment only', () => {
  const p = { ...defaultProfile('vegan'), allergens: ['peanut' as const], avoidIngredients: ['mushroom'], targets: { protein: 35 } };
  const h = profileToHash(p, 'Gym days');
  assert.ok(h.startsWith('#profile='));
  const back = profileFromHash(h)!;
  assert.deepEqual(back.profile, sanitizeProfile(p)); assert.equal(back.name, 'Gym days');
  assert.equal(profileFromHash('#profile=@@@'), null);
  assert.equal(profileFromHash('#other=1'), null);
});
test('sanitizeProfile drops unknown fields and bad values', () => {
  const p = sanitizeProfile({ pattern: 'vegetarian', allergens: ['milk', 'plutonium', 'milk'], avoidIngredients: ['  Cilantro ', 7, ''], calorieCap: -5, targets: { protein: 'lots', fat: 30 }, evil: '<script>' })!;
  assert.deepEqual(p.allergens, ['milk']); assert.deepEqual(p.avoidIngredients, ['cilantro']); assert.equal(p.calorieCap, 1000); assert.deepEqual(p.targets, { fat: 30 });
  assert.ok(!('evil' in p));
  assert.equal(sanitizeProfile({ pattern: 'raw-only' }), null);
  assert.equal(sanitizeProfile('x'), null);
});
test('JSON export/import of several profiles', () => {
  const txt = exportProfiles([{ id: '1', name: 'Default', profile: defaultProfile('none') }, { id: '2', name: 'Cut', profile: { ...defaultProfile('pescatarian'), targets: { protein: 40 } } }]);
  const r = importProfiles(txt);
  assert.equal(r.profiles.length, 2); assert.equal(r.profiles[1].profile.targets.protein, 40);
  assert.ok(importProfiles('nope').errors.length); assert.ok(importProfiles('{"profiles":[{"profile":{"pattern":"x"}}]}').errors.length);
});
test('extra presets change only avoid lists or macro targets, never the diet pattern or allergies', () => {
  for (const pr of EXTRA_PRESETS) {
    const before = { ...defaultProfile('vegan'), allergens: ['soy' as const], avoidIngredients: ['kale'] };
    const after = pr.apply(before);
    assert.equal(after.pattern, 'vegan'); assert.deepEqual(after.allergens, ['soy']); assert.ok(after.avoidIngredients.includes('kale'));
    assert.match(pr.description, /not medical advice/i);
  }
  assert.ok(EXTRA_PRESETS[0].apply(defaultProfile('none')).avoidIngredients.includes('garlic'));
});
