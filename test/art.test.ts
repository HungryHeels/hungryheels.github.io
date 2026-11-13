import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAMPUS, MASCOT_LINES, POSES, SPRITES, campusSvg, mascotSvg, quadSvg, seasonFor, skyFor, spriteSvg } from '../src/client/art.ts';

const all = () => [...POSES.map(p => mascotSvg(p)), ...POSES.map(p => mascotSvg(p, true)), ...SPRITES.map(spriteSvg), ...CAMPUS.map(campusSvg), quadSvg()];

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
  assert.equal(new Set(POSES.map(p => mascotSvg(p))).size, POSES.length);
});

test('art: every food sprite is drawn differently', () => {
  assert.equal(new Set(SPRITES.map(spriteSvg)).size, SPRITES.length);
});

test('art: mascot lines stay friendly and claim nothing', () => {
  for (const l of MASCOT_LINES) {
    assert.doesNotMatch(l, /official|safe|certif|guarantee|allerg|go heels|tar heel|hark|rameses|\bunc\b/i);
    assert.ok(l.length <= 60);
  }
});

test('art: the sky follows the meal, then the New York clock; the oaks follow the season', () => {
  assert.equal(skyFor('Breakfast', 0), 'morning');
  assert.equal(skyFor('Late Lunch', 0), 'day');
  assert.equal(skyFor('Dinner', 0), 'evening');
  assert.equal(skyFor('Late Dinner', 0), 'night');
  assert.equal(skyFor('Late Night', 12 * 60), 'night');
  assert.equal(skyFor(null, 7 * 60), 'morning');
  assert.equal(skyFor(null, 13 * 60), 'day');
  assert.equal(skyFor(null, 18 * 60 + 30), 'evening');
  assert.equal(skyFor(null, 23 * 60), 'night');
  assert.equal(seasonFor('2026-11-13'), 'fall');
  assert.equal(seasonFor('2026-04-02'), 'spring');
  assert.equal(seasonFor('2026-07-04'), 'summer');
  assert.equal(seasonFor('2027-01-20'), 'winter');
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
