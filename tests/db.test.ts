import 'fake-indexeddb/auto';
import { expect, test } from 'vitest';
import {
  DEFAULT_MANUFACTURERS,
  deleteEntry,
  deletePhoto,
  deleteSet,
  exportAll,
  getEntry,
  getManufacturers,
  getPhoto,
  getSet,
  listEntries,
  listPhotos,
  listSets,
  openBrickDb,
  putSet,
  replaceAll,
  saveEntryWithPhotos,
  setManufacturers,
} from '../src/lib/db';
import { makeEntry, makePhoto, makeSet } from './helpers';

const freshDb = () => openBrickDb(`test-${crypto.randomUUID()}`);

test('a new database offers the default manufacturers', async () => {
  const db = await freshDb();
  expect(await getManufacturers(db)).toEqual(DEFAULT_MANUFACTURERS);
  await setManufacturers(db, ['Qman']);
  expect(await getManufacturers(db)).toEqual(['Qman']);
});

test('putSet and getSet', async () => {
  const db = await freshDb();
  const set = makeSet({ name: 'Burg Blaustein', priceCents: 123450 });
  await putSet(db, set);
  const stored = await getSet(db, set.id);
  expect(stored).toMatchObject({ id: set.id, name: 'Burg Blaustein', priceCents: 123450 });
  expect(stored!.updatedAt > set.updatedAt).toBe(true);
});

test('listEntries returns only the entries of one set, newest first', async () => {
  const db = await freshDb();
  const a = makeSet();
  const b = makeSet();
  await putSet(db, a);
  await putSet(db, b);
  await saveEntryWithPhotos(db, makeEntry(a.id, { id: 'old', date: '2026-09-01' }), []);
  await saveEntryWithPhotos(db, makeEntry(a.id, { id: 'new', date: '2026-10-05' }), []);
  await saveEntryWithPhotos(db, makeEntry(b.id, { id: 'other' }), []);
  expect((await listEntries(db, a.id)).map((e) => e.id)).toEqual(['new', 'old']);
});

test('deleteSet removes its entries and photos and leaves other sets alone', async () => {
  const db = await freshDb();
  const a = makeSet();
  const b = makeSet();
  await putSet(db, a);
  await putSet(db, b);
  await saveEntryWithPhotos(db, makeEntry(a.id, { photoIds: ['a1'] }), [makePhoto(a.id, 'a1')]);
  await saveEntryWithPhotos(db, makeEntry(b.id, { photoIds: ['b1'] }), [makePhoto(b.id, 'b1')]);

  await deleteSet(db, a.id);

  expect((await listSets(db)).map((s) => s.id)).toEqual([b.id]);
  expect(await listEntries(db, a.id)).toEqual([]);
  expect(await listPhotos(db, a.id)).toEqual([]);
  expect(await listEntries(db, b.id)).toHaveLength(1);
  expect(await getPhoto(db, 'b1')).toBeDefined();
});

test('the first photo becomes the cover when the set has none', async () => {
  const db = await freshDb();
  const set = makeSet();
  await putSet(db, set);
  await saveEntryWithPhotos(db, makeEntry(set.id, { photoIds: ['p1', 'p2'] }), [
    makePhoto(set.id, 'p1'),
    makePhoto(set.id, 'p2'),
  ]);
  expect((await getSet(db, set.id))!.coverPhotoId).toBe('p1');
  await saveEntryWithPhotos(db, makeEntry(set.id, { photoIds: ['p3'] }), [makePhoto(set.id, 'p3')]);
  expect((await getSet(db, set.id))!.coverPhotoId).toBe('p1');
});

test('deleteEntry removes the photos of the entry and clears a cover among them', async () => {
  const db = await freshDb();
  const set = makeSet();
  await putSet(db, set);
  const entry = makeEntry(set.id, { photoIds: ['p1', 'p2'] });
  await saveEntryWithPhotos(db, entry, [makePhoto(set.id, 'p1'), makePhoto(set.id, 'p2')]);

  await deleteEntry(db, entry.id);

  expect(await getEntry(db, entry.id)).toBeUndefined();
  expect(await listPhotos(db, set.id)).toEqual([]);
  expect((await getSet(db, set.id))!.coverPhotoId).toBeNull();
});

test('deletePhoto removes the id from its entry and clears the cover if it was one', async () => {
  const db = await freshDb();
  const set = makeSet();
  await putSet(db, set);
  const entry = makeEntry(set.id, { photoIds: ['p1', 'p2'] });
  await saveEntryWithPhotos(db, entry, [makePhoto(set.id, 'p1'), makePhoto(set.id, 'p2')]);

  await deletePhoto(db, 'p2');
  expect((await getEntry(db, entry.id))!.photoIds).toEqual(['p1']);
  expect((await getSet(db, set.id))!.coverPhotoId).toBe('p1');

  await deletePhoto(db, 'p1');
  expect((await getEntry(db, entry.id))!.photoIds).toEqual([]);
  expect((await getSet(db, set.id))!.coverPhotoId).toBeNull();
});

test('saveEntryWithPhotos writes nothing when one photo fails', async () => {
  const db = await freshDb();
  const set = makeSet();
  await putSet(db, set);
  await saveEntryWithPhotos(db, makeEntry(set.id, { photoIds: ['p1'] }), [makePhoto(set.id, 'p1')]);

  const entry = makeEntry(set.id, { photoIds: ['p2', 'p1'] });
  await expect(saveEntryWithPhotos(db, entry, [makePhoto(set.id, 'p2'), makePhoto(set.id, 'p1')])).rejects.toThrow();

  expect(await getEntry(db, entry.id)).toBeUndefined();
  expect(await getPhoto(db, 'p2')).toBeUndefined();
});

test('replaceAll swaps the whole stock', async () => {
  const db = await freshDb();
  const old = makeSet({ name: 'Alt' });
  await putSet(db, old);
  await saveEntryWithPhotos(db, makeEntry(old.id, { photoIds: ['o1'] }), [makePhoto(old.id, 'o1')]);

  const fresh = makeSet({ name: 'Neu', coverPhotoId: 'n1' });
  const data = {
    sets: [fresh],
    entries: [makeEntry(fresh.id, { photoIds: ['n1'] })],
    photos: [makePhoto(fresh.id, 'n1', [9, 8, 7])],
    manufacturers: ['Qman'],
  };
  await replaceAll(db, data);

  const result = await exportAll(db);
  expect(result.sets).toEqual(data.sets);
  expect(result.entries).toEqual(data.entries);
  expect(result.manufacturers).toEqual(['Qman']);
  expect(result.photos.map((p) => p.id)).toEqual(['n1']);
  expect([...new Uint8Array(result.photos[0].data)]).toEqual([9, 8, 7]);
});
