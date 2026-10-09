import { newSet } from '../src/lib/sets';
import type { BrickSet, LogEntry, Photo } from '../src/lib/types';

export function makeSet(overrides: Partial<BrickSet> = {}): BrickSet {
  return { ...newSet('sammlung', new Date('2026-10-01T10:00:00Z')), name: 'Testset', ...overrides };
}

export function makeEntry(setId: string, overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: crypto.randomUUID(),
    setId,
    date: '2026-10-01',
    note: '',
    section: '',
    minutes: null,
    photoIds: [],
    createdAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  };
}

export function makePhoto(setId: string, id: string, bytes: number[] = [1, 2, 3]): Photo {
  return {
    id,
    setId,
    data: new Uint8Array(bytes).buffer,
    width: 4,
    height: 3,
    createdAt: '2026-10-01T10:00:00.000Z',
  };
}
