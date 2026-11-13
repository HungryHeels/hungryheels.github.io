import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iconDataUri, iconSvg } from '../src/pwa/icon.ts';

test('site icon: the mascot, self-contained, with real colors (icons cannot read the page CSS)', () => {
  const s = iconSvg();
  assert.match(s, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 512 512">/);
  assert.match(s, /class="m-upper"/, 'draws the Hungry Heel');
  assert.doesNotMatch(s, /var\(/, 'no CSS variables: they would not resolve in an icon');
  const withoutNs = s.replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '');
  assert.doesNotMatch(withoutNs, /https?:|\/\/|href|url\(|<image|<script|<text|\son[a-z]+=/i, 'no outbound references, scripts or lettering');
});

test('site icon: the tab icon is the same SVG as a data: URI (no request from the single file)', () => {
  assert.equal(decodeURIComponent(iconDataUri().replace('data:image/svg+xml,', '')), iconSvg());
});
