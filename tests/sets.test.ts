import { expect, test } from 'vitest';
import { filterSets, markPurchased, sortWishlist, suggestions, type SetFilter } from '../src/lib/sets';
import { makeSet } from './helpers';

const TODAY = '2026-10-09';
const ALL: SetFilter = { query: '', manufacturer: null, theme: null };

test('markPurchased moves a wish into the collection', () => {
  const wish = makeSet({ status: 'wunsch', priority: 'hoch', priceCents: 8000, shopUrl: 'https://example.org/x' });
  expect(markPurchased(wish, TODAY, 7500)).toMatchObject({
    status: 'sammlung',
    purchaseDate: TODAY,
    priceCents: 7500,
    priority: null,
    shopUrl: 'https://example.org/x',
  });
});

test('filterSets searches name and set number, ignoring case', () => {
  const sets = [
    makeSet({ name: 'Burg Blaustein' }),
    makeSet({ name: 'Turm', setNumber: 'BURG-1' }),
    makeSet({ name: 'Bahnhof' }),
  ];
  expect(filterSets(sets, { ...ALL, query: ' burg ' }).map((s) => s.name)).toEqual(['Burg Blaustein', 'Turm']);
});

test('filterSets without criteria returns everything', () => {
  const sets = [makeSet({ name: 'A' }), makeSet({ name: 'B' })];
  expect(filterSets(sets, ALL).map((s) => s.name)).toEqual(['A', 'B']);
});

test('filterSets combines manufacturer and theme', () => {
  const sets = [
    makeSet({ name: 'A', manufacturer: 'BlueBrixx', theme: 'Burgen' }),
    makeSet({ name: 'B', manufacturer: 'BlueBrixx', theme: 'Bahn' }),
    makeSet({ name: 'C', manufacturer: 'CaDA', theme: 'Burgen' }),
  ];
  expect(filterSets(sets, { ...ALL, manufacturer: 'BlueBrixx', theme: 'Burgen' }).map((s) => s.name)).toEqual(['A']);
});

test('sortWishlist by priority, sets without priority last, ties by name', () => {
  const sets = [
    makeSet({ name: 'Zug', priority: 'hoch' }),
    makeSet({ name: 'Ohne' }),
    makeSet({ name: 'Auto', priority: 'niedrig' }),
    makeSet({ name: 'Burg', priority: 'hoch' }),
    makeSet({ name: 'Mitte', priority: 'mittel' }),
  ];
  expect(sortWishlist(sets, 'priority').map((s) => s.name)).toEqual(['Burg', 'Zug', 'Mitte', 'Auto', 'Ohne']);
});

test('sortWishlist by price ascending, sets without price last', () => {
  const sets = [
    makeSet({ name: 'Teuer', priceCents: 9000 }),
    makeSet({ name: 'Ohne' }),
    makeSet({ name: 'Billig', priceCents: 1500 }),
  ];
  expect(sortWishlist(sets, 'price').map((s) => s.name)).toEqual(['Billig', 'Teuer', 'Ohne']);
});

test('suggestions are unique, non-empty and sorted the German way', () => {
  const sets = [makeSet({ theme: 'Züge' }), makeSet({ theme: 'Burgen' }), makeSet({ theme: ' Burgen ' }), makeSet({ theme: '' }), makeSet({ theme: 'Äxte' })];
  expect(suggestions(sets, 'theme')).toEqual(['Äxte', 'Burgen', 'Züge']);
});
