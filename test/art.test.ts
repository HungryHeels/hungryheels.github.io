import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MASCOT_LINES, POSES, SPRITES, keywordSprite, mascotSvg, quadSvg, spriteFor, spriteSvg } from '../src/client/art.ts';

const all = () => [...POSES.map(mascotSvg), ...SPRITES.map(spriteSvg), quadSvg()];

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
