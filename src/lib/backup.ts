import { strFromU8, strToU8, unzip, zip, type Unzipped, type Zippable } from 'fflate';
import { replaceAll, type BrickDb } from './db';
import { newSet } from './sets';
import { normalizeStatus, type BackupData, type BrickSet, type LogEntry, type Photo } from './types';

export const BACKUP_VERSION = 1;
const MANIFEST = 'bricklog.json';

export class BackupFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupFormatError';
  }
}

export function backupFileName(today: string): string {
  return `BrickLog-Sicherung_${today}.zip`;
}

export function buildBackupZip(data: BackupData, exportedAt: string): Promise<Uint8Array> {
  const manifest = {
    app: 'BrickLog',
    version: BACKUP_VERSION,
    exportedAt,
    sets: data.sets,
    entries: data.entries,
    manufacturers: data.manufacturers,
    photos: data.photos.map(({ data: _bytes, ...meta }) => meta),
  };
  const files: Zippable = { [MANIFEST]: strToU8(JSON.stringify(manifest)) };
  for (const p of data.photos) {
    // JPEGs are already compressed; storing them saves time and memory.
    files[`photos/${p.id}.jpg`] = [new Uint8Array(p.data), { level: 0 }];
  }
  return new Promise((resolve, reject) => zip(files, (err, out) => (err ? reject(err) : resolve(out))));
}

function fail(reason: string): never {
  throw new BackupFormatError(reason);
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string' && v !== '';

export async function parseBackupZip(bytes: Uint8Array): Promise<BackupData> {
  let files: Unzipped;
  try {
    files = await new Promise<Unzipped>((resolve, reject) =>
      unzip(bytes, (err, out) => (err ? reject(err) : resolve(out))),
    );
  } catch {
    fail('not a zip file');
  }
  if (!files[MANIFEST]) fail('manifest missing');

  let manifest: unknown;
  try {
    manifest = JSON.parse(strFromU8(files[MANIFEST]));
  } catch {
    fail('manifest is not JSON');
  }
  if (!isObject(manifest) || manifest.app !== 'BrickLog') fail('not a BrickLog backup');
  if (manifest.version !== BACKUP_VERSION) fail('unsupported version');
  const { sets, entries, photos, manufacturers } = manifest;
  if (!Array.isArray(sets) || !Array.isArray(entries) || !Array.isArray(photos) || !Array.isArray(manufacturers)) {
    fail('lists missing');
  }

  const template = newSet('sammlung');
  const parsedSets = sets.map((s): BrickSet => {
    if (!isObject(s) || !isText(s.id) || !isText(s.name)) fail('invalid set');
    // Backups made before version 1.2 still carry the old build status.
    return { ...template, ...(s as Partial<BrickSet>), status: normalizeStatus(s.status) } as BrickSet;
  });
  const parsedEntries = entries.map((e): LogEntry => {
    if (!isObject(e) || !isText(e.id) || !isText(e.setId) || !isText(e.date) || !Array.isArray(e.photoIds)) {
      fail('invalid entry');
    }
    return e as unknown as LogEntry;
  });
  const parsedPhotos = photos.map((p): Photo => {
    if (!isObject(p) || !isText(p.id) || !isText(p.setId)) fail('invalid photo');
    const file = files[`photos/${p.id}.jpg`];
    if (!file) fail('photo file missing');
    // slice() yields a standalone ArrayBuffer instead of a view into the zip buffer.
    return { ...(p as unknown as Omit<Photo, 'data'>), data: file.slice().buffer as ArrayBuffer };
  });

  return {
    sets: parsedSets,
    entries: parsedEntries,
    photos: parsedPhotos,
    manufacturers: manufacturers.filter(isText),
  };
}

// Parses completely before touching the database, so a broken file changes nothing.
export async function restoreBackup(db: BrickDb, bytes: Uint8Array): Promise<{ sets: number; photos: number }> {
  const data = await parseBackupZip(bytes);
  await replaceAll(db, data);
  return { sets: data.sets.length, photos: data.photos.length };
}
