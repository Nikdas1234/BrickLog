import type { BrickSet, LogEntry, Status } from './types';

export interface Stats {
  countByStatus: Record<Status, number>;
  totalPieces: number;
  totalSpentCents: number;
  totalMinutes: number;
  wishlistCents: number;
  byManufacturer: { manufacturer: string; count: number; spentCents: number }[];
}

export function computeStats(sets: BrickSet[], entries: LogEntry[]): Stats {
  const stats: Stats = {
    countByStatus: { wunsch: 0, ungebaut: 0, im_bau: 0, fertig: 0, abgegeben: 0 },
    totalPieces: 0,
    totalSpentCents: 0,
    totalMinutes: entries.reduce((sum, e) => sum + (e.minutes ?? 0), 0),
    wishlistCents: 0,
    byManufacturer: [],
  };
  const groups = new Map<string, { manufacturer: string; count: number; spentCents: number }>();

  for (const s of sets) {
    stats.countByStatus[s.status]++;
    if (s.status === 'wunsch') {
      stats.wishlistCents += s.priceCents ?? 0;
      continue;
    }
    // Given-away sets still cost money but their pieces are no longer in the house.
    stats.totalSpentCents += s.priceCents ?? 0;
    if (s.status !== 'abgegeben') stats.totalPieces += s.pieceCount ?? 0;

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
