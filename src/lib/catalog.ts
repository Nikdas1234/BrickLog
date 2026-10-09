export interface CatalogEntry {
  manufacturer: string;
  number: string;
  name: string;
  // Translated name from the German shop page; only used for searching.
  nameDe?: string;
  theme: string;
  pieces: number | null;
  // Guide price in euro cents, converted from the shop's US dollar price.
  priceCents: number | null;
  image: string | null;
  url: string;
}

interface CatalogFile {
  manufacturer: string;
  source: string;
  updated: string;
  entries: Omit<CatalogEntry, 'manufacturer'>[];
}

let cached: Promise<CatalogEntry[]> | null = null;

// Loaded on demand, so the catalog does not slow down the app start.
export function loadCatalog(): Promise<CatalogEntry[]> {
  cached ??= import('../data/catalog-lumibricks.json').then((module) => {
    const file = module.default as CatalogFile;
    return file.entries.map((entry) => ({ ...entry, manufacturer: file.manufacturer }));
  });
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

// Shopify's image CDN scales on request; 1600 matches what we store anyway.
export function catalogImageUrl(image: string, width: number): string {
  return `${image}${image.includes('?') ? '&' : '?'}width=${width}`;
}
