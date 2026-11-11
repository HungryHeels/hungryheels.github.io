import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attrValue } from '../src/client/dom.ts';

// Bug fixed Nov 11: aria-pressed={true} rendered as aria-pressed="" and {false} was dropped, so screen readers
// could not tell which hall, period or tab was selected.
test('BUG: ARIA state attributes render as "true"/"false"', () => {
  assert.equal(attrValue('aria-pressed', true), 'true');
  assert.equal(attrValue('aria-pressed', false), 'false');
  assert.equal(attrValue('aria-expanded', false), 'false');
  assert.equal(attrValue('aria-current', null), null);
  assert.equal(attrValue('open', true), '');
  assert.equal(attrValue('open', false), null);
  assert.equal(attrValue('data-fk', 'x'), 'x');
});
