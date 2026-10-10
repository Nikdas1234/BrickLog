import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { normalizeStatus, type BackupData, type BrickSet, type LogEntry, type Photo, type Video } from './types';

export const DEFAULT_MANUFACTURERS = ['BlueBrixx', 'Lumibricks', 'CaDA', 'Cobi', 'LEGO', 'Mould King', 'Pantasy'];

interface BrickSchema extends DBSchema {
  sets: { key: string; value: BrickSet };
  entries: { key: string; value: LogEntry; indexes: { setId: string } };
  photos: { key: string; value: Photo; indexes: { setId: string } };
  videos: { key: string; value: Video; indexes: { setId: string } };
  meta: { key: string; value: string[] };
}

export type BrickDb = IDBPDatabase<BrickSchema>;

const MEDIA = ['sets', 'entries', 'photos', 'videos'] as const;

export function openBrickDb(name = 'bricklog'): Promise<BrickDb> {
  return openDB<BrickSchema>(name, 3, {
    async upgrade(db, oldVersion, _newVersion, tx) {
      const existed = oldVersion >= 1;
      if (!existed) {
        db.createObjectStore('sets', { keyPath: 'id' });
        db.createObjectStore('entries', { keyPath: 'id' }).createIndex('setId', 'setId');
        db.createObjectStore('photos', { keyPath: 'id' }).createIndex('setId', 'setId');
        db.createObjectStore('meta');
        tx.objectStore('meta').put(DEFAULT_MANUFACTURERS, 'manufacturers');
      }
      if (oldVersion < 3) db.createObjectStore('videos', { keyPath: 'id' }).createIndex('setId', 'setId');

      // Version 2 dropped the build status: every owned set is simply 'sammlung'.
      if (existed && oldVersion < 2) {
        for (let cursor = await tx.objectStore('sets').openCursor(); cursor; cursor = await cursor.continue()) {
          const status = normalizeStatus(cursor.value.status);
          if (status !== cursor.value.status) await cursor.update({ ...cursor.value, status });
        }
      }
      // Version 3 added videos: older diary entries get an empty list.
      if (existed && oldVersion < 3) {
        for (let cursor = await tx.objectStore('entries').openCursor(); cursor; cursor = await cursor.continue()) {
          if (!Array.isArray(cursor.value.videoIds)) await cursor.update({ ...cursor.value, videoIds: [] });
        }
      }
    },
  });
}

export function listSets(db: BrickDb): Promise<BrickSet[]> {
  return db.getAll('sets');
}

export function getSet(db: BrickDb, id: string): Promise<BrickSet | undefined> {
  return db.get('sets', id);
}

export async function putSet(db: BrickDb, set: BrickSet): Promise<void> {
  await db.put('sets', { ...set, updatedAt: new Date().toISOString() });
}

export async function deleteSet(db: BrickDb, id: string): Promise<void> {
  const tx = db.transaction(MEDIA, 'readwrite');
  const entryKeys = await tx.objectStore('entries').index('setId').getAllKeys(id);
  const photoKeys = await tx.objectStore('photos').index('setId').getAllKeys(id);
  const videoKeys = await tx.objectStore('videos').index('setId').getAllKeys(id);
  await Promise.all([
    ...entryKeys.map((k) => tx.objectStore('entries').delete(k)),
    ...photoKeys.map((k) => tx.objectStore('photos').delete(k)),
    ...videoKeys.map((k) => tx.objectStore('videos').delete(k)),
    tx.objectStore('sets').delete(id),
    tx.done,
  ]);
}

function newestFirst(a: LogEntry, b: LogEntry): number {
  return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
}

export async function listEntries(db: BrickDb, setId: string): Promise<LogEntry[]> {
  return (await db.getAllFromIndex('entries', 'setId', setId)).sort(newestFirst);
}

export function listAllEntries(db: BrickDb): Promise<LogEntry[]> {
  return db.getAll('entries');
}

export function getEntry(db: BrickDb, id: string): Promise<LogEntry | undefined> {
  return db.get('entries', id);
}

// Entry and its new photos and videos are written in one transaction, so a failure
// (e.g. storage full) never leaves an entry pointing at media that were not stored.
// The first photo becomes the cover when the set has none yet.
export async function saveEntryWithMedia(
  db: BrickDb,
  entry: LogEntry,
  newPhotos: Photo[],
  newVideos: Video[] = [],
): Promise<void> {
  const tx = db.transaction(MEDIA, 'readwrite');
  const set = await tx.objectStore('sets').get(entry.setId);
  const writes: Promise<unknown>[] = [
    ...newPhotos.map((p) => tx.objectStore('photos').add(p)),
    ...newVideos.map((v) => tx.objectStore('videos').add(v)),
    tx.objectStore('entries').put(entry),
  ];
  if (set && !set.coverPhotoId && entry.photoIds.length > 0) {
    writes.push(tx.objectStore('sets').put({ ...set, coverPhotoId: entry.photoIds[0] }));
  }
  await Promise.all([...writes, tx.done]);
}

export async function deleteEntry(db: BrickDb, id: string): Promise<void> {
  const tx = db.transaction(MEDIA, 'readwrite');
  const entry = await tx.objectStore('entries').get(id);
  if (!entry) {
    await tx.done;
    return;
  }
  const set = await tx.objectStore('sets').get(entry.setId);
  const writes: Promise<unknown>[] = [
    ...entry.photoIds.map((p) => tx.objectStore('photos').delete(p)),
    ...entry.videoIds.map((v) => tx.objectStore('videos').delete(v)),
  ];
  if (set?.coverPhotoId && entry.photoIds.includes(set.coverPhotoId)) {
    writes.push(tx.objectStore('sets').put({ ...set, coverPhotoId: null }));
  }
  writes.push(tx.objectStore('entries').delete(id));
  await Promise.all([...writes, tx.done]);
}

// Stores a photo that belongs to no diary entry and makes it the cover of its set.
// A previous cover that was also entry-less is replaced instead of piling up.
export async function replaceCover(db: BrickDb, photo: Photo): Promise<void> {
  const tx = db.transaction(['sets', 'entries', 'photos'], 'readwrite');
  const set = await tx.objectStore('sets').get(photo.setId);
  if (!set) {
    await tx.done;
    return;
  }
  const writes: Promise<unknown>[] = [];
  if (set.coverPhotoId) {
    const entries = await tx.objectStore('entries').index('setId').getAll(photo.setId);
    if (!entries.some((e) => e.photoIds.includes(set.coverPhotoId!))) {
      writes.push(tx.objectStore('photos').delete(set.coverPhotoId));
    }
  }
  writes.push(tx.objectStore('photos').add(photo));
  writes.push(tx.objectStore('sets').put({ ...set, coverPhotoId: photo.id }));
  await Promise.all([...writes, tx.done]);
}

export function getPhoto(db: BrickDb, id: string): Promise<Photo | undefined> {
  return db.get('photos', id);
}

export function listPhotos(db: BrickDb, setId: string): Promise<Photo[]> {
  return db.getAllFromIndex('photos', 'setId', setId);
}

export async function deletePhoto(db: BrickDb, id: string): Promise<void> {
  const tx = db.transaction(['sets', 'entries', 'photos'], 'readwrite');
  const photo = await tx.objectStore('photos').get(id);
  if (!photo) {
    await tx.done;
    return;
  }
  const set = await tx.objectStore('sets').get(photo.setId);
  const entries = await tx.objectStore('entries').index('setId').getAll(photo.setId);
  const writes: Promise<unknown>[] = entries
    .filter((e) => e.photoIds.includes(id))
    .map((e) => tx.objectStore('entries').put({ ...e, photoIds: e.photoIds.filter((p) => p !== id) }));
  if (set?.coverPhotoId === id) {
    writes.push(tx.objectStore('sets').put({ ...set, coverPhotoId: null }));
  }
  writes.push(tx.objectStore('photos').delete(id));
  await Promise.all([...writes, tx.done]);
}

export function getVideo(db: BrickDb, id: string): Promise<Video | undefined> {
  return db.get('videos', id);
}

export function listVideos(db: BrickDb, setId: string): Promise<Video[]> {
  return db.getAllFromIndex('videos', 'setId', setId);
}

export async function deleteVideo(db: BrickDb, id: string): Promise<void> {
  const tx = db.transaction(['entries', 'videos'], 'readwrite');
  const video = await tx.objectStore('videos').get(id);
  if (!video) {
    await tx.done;
    return;
  }
  const entries = await tx.objectStore('entries').index('setId').getAll(video.setId);
  await Promise.all([
    ...entries
      .filter((e) => e.videoIds.includes(id))
      .map((e) => tx.objectStore('entries').put({ ...e, videoIds: e.videoIds.filter((v) => v !== id) })),
    tx.objectStore('videos').delete(id),
    tx.done,
  ]);
}

export async function getManufacturers(db: BrickDb): Promise<string[]> {
  return (await db.get('meta', 'manufacturers')) ?? [];
}

export async function setManufacturers(db: BrickDb, list: string[]): Promise<void> {
  await db.put('meta', list, 'manufacturers');
}

// Photos come back as data in memory. Videos come back as handles to data on disk, so
// even a large collection of videos does not have to fit into memory here.
export async function exportAll(db: BrickDb): Promise<BackupData> {
  const [sets, entries, photos, videos, manufacturers] = await Promise.all([
    db.getAll('sets'),
    db.getAll('entries'),
    db.getAll('photos'),
    db.getAll('videos'),
    getManufacturers(db),
  ]);
  return { sets, entries, photos, videos, manufacturers };
}

export async function replaceAll(db: BrickDb, data: BackupData): Promise<void> {
  const tx = db.transaction([...MEDIA, 'meta'], 'readwrite');
  await Promise.all([
    tx.objectStore('sets').clear(),
    tx.objectStore('entries').clear(),
    tx.objectStore('photos').clear(),
    tx.objectStore('videos').clear(),
    ...data.sets.map((s) => tx.objectStore('sets').put(s)),
    ...data.entries.map((e) => tx.objectStore('entries').put(e)),
    ...data.photos.map((p) => tx.objectStore('photos').put(p)),
    ...data.videos.map((v) => tx.objectStore('videos').put(v)),
    tx.objectStore('meta').put(data.manufacturers, 'manufacturers'),
    tx.done,
  ]);
}
