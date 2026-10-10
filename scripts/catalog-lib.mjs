// Shared helpers of the catalog scripts for Reobrix and Mould King.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HEADERS = { 'user-agent': 'BrickLog catalog update (private hobby project; github.com/Nikdas1234/BrickLog)' };

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetches a page, with two more attempts when the shop hiccups.
export async function get(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(40_000) });
      if (!response.ok) throw new Error(`${response.status} for ${url}`);
      return response;
    } catch (error) {
      if (attempt === 3) throw error;
      await sleep(3000 * attempt);
    }
  }
}

export const decode = (text) =>
  text
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#8217;/g, "'")
    .replace(/&#8211;/g, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/&plusmn;/g, '±')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

export const stripTags = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// "1,234" or "1.234" or "~1300" → 1234 / 1300
export function toCount(text) {
  const value = Number(String(text).replace(/[^\d]/g, ''));
  return Number.isInteger(value) && value > 0 ? value : null;
}

// Both shops charge in US dollars. The euro value in the catalog is therefore a guide
// price, converted with the daily rates that Shopify publishes for its shops.
export async function usdToEurRate() {
  const script = await (await get('https://cdn.shopify.com/s/javascripts/currencies.js')).text();
  const rate = (code) => Number((script.match(new RegExp(`"?${code}"?:\\s*([\\d.]+)`)) ?? [])[1]);
  const result = rate('USD') / rate('EUR');
  if (!(result > 0.5 && result < 1.5)) throw new Error(`implausible USD/EUR rate: ${result}`);
  return result;
}

export function writeCatalog(fileName, catalog) {
  const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', fileName);
  writeFileSync(out, JSON.stringify({ ...catalog, updated: new Date().toISOString().slice(0, 10) }) + '\n');
  const count = (test) => catalog.entries.filter(test).length;
  console.log(`\n${catalog.entries.length} Sets geschrieben nach ${out}`);
  console.log(
    `ohne Teilezahl ${count((e) => e.pieces === null)}, ohne Preis ${count((e) => e.priceCents === null)}, ohne Bild ${count((e) => !e.image)}, ohne Thema ${count((e) => e.theme === '')}`,
  );
}
