export type Status = 'wunsch' | 'ungebaut' | 'im_bau' | 'fertig' | 'abgegeben';
export type Priority = 'hoch' | 'mittel' | 'niedrig';

export const STATUSES: Status[] = ['wunsch', 'ungebaut', 'im_bau', 'fertig', 'abgegeben'];
export const OWNED_STATUSES: Status[] = ['ungebaut', 'im_bau', 'fertig', 'abgegeben'];
export const PRIORITIES: Priority[] = ['hoch', 'mittel', 'niedrig'];

export const STATUS_LABEL: Record<Status, string> = {
  wunsch: 'Wunschliste',
  ungebaut: 'ungebaut',
  im_bau: 'im Bau',
  fertig: 'fertig',
  abgegeben: 'abgegeben',
};

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

export interface BackupData {
  sets: BrickSet[];
  entries: LogEntry[];
  photos: Photo[];
  manufacturers: string[];
}
