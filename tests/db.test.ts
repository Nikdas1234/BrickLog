import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { expect, test } from 'vitest';
import {
  DEFAULT_MANUFACTURERS,
  deleteEntry,
  deletePhoto,
  deleteSet,
  deleteVideo,
  exportAll,
  getEntry,
  getManufacturers,
  getPhoto,
  getSet,
  getVideo,
  listEntries,
  listPhotos,
  listSets,
  listVideos,
  openBrickDb,
  putSet,
  replaceAll,
  replaceCover,
  saveEntryWithMedia,
  setManufacturers,
} from '../src/lib/db';
import { bytesOf, makeEntry, makePhoto, makeSet, makeVideo } from './helpers';

const freshDb = () => openBrickDb(`test-${crypto.randomUUID()}`);

test('a new database offers the default manufacturers', async () => {
  const db = await freshDb();
  expect(await getManufacturers(db)).toEqual(DEFAULT_MANUFACTURERS);
  await setManufacturers(db, ['Qman']);
  expect(await getManufacturers(db)).toEqual(['Qman']);
});

test('opening a version 1 database drops the build status but keeps everything else', async () => {
  const name = `test-${crypto.randomUUID()}`;
  const old = await openDB(name, 1, {
    upgrade(db) {
      db.createObjectStore('sets', { keyPath: 'id' });
      db.createObjectStore('entries', { keyPath: 'id' }).createIndex('setId', 'setId');
      db.createObjectStore('photos', { keyPath: 'id' }).createIndex('setId', 'setId');
      db.createObjectStore('meta');
    },
  });
  await old.put('sets', { ...makeSet({ id: 'a', name: 'Im Bau', buildStart: '2026-09-01' }), status: 'im_bau' });
  await old.put('sets', { ...makeSet({ id: 'b', name: 'Abgegeben', priceCents: 2000 }), status: 'abgegeben' });
  await old.put('sets', makeSet({ id: 'c', name: 'Wunsch', status: 'wunsch', priority: 'hoch' }));
  // Entries written before version 3 had no list of videos.
  const { videoIds: _none, ...oldEntry } = makeEntry('a', { id: 'e1', photoIds: ['p1'] });
  await old.put('entries', oldEntry);
  await old.put('photos', makePhoto('a', 'p1'));
  await old.put('meta', ['Qman'], 'manufacturers');
  old.close();

  const db = await openBrickDb(name);

  expect((await listEntries(db, 'a'))[0]).toMatchObject({ id: 'e1', photoIds: ['p1'], videoIds: [] });
  expect(await getPhoto(db, 'p1')).toBeDefined();
  expect(await listVideos(db, 'a')).toEqual([]);

  const sets = (await listSets(db)).sort((x, y) => x.id.localeCompare(y.id));
  expect(sets.map((s) => [s.name, s.status])).toEqual([
    ['Im Bau', 'sammlung'],
    ['Abgegeben', 'sammlung'],
    ['Wunsch', 'wunsch'],
  ]);
  expect(sets[0].buildStart).toBe('2026-09-01');
  expect(sets[1].priceCents).toBe(2000);
  expect(sets[2].priority).toBe('hoch');
  expect(await listEntries(db, 'a')).toHaveLength(1);
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
  await saveEntryWithMedia(db, makeEntry(a.id, { id: 'old', date: '2026-09-01' }), []);
  await saveEntryWithMedia(db, makeEntry(a.id, { id: 'new', date: '2026-10-05' }), []);
  await saveEntryWithMedia(db, makeEntry(b.id, { id: 'other' }), []);
  expect((await listEntries(db, a.id)).map((e) => e.id)).toEqual(['new', 'old']);
});

test('deleteSet removes its entries and photos and leaves other sets alone', async () => {
  const db = await freshDb();
  const a = makeSet();
  const b = makeSet();
  await putSet(db, a);
  await putSet(db, b);
  await saveEntryWithMedia(db, makeEntry(a.id, { photoIds: ['a1'] }), [makePhoto(a.id, 'a1')]);
  await saveEntryWithMedia(db, makeEntry(b.id, { photoIds: ['b1'] }), [makePhoto(b.id, 'b1')]);

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
  await saveEntryWithMedia(db, makeEntry(set.id, { photoIds: ['p1', 'p2'] }), [
    makePhoto(set.id, 'p1'),
    makePhoto(set.id, 'p2'),
  ]);
  expect((await getSet(db, set.id))!.coverPhotoId).toBe('p1');
  await saveEntryWithMedia(db, makeEntry(set.id, { photoIds: ['p3'] }), [makePhoto(set.id, 'p3')]);
  expect((await getSet(db, set.id))!.coverPhotoId).toBe('p1');
});

test('deleteEntry removes the photos of the entry and clears a cover among them', async () => {
  const db = await freshDb();
  const set = makeSet();
  await putSet(db, set);
  const entry = makeEntry(set.id, { photoIds: ['p1', 'p2'] });
  await saveEntryWithMedia(db, entry, [makePhoto(set.id, 'p1'), makePhoto(set.id, 'p2')]);

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
  await saveEntryWithMedia(db, entry, [makePhoto(set.id, 'p1'), makePhoto(set.id, 'p2')]);

  await deletePhoto(db, 'p2');
  expect((await getEntry(db, entry.id))!.photoIds).toEqual(['p1']);
  expect((await getSet(db, set.id))!.coverPhotoId).toBe('p1');

  await deletePhoto(db, 'p1');
  expect((await getEntry(db, entry.id))!.photoIds).toEqual([]);
  expect((await getSet(db, set.id))!.coverPhotoId).toBeNull();
});

test('replaceCover swaps an entry-less cover but keeps a diary photo', async () => {
  const db = await freshDb();
  const set = makeSet();
  await putSet(db, set);

  await replaceCover(db, makePhoto(set.id, 'c1'));
  expect((await getSet(db, set.id))!.coverPhotoId).toBe('c1');

  await replaceCover(db, makePhoto(set.id, 'c2'));
  expect((await getSet(db, set.id))!.coverPhotoId).toBe('c2');
  expect(await getPhoto(db, 'c1')).toBeUndefined();

  const entry = makeEntry(set.id, { photoIds: ['p1'] });
  await saveEntryWithMedia(db, entry, [makePhoto(set.id, 'p1')]);
  await putSet(db, { ...(await getSet(db, set.id))!, coverPhotoId: 'p1' });
  await replaceCover(db, makePhoto(set.id, 'c3'));
  expect((await getSet(db, set.id))!.coverPhotoId).toBe('c3');
  expect(await getPhoto(db, 'p1')).toBeDefined();
});

test('saveEntryWithMedia writes nothing when one photo fails', async () => {
  const db = await freshDb();
  const set = makeSet();
  await putSet(db, set);
  await saveEntryWithMedia(db, makeEntry(set.id, { photoIds: ['p1'] }), [makePhoto(set.id, 'p1')]);

  const entry = makeEntry(set.id, { photoIds: ['p2', 'p1'] });
  await expect(saveEntryWithMedia(db, entry, [makePhoto(set.id, 'p2'), makePhoto(set.id, 'p1')])).rejects.toThrow();

  expect(await getEntry(db, entry.id)).toBeUndefined();
  expect(await getPhoto(db, 'p2')).toBeUndefined();
});

test('replaceAll swaps the whole stock', async () => {
  const db = await freshDb();
  const old = makeSet({ name: 'Alt' });
  await putSet(db, old);
  await saveEntryWithMedia(db, makeEntry(old.id, { photoIds: ['o1'] }), [makePhoto(old.id, 'o1')]);

  await saveEntryWithMedia(db, makeEntry(old.id, { videoIds: ['ov'] }), [], [makeVideo(old.id, 'ov')]);

  const fresh = makeSet({ name: 'Neu', coverPhotoId: 'n1' });
  const data = {
    sets: [fresh],
    entries: [makeEntry(fresh.id, { photoIds: ['n1'], videoIds: ['nv'] })],
    photos: [makePhoto(fresh.id, 'n1', [9, 8, 7])],
    videos: [makeVideo(fresh.id, 'nv', new Uint8Array([4, 2]))],
    manufacturers: ['Qman'],
  };
  await replaceAll(db, data);

  const result = await exportAll(db);
  expect(result.sets).toEqual(data.sets);
  expect(result.entries).toEqual(data.entries);
  expect(result.manufacturers).toEqual(['Qman']);
  expect(result.photos.map((p) => p.id)).toEqual(['n1']);
  expect([...new Uint8Array(result.photos[0].data)]).toEqual([9, 8, 7]);
  expect(result.videos.map((v) => v.id)).toEqual(['nv']);
  expect(await bytesOf(result.videos[0].blob)).toEqual([4, 2]);
});

test('a video is stored with its entry and read back unchanged', async () => {
  const db = await freshDb();
  const set = makeSet();
  await putSet(db, set);
  const entry = makeEntry(set.id, { videoIds: ['v1'] });
  await saveEntryWithMedia(db, entry, [], [makeVideo(set.id, 'v1')]);

  const stored = await getVideo(db, 'v1');
  expect(stored).toMatchObject({ id: 'v1', setId: set.id, type: 'video/mp4', size: 4, durationSec: 12 });
  expect(await bytesOf(stored!.blob)).toEqual([9, 8, 7, 6]);
  expect([...new Uint8Array(stored!.poster!)]).toEqual([5, 5]);
  // A video never becomes the cover picture of the set.
  expect((await getSet(db, set.id))!.coverPhotoId).toBeNull();
});

test('deleteVideo removes the id from its entry', async () => {
  const db = await freshDb();
  const set = makeSet();
  await putSet(db, set);
  const entry = makeEntry(set.id, { videoIds: ['v1', 'v2'] });
  await saveEntryWithMedia(db, entry, [], [makeVideo(set.id, 'v1'), makeVideo(set.id, 'v2')]);

  await deleteVideo(db, 'v1');

  expect((await getEntry(db, entry.id))!.videoIds).toEqual(['v2']);
  expect((await listVideos(db, set.id)).map((v) => v.id)).toEqual(['v2']);
});

test('deleting an entry or a set takes the videos along', async () => {
  const db = await freshDb();
  const a = makeSet();
  const b = makeSet();
  await putSet(db, a);
  await putSet(db, b);
  const first = makeEntry(a.id, { videoIds: ['a1'] });
  await saveEntryWithMedia(db, first, [], [makeVideo(a.id, 'a1')]);
  await saveEntryWithMedia(db, makeEntry(a.id, { videoIds: ['a2'] }), [], [makeVideo(a.id, 'a2')]);
  await saveEntryWithMedia(db, makeEntry(b.id, { videoIds: ['b1'] }), [], [makeVideo(b.id, 'b1')]);

  await deleteEntry(db, first.id);
  expect((await listVideos(db, a.id)).map((v) => v.id)).toEqual(['a2']);

  await deleteSet(db, a.id);
  expect(await listVideos(db, a.id)).toEqual([]);
  expect(await getVideo(db, 'b1')).toBeDefined();
});

test('an entry is not saved when one of its videos cannot be stored', async () => {
  const db = await freshDb();
  const set = makeSet();
  await putSet(db, set);
  await saveEntryWithMedia(db, makeEntry(set.id, { videoIds: ['v1'] }), [], [makeVideo(set.id, 'v1')]);

  const entry = makeEntry(set.id, { photoIds: ['p9'], videoIds: ['v2', 'v1'] });
  await expect(
    saveEntryWithMedia(db, entry, [makePhoto(set.id, 'p9')], [makeVideo(set.id, 'v2'), makeVideo(set.id, 'v1')]),
  ).rejects.toThrow();

  expect(await getEntry(db, entry.id)).toBeUndefined();
  expect(await getVideo(db, 'v2')).toBeUndefined();
  expect(await getPhoto(db, 'p9')).toBeUndefined();
});
