import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHash, routeHash } from '../src/client/router.ts';

test('routes round-trip and keep hall, date, meal and item in the address', () => {
  const r = { page: 'menus' as const, hall: 'top-of-lenoir' as const, date: '2026-11-16', period: 'Late Night', item: '12345' };
  const h = routeHash(r);
  assert.equal(h, '#/menus?hall=top-of-lenoir&date=2026-11-16&period=Late+Night&item=12345');
  assert.deepEqual(parseHash(h), r);
  assert.equal(routeHash({ page: 'today' }), '#/');
  assert.deepEqual(parseHash(''), { page: 'today' });
  assert.deepEqual(parseHash('#/me?section=goals'), { page: 'me', section: 'goals' });
  assert.equal(routeHash({ page: 'me', hall: 'chase', section: 'saved' }), '#/me?section=saved');
});
test('the About content on Today has its own address', () => {
  assert.equal(routeHash({ page: 'today', about: true }), '#/?about=1');
  assert.deepEqual(parseHash('#/?about=1'), { page: 'today', about: true });
  assert.equal(parseHash('#/menus?about=1').about, undefined);
});
test('bad values in the address are ignored, never guessed', () => {
  assert.deepEqual(parseHash('#/?hall=duke&date=tomorrow&item=<script>'), { page: 'today' });
});
test('old "#profile=" share links still open the Me page with the profile', () => {
  assert.deepEqual(parseHash('#profile=abc_-1'), { page: 'me', profile: 'abc_-1' });
  assert.equal(parseHash('#/me?profile=xyz').profile, 'xyz');
});
