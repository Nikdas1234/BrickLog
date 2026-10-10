import { strFromU8, strToU8, Zip, ZipDeflate, ZipPassThrough } from 'fflate';
import { replaceAll, type BrickDb } from './db';
import { newSet } from './sets';
import { normalizeStatus, type BackupData, type BrickSet, type LogEntry, type Photo, type Video } from './types';
import { readZip, type ZipEntry } from './zipReader';

export const BACKUP_VERSION = 1;
const MANIFEST = 'bricklog.json';
// Videos are fed into the ZIP in pieces of this size, so memory use stays flat.
const VIDEO_CHUNK = 4 * 1024 * 1024;
// The plain ZIP format ends at 4 GB. We stop a little earlier to leave room for the
// table of contents.
export const MAX_BACKUP_BYTES = 3.9 * 1024 ** 3;

export class BackupFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupFormatError';
  }
}

export class BackupTooLargeError extends Error {
  constructor(public readonly bytes: number) {
    super('backup exceeds the size a zip file can hold');
    this.name = 'BackupTooLargeError';
  }
}

export function backupFileName(today: string): string {
  return `BrickLog-Sicherung_${today}.zip`;
}

const EXTENSIONS: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/3gpp': '3gp',
  'video/x-matroska': 'mkv',
};

interface VideoRecord extends Omit<Video, 'blob' | 'poster'> {
  file: string;
  poster: string | null;
}

// Writes the backup piece by piece to `write`, e.g. into a file. Nothing but the piece
// currently being written is held in memory, so videos of any length can be included.
export async function writeBackupZip(
  data: BackupData,
  exportedAt: string,
  write: (chunk: Uint8Array) => void | Promise<void>,
): Promise<void> {
  const contentBytes =
    data.photos.reduce((sum, p) => sum + p.data.byteLength, 0) +
    data.videos.reduce((sum, v) => sum + v.blob.size + (v.poster?.byteLength ?? 0), 0);
  if (contentBytes > MAX_BACKUP_BYTES) throw new BackupTooLargeError(contentBytes);

  const videoRecords: VideoRecord[] = data.videos.map(({ blob: _blob, poster, ...meta }) => ({
    ...meta,
    file: `videos/${meta.id}.${EXTENSIONS[meta.type] ?? 'bin'}`,
    poster: poster ? `videos/${meta.id}.jpg` : null,
  }));
  const manifest = {
    app: 'BrickLog',
    version: BACKUP_VERSION,
    exportedAt,
    sets: data.sets,
    entries: data.entries,
    manufacturers: data.manufacturers,
    photos: data.photos.map(({ data: _bytes, ...meta }) => meta),
    videos: videoRecords,
  };

  // The ZIP writer hands out finished pieces as we feed it; we pass them on right away.
  let ready: Uint8Array[] = [];
  let failure: Error | null = null;
  const zip = new Zip((error, chunk) => {
    if (error) failure = error;
    else ready.push(chunk);
  });
  const flush = async () => {
    if (failure) throw failure;
    const chunks = ready;
    ready = [];
    for (const chunk of chunks) await write(chunk);
  };
  // Photos and videos are already compressed; storing them as they are saves time and
  // lets a restore cut them straight out of the file.
  const store = async (name: string, bytes: Uint8Array) => {
    const file = new ZipPassThrough(name);
    zip.add(file);
    file.push(bytes, true);
    await flush();
  };

  const manifestFile = new ZipDeflate(MANIFEST, { level: 6 });
  zip.add(manifestFile);
  manifestFile.push(strToU8(JSON.stringify(manifest)), true);
  await flush();

  for (const photo of data.photos) await store(`photos/${photo.id}.jpg`, new Uint8Array(photo.data));

  for (const [index, video] of data.videos.entries()) {
    const record = videoRecords[index];
    if (video.poster && record.poster) await store(record.poster, new Uint8Array(video.poster));

    const file = new ZipPassThrough(record.file);
    zip.add(file);
    if (video.blob.size === 0) file.push(new Uint8Array(0), true);
    for (let offset = 0; offset < video.blob.size; offset += VIDEO_CHUNK) {
      const part = new Uint8Array(await video.blob.slice(offset, offset + VIDEO_CHUNK).arrayBuffer());
      file.push(part, offset + VIDEO_CHUNK >= video.blob.size);
      await flush();
    }
  }

  zip.end();
  await flush();
}

function fail(reason: string): never {
  throw new BackupFormatError(reason);
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string' && v !== '';

async function inMemory(entry: ZipEntry): Promise<ArrayBuffer> {
  const bytes = await entry.bytes();
  // A standalone buffer, not a window into a larger one.
  return bytes.byteLength === bytes.buffer.byteLength ? (bytes.buffer as ArrayBuffer) : (bytes.slice().buffer as ArrayBuffer);
}

// Reads a backup file. Photos are loaded into memory; videos stay on disk and are only
// referenced as a part of the backup file.
export async function parseBackupZip(file: Blob): Promise<BackupData> {
  let files: Map<string, ZipEntry>;
  try {
    files = await readZip(file);
  } catch {
    fail('not a zip file');
  }
  const manifestEntry = files.get(MANIFEST);
  if (!manifestEntry) fail('manifest missing');

  let manifest: unknown;
  try {
    manifest = JSON.parse(strFromU8(await manifestEntry.bytes()));
  } catch {
    fail('manifest is not JSON');
  }
  if (!isObject(manifest) || manifest.app !== 'BrickLog') fail('not a BrickLog backup');
  if (manifest.version !== BACKUP_VERSION) fail('unsupported version');
  const { sets, entries, photos, manufacturers } = manifest;
  // Backups made before version 1.10 have no videos.
  const videos = manifest.videos ?? [];
  if (
    !Array.isArray(sets) ||
    !Array.isArray(entries) ||
    !Array.isArray(photos) ||
    !Array.isArray(videos) ||
    !Array.isArray(manufacturers)
  ) {
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
    return { ...(e as unknown as LogEntry), videoIds: Array.isArray(e.videoIds) ? e.videoIds : [] };
  });

  const parsedPhotos: Photo[] = [];
  for (const p of photos) {
    if (!isObject(p) || !isText(p.id) || !isText(p.setId)) fail('invalid photo');
    const entry = files.get(`photos/${p.id}.jpg`);
    if (!entry) fail('photo file missing');
    try {
      parsedPhotos.push({ ...(p as unknown as Omit<Photo, 'data'>), data: await inMemory(entry) });
    } catch {
      fail('photo file unreadable');
    }
  }

  const parsedVideos: Video[] = [];
  for (const v of videos) {
    if (!isObject(v) || !isText(v.id) || !isText(v.setId) || !isText(v.file)) fail('invalid video');
    const entry = files.get(v.file);
    if (!entry) fail('video file missing');
    const type = isText(v.type) ? v.type : 'video/mp4';
    const posterEntry = isText(v.poster) ? files.get(v.poster) : undefined;
    const { file: _file, poster: _poster, ...meta } = v;
    try {
      parsedVideos.push({
        ...(meta as unknown as Omit<Video, 'blob' | 'poster' | 'type' | 'size'>),
        type,
        size: entry.size,
        blob: await entry.slice(type),
        poster: posterEntry ? await inMemory(posterEntry) : null,
      });
    } catch {
      fail('video file unreadable');
    }
  }

  return {
    sets: parsedSets,
    entries: parsedEntries,
    photos: parsedPhotos,
    videos: parsedVideos,
    manufacturers: manufacturers.filter(isText),
  };
}

// Parses completely before touching the database, so a broken file changes nothing.
export async function restoreBackup(
  db: BrickDb,
  file: Blob,
): Promise<{ sets: number; photos: number; videos: number }> {
  const data = await parseBackupZip(file);
  await replaceAll(db, data);
  return { sets: data.sets.length, photos: data.photos.length, videos: data.videos.length };
}
