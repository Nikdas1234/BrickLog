import type { BrickSet, Priority, Status } from './types';

export function newSet(status: Status, now: Date = new Date()): BrickSet {
  const stamp = now.toISOString();
  return {
    id: crypto.randomUUID(),
    name: '',
    manufacturer: '',
    setNumber: '',
    theme: '',
    pieceCount: null,
    priceCents: null,
    purchaseDate: null,
    retailer: '',
    location: '',
    note: '',
    coverPhotoId: null,
    status,
    buildStart: null,
    buildEnd: null,
    shopUrl: '',
    priority: null,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export function markPurchased(set: BrickSet, purchaseDate: string, priceCents: number | null): BrickSet {
  return { ...set, status: 'sammlung', purchaseDate, priceCents, priority: null };
}

export interface SetFilter {
  query: string;
  manufacturer: string | null;
  theme: string | null;
}

export function filterSets(sets: BrickSet[], filter: SetFilter): BrickSet[] {
  const q = filter.query.trim().toLowerCase();
  return sets.filter(
    (s) =>
      (filter.manufacturer === null || s.manufacturer === filter.manufacturer) &&
      (filter.theme === null || s.theme === filter.theme) &&
      (q === '' || s.name.toLowerCase().includes(q) || s.setNumber.toLowerCase().includes(q)),
  );
}

const PRIORITY_RANK: Record<Priority, number> = { hoch: 0, mittel: 1, niedrig: 2 };

function byName(a: BrickSet, b: BrickSet): number {
  return a.name.localeCompare(b.name, 'de');
}

export function sortWishlist(sets: BrickSet[], by: 'priority' | 'price'): BrickSet[] {
  const rank = (s: BrickSet) =>
    by === 'priority' ? (s.priority ? PRIORITY_RANK[s.priority] : 3) : (s.priceCents ?? Infinity);
  return [...sets].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    return ra === rb ? byName(a, b) : ra - rb;
  });
}

export function suggestions(sets: BrickSet[], field: 'theme' | 'retailer' | 'location'): string[] {
  const values = new Set(sets.map((s) => s[field].trim()).filter((v) => v !== ''));
  return [...values].sort((a, b) => a.localeCompare(b, 'de'));
}
