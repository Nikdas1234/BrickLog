import 'fake-indexeddb/auto';
import { strToU8, unzipSync, zipSync } from 'fflate';
import { expect, test } from 'vitest';
import {
  BackupFormatError,
  BackupTooLargeError,
  backupFileName,
  MAX_BACKUP_BYTES,
  parseBackupZip,
  restoreBackup,
  writeBackupZip,
} from '../src/lib/backup';
import { exportAll, listSets, openBrickDb, putSet } from '../src/lib/db';
import type { BackupData } from '../src/lib/types';
import { backupFile, bytesOf, makeEntry, makePhoto, makeSet, makeVideo, sameBytes } from './helpers';

// Larger than one piece of the streaming export, to exercise the splitting.
const LONG_VIDEO = Uint8Array.from({ length: 9 * 1024 * 1024 + 123 }, (_, i) => (i * 31 + (i >> 8)) % 251);

function sampleData(): BackupData {
  const set = makeSet({ name: 'Burg Blaustein', coverPhotoId: 'p1', priceCents: 123450 });
  return {
    sets: [set, makeSet({ name: 'Wunsch', status: 'wunsch', priority: 'hoch' })],
    entries: [makeEntry(set.id, { photoIds: ['p1', 'p2'], videoIds: ['v1', 'v2'], minutes: 90, note: 'Tüte 1 – läuft' })],
    photos: [makePhoto(set.id, 'p1', [255, 216, 255, 0]), makePhoto(set.id, 'p2', [1, 2, 3, 4, 5])],
    videos: [makeVideo(set.id, 'v1'), makeVideo(set.id, 'v2', LONG_VIDEO, null)],
    manufacturers: ['BlueBrixx', 'Qman'],
  };
}

const zipFile = (files: Record<string, Uint8Array>) => new Blob([zipSync(files) as BlobPart]);
const manifestOnly = (manifest: unknown, extra: Record<string, Uint8Array> = {}) =>
  zipFile({ 'bricklog.json': strToU8(JSON.stringify(manifest)), ...extra });

const validManifest = () => ({
  app: 'BrickLog',
  version: 1,
  exportedAt: '2026-10-09T10:00:00.000Z',
  sets: [makeSet()],
  entries: [],
  photos: [],
  manufacturers: [],
});

test('backupFileName', () => {
  expect(backupFileName('2026-10-09')).toBe('BrickLog-Sicherung_2026-10-09.zip');
});

test('export and import yield the same data', async () => {
  const data = sampleData();
  const parsed = await parseBackupZip(await backupFile(data));
  expect(parsed.sets).toEqual(data.sets);
  expect(parsed.entries).toEqual(data.entries);
  expect(parsed.manufacturers).toEqual(data.manufacturers);
  expect(parsed.photos.map(({ data: _d, ...meta }) => meta)).toEqual(data.photos.map(({ data: _d, ...meta }) => meta));
  expect([...new Uint8Array(parsed.photos[0].data)]).toEqual([255, 216, 255, 0]);
  expect([...new Uint8Array(parsed.photos[1].data)]).toEqual([1, 2, 3, 4, 5]);
});

test('videos survive export and import byte for byte, also across several pieces', async () => {
  const data = sampleData();
  const parsed = await parseBackupZip(await backupFile(data));

  expect(parsed.videos.map(({ blob: _b, poster: _p, ...meta }) => meta)).toEqual(
    data.videos.map(({ blob: _b, poster: _p, ...meta }) => meta),
  );
  const [short, long] = parsed.videos;
  expect(short.blob.type).toBe('video/mp4');
  expect(await bytesOf(short.blob)).toEqual([9, 8, 7, 6]);
  expect([...new Uint8Array(short.poster!)]).toEqual([5, 5]);
  expect(long.poster).toBeNull();
  expect(long.blob.size).toBe(LONG_VIDEO.length);
  expect(await sameBytes(long.blob, LONG_VIDEO)).toBe(true);
});

test('the export is an ordinary zip file that other programs can open', async () => {
  const files = unzipSync(new Uint8Array(await (await backupFile(sampleData())).arrayBuffer()));
  expect(Object.keys(files).sort()).toEqual([
    'bricklog.json',
    'photos/p1.jpg',
    'photos/p2.jpg',
    'videos/v1.jpg',
    'videos/v1.mp4',
    'videos/v2.mp4',
  ]);
  expect(files['videos/v2.mp4'].length).toBe(LONG_VIDEO.length);
});

test('the export is handed out in pieces instead of one large block', async () => {
  const sizes: number[] = [];
  await writeBackupZip(sampleData(), '2026-10-09T10:00:00.000Z', (chunk) => {
    sizes.push(chunk.length);
  });
  expect(sizes.length).toBeGreaterThan(5);
  expect(Math.max(...sizes)).toBeLessThanOrEqual(4 * 1024 * 1024 + 1024);
});

test('a backup that would not fit into a zip file is refused before anything is written', async () => {
  const huge = makeVideo('s1', 'v1');
  Object.defineProperty(huge.blob, 'size', { value: MAX_BACKUP_BYTES + 1 });
  let written = 0;
  await expect(
    writeBackupZip({ ...sampleData(), videos: [huge] }, '2026-10-09T10:00:00.000Z', () => {
      written++;
    }),
  ).rejects.toBeInstanceOf(BackupTooLargeError);
  expect(written).toBe(0);
});

test('broken or foreign files are rejected', async () => {
  const reject = (file: Blob) => expect(parseBackupZip(file)).rejects.toBeInstanceOf(BackupFormatError);

  await reject(new Blob([new Uint8Array([1, 2, 3])]));
  await reject(new Blob(['# BrickLog\n\nJust a readme, not a backup.']));
  await reject(zipFile({ 'something.txt': strToU8('hello') }));
  await reject(zipFile({ 'bricklog.json': strToU8('{not json') }));
  await reject(manifestOnly({ ...validManifest(), app: 'SomethingElse' }));
  await reject(manifestOnly({ ...validManifest(), version: 2 }));
  await reject(manifestOnly({ ...validManifest(), sets: 'nope' }));
  await reject(manifestOnly({ ...validManifest(), sets: [{ ...makeSet(), name: '' }] }));
  await reject(manifestOnly({ ...validManifest(), photos: [{ id: 'p1', setId: 's1', width: 1, height: 1 }] }));
  await reject(manifestOnly({ ...validManifest(), videos: 'nope' }));
  await reject(manifestOnly({ ...validManifest(), videos: [{ id: 'v1', setId: 's1', file: 'videos/v1.mp4' }] }));

  // A backup cut off in the middle, e.g. by an interrupted copy.
  const whole = await backupFile(sampleData());
  await reject(whole.slice(0, Math.floor(whole.size / 2)));
});

test('a valid manifest without photos is accepted', async () => {
  const parsed = await parseBackupZip(manifestOnly(validManifest()));
  expect(parsed.sets).toHaveLength(1);
  expect(parsed.videos).toEqual([]);
});

test('a backup from before version 1.10 has no videos and its entries get an empty list', async () => {
  const set = makeSet();
  const { videoIds: _v, ...oldEntry } = makeEntry(set.id, { photoIds: ['p1'] });
  const parsed = await parseBackupZip(
    manifestOnly(
      { ...validManifest(), sets: [set], entries: [oldEntry], photos: [{ id: 'p1', setId: set.id, width: 4, height: 3 }] },
      { 'photos/p1.jpg': new Uint8Array([7, 7, 7]) },
    ),
  );
  expect(parsed.entries[0].videoIds).toEqual([]);
  expect([...new Uint8Array(parsed.photos[0].data)]).toEqual([7, 7, 7]);
});

test('a backup from before version 1.2 loses its build status', async () => {
  const legacy = [
    { ...makeSet({ name: 'Fertig' }), status: 'fertig' },
    { ...makeSet({ name: 'Abgegeben' }), status: 'abgegeben' },
    { ...makeSet({ name: 'Wunsch' }), status: 'wunsch' },
  ];
  const parsed = await parseBackupZip(manifestOnly({ ...validManifest(), sets: legacy }));
  expect(parsed.sets.map((s) => [s.name, s.status])).toEqual([
    ['Fertig', 'sammlung'],
    ['Abgegeben', 'sammlung'],
    ['Wunsch', 'wunsch'],
  ]);
});

test('restoreBackup with a broken file leaves the stock untouched', async () => {
  const db = await openBrickDb(`test-${crypto.randomUUID()}`);
  await putSet(db, makeSet({ name: 'A' }));
  await putSet(db, makeSet({ name: 'B' }));

  await expect(restoreBackup(db, new Blob([new Uint8Array([1, 2, 3])]))).rejects.toBeInstanceOf(BackupFormatError);

  expect(await listSets(db)).toHaveLength(2);
});

test('restoreBackup replaces the stock and reports the counts', async () => {
  const db = await openBrickDb(`test-${crypto.randomUUID()}`);
  await putSet(db, makeSet({ name: 'Alt' }));
  const data = sampleData();

  const result = await restoreBackup(db, await backupFile(data));

  expect(result).toEqual({ sets: 2, photos: 2, videos: 2 });
  const stored = await exportAll(db);
  expect(stored.sets.map((s) => s.name).sort()).toEqual(['Burg Blaustein', 'Wunsch']);
  expect(stored.photos).toHaveLength(2);
  expect(stored.manufacturers).toEqual(['BlueBrixx', 'Qman']);
  const long = stored.videos.find((v) => v.id === 'v2')!;
  expect(long.blob.size).toBe(LONG_VIDEO.length);
  expect(await sameBytes(long.blob, LONG_VIDEO)).toBe(true);
});
