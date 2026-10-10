// A set is either on the wishlist or in the collection. There is no build status.
export type Status = 'wunsch' | 'sammlung';
export type Priority = 'hoch' | 'mittel' | 'niedrig';

export const PRIORITIES: Priority[] = ['hoch', 'mittel', 'niedrig'];

// Up to version 1.1 owned sets carried a build status (ungebaut, im_bau, fertig,
// abgegeben). Stored data and old backups may still contain those values.
export function normalizeStatus(value: unknown): Status {
  return value === 'wunsch' ? 'wunsch' : 'sammlung';
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  hoch: 'hoch',
  mittel: 'mittel',
  niedrig: 'niedrig',
};

export interface BrickSet {
  id: string;
  name: string;
  manufacturer: string;
  setNumber: string;
  theme: string;
  pieceCount: number | null;
  priceCents: number | null;
  purchaseDate: string | null;
  retailer: string;
  location: string;
  note: string;
  coverPhotoId: string | null;
  status: Status;
  buildStart: string | null;
  buildEnd: string | null;
  shopUrl: string;
  priority: Priority | null;
  createdAt: string;
  updatedAt: string;
}

export interface LogEntry {
  id: string;
  setId: string;
  date: string;
  note: string;
  section: string;
  minutes: number | null;
  photoIds: string[];
  videoIds: string[];
  createdAt: string;
}

export interface Photo {
  id: string;
  setId: string;
  data: ArrayBuffer;
  width: number;
  height: number;
  createdAt: string;
}

// Videos are stored as they come from the camera. They are kept as a Blob, which the
// browser holds on disk, because a video does not fit into memory the way a photo does.
export interface Video {
  id: string;
  setId: string;
  blob: Blob;
  // MIME type, e.g. "video/mp4".
  type: string;
  size: number;
  durationSec: number | null;
  // A still picture (JPEG) shown before the video plays; null if none could be made.
  poster: ArrayBuffer | null;
  createdAt: string;
}

export interface BackupData {
  sets: BrickSet[];
  entries: LogEntry[];
  photos: Photo[];
  videos: Video[];
  manufacturers: string[];
}
