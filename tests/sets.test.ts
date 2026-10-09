import { expect, test } from 'vitest';
import { applyStatus, filterSets, markPurchased, sortWishlist, suggestions, type SetFilter } from '../src/lib/sets';
import { makeSet } from './helpers';

const TODAY = '2026-10-09';
const ALL: SetFilter = { query: '', status: null, manufacturer: null, theme: null };

test('starting a build sets the start date', () => {
  const next = applyStatus(makeSet(), 'im_bau', TODAY);
  expect(next).toMatchObject({ status: 'im_bau', buildStart: TODAY, buildEnd: null });
});

test('finishing keeps an existing start date and sets the end date', () => {
  const next = applyStatus(makeSet({ status: 'im_bau', buildStart: '2026-09-01' }), 'fertig', TODAY);
  expect(next).toMatchObject({ status: 'fertig', buildStart: '2026-09-01', buildEnd: TODAY });
});

test('finishing straight from the shelf sets both dates', () => {
  expect(applyStatus(makeSet(), 'fertig', TODAY)).toMatchObject({ buildStart: TODAY, buildEnd: TODAY });
});

test('going back from finished clears the end date only', () => {
  const done = makeSet({ status: 'fertig', buildStart: '2026-09-01', buildEnd: '2026-09-20' });
  expect(applyStatus(done, 'im_bau', TODAY)).toMatchObject({ buildStart: '2026-09-01', buildEnd: null });
  expect(applyStatus(done, 'ungebaut', TODAY)).toMatchObject({ buildStart: '2026-09-01', buildEnd: null });
});

test('giving a set away keeps both dates', () => {
  const done = makeSet({ status: 'fertig', buildStart: '2026-09-01', buildEnd: '2026-09-20' });
  expect(applyStatus(done, 'abgegeben', TODAY)).toMatchObject({ buildStart: '2026-09-01', buildEnd: '2026-09-20' });
});

test('applyStatus does not change its argument', () => {
  const set = makeSet();
  applyStatus(set, 'fertig', TODAY);
  expect(set).toMatchObject({ status: 'ungebaut', buildStart: null, buildEnd: null });
});

test('markPurchased moves a wish into the collection', () => {
  const wish = makeSet({ status: 'wunsch', priority: 'hoch', priceCents: 8000, shopUrl: 'https://example.org/x' });
  expect(markPurchased(wish, TODAY, 7500)).toMatchObject({
    status: 'ungebaut',
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

test('filterSets without a status shows everything except wishes', () => {
  const sets = [makeSet({ name: 'A' }), makeSet({ name: 'B', status: 'wunsch' }), makeSet({ name: 'C', status: 'abgegeben' })];
  expect(filterSets(sets, ALL).map((s) => s.name)).toEqual(['A', 'C']);
  expect(filterSets(sets, { ...ALL, status: 'wunsch' }).map((s) => s.name)).toEqual(['B']);
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
