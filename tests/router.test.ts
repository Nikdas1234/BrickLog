import { expect, test } from 'vitest';
import { href, parseRoute, type Route } from '../src/lib/router';

const cases: [string, Route][] = [
  ['#/sammlung', { page: 'collection' }],
  ['#/wunschliste', { page: 'wishlist' }],
  ['#/statistik', { page: 'stats' }],
  ['#/einstellungen', { page: 'settings' }],
  ['#/set/abc', { page: 'set', id: 'abc' }],
  ['#/set/neu', { page: 'setForm', id: null, wish: false }],
  ['#/wunsch/neu', { page: 'setForm', id: null, wish: true }],
  ['#/set/abc/bearbeiten', { page: 'setForm', id: 'abc', wish: false }],
  ['#/set/abc/eintrag/neu', { page: 'entryForm', setId: 'abc', entryId: null }],
  ['#/set/abc/eintrag/e1', { page: 'entryForm', setId: 'abc', entryId: 'e1' }],
];

test.each(cases)('%s', (hash, route) => {
  expect(parseRoute(hash)).toEqual(route);
  expect(href(route)).toBe(hash);
});

test('unknown addresses fall back to the collection', () => {
  expect(parseRoute('')).toEqual({ page: 'collection' });
  expect(parseRoute('#/unsinn')).toEqual({ page: 'collection' });
  expect(parseRoute('#/set/abc/unsinn')).toEqual({ page: 'collection' });
  expect(parseRoute('#/statistik/extra')).toEqual({ page: 'collection' });
});
