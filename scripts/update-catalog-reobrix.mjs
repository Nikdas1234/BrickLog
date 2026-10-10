// Rebuilds src/data/catalog-reobrix.json from the official Reobrix shop
// (`npm run katalog:reobrix`).
//
// The shop lists 20 products per page; set number and piece count are only on the
// product pages, so each of them is read once.
//
// Only facts are taken over; no description texts and no picture files.
import { get, sleep, stripTags, toCount, usdToEurRate, writeCatalog, decode } from './catalog-lib.mjs';

const SHOP = 'https://www.reobrix.com';
const IMAGE_BASE = 'https://ueeshop.ly200-cdn.com/u_file/';
const URL_BASE = `${SHOP}/products/`;
const PAUSE_MS = 300;
const MAX_PAGES = 100;

// Collect the product addresses from the listing pages until one brings nothing new.
const slugs = [];
for (let page = 1; page <= MAX_PAGES; page++) {
  const html = await (await get(`${SHOP}/products/?page=${page}`)).text();
  const found = [...new Set([...html.matchAll(/href="\/products\/([^"#?/]+)"/g)].map((m) => m[1]))].filter(
    (slug) => !slugs.includes(slug),
  );
  if (found.length === 0) break;
  slugs.push(...found);
  process.stdout.write(`\rListe: Seite ${page}, ${slugs.length} Produkte`);
  await sleep(PAUSE_MS);
}
console.log();

const meta = (html, name) => decode((html.match(new RegExp(`<meta[^>]+(?:property|name)="${name}"[^>]+content="([^"]*)"`)) ?? [])[1] ?? '');

const rate = await usdToEurRate();
const byNumber = new Map();
let skipped = 0;
for (const [index, slug] of slugs.entries()) {
  const html = await (await get(`${URL_BASE}${slug}`)).text();
  const text = stripTags(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' '));
  // "Item No: Reobrix 99009" – products without it are spare parts and accessories.
  const number = (text.match(/Item\s*No\.?\s*[:：]\s*(?:Reobrix\s*)?([A-Z]{0,3}\d{3,6}[A-Z]?(?:-\d+)?)/i) ?? [])[1]?.toUpperCase();
  const name = meta(html, 'og:title').trim();
  if (!number || name === '' || byNumber.has(number)) {
    skipped++;
  } else {
    const amount = Number(meta(html, 'product:price:amount'));
    const currency = meta(html, 'product:price:currency');
    const euros = currency === 'EUR' ? amount : currency === 'USD' ? amount * rate : 0;
    const image = meta(html, 'og:image');
    byNumber.set(number, {
      number,
      name,
      // "Dealer: Modular Buildings Building Block" – the shop's own category line.
      theme: (text.match(/Dealer\s*[:：]\s*(.+?)\s+Building\s+Blocks?\b/i) ?? [])[1]?.trim() ?? '',
      pieces: toCount((text.match(/Bricks?\s*Blocks?\s*[:：]\s*([\d.,]+)/i) ?? [])[1] ?? ''),
      // Whatever currency the shop shows, it converts from dollars: a guide price.
      priceCents: euros > 0 ? Math.round(euros) * 100 : null,
      image: image.startsWith(IMAGE_BASE) ? image.slice(IMAGE_BASE.length) : image || null,
      url: slug,
    });
  }
  process.stdout.write(`\rProdukte: ${index + 1}/${slugs.length}`);
  await sleep(PAUSE_MS);
}

const entries = [...byNumber.values()].sort((a, b) => a.number.localeCompare(b.number, 'en', { numeric: true }));
console.log(`\n${slugs.length} Produkte gelesen, ${skipped} ohne Setnummer oder doppelt`);
writeCatalog('catalog-reobrix.json', {
  manufacturer: 'Reobrix',
  source: SHOP,
  priceEstimated: true,
  imageCors: true,
  imageBase: IMAGE_BASE,
  // The picture server scales on request.
  thumbSuffix: '?x-oss-process=image/resize,m_lfit,h_0,w_160',
  imageSuffix: '?x-oss-process=image/resize,m_lfit,h_0,w_1600',
  urlBase: URL_BASE,
  entries,
});
