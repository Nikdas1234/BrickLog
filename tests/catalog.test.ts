import { expect, test } from 'vitest';
import { fromBlueBrixx, fromLumibricks, fromShop, loadCatalog, searchCatalog, type CatalogEntry } from '../src/lib/catalog';

const entry = (number: string, name: string, nameDe?: string): CatalogEntry => ({
  manufacturer: 'Lumibricks',
  number,
  shopNumber: false,
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
  const [blue, bare, cobi, other] = fromBlueBrixx({
    manufacturer: 'BlueBrixx',
    source: 'https://www.bluebrixx.com',
    entries: [
      { number: '108932', name: 'Burg Blaustein: Festungsspitzen', theme: 'Mittelalter – Burg Blaustein', pieces: 834, priceCents: 2995, image: '5b/97/a0/1790062901/0d73.webp', slug: 'burg-blaustein-festungsspitzen' },
      { number: '100001', name: 'Ohne Bild', theme: '', pieces: null, priceCents: null, image: null, slug: 'ohne-bild' },
      { number: '601234', name: 'Panzer IV', theme: 'Militär', pieces: 900, priceCents: 4995, image: null, slug: 'panzer-iv', brand: 'Cobi' },
      { number: '601235', name: 'Irgendwas', theme: '', pieces: null, priceCents: 995, image: null, slug: 'irgendwas', brand: '' },
    ],
  });
  // Sets of other manufacturers keep their brand; their number is the shop's.
  expect(cobi).toMatchObject({ manufacturer: 'Cobi', shopNumber: true });
  expect(cobi).not.toHaveProperty('brand');
  expect(other).toMatchObject({ manufacturer: '', shopNumber: true });
  expect(blue).toMatchObject({
    manufacturer: 'BlueBrixx',
    shopNumber: false,
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

test('the common shop format rebuilds addresses from their shared beginning', () => {
  const [scaled, readyMade, bare] = fromShop({
    manufacturer: 'Reobrix',
    priceEstimated: true,
    imageCors: true,
    imageBase: 'https://img.example/u/',
    urlBase: 'https://shop.example/products/',
    thumbSuffix: '?w=160',
    imageSuffix: '?w=1600',
    entries: [
      { number: '99009', name: 'Royal Fortress', theme: 'Modular Buildings', pieces: 5508, priceCents: 33200, image: 'a/99009.webp', url: 'red-keep' },
      { number: '10001', name: 'Racing Car', theme: 'Super Car', pieces: 928, priceCents: 4300, image: 'b/10001.jpg', thumb: 'b/10001-100x100.jpg', url: 'racing-car/' },
      { number: '10002', name: 'Ohne Bild', theme: '', pieces: null, priceCents: null, image: null, url: 'ohne-bild' },
    ],
  });
  expect(scaled).toMatchObject({
    manufacturer: 'Reobrix',
    shopNumber: false,
    priceEstimated: true,
    imageCors: true,
    thumb: 'https://img.example/u/a/99009.webp?w=160',
    image: 'https://img.example/u/a/99009.webp?w=1600',
    url: 'https://shop.example/products/red-keep',
  });
  // A ready-made preview wins over a scaled one.
  expect(readyMade.thumb).toBe('https://img.example/u/b/10001-100x100.jpg');
  expect(bare).toMatchObject({ thumb: null, image: null });

  // A shop whose server cannot scale shows no preview instead of the full-size picture.
  const [unscaled] = fromShop({
    manufacturer: 'Mould King',
    priceEstimated: true,
    imageCors: false,
    imageBase: 'https://img.example/u/',
    urlBase: 'https://shop.example/product/',
    entries: [{ number: '10009', name: 'Truck', theme: 'Technic', pieces: 900, priceCents: 5000, image: 'c/big.png', url: 'truck/' }],
  });
  expect(unscaled).toMatchObject({ thumb: null, image: 'https://img.example/u/c/big.png' });
});

test('the bundled catalogs are well-formed', async () => {
  const catalog = await loadCatalog();
  const count = (manufacturer: string) => catalog.filter((e) => e.manufacturer === manufacturer).length;
  expect(count('Lumibricks')).toBeGreaterThan(100);
  expect(count('BlueBrixx')).toBeGreaterThan(500);
  expect(count('Mould King')).toBeGreaterThan(300);
  expect(count('Reobrix')).toBeGreaterThan(50);
  expect(new Set(catalog.map((e) => `${e.manufacturer}:${e.number}`)).size).toBe(catalog.length);

  const SHOPS: [string, RegExp, RegExp][] = [
    ['https://www.lumibricks.com/', /^[A-Z]?\d{4,5}\w*$/, /^https:\/\/cdn\.shopify\.com\//],
    ['https://www.bluebrixx.com/de/prod/', /^\d{5,8}$/, /^https:\/\/www\.bluebrixx\.com\/media\//],
    ['https://mouldkingblock.com/product/', /^[A-Z]{0,3}\d{3,6}[A-Z]?(-\d+)?$/, /^https:\/\/mouldkingblock\.com\/wp-content\/uploads\//],
    ['https://www.reobrix.com/products/', /^[A-Z]{0,3}\d{3,6}[A-Z]?(-\d+)?$/, /^https:\/\//],
  ];
  for (const e of catalog) {
    expect(e.name.trim()).not.toBe('');
    if (e.pieces !== null) expect(Number.isInteger(e.pieces) && e.pieces > 0).toBe(true);
    if (e.priceCents !== null) expect(Number.isInteger(e.priceCents) && e.priceCents > 0).toBe(true);

    const shop = SHOPS.find(([address]) => e.url.startsWith(address));
    expect(shop, e.url).toBeDefined();
    expect(e.number).toMatch(shop![1]);
    if (e.image !== null) expect(e.image).toMatch(shop![2]);
    // Only sets of other manufacturers sold by the BlueBrixx shop carry its article
    // number instead of their own set number.
    expect(e.shopNumber).toBe(shop![0].includes('bluebrixx') && e.manufacturer !== 'BlueBrixx');
  }
});
