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

export function applyStatus(set: BrickSet, status: Status, today: string): BrickSet {
  const next = { ...set, status };
  if (status === 'im_bau') {
    next.buildStart ??= today;
    next.buildEnd = null;
  } else if (status === 'fertig') {
    next.buildStart ??= today;
    next.buildEnd ??= today;
  } else if (status === 'ungebaut') {
    next.buildEnd = null;
  }
  return next;
}

export function markPurchased(set: BrickSet, purchaseDate: string, priceCents: number | null): BrickSet {
  return { ...set, status: 'ungebaut', purchaseDate, priceCents, priority: null };
}

export interface SetFilter {
  query: string;
  status: Status | null;
  manufacturer: string | null;
  theme: string | null;
}

// status null means "everything owned", i.e. all sets except wishes.
export function filterSets(sets: BrickSet[], filter: SetFilter): BrickSet[] {
  const q = filter.query.trim().toLowerCase();
  return sets.filter(
    (s) =>
      (filter.status === null ? s.status !== 'wunsch' : s.status === filter.status) &&
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
