import type { BrickSet, LogEntry } from './types';

export interface Stats {
  ownedCount: number;
  wishCount: number;
  totalPieces: number;
  totalSpentCents: number;
  totalMinutes: number;
  wishlistCents: number;
  byManufacturer: { manufacturer: string; count: number; spentCents: number }[];
}

export function computeStats(sets: BrickSet[], entries: LogEntry[]): Stats {
  const stats: Stats = {
    ownedCount: 0,
    wishCount: 0,
    totalPieces: 0,
    totalSpentCents: 0,
    totalMinutes: entries.reduce((sum, e) => sum + (e.minutes ?? 0), 0),
    wishlistCents: 0,
    byManufacturer: [],
  };
  const groups = new Map<string, { manufacturer: string; count: number; spentCents: number }>();

  for (const s of sets) {
    if (s.status === 'wunsch') {
      stats.wishCount++;
      stats.wishlistCents += s.priceCents ?? 0;
      continue;
    }
    stats.ownedCount++;
    stats.totalSpentCents += s.priceCents ?? 0;
    stats.totalPieces += s.pieceCount ?? 0;

    const manufacturer = s.manufacturer || 'Ohne Hersteller';
    const group = groups.get(manufacturer) ?? { manufacturer, count: 0, spentCents: 0 };
    group.count++;
    group.spentCents += s.priceCents ?? 0;
    groups.set(manufacturer, group);
  }

  stats.byManufacturer = [...groups.values()].sort(
    (a, b) => b.count - a.count || a.manufacturer.localeCompare(b.manufacturer, 'de'),
  );
  return stats;
}
