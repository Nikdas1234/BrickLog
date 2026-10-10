// Rebuilds src/data/catalog-bluebrixx.json from the public BlueBrixx shop
// (`npm run katalog:bluebrixx`). Only facts are taken over: article number, name,
// theme, piece count, list price and the address of the product picture. No
// description texts and no picture files end up in this repository.
//
// The shop lists 30 products per category page, with everything we need in each product
// tile. So we read the category pages (a few hundred requests) instead of every single
// product page (about 5,000).
//
// Sets of other manufacturers that the shop sells are kept too, marked with their brand.
// Their number is the BlueBrixx article number, not the one printed on their boxes.
// Left out: loose bricks and baseplates (part packs), and the brands that have their own
// catalog with the real set numbers (Lumibricks, Reobrix).
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const SHOP = 'https://www.bluebrixx.com';
const ROOT = `${SHOP}/de/alle-themenwelten/`;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'catalog-bluebrixx.json');
const HEADERS = { 'user-agent': 'BrickLog catalog update (private hobby project; github.com/Nikdas1234/BrickLog)' };
const PAUSE_MS = 350;
const MAX_PAGES = 400;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { headers: HEADERS });
      if (!response.ok) throw new Error(`${response.status} for ${url}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (attempt === 3) throw error;
      await sleep(3000 * attempt);
    }
  }
}

const decode = (text) =>
  text
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

function parseTiles(html) {
  const tiles = [];
  // Every tile starts with this attribute; inner elements carry similar class names,
  // so the attribute is the only safe place to cut.
  for (const tile of html.split('data-product-information="').slice(1)) {
    const link = tile.match(/href="https:\/\/www\.bluebrixx\.com\/de\/prod\/(\d+)\/([^"/]+)\/"/);
    const info = tile.match(/^([^"]*)"/);
    if (!link || !info) continue;
    let name, brand;
    try {
      ({ name, brand } = JSON.parse(decode(info[1])));
    } catch {
      continue;
    }
    const pieces = tile.match(/pieces-wrapper[^>]*>\s*(?:<[^>]+>\s*)*(\d[\d.]*)/);
    const price =
      tile.match(/Regulärer Preis:\s*<\/span>\s*<span class="product-price">\s*([\d.]+,\d{2})/) ??
      tile.match(/class="product-price[^"]*">\s*(?:ab\s*)?([\d.]+,\d{2})\s*€/);
    const image = tile.match(/<img src="https:\/\/www\.bluebrixx\.com\/media\/([^"?]+)/);
    tiles.push({
      number: link[1],
      slug: link[2],
      name: String(name ?? '').trim(),
      brand: String(brand ?? '').trim(),
      pieces: pieces ? Number(pieces[1].replace(/\./g, '')) : null,
      priceCents: price ? Math.round(Number(price[1].replace(/\./g, '').replace(',', '.')) * 100) : null,
      image: image ? image[1] : null,
    });
  }
  return tiles;
}

const heading = (html) => decode((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) ?? [])[1]?.replace(/<[^>]+>/g, '').trim() ?? '');

// Category names as they appear in the shop's menu. The headline on a category page is
// often an advertising sentence, so it only serves as a fallback.
const menuName = new Map();
for (const link of (await get(`${SHOP}/de/`)).toString('utf8').matchAll(/<a[^>]+href="(https:\/\/www\.bluebrixx\.com\/de\/alle-themenwelten\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
  const name = decode(link[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  if (name !== '' && !/^Zur Kategorie/i.test(name) && !menuName.has(link[1])) menuName.set(link[1], name);
}

let requests = 0;
// Reads every page of one category. Returns its title and all product tiles.
async function readCategory(url) {
  const tiles = [];
  let title = '';
  let lastPage = 1;
  for (let page = 1; page <= lastPage; page++) {
    const html = (await get(`${url}?p=${page}`)).toString('utf8');
    requests++;
    if (page === 1) {
      title = menuName.get(url) ?? heading(html);
      // The page links at the bottom name the last page.
      const pages = [...html.matchAll(/[?&](?:amp;)?p=(\d+)/g)].map((m) => Number(m[1]));
      lastPage = Math.min(Math.max(1, ...pages), MAX_PAGES);
    }
    const found = parseTiles(html);
    tiles.push(...found);
    await sleep(PAUSE_MS);
    if (found.length === 0) break;
  }
  return { title, tiles };
}

// The sitemap names every category of the shop.
const robots = (await get(`${SHOP}/robots.txt`)).toString('utf8');
const sitemapUrl = (robots.match(/Sitemap:\s*(\S+\/de\/sitemap\/\S+)/) ?? [])[1];
if (!sitemapUrl) throw new Error('German sitemap not found in robots.txt');
let sitemap = await get(sitemapUrl);
if (sitemap[0] === 0x1f && sitemap[1] === 0x8b) sitemap = gunzipSync(sitemap);
const categoryUrls = [...sitemap.toString('utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1])
  .filter((url) => url.startsWith(ROOT) && url !== ROOT);
const depth = (url) => url.slice(ROOT.length).split('/').filter(Boolean).length;
// For a quick trial run, KATALOG_NUR=mittelalter limits the crawl to matching categories.
const only = process.env.KATALOG_NUR ?? '';
const topUrls = categoryUrls.filter((url) => depth(url) === 1 && url.includes(only)).sort();
const subUrls = categoryUrls.filter((url) => depth(url) === 2 && url.includes(only)).sort();
console.log(`${topUrls.length} Themenwelten, ${subUrls.length} Unterthemen`);

const products = new Map();
const topTitle = new Map();
const topOf = new Map();
const subOf = new Map();
const progress = (label) => process.stdout.write(`\r${label.padEnd(70).slice(0, 70)} ${requests} Abrufe`);

for (const url of topUrls) {
  const { title, tiles } = await readCategory(url);
  topTitle.set(url, title);
  for (const tile of tiles) {
    if (!products.has(tile.number)) products.set(tile.number, tile);
    if (!topOf.has(tile.number)) topOf.set(tile.number, title);
  }
  progress(title);
}
for (const url of subUrls) {
  const { title, tiles } = await readCategory(url);
  const parent = topTitle.get(topUrls.find((top) => url.startsWith(top)) ?? '') ?? '';
  for (const tile of tiles) {
    if (!products.has(tile.number)) products.set(tile.number, tile);
    if (!subOf.has(tile.number)) subOf.set(tile.number, { parent, title });
  }
  progress(`${parent} – ${title}`);
}

const skippedBrands = {};
const entries = [];
for (const product of products.values()) {
  if (/part-?packs/i.test(product.brand) || /^(lumibricks|reobrix)$/i.test(product.brand)) {
    skippedBrands[product.brand] = (skippedBrands[product.brand] ?? 0) + 1;
    continue;
  }
  const ownBrand = /^bluebrixx/i.test(product.brand);
  if (product.name === '') continue;
  const sub = subOf.get(product.number);
  const top = sub?.parent || topOf.get(product.number) || '';
  // Loose bricks and baseplates are no sets.
  if (top === 'Partpacks') {
    skippedBrands['(Partpacks)'] = (skippedBrands['(Partpacks)'] ?? 0) + 1;
    continue;
  }
  entries.push({
    number: product.number,
    name: product.name,
    theme: sub ? [top, sub.title].filter(Boolean).join(' – ') : top,
    pieces: product.pieces,
    priceCents: product.priceCents,
    image: product.image,
    slug: product.slug,
    // Only present for other manufacturers. "Others" is the shop's catch-all.
    ...(ownBrand ? {} : { brand: /^others$/i.test(product.brand) ? '' : product.brand }),
  });
}
entries.sort((a, b) => Number(a.number) - Number(b.number));

const catalog = {
  manufacturer: 'BlueBrixx',
  source: SHOP,
  updated: new Date().toISOString().slice(0, 10),
  // image is the path below https://www.bluebrixx.com/media/, slug the last part of
  // https://www.bluebrixx.com/de/prod/<number>/<slug>/
  entries,
};
writeFileSync(OUT, JSON.stringify(catalog) + '\n');

const count = (test) => entries.filter(test).length;
console.log(`\n${products.size} Artikel gelesen in ${requests} Abrufen, ${entries.length} Sets geschrieben nach ${OUT}`);
console.log(`ohne Teilezahl ${count((e) => e.pieces === null)}, ohne Preis ${count((e) => e.priceCents === null)}, ohne Bild ${count((e) => e.image === null)}, ohne Thema ${count((e) => e.theme === '')}`);
const brands = {};
for (const e of entries) brands[e.brand ?? 'BlueBrixx'] = (brands[e.brand ?? 'BlueBrixx'] ?? 0) + 1;
console.log('Marken:', JSON.stringify(Object.fromEntries(Object.entries(brands).sort((a, b) => b[1] - a[1]))));
console.log('Weggelassen:', JSON.stringify(Object.fromEntries(Object.entries(skippedBrands).sort((a, b) => b[1] - a[1]))));
