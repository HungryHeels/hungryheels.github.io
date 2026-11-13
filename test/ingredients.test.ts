import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { parseIngredients, ingredientsToText, sentenceCase } from '../src/sources/ingredients.ts';
import { decodeSeed } from '../src/core/seed.ts';
import { SEED_B64 } from '../src/client/seed-data.ts';

const line = (s: string | null) => { const p = parseIngredients(s); return p ? ingredientsToText(p.items) : null; };

test('ingredients: null, empty, whitespace and punctuation-only text is "not listed" (null), never an empty list', () => {
  for (const s of [null, undefined, '', '   ', ' , ; . ', '()', '[ ]']) assert.equal(parseIngredients(s as any), null, JSON.stringify(s));
});

test('ingredients: sub-ingredients stay in parentheses after their parent, in sentence case', () => {
  const p = parseIngredients('marinara sauce (tomatoes, olive oil, garlic, salt), basil')!;
  assert.equal(p.structured, true);
  assert.deepEqual(p.items.map(n => n.name), ['Marinara sauce', 'Basil']);
  assert.deepEqual(p.items[0].sub!.map(n => n.name), ['Tomatoes', 'Olive oil', 'Garlic', 'Salt']);
  assert.equal(line('Marinara Sauce (Tomatoes, Olive Oil, Garlic, Salt)'), 'Marinara Sauce (Tomatoes, Olive Oil, Garlic, Salt)');
});

test('ingredients: nested parentheses keep their depth', () => {
  const p = parseIngredients('Pizza Crust (Enriched Flour (Wheat Flour, Niacin, Iron), Water), Cheese (Milk, Salt)')!;
  assert.equal(p.items.length, 2);
  const flour = p.items[0].sub![0];
  assert.equal(flour.name, 'Enriched Flour');
  assert.deepEqual(flour.sub!.map(n => n.name), ['Wheat Flour', 'Niacin', 'Iron']);
  assert.equal(p.items[0].sub![1].name, 'Water');
  assert.equal(line('Pizza Crust (Enriched Flour (Wheat Flour, Niacin, Iron), Water), Cheese (Milk, Salt)'),
    'Pizza Crust (Enriched Flour (Wheat Flour, Niacin, Iron), Water), Cheese (Milk, Salt)');
});

test('ingredients: square and curly brackets work like parentheses; mismatched or unclosed brackets never lose text', () => {
  assert.equal(line('Bread [Wheat Flour, Yeast {Dried}], Butter'), 'Bread (Wheat Flour, Yeast (Dried)), Butter');
  assert.equal(line('Sauce (Tomato, Salt'), 'Sauce (Tomato, Salt)');
  assert.equal(line('Sauce (Tomato, Salt], Pepper'), 'Sauce (Tomato, Salt), Pepper');
  assert.equal(line('Salt), Pepper'), 'Salt, Pepper');
});

test('ingredients: trailing periods and sentence periods are removed; decimals are kept', () => {
  assert.equal(line('Water, Sugar, Salt.'), 'Water, Sugar, Salt');
  assert.equal(line('Chicken (Chicken, Salt.). Pepper.'), 'Chicken (Chicken, Salt), Pepper');
  assert.equal(line('Citric Acid 0.15%, Water'), 'Citric Acid 0.15%, Water');
});

test('ingredients: "and/or" stays inside one ingredient (with any spacing)', () => {
  assert.equal(line('Water, Canola and/or Soybean Oil, Salt'), 'Water, Canola and/or Soybean Oil, Salt');
  assert.equal(line('Canola and / or Soybean Oil'), 'Canola and/or Soybean Oil');
  assert.equal(parseIngredients('Water, Canola and/or Soybean Oil')!.items.length, 2);
});

test('ingredients: "contains 2% or less of" is its own lead-in entry, not glued to the next ingredient', () => {
  const p = parseIngredients('Water, Sugar, Contains 2% or less of: Salt, Citric Acid.')!;
  assert.deepEqual(p.items.map(n => [n.name, !!n.lead]), [['Water', false], ['Sugar', false], ['Contains 2% or less of', true], ['Salt', false], ['Citric Acid', false]]);
  assert.equal(ingredientsToText(p.items), 'Water, Sugar, Contains 2% or less of: Salt, Citric Acid');
  const q = parseIngredients('Water, contains less than 2% of salt, yeast')!;
  assert.deepEqual(q.items.map(n => n.name), ['Water', 'Contains less than 2% of', 'Salt', 'Yeast']);
  const r = parseIngredients('Flour, Contains 2% or less of (Salt, Yeast)')!;
  assert.equal(r.items[1].lead, true); assert.deepEqual(r.items[1].sub!.map(n => n.name), ['Salt', 'Yeast']);
});

test('ingredients: duplicate whitespace, tabs and newlines collapse; empty entries between commas are dropped', () => {
  assert.equal(line('  Water ,,  Sugar\n\t(Cane   Sugar) ;  Salt  '), 'Water, Sugar (Cane Sugar), Salt');
});

test('ingredients: text after a bracket group is kept in its place; ALL-CAPS becomes sentence case', () => {
  const p = parseIngredients('Cheese (Milk, Salt) Shredded, Pepper')!;
  assert.equal(p.items[0].name, 'Cheese'); assert.equal(p.items[0].after, 'Shredded');
  assert.equal(line('WATER, SEA SALT'), 'Water, Sea salt');
  assert.equal(sentenceCase('2% milk'), '2% Milk');
});

test('ingredients: text with no punctuation is one entry as published, never split by guessing', () => {
  const p = parseIngredients('white rice waterwhite long grain rice')!;
  assert.equal(p.structured, false);
  assert.deepEqual(p.items, [{ name: 'White rice waterwhite long grain rice', sub: null }]);
});

// Real items from the built-in seed. UNC's saved pages lowercase the text and strip punctuation, so these come out as
// one entry each, word for word; nothing is added, dropped or reordered.
const days = decodeSeed(JSON.parse(gunzipSync(Buffer.from(SEED_B64, 'base64')).toString('utf8')));
const seedItem = (name: string) => { for (const d of days) for (const it of Object.values(d.items)) if (it.name === name) return it; throw new Error(name); };
test('ingredients: real seed items keep every word in order', () => {
  for (const name of ['White Rice', 'Cheese Pizza', 'Marinara Sauce', 'Scrambled Eggs', 'Crispy Tater Tots']) {
    const raw = seedItem(name).ingredients!;
    const p = parseIngredients(raw)!;
    assert.ok(p, name);
    const words = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}%]+/gu, ' ').trim();
    assert.equal(words(ingredientsToText(p.items)), words(raw), name);
  }
  assert.equal(line(seedItem('White Rice').ingredients), 'White rice waterwhite long grain rice');
  assert.ok(line(seedItem('Cheese Pizza').ingredients)!.startsWith('Cheese pizza dough pizza ball'));
});
test('ingredients: every built-in item parses to a non-empty list', () => {
  for (const d of days) for (const it of Object.values(d.items)) if (it.ingredients) assert.ok(parseIngredients(it.ingredients)?.items.length, it.name);
});
