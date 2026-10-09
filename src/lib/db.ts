import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { BackupData, BrickSet, LogEntry, Photo } from './types';

export const DEFAULT_MANUFACTURERS = ['BlueBrixx', 'Lumibricks', 'CaDA', 'Cobi', 'LEGO', 'Mould King', 'Pantasy'];

interface BrickSchema extends DBSchema {
  sets: { key: string; value: BrickSet };
  entries: { key: string; value: LogEntry; indexes: { setId: string } };
  photos: { key: string; value: Photo; indexes: { setId: string } };
  meta: { key: string; value: string[] };
}

export type BrickDb = IDBPDatabase<BrickSchema>;

export function openBrickDb(name = 'bricklog'): Promise<BrickDb> {
  return openDB<BrickSchema>(name, 1, {
    upgrade(db, _oldVersion, _newVersion, tx) {
      db.createObjectStore('sets', { keyPath: 'id' });
      db.createObjectStore('entries', { keyPath: 'id' }).createIndex('setId', 'setId');
      db.createObjectStore('photos', { keyPath: 'id' }).createIndex('setId', 'setId');
      db.createObjectStore('meta');
      tx.objectStore('meta').put(DEFAULT_MANUFACTURERS, 'manufacturers');
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
  const tx = db.transaction(['sets', 'entries', 'photos'], 'readwrite');
  const entryKeys = await tx.objectStore('entries').index('setId').getAllKeys(id);
  const photoKeys = await tx.objectStore('photos').index('setId').getAllKeys(id);
  await Promise.all([
    ...entryKeys.map((k) => tx.objectStore('entries').delete(k)),
    ...photoKeys.map((k) => tx.objectStore('photos').delete(k)),
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

// Entry and its new photos are written in one transaction, so a failure (e.g. storage
// full) never leaves an entry pointing at photos that were not stored. The first photo
// becomes the cover when the set has none yet.
export async function saveEntryWithPhotos(db: BrickDb, entry: LogEntry, newPhotos: Photo[]): Promise<void> {
  const tx = db.transaction(['sets', 'entries', 'photos'], 'readwrite');
  const set = await tx.objectStore('sets').get(entry.setId);
  const writes: Promise<unknown>[] = newPhotos.map((p) => tx.objectStore('photos').add(p));
  writes.push(tx.objectStore('entries').put(entry));
  if (set && !set.coverPhotoId && entry.photoIds.length > 0) {
    writes.push(tx.objectStore('sets').put({ ...set, coverPhotoId: entry.photoIds[0] }));
  }
  await Promise.all([...writes, tx.done]);
}

export async function deleteEntry(db: BrickDb, id: string): Promise<void> {
  const tx = db.transaction(['sets', 'entries', 'photos'], 'readwrite');
  const entry = await tx.objectStore('entries').get(id);
  if (!entry) {
    await tx.done;
    return;
  }
  const set = await tx.objectStore('sets').get(entry.setId);
  const writes: Promise<unknown>[] = entry.photoIds.map((p) => tx.objectStore('photos').delete(p));
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

export async function getManufacturers(db: BrickDb): Promise<string[]> {
  return (await db.get('meta', 'manufacturers')) ?? [];
}

export async function setManufacturers(db: BrickDb, list: string[]): Promise<void> {
  await db.put('meta', list, 'manufacturers');
}

export async function exportAll(db: BrickDb): Promise<BackupData> {
  const [sets, entries, photos, manufacturers] = await Promise.all([
    db.getAll('sets'),
    db.getAll('entries'),
    db.getAll('photos'),
    getManufacturers(db),
  ]);
  return { sets, entries, photos, manufacturers };
}

export async function replaceAll(db: BrickDb, data: BackupData): Promise<void> {
  const tx = db.transaction(['sets', 'entries', 'photos', 'meta'], 'readwrite');
  await Promise.all([
    tx.objectStore('sets').clear(),
    tx.objectStore('entries').clear(),
    tx.objectStore('photos').clear(),
    ...data.sets.map((s) => tx.objectStore('sets').put(s)),
    ...data.entries.map((e) => tx.objectStore('entries').put(e)),
    ...data.photos.map((p) => tx.objectStore('photos').put(p)),
    tx.objectStore('meta').put(data.manufacturers, 'manufacturers'),
    tx.done,
  ]);
}
