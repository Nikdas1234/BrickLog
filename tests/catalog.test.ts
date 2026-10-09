import { expect, test } from 'vitest';
import { fromBlueBrixx, fromLumibricks, loadCatalog, searchCatalog, type CatalogEntry } from '../src/lib/catalog';

const entry = (number: string, name: string, nameDe?: string): CatalogEntry => ({
  manufacturer: 'Lumibricks',
  number,
  name,
  nameDe,
  theme: 'Test',
  pieces: 1000,
  priceCents: 9900,
  priceEstimated: true,
  thumb: null,
  image: null,
  imageCors: true,
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

test('Lumibricks pictures are scaled by the image server', () => {
  const [lumi] = fromLumibricks({
    manufacturer: 'Lumibricks',
    entries: [
      { number: '10016', name: 'Explorer Treehouse', theme: 'Retro House', pieces: 2466, priceCents: 14600, image: 'https://cdn.example/a.webp?v=1', url: 'https://shop.example/a' },
    ],
  });
  expect(lumi).toMatchObject({
    manufacturer: 'Lumibricks',
    priceEstimated: true,
    imageCors: true,
    thumb: 'https://cdn.example/a.webp?v=1&width=120',
    image: 'https://cdn.example/a.webp?v=1&width=1600',
  });
});

test('BlueBrixx addresses are rebuilt from the short form in the file', () => {
  const [blue, bare] = fromBlueBrixx({
    manufacturer: 'BlueBrixx',
    source: 'https://www.bluebrixx.com',
    entries: [
      { number: '108932', name: 'Burg Blaustein: Festungsspitzen', theme: 'Mittelalter – Burg Blaustein', pieces: 834, priceCents: 2995, image: '5b/97/a0/1790062901/0d73.webp', slug: 'burg-blaustein-festungsspitzen' },
      { number: '100001', name: 'Ohne Bild', theme: '', pieces: null, priceCents: null, image: null, slug: 'ohne-bild' },
    ],
  });
  expect(blue).toMatchObject({
    manufacturer: 'BlueBrixx',
    number: '108932',
    priceEstimated: false,
    imageCors: false,
    thumb: 'https://www.bluebrixx.com/thumbnail/5b/97/a0/1790062901/0d73_260x260.webp',
    image: 'https://www.bluebrixx.com/media/5b/97/a0/1790062901/0d73.webp',
    url: 'https://www.bluebrixx.com/de/prod/108932/burg-blaustein-festungsspitzen/',
  });
  expect(blue).not.toHaveProperty('slug');
  expect(bare).toMatchObject({ thumb: null, image: null });
});

test('the bundled catalogs are well-formed', async () => {
  const catalog = await loadCatalog();
  const count = (manufacturer: string) => catalog.filter((e) => e.manufacturer === manufacturer).length;
  expect(count('Lumibricks')).toBeGreaterThan(100);
  expect(count('BlueBrixx')).toBeGreaterThan(500);
  expect(count('Lumibricks') + count('BlueBrixx')).toBe(catalog.length);
  expect(new Set(catalog.map((e) => `${e.manufacturer}:${e.number}`)).size).toBe(catalog.length);

  for (const e of catalog) {
    expect(e.name.trim()).not.toBe('');
    if (e.pieces !== null) expect(Number.isInteger(e.pieces) && e.pieces > 0).toBe(true);
    if (e.priceCents !== null) expect(Number.isInteger(e.priceCents) && e.priceCents > 0).toBe(true);
    if (e.manufacturer === 'Lumibricks') {
      expect(e.number).toMatch(/^[A-Z]?\d{4,5}\w*$/);
      expect(e.url).toMatch(/^https:\/\/www\.lumibricks\.com\//);
      if (e.image !== null) expect(e.image).toMatch(/^https:\/\/cdn\.shopify\.com\//);
    } else {
      expect(e.number).toMatch(/^\d{5,8}$/);
      expect(e.url).toMatch(/^https:\/\/www\.bluebrixx\.com\/de\/prod\/\d+\/[^/]+\/$/);
      if (e.image !== null) expect(e.image).toMatch(/^https:\/\/www\.bluebrixx\.com\/media\//);
    }
  }
});
