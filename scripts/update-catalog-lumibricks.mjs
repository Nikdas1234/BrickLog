// Rebuilds src/data/catalog-lumibricks.json from the public Lumibricks shop
// (`npm run katalog`). Only facts are taken over: set number, name, theme, piece
// count, a guide price and the address of the product picture. No description texts
// and no picture files end up in this repository.
//
// Sources:
//   /products.json and /de/products.json  the shop's public product feed
//   /products/<handle>                    piece count ("2466 PCS | ...")
//   cdn.shopify.com/s/javascripts/currencies.js  the rates the shop itself uses to
//                                                show euro prices
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHOP = 'https://www.lumibricks.com';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'catalog-lumibricks.json');
const HEADERS = { 'user-agent': 'BrickLog catalog update (private hobby project; github.com/Nikdas1234/BrickLog)' };
const PAUSE_MS = 300;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(url) {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  return response;
}

async function feed(prefix) {
  const products = [];
  for (let page = 1; ; page++) {
    const batch = (await (await get(`${SHOP}${prefix}/products.json?limit=250&page=${page}`)).json()).products;
    products.push(...batch);
    if (batch.length < 250) return products;
  }
}

function isSet(product) {
  const sku = product.variants[0]?.sku ?? '';
  return (
    product.product_type !== '' &&
    product.product_type !== 'POINTS REDEMPTION' &&
    !/REDEEM/i.test(sku) &&
    !/not for sale|points redemption|accessories/i.test(product.title) &&
    /\d{4}/.test(sku)
  );
}

function parsePieces(html, bodyHtml) {
  const text = bodyHtml.replace(/<[^>]+>/g, ' ');
  const match =
    html.match(/(\d[\d.,]*)\s*PCS\s*\|/i) ??
    html.match(/(?:Pieces|Stücke):\s*(\d[\d.,]*)/i) ??
    text.match(/(\d[\d.,]*)\s*(?:building blocks|pieces|pcs)\b/i);
  if (!match) return null;
  const pieces = Number(match[1].replace(/[.,]/g, ''));
  return Number.isInteger(pieces) && pieces > 0 ? pieces : null;
}

// The shop charges in US dollars and shows euros converted with these rates,
// rounded to whole euros. So the euro value is a guide price, not a fixed one.
async function usdToEurRate() {
  const script = await (await get('https://cdn.shopify.com/s/javascripts/currencies.js')).text();
  const rate = (code) => Number((script.match(new RegExp(`"?${code}"?:\\s*([\\d.]+)`)) ?? [])[1]);
  const result = rate('USD') / rate('EUR');
  if (!(result > 0.5 && result < 1.5)) throw new Error(`implausible USD/EUR rate: ${result}`);
  return result;
}

const [english, german, rate] = await Promise.all([feed(''), feed('/de'), usdToEurRate()]);
const germanTitle = new Map(german.map((p) => [p.id, p.title.trim()]));
const sets = english.filter(isSet);
console.log(`${english.length} Produkte im Shop, davon ${sets.length} Sets. Kurs USD→EUR: ${rate.toFixed(4)}`);

const entries = [];
for (const [index, product] of sets.entries()) {
  const html = await (await get(`${SHOP}/products/${product.handle}`)).text();
  const name = product.title.replace(/\s*\((?:Retiring Soon|Coming Soon|Pre-?order)\)/gi, '').trim();
  const nameDe = germanTitle.get(product.id);
  const usd = Number(product.variants[0].price);
  entries.push({
    number: product.variants[0].sku.split('#')[0],
    name,
    ...(nameDe && nameDe !== product.title.trim() ? { nameDe } : {}),
    theme: product.product_type,
    pieces: parsePieces(html, product.body_html ?? ''),
    priceCents: usd > 0 ? Math.round(usd * rate) * 100 : null,
    image: product.images[0]?.src ?? null,
    url: `${SHOP}/de/products/${product.handle}`,
  });
  process.stdout.write(`\r${index + 1}/${sets.length}`);
  await sleep(PAUSE_MS);
}
entries.sort((a, b) => a.number.localeCompare(b.number, 'en', { numeric: true }));

const catalog = {
  manufacturer: 'Lumibricks',
  source: SHOP,
  updated: new Date().toISOString().slice(0, 10),
  entries,
};
writeFileSync(OUT, JSON.stringify(catalog, null, 1) + '\n');

const withoutPieces = entries.filter((e) => e.pieces === null).map((e) => `${e.number} ${e.name}`);
console.log(`\n${entries.length} Sets geschrieben nach ${OUT}`);
console.log(`Ohne Teilezahl: ${withoutPieces.length}${withoutPieces.length ? '\n  ' + withoutPieces.join('\n  ') : ''}`);
