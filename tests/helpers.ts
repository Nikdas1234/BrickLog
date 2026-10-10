import { writeBackupZip } from '../src/lib/backup';
import { newSet } from '../src/lib/sets';
import type { BackupData, BrickSet, LogEntry, Photo, Video } from '../src/lib/types';

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
    videoIds: [],
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

export function makeVideo(setId: string, id: string, bytes: Uint8Array = new Uint8Array([9, 8, 7, 6]), poster: number[] | null = [5, 5]): Video {
  return {
    id,
    setId,
    blob: new Blob([bytes as BlobPart], { type: 'video/mp4' }),
    type: 'video/mp4',
    size: bytes.length,
    durationSec: 12,
    poster: poster ? new Uint8Array(poster).buffer : null,
    createdAt: '2026-10-01T10:00:00.000Z',
  };
}

export const bytesOf = async (blob: Blob) => [...new Uint8Array(await blob.arrayBuffer())];

// For contents too large to print in a failed comparison.
export async function sameBytes(blob: Blob, expected: Uint8Array): Promise<boolean> {
  const actual = new Uint8Array(await blob.arrayBuffer());
  if (actual.length !== expected.length) return false;
  for (let i = 0; i < actual.length; i++) if (actual[i] !== expected[i]) return false;
  return true;
}

// Runs the streaming export and collects the pieces into one file, as the app does.
export async function backupFile(data: BackupData): Promise<Blob> {
  const chunks: Uint8Array[] = [];
  await writeBackupZip(data, '2026-10-09T10:00:00.000Z', (chunk) => {
    chunks.push(chunk);
  });
  return new Blob(chunks as BlobPart[]);
}
