import { expect, test } from 'vitest';
import { computeStats } from '../src/lib/stats';
import { makeEntry, makeSet } from './helpers';

test('computeStats', () => {
  const a = makeSet({ status: 'ungebaut', pieceCount: 1000, priceCents: 5000, manufacturer: 'BlueBrixx' });
  const b = makeSet({ status: 'fertig', pieceCount: 500, priceCents: 3000, manufacturer: 'BlueBrixx' });
  const c = makeSet({ status: 'abgegeben', pieceCount: 200, priceCents: 2000, manufacturer: '' });
  const d = makeSet({ status: 'wunsch', pieceCount: 900, priceCents: 8000, manufacturer: 'CaDA' });
  const entries = [makeEntry(b.id, { minutes: 60 }), makeEntry(b.id, { minutes: 75 }), makeEntry(b.id)];

  const stats = computeStats([a, b, c, d], entries);

  expect(stats.countByStatus).toEqual({ wunsch: 1, ungebaut: 1, im_bau: 0, fertig: 1, abgegeben: 1 });
  expect(stats.totalPieces).toBe(1500);
  expect(stats.totalSpentCents).toBe(10000);
  expect(stats.wishlistCents).toBe(8000);
  expect(stats.totalMinutes).toBe(135);
  expect(stats.byManufacturer).toEqual([
    { manufacturer: 'BlueBrixx', count: 2, spentCents: 8000 },
    { manufacturer: 'Ohne Hersteller', count: 1, spentCents: 2000 },
  ]);
});

test('computeStats on an empty stock', () => {
  const stats = computeStats([], []);
  expect(stats.totalPieces).toBe(0);
  expect(stats.byManufacturer).toEqual([]);
});
