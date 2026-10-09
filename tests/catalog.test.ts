import { expect, test } from 'vitest';
import { catalogImageUrl, loadCatalog, searchCatalog, type CatalogEntry } from '../src/lib/catalog';

const entry = (number: string, name: string, nameDe?: string): CatalogEntry => ({
  manufacturer: 'Lumibricks',
  number,
  name,
  nameDe,
  theme: 'Test',
  pieces: 1000,
  priceCents: 9900,
  image: null,
  url: 'https://example.org',
});

const entries = [
  entry('10016', 'Explorer Treehouse'),
  entry('F9043', 'Police Patrol Car', 'Streifenwagen der Polizei'),
  entry('10013', 'Garden Cottage', 'Gartenhaus'),
  entry('L9100', 'Toy Store'),
  entry('21001', 'Car Wash 1001'),
];

const numbers = (query: string, limit?: number) => searchCatalog(entries, query, limit).map((e) => e.number);

test('an empty query finds nothing', () => {
  expect(numbers('')).toEqual([]);
  expect(numbers('   ')).toEqual([]);
});

test('set numbers match from the start first, then anywhere', () => {
  expect(numbers('1001')).toEqual(['10016', '10013', '21001']);
  expect(numbers('f90')).toEqual(['F9043']);
  expect(numbers('9100')).toEqual(['L9100']);
});

test('names match in English and German, ignoring case and word order', () => {
  expect(numbers('treehouse')).toEqual(['10016']);
  expect(numbers('STREIFENWAGEN')).toEqual(['F9043']);
  expect(numbers('car patrol')).toEqual(['F9043']);
  expect(numbers('car')).toEqual(['21001', 'F9043']);
  expect(numbers('gibt es nicht')).toEqual([]);
});

test('the result is limited', () => {
  expect(numbers('1', 2)).toHaveLength(2);
});

test('catalogImageUrl appends the width', () => {
  expect(catalogImageUrl('https://cdn.example/a.webp?v=1', 300)).toBe('https://cdn.example/a.webp?v=1&width=300');
  expect(catalogImageUrl('https://cdn.example/a.webp', 300)).toBe('https://cdn.example/a.webp?width=300');
});

test('the bundled catalog is well-formed', async () => {
  const catalog = await loadCatalog();
  expect(catalog.length).toBeGreaterThan(100);
  expect(new Set(catalog.map((e) => e.number)).size).toBe(catalog.length);
  for (const e of catalog) {
    expect(e.manufacturer).toBe('Lumibricks');
    expect(e.number).toMatch(/^[A-Z]?\d{4,5}\w*$/);
    expect(e.name.trim()).not.toBe('');
    expect(e.url).toMatch(/^https:\/\/www\.lumibricks\.com\//);
    if (e.pieces !== null) expect(Number.isInteger(e.pieces) && e.pieces > 0).toBe(true);
    if (e.priceCents !== null) expect(e.priceCents % 100).toBe(0);
    if (e.image !== null) expect(e.image).toMatch(/^https:\/\/cdn\.shopify\.com\//);
  }
});
