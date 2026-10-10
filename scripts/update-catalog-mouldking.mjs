// Rebuilds src/data/catalog-mouldking.json (`npm run katalog:mouldking`).
//
// Mould King has no shop of its own that can be read: the best-known one turns away
// automatic requests. So the data comes from the shop mouldkingblock.com, a dealer that
// lists the Mould King range with set number, name, series and piece count. It offers
// the public product interface of WooCommerce, which needs only a handful of requests.
// Its prices are this dealer's dollar prices and serve only as a rough guide.
//
// Only facts are taken over; no description texts and no picture files.
import { get, sleep, stripTags, toCount, usdToEurRate, writeCatalog, decode } from './catalog-lib.mjs';

const SHOP = 'https://mouldkingblock.com';
const IMAGE_BASE = `${SHOP}/wp-content/uploads/`;
const URL_BASE = `${SHOP}/product/`;
const PAUSE_MS = 500;

// "MOULD KING 10271 1990 NSX sports car Building Block" → number 10271, name "1990 NSX sports car"
function parseTitle(title) {
  const match = decode(title).match(/^MOULD\s*KING\s+([A-Z]{0,3}\d{3,6}[A-Z]?(?:-\d+)?)\s+(.+?)(?:\s+Building\s+Blocks?)?$/i);
  return match ? { number: match[1].toUpperCase(), name: match[2].trim() } : null;
}

// "... Contains: Mould King 10271 ~1300 pcs ..." or "Pieces: 1300"
function parsePieces(description) {
  const text = stripTags(description);
  const match = text.match(/~?\s*(\d[\d,.]*)\s*\+?\s*(?:pcs|pieces)\b/i) ?? text.match(/(?:pieces|pcs|parts)\s*[:：]\s*~?\s*(\d[\d,.]*)/i);
  return match ? toCount(match[1]) : null;
}

// "MOULDKING Technic Series" → "Technic"
const series = (categories) =>
  decode(categories.map((c) => c.name).find((name) => /series/i.test(name)) ?? categories[0]?.name ?? '')
    .replace(/^MOULD\s*KING\s+/i, '')
    .replace(/\s+Series$/i, '')
    .trim();

// The smallest ready-made preview of at least 100 px keeps the result list light.
// For about half of the pictures the shop has none; those sets get no preview, because
// loading originals of up to 1 MB each into a result list would waste mobile data.
function smallestPreview(image) {
  const candidates = [...(image.srcset ?? '').matchAll(/(\S+)\s+(\d+)w/g)].map((m) => ({ url: m[1], width: Number(m[2]) }));
  // The shop's standard preview is not always part of the list above; its size is in
  // its file name ("…-300x300.png").
  const standard = image.thumbnail?.match(/-(\d+)x\d+\.\w+$/);
  if (standard) candidates.push({ url: image.thumbnail, width: Number(standard[1]) });
  return candidates.filter((c) => c.width >= 100 && c.width <= 400 && c.url !== image.src).sort((a, b) => a.width - b.width)[0]?.url ?? null;
}

const relative = (url, base) => (url.startsWith(base) ? url.slice(base.length) : url);

const rate = await usdToEurRate();
const products = [];
for (let page = 1; ; page++) {
  const response = await get(`${SHOP}/wp-json/wc/store/v1/products?per_page=100&search=MOULD%20KING&page=${page}`);
  products.push(...(await response.json()));
  const pages = Number(response.headers.get('x-wp-totalpages') ?? 1);
  process.stdout.write(`\rSeite ${page}/${pages}`);
  if (page >= pages) break;
  await sleep(PAUSE_MS);
}

const byNumber = new Map();
let unreadable = 0;
for (const product of products) {
  const title = parseTitle(product.name);
  if (!title) {
    unreadable++;
    continue;
  }
  if (byNumber.has(title.number)) continue;
  const image = product.images?.[0];
  const dollars = Number(product.prices?.price) / 10 ** (product.prices?.currency_minor_unit ?? 2);
  byNumber.set(title.number, {
    number: title.number,
    name: title.name,
    theme: series(product.categories ?? []),
    pieces: parsePieces(product.description ?? ''),
    priceCents: product.prices?.currency_code === 'USD' && dollars > 0 ? Math.round(dollars * rate) * 100 : null,
    image: image ? relative(image.src, IMAGE_BASE) : null,
    ...(image && smallestPreview(image) ? { thumb: relative(smallestPreview(image), IMAGE_BASE) } : {}),
    url: relative(product.permalink, URL_BASE),
  });
}

const entries = [...byNumber.values()].sort((a, b) => a.number.localeCompare(b.number, 'en', { numeric: true }));
console.log(`\n${products.length} Artikel gelesen, ${unreadable} ohne lesbare Setnummer, Kurs USD→EUR ${rate.toFixed(4)}`);
writeCatalog('catalog-mouldking.json', {
  manufacturer: 'Mould King',
  source: SHOP,
  priceEstimated: true,
  imageCors: false,
  imageBase: IMAGE_BASE,
  urlBase: URL_BASE,
  entries,
});
