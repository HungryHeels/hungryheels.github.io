// Restaurants (Sweetgreen, Chipotle). The real official files could not be fetched from the build environment, so
// these tests run on SYNTHETIC fixtures in test/fixtures/restaurants/ (clearly labeled; never shipped). Whatever is in
// data/restaurants/ is ALSO checked: once the official files are added, they must import cleanly and pass the audits.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importRestaurant, parseCsv, validNyTime } from '../src/sources/restaurant-import.ts';
import { buildBowls, bowlCandidates } from '../src/core/restaurant-meals.ts';
import { evaluateItem, evidence, customEvidence } from '../src/core/engine.ts';
import { ALLERGEN_IDS, defaultProfile, type PatternId, type Profile } from '../src/core/profile.ts';
import type { RestaurantMenu } from '../src/core/restaurant.ts';
import type { MenuItem } from '../src/core/types.ts';
import { parseHash, routeHash } from '../src/client/router.ts';
import { readRestaurantFolders } from '../scripts/build-restaurants.ts';
import { mkItem } from './fixtures.ts';

const FIX = 'test/fixtures/restaurants/synthetic/';
const SRC = readFileSync(FIX + 'source.json', 'utf8');
const CSV = readFileSync(FIX + 'components.csv', 'utf8');
const load = (src = SRC, csv = CSV) => importRestaurant(src, csv);
const fixture = (): RestaurantMenu => { const r = load(); assert.deepEqual(r.errors, []); return r.menu!; };
const withSrc = (patch: Record<string, unknown>) => JSON.stringify({ ...JSON.parse(SRC), ...patch });
const comp = (m: RestaurantMenu, id: string) => m.components.find(c => c.item.id === 'chipotle:' + id)!;

// Every menu to audit: the synthetic fixture plus any real data that has been added.
const REAL = readRestaurantFolders().filter(r => r.menu).map(r => r.menu!);
const MENUS: Array<[string, RestaurantMenu]> = [['synthetic fixture', fixture()], ...REAL.map(m => [`real ${m.id}`, m] as [string, RestaurantMenu])];

// ---------------- importer ----------------
test('importer: the synthetic fixture imports with provenance and nothing invented', () => {
  const m = fixture();
  assert.equal(m.id, 'chipotle');
  assert.equal(m.provenance.kind, 'official');
  assert.equal(m.provenance.retrievedAt, '2026-11-13T10:05:00-05:00');
  assert.equal(m.hours, null, 'no official hours: hours stay unknown');
  assert.equal(m.components.length, 26, 'the extra-serving row is attached to its parent, not a component');
  const rice = comp(m, 'b-rice').item;
  assert.deepEqual([rice.nutrition.calories, rice.nutrition.protein, rice.nutrition.fat, rice.nutrition.carbs], [210, 4, 4, 40]);
  assert.equal(rice.nutrition.source, 'official');
  assert.equal(rice.publisher, 'Chipotle');
  assert.deepEqual(rice.allergens, []);
  assert.equal(rice.allergensUnknown, undefined, '"none" is a declaration');
  assert.equal(rice.labels.vegan, true);
  // Missing cells stay unknown, never 0 and never "free of".
  const house = comp(m, 's-house').item;
  assert.equal(house.allergensUnknown, true);
  assert.equal(house.ingredients, null);
  assert.equal(comp(m, 't-onion').item.ingredients, null);
  // Cross-contact goes to mayContain, not to allergens.
  assert.deepEqual(comp(m, 'p-beans').item.mayContain, ['milk']);
  assert.deepEqual(comp(m, 'p-beans').item.allergens, []);
  assert.deepEqual(comp(m, 't-almonds').item.allergens, ['tree_nut'], '"tree nuts" normalizes');
  assert.deepEqual(comp(m, 'b-barley').item.allergens, ['gluten']);
  // Extra serving only where the data defines one.
  assert.equal(comp(m, 'p-chicken').extra?.kind, 'added');
  assert.equal(comp(m, 'p-chicken').extra?.item.nutrition.protein, 32);
  assert.deepEqual(comp(m, 'p-chicken').extra?.item.allergens, [], 'the extra serving inherits the parent declaration');
  assert.equal(comp(m, 'p-steak').extra, null);
  assert.equal(m.presets.length, 3);
  assert.equal(m.presets[0].nutrition?.calories, 600);
  assert.equal(m.presets[1].nutrition, null);
});

test('importer: refuses anything that is not official, on the restaurant domain, in New York time', () => {
  assert.match(load(withSrc({ kind: 'third_party' })).errors.join(), /must be "official"/);
  assert.match(load(withSrc({ sourceUrl: 'https://example.com/chipotle.pdf' })).errors.join(), /must be on chipotle\.com/);
  assert.match(load(withSrc({ sourceUrl: 'http://www.chipotle.com/x.pdf' })).errors.join(), /https link/);
  assert.match(load(withSrc({ retrievedAt: '2026-11-13T10:05:00-04:00' })).errors.join(), /New York time/, 'November is EST (-05:00)');
  assert.match(load(withSrc({ retrievedAt: '2026-11-13T15:05:00Z' })).errors.join(), /New York time/);
  assert.match(load(withSrc({ restaurant: 'tacobell' })).errors.join(), /must be one of/);
  assert.match(load(withSrc({ hours: { text: '10am-10pm' } })).errors.join(), /hours/, 'hours need an official source');
  assert.match(load(withSrc({ presets: [{ name: 'X', components: ['b-rice', 'p-unicorn'] }] })).errors.join(), /unknown component ids p-unicorn/);
  assert.equal(load(withSrc({ kind: 'third_party' })).menu, null, 'no partial menu on error');
  assert.ok(validNyTime('2026-07-04T12:00:00-04:00'), 'summer is EDT');
  assert.ok(!validNyTime('2026-07-04T12:00:00-05:00'));
});

test('importer: refuses bad rows instead of fixing them', () => {
  const head = CSV.split('\n')[0];
  const one = (row: string) => load(SRC.replace(/"presets": \[[\s\S]*\]/, '"presets": []'), head + '\n' + row);
  assert.match(one('x,base,Thing,,100,1,1,1,mustard;peanut,,,,,,').errors.join(), /^$/, 'non-Big-9 allergens are kept, not refused');
  assert.deepEqual(one('x,base,Thing,,100,1,1,1,mustard;peanut,,,,,,').menu?.components[0].item.otherAllergens, ['mustard']);
  assert.match(one('x,base,Thing,,100,1,1,1,none,nuts?,,,,,').errors.join(), /unknown allergen "nuts\?"/);
  assert.match(one('x,bread,Thing,,100,1,1,1,none,,,,,,').errors.join(), /role "bread"/);
  assert.match(one('x,base,Thing,,abc,1,1,1,none,,,,,,').errors.join(), /not a number/);
  assert.match(one('x,base,Thing,,-5,1,1,1,none,,,,,,').errors.join(), /negative/);
  assert.match(one('x,base,Thing,,9000,1,1,1,none,,,,,,').errors.join(), /not plausible/);
  assert.match(one('x,base,Thing,,100,1,1,1,none,,,,nope,added,').errors.join(), /"nope", which is not a component/);
  assert.match(one('x,base,Thing,,100,1,1,1,none,,,,x,,').errors.join(), /extra_kind/);
  const lt = one('x,base,Thing,,100,<1,1,1,none,,,,,,');
  assert.equal(lt.menu?.components[0].item.nutrition.protein, null, '"<1" stays unknown');
  assert.equal(one('x,base,Thing,,0,0,0,0,none,,,,,,').menu?.components[0].item.nutrition.calories, 0, 'a published 0 is kept');
  assert.equal(one('x,base,Thing,,,,,,none,,,,,,').menu?.components[0].item.nutrition.calories, null, 'an empty cell is unknown');
  assert.equal(one('x,base,Thing,,,,,,none,,,,,,').menu?.components[0].item.nutrition.source, undefined, 'no numbers: no "official" badge');
  assert.match(one('x,base,Thing,,500,1,1,1,none,,,,,,').warnings.join(), /does not match its protein, fat and carbs/);
  assert.match(load(SRC, 'id,role,name\nx,base,Thing').errors.join(), /missing the "contains" column/);
});

test('importer: a blanket cross-contact statement applies to every component', () => {
  const r = load(withSrc({ crossContact: [{ text: 'SYNTHETIC: shared equipment with sesame.', allergens: ['sesame'] }] }));
  assert.deepEqual(r.errors, []);
  for (const c of r.menu!.components) assert.ok(c.item.allergens.includes('sesame') || c.item.mayContain!.includes('sesame'), c.item.name);
  const all = load(withSrc({ crossContact: [{ text: 'SYNTHETIC: cannot guarantee anything is allergen free.', allergens: 'all' }] })).menu!;
  for (const a of ALLERGEN_IDS) assert.ok(buildBowls(all, { ...defaultProfile('none'), allergens: [a] }).noMeal, `blanket "all" + ${a} allergy: no bowl`);
  assert.ok(!buildBowls(all, defaultProfile('vegan')).noMeal, 'a soft diet still gets a (mostly confirmed) bowl');
});

test('parseCsv: quoted commas, quotes and newlines', () => {
  assert.deepEqual(parseCsv('a,b\n"x, y","he said ""hi""\nthen"\n'), [['a', 'b'], ['x, y', 'he said "hi"\nthen']]);
});

// ---------------- engine: cross-contact is uncertain ----------------
test('engine: "may contain" is unknown (never free of), and labels never override it', () => {
  const it: MenuItem = { ...mkItem('Beans', { ing: 'black beans, salt', labels: { vegan: true, vegetarian: true, halal: false, madeWithoutGluten: true } }), publisher: 'Chipotle', mayContain: ['milk', 'wheat'] };
  assert.equal(evidence(it, 'dairy').state, 'unknown');
  assert.equal(evidence(it, 'gluten').state, 'unknown', 'gluten-free label does not beat a cross-contact statement');
  assert.match(evidence(it, 'dairy').why, /Chipotle says it may contain milk/);
  assert.equal(evaluateItem(it, { ...defaultProfile('none'), allergens: ['milk'] }).status, 'excluded');
  assert.equal(evaluateItem(it, { ...defaultProfile('none'), avoidGluten: true }).status, 'excluded');
  assert.equal(evaluateItem(it, { ...defaultProfile('none'), avoidIngredients: ['milk'] }).status, 'excluded', 'custom avoid naming an allergen');
  assert.equal(evaluateItem(it, defaultProfile('vegan')).status, 'potential', 'soft diet: possible match only');
  const noDecl: MenuItem = { ...mkItem('Sauce', { ing: 'oil, salt' }), publisher: 'Chipotle', allergensUnknown: true };
  assert.equal(evaluateItem(noDecl, { ...defaultProfile('none'), allergens: ['peanut'] }).status, 'excluded', 'no allergen declaration: excluded for allergies');
  assert.equal(evaluateItem(noDecl, defaultProfile('none')).status, 'match');
  const barley: MenuItem = { ...mkItem('Grain', { ing: 'grain' }), allergens: ['gluten'] };
  assert.equal(evidence(barley, 'gluten').state, 'yes');
  assert.equal(evidence(barley, 'wheat').state, 'no', '"gluten" is not "wheat"');
  assert.equal(customEvidence({ ...mkItem('X', { ing: 'x' }), otherAllergens: ['mustard'] }, 'mustard').state, 'yes');
});

test('engine: dining-hall evidence text is unchanged (still says UNC)', () => {
  assert.equal(evidence(mkItem('Cheese', { ing: 'x', allergens: ['milk'] }), 'dairy').why, 'UNC lists milk as an allergen');
});

// ---------------- builder ----------------
const parts = (m: { parts: Array<{ item: MenuItem; component?: string }> }) => m.parts as Array<{ item: MenuItem; component: string }>;
function assertValidBowl(m: { parts: Array<{ item: MenuItem }> }, menu: RestaurantMenu, p: Profile, where: string) {
  const ps = parts(m);
  const n = (r: string) => ps.filter(x => x.component === r).length;
  assert.equal(n('base'), 1, `${where}: exactly one base`);
  const prot = ps.filter(x => x.component === 'protein');
  assert.ok(prot.length <= 1 || (prot.length === 2 && menu.components.some(c => c.extra?.item === prot[1].item)), `${where}: one protein (plus its published extra at most)`);
  assert.ok(n('topping') <= 3, `${where}: at most three toppings`);
  assert.ok(n('sauce') <= 1, `${where}: at most one sauce or dressing`);
  assert.ok(n('side') <= 1, `${where}: at most one side`);
  for (const x of ps) assert.ok(['match', 'potential'].includes(evaluateItem(x.item, p).status), `${where}: ${x.item.name} passes the rules`);
}

test('builder: valid bowls; extra serving only when published; calorie cap respected', () => {
  const m = fixture();
  const r = buildBowls(m, defaultProfile('none'));
  assert.ok(r.meals.length >= 5);
  for (const b of r.meals) assertValidBowl(b, m, defaultProfile('none'), 'none');
  const t = buildBowls(m, { ...defaultProfile('none'), targets: { protein: 80 }, maxPortion: 2 });
  const withExtra = t.meals.find(b => b.parts.some(x => x.item.id === 'chipotle:p-chicken-x'));
  assert.ok(withExtra, 'a high protein target can use the published extra chicken');
  assert.ok(t.meals.every(b => !b.parts.some(x => /steak/i.test(x.item.name)) || b.parts.filter(x => /steak/i.test(x.item.name)).length === 1), 'no unpublished double steak');
  assert.ok(!buildBowls(m, { ...defaultProfile('none'), targets: { protein: 80 }, maxPortion: 1 }).meals.some(b => b.parts.some(x => x.item.id === 'chipotle:p-chicken-x')), 'max portion 1: no extra');
  const capped = buildBowls(m, { ...defaultProfile('none'), calorieCap: 400 });
  for (const b of capped.meals) assert.ok(b.totals.calories.min <= 400);
  assert.ok(buildBowls(m, { ...defaultProfile('none'), calorieCap: 1 }).noMeal, 'nothing under 1 kcal with a base: honest no meal');
});

test('builder: published presets fit only when every component fits; published totals are used as is', () => {
  const m = fixture();
  const none = buildBowls(m, defaultProfile('none'));
  assert.equal(none.presets.length, 3);
  assert.equal(none.presets[0].meal.totals.calories.value, 600, 'the preset’s own published total');
  const vegan = buildBowls(m, defaultProfile('vegan'));
  assert.deepEqual(vegan.presets.map(x => x.preset.name), ['TEST Tofu Greens Bowl']);
  assert.equal(vegan.presetsExcluded, 2);
  assert.equal(buildBowls(m, { ...defaultProfile('vegan'), allergens: ['soy'] }).presets.length, 0);
});

// ---------------- preset audit: every diet preset yields a bowl or an honest "No meal fits" ----------------
const PATTERNS: PatternId[] = ['none', 'vegetarian', 'pescatarian', 'vegan', 'animal_based', 'carnivore'];
for (const [label, menu] of MENUS) {
  test(`preset audit (${label}): every diet preset yields a valid bowl or an honest "No meal fits"`, () => {
    for (const pat of PATTERNS) for (const extra of [{}, { avoidGluten: true }, { avoidDairy: true }, { halalStyle: true }, { targets: { protein: 40, calories: 700 } }] as Array<Partial<Profile>>) {
      const p = { ...defaultProfile(pat), ...extra };
      const r = buildBowls(menu, p);
      const where = `${pat} ${JSON.stringify(extra)}`;
      if (r.noMeal) {
        assert.equal(r.meals.length, 0, where);
        assert.match(r.banner ?? '', /not loosened/, `${where}: says the rules were not loosened`);
      } else {
        assert.ok(r.meals.length > 0, where);
        for (const b of r.meals) assertValidBowl(b, menu, p, where);
        if (pat === 'carnivore' || pat === 'animal_based') for (const b of r.meals) assert.ok(parts(b).some(x => x.component === 'protein'), `${where}: animal protein required`);
      }
    }
    if (label === 'synthetic fixture') {
      for (const pat of ['none', 'vegetarian', 'pescatarian', 'vegan'] as PatternId[]) assert.ok(!buildBowls(menu, defaultProfile(pat)).noMeal, `${pat} gets a bowl on the fixture`);
      assert.ok(buildBowls(menu, defaultProfile('carnivore')).noMeal, 'carnivore: no base fits, so honestly no meal');
      assert.ok(buildBowls(menu, defaultProfile('vegan')).meals.every(b => parts(b).every(x => !/chicken|steak|cheese|ranch|egg/i.test(x.item.name))));
    }
  });
}

// ---------------- strict audit: no declared or cross-contact match ever appears ----------------
const STRICT: Array<[string, Partial<Profile>, string[]]> = [
  ...ALLERGEN_IDS.map(a => [`${a} allergy`, { allergens: [a] }, a === 'wheat' ? ['wheat'] : [a]] as [string, Partial<Profile>, string[]]),
  ['gluten', { avoidGluten: true }, ['wheat', 'gluten']],
  ['dairy', { avoidDairy: true }, ['milk']],
  ['egg', { avoidEgg: true }, ['egg']],
];
for (const [label, menu] of MENUS) {
  test(`strict audit (${label}): Big 9, gluten, dairy and egg never appear, declared or cross-contact`, () => {
    let excludedSomething = 0;
    for (const [name, rule, flags] of STRICT) for (const pat of PATTERNS) for (const targets of [{}, { protein: 50 }]) {
      const p: Profile = { ...defaultProfile(pat), ...rule, targets };
      const r = buildBowls(menu, p);
      const all = [...r.meals, ...r.presets.map(x => x.meal)].flatMap(b => b.parts.map(x => x.item));
      for (const it of all) {
        for (const f of flags) {
          assert.ok(!it.allergens.includes(f), `${name}/${pat}: ${it.name} declares ${f}`);
          assert.ok(!(it.mayContain ?? []).includes(f), `${name}/${pat}: ${it.name} may contain ${f}`);
        }
        assert.ok(!it.allergensUnknown, `${name}/${pat}: ${it.name} has no allergen declaration`);
      }
      // Also check every candidate the builder could use, not just the ideas shown.
      const cands = bowlCandidates(menu, p);
      for (const list of Object.values(cands)) for (const c of list) for (const f of flags) {
        assert.ok(!c.comp.item.allergens.includes(f) && !(c.comp.item.mayContain ?? []).includes(f), `${name}/${pat}: candidate ${c.comp.item.name} has ${f}`);
      }
      excludedSomething += menu.components.filter(c => evaluateItem(c.item, p).status === 'excluded').length;
    }
    assert.ok(excludedSomething > 0, 'the audit actually excluded items');
  });
}

test('strict audit (synthetic fixture): each rule really removes its items', () => {
  const m = fixture();
  const names = (p: Profile) => new Set(Object.values(bowlCandidates(m, p)).flat().map(c => c.comp.item.name));
  const peanut = names({ ...defaultProfile('none'), allergens: ['peanut'] });
  assert.ok(!peanut.has('TEST Roasted Peanuts') && !peanut.has('TEST House Sauce') && peanut.has('TEST White Rice'));
  const milk = names({ ...defaultProfile('none'), allergens: ['milk'] });
  assert.ok(!milk.has('TEST Black Beans'), 'may contain milk: excluded');
  assert.ok(!milk.has('TEST Shredded Cheese') && !milk.has('TEST Ranch'));
  const gluten = names({ ...defaultProfile('none'), avoidGluten: true });
  assert.ok(!gluten.has('TEST Flour Wrap') && !gluten.has('TEST Barley Grains') && !gluten.has('TEST Corn Chips') && !gluten.has('TEST Soy Glaze'));
  const halal = names({ ...defaultProfile('none'), halalStyle: true });
  assert.ok(!halal.has('TEST Bacon') && !halal.has('TEST White Wine Sauce') && !halal.has('TEST Pickled Onion'), 'pork, wine and no-ingredient items are excluded');
  const custom = names({ ...defaultProfile('none'), avoidIngredients: ['lime'] });
  assert.ok(!custom.has('TEST Lime Vinaigrette') && !custom.has('TEST Corn Salsa') && !custom.has('TEST Pickled Onion'));
});

// ---------------- router ----------------
test('router: place=sweetgreen|chipotle round-trips and drops the date, meal and item', () => {
  assert.deepEqual(parseHash('#/?place=chipotle'), { page: 'today', place: 'chipotle' });
  assert.equal(routeHash({ page: 'menus', place: 'sweetgreen', hall: 'chase', date: '2026-11-16', period: 'Dinner', item: '1' }), '#/menus?place=sweetgreen');
  assert.equal(parseHash('#/?place=mcdonalds').place, undefined);
  assert.equal(parseHash('#/me?place=chipotle').place, undefined);
  assert.equal(routeHash({ page: 'today', hall: 'chase', date: '2026-11-16' }), '#/?hall=chase&date=2026-11-16', 'halls unchanged');
});

// ---------------- data folders ----------------
test('data/restaurants: every folder is either pending or imports cleanly', () => {
  for (const r of readRestaurantFolders()) {
    assert.deepEqual(r.errors, [], `${r.id}: ${r.errors.join('; ')}`);
    if (r.menu) assert.equal(r.menu.provenance.kind, 'official');
  }
});
