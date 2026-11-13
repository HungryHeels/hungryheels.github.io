import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAMPUS, MASCOT_LINES, POSES, SPRITES, campusSvg, keywordSprite, mascotSvg, quadSvg, spriteFor, spriteSvg } from '../src/client/art.ts';

const all = () => [...POSES.map(mascotSvg), ...SPRITES.map(spriteSvg), ...CAMPUS.map(campusSvg), quadSvg()];

test('art: every picture is decorative (aria-hidden, not focusable)', () => {
  for (const s of all()) {
    assert.match(s, /^<svg [^>]*aria-hidden="true"/);
    assert.match(s, /focusable="false"/);
  }
});

test('art: self-contained, no outbound references, no scripts, no text', () => {
  for (const s of all()) {
    const withoutNs = s.replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '');
    assert.doesNotMatch(withoutNs, /https?:|\/\/|href|url\(|<image|<use|<script|<foreignObject|\son[a-z]+=/i);
    assert.doesNotMatch(s, /<text|<tspan/, 'no lettering, so no wordmarks');
    assert.doesNotMatch(s, /#[0-9a-f]{3,6}\b/i, 'colors come from CSS tokens so themes and high contrast apply');
  }
});

test('art: each mascot pose is drawn differently', () => {
  assert.equal(new Set(POSES.map(mascotSvg)).size, POSES.length);
});

test('art: food glyphs come from words that clearly name the food, never from a guess', () => {
  assert.equal(keywordSprite('Pepperoni Pizza'), 'pizza');
  assert.equal(keywordSprite('Garden Salad'), 'salad');
  assert.equal(keywordSprite('Diced Pineapple'), 'fruit');
  assert.equal(keywordSprite('Orange Chicken'), null);
  assert.equal(keywordSprite('Grilled Chicken'), null);
  assert.equal(keywordSprite('The Griddle'), null);
  assert.equal(spriteFor('Grilled Chicken', 'Grill', 'main'), 'plate');
  assert.equal(spriteFor('Steamed Broccoli', 'Sides', 'side'), 'bowl');
});

test('art: mascot lines stay friendly and claim nothing', () => {
  for (const l of MASCOT_LINES) {
    assert.doesNotMatch(l, /official|safe|certif|guarantee|allerg|go heels|tar heel|hark|rameses|\bunc\b/i);
    assert.ok(l.length <= 60);
  }
});

test('art: the campus band draws each landmark once, in the middle, and scales by height', () => {
  const s = quadSvg();
  const vb = /viewBox="0 0 (\d+) 120" width="(\d+)" height="120"/.exec(s);
  assert.ok(vb && vb[1] === vb[2], 'width and height match the viewBox so the band keeps its proportions');
  assert.equal((s.match(/class="q-dome"/g) ?? []).length, 1, 'one library');
  assert.equal((s.match(/class="q-stand"/g) ?? []).length, 1, 'one stadium');
  const mid = Number(vb![1]) / 2, at = [...s.matchAll(/translate\((\d+) 0\)/g)].map(m => Number(m[1]));
  assert.ok(at.some(x => x <= mid) && at.some(x => x > mid - 900 && x < mid + 900), 'landmarks sit around the centre');
});

test('art: each campus sprite is drawn differently', () => {
  assert.equal(new Set(CAMPUS.map(campusSvg)).size, CAMPUS.length);
});

test('art: local favourites get their own glyph only when the dish name says so', () => {
  assert.equal(keywordSprite('Chicken Biscuit'), 'biscuit');
  assert.equal(keywordSprite('Eastern Carolina Pulled Pork'), 'bbq');
  assert.equal(keywordSprite('Hushpuppies'), 'bbq');
  assert.equal(keywordSprite('Sweet Tea'), 'tea');
  assert.equal(keywordSprite('Hot Tea'), 'coffee');
  assert.equal(keywordSprite('BBQ Chicken Pizza'), 'pizza');
  assert.equal(keywordSprite('Roasted Pork Loin'), null);
});
