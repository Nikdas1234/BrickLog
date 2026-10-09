import 'fake-indexeddb/auto';
import { strToU8, zipSync } from 'fflate';
import { expect, test } from 'vitest';
import { BackupFormatError, backupFileName, buildBackupZip, parseBackupZip, restoreBackup } from '../src/lib/backup';
import { exportAll, listSets, openBrickDb, putSet } from '../src/lib/db';
import type { BackupData } from '../src/lib/types';
import { makeEntry, makePhoto, makeSet } from './helpers';

function sampleData(): BackupData {
  const set = makeSet({ name: 'Burg Blaustein', coverPhotoId: 'p1', priceCents: 123450 });
  return {
    sets: [set, makeSet({ name: 'Wunsch', status: 'wunsch', priority: 'hoch' })],
    entries: [makeEntry(set.id, { photoIds: ['p1', 'p2'], minutes: 90, note: 'Tüte 1 – läuft' })],
    photos: [makePhoto(set.id, 'p1', [255, 216, 255, 0]), makePhoto(set.id, 'p2', [1, 2, 3, 4, 5])],
    manufacturers: ['BlueBrixx', 'Qman'],
  };
}

const manifestOnly = (manifest: unknown, extra: Record<string, Uint8Array> = {}) =>
  zipSync({ 'bricklog.json': strToU8(JSON.stringify(manifest)), ...extra });

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
  const parsed = await parseBackupZip(await buildBackupZip(data, '2026-10-09T10:00:00.000Z'));
  expect(parsed.sets).toEqual(data.sets);
  expect(parsed.entries).toEqual(data.entries);
  expect(parsed.manufacturers).toEqual(data.manufacturers);
  expect(parsed.photos.map(({ data: _d, ...meta }) => meta)).toEqual(data.photos.map(({ data: _d, ...meta }) => meta));
  expect([...new Uint8Array(parsed.photos[0].data)]).toEqual([255, 216, 255, 0]);
  expect([...new Uint8Array(parsed.photos[1].data)]).toEqual([1, 2, 3, 4, 5]);
});

test('broken or foreign files are rejected', async () => {
  const reject = (bytes: Uint8Array) => expect(parseBackupZip(bytes)).rejects.toBeInstanceOf(BackupFormatError);

  await reject(new Uint8Array([1, 2, 3]));
  await reject(strToU8('# BrickLog\n\nJust a readme, not a backup.'));
  await reject(zipSync({ 'something.txt': strToU8('hello') }));
  await reject(zipSync({ 'bricklog.json': strToU8('{not json') }));
  await reject(manifestOnly({ ...validManifest(), app: 'SomethingElse' }));
  await reject(manifestOnly({ ...validManifest(), version: 2 }));
  await reject(manifestOnly({ ...validManifest(), sets: 'nope' }));
  await reject(manifestOnly({ ...validManifest(), sets: [{ ...makeSet(), name: '' }] }));
  await reject(manifestOnly({ ...validManifest(), photos: [{ id: 'p1', setId: 's1', width: 1, height: 1 }] }));
});

test('a valid manifest without photos is accepted', async () => {
  const parsed = await parseBackupZip(manifestOnly(validManifest()));
  expect(parsed.sets).toHaveLength(1);
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

  await expect(restoreBackup(db, new Uint8Array([1, 2, 3]))).rejects.toBeInstanceOf(BackupFormatError);

  expect(await listSets(db)).toHaveLength(2);
});

test('restoreBackup replaces the stock and reports the counts', async () => {
  const db = await openBrickDb(`test-${crypto.randomUUID()}`);
  await putSet(db, makeSet({ name: 'Alt' }));
  const data = sampleData();

  const result = await restoreBackup(db, await buildBackupZip(data, '2026-10-09T10:00:00.000Z'));

  expect(result).toEqual({ sets: 2, photos: 2 });
  const stored = await exportAll(db);
  expect(stored.sets.map((s) => s.name).sort()).toEqual(['Burg Blaustein', 'Wunsch']);
  expect(stored.photos).toHaveLength(2);
  expect(stored.manufacturers).toEqual(['BlueBrixx', 'Qman']);
});
