export interface CatalogEntry {
  manufacturer: string;
  number: string;
  // True when `number` is only a shop's article number and not the set number the
  // manufacturer prints on the box.
  shopNumber: boolean;
  name: string;
  // Translated name from the German shop page; only used for searching.
  nameDe?: string;
  theme: string;
  pieces: number | null;
  priceCents: number | null;
  // True when the shop charges in another currency and the euro value is converted.
  priceEstimated: boolean;
  // Small picture for the result list.
  thumb: string | null;
  // Picture that becomes the cover of the set.
  image: string | null;
  // Whether a web page may download the picture. The Android app always can.
  imageCors: boolean;
  url: string;
}

interface LumibricksFile {
  manufacturer: string;
  entries: {
    number: string;
    name: string;
    nameDe?: string;
    theme: string;
    pieces: number | null;
    priceCents: number | null;
    image: string | null;
    url: string;
  }[];
}

interface BlueBrixxFile {
  manufacturer: string;
  source: string;
  entries: {
    number: string;
    name: string;
    theme: string;
    pieces: number | null;
    priceCents: number | null;
    // Path below <source>/media/
    image: string | null;
    // Last part of <source>/de/prod/<number>/<slug>/
    slug: string;
    // Only set for sets of other manufacturers that the shop sells.
    brand?: string;
  }[];
}

// Shopify's image CDN scales on request.
const withWidth = (image: string, width: number) => `${image}${image.includes('?') ? '&' : '?'}width=${width}`;

export function fromLumibricks(file: LumibricksFile): CatalogEntry[] {
  return file.entries.map((entry) => ({
    ...entry,
    manufacturer: file.manufacturer,
    shopNumber: false,
    priceEstimated: true,
    thumb: entry.image && withWidth(entry.image, 120),
    image: entry.image && withWidth(entry.image, 1600),
    imageCors: true,
  }));
}

export function fromBlueBrixx(file: BlueBrixxFile): CatalogEntry[] {
  return file.entries.map(({ slug, image, brand, ...entry }) => ({
    ...entry,
    manufacturer: brand ?? file.manufacturer,
    shopNumber: brand !== undefined,
    priceEstimated: false,
    // The shop keeps ready-made thumbnails next to every picture.
    thumb: image && `${file.source}/thumbnail/${image.replace(/(\.\w+)$/, '_260x260$1')}`,
    image: image && `${file.source}/media/${image}`,
    imageCors: false,
    url: `${file.source}/de/prod/${entry.number}/${slug}/`,
  }));
}

let cached: Promise<CatalogEntry[]> | null = null;

// Loaded on demand, so the catalogs do not slow down the app start.
export function loadCatalog(): Promise<CatalogEntry[]> {
  cached ??= Promise.all([
    import('../data/catalog-lumibricks.json').then((module) => fromLumibricks(module.default as LumibricksFile)),
    import('../data/catalog-bluebrixx.json').then((module) => fromBlueBrixx(module.default as BlueBrixxFile)),
  ]).then((catalogs) => catalogs.flat());
  return cached;
}

// Best matches first: set number starts with the query, then number contains it,
// then every word of the query appears in one of the names.
export function searchCatalog(entries: CatalogEntry[], query: string, limit = 8): CatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [];
  const words = q.split(/\s+/);

  const rank = (entry: CatalogEntry): number | null => {
    const number = entry.number.toLowerCase();
    if (number.startsWith(q)) return 0;
    if (number.includes(q)) return 1;
    const names = `${entry.name} ${entry.nameDe ?? ''}`.toLowerCase();
    return words.every((word) => names.includes(word)) ? 2 : null;
  };

  return entries
    .map((entry) => ({ entry, rank: rank(entry) }))
    .filter((hit): hit is { entry: CatalogEntry; rank: number } => hit.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.entry.name.localeCompare(b.entry.name, 'de'))
    .slice(0, limit)
    .map((hit) => hit.entry);
}
