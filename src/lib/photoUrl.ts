import { getPhoto, type BrickDb } from './db';

const cache = new Map<string, string>();

// One blob: URL per photo for the lifetime of the page.
export async function photoUrl(db: BrickDb, id: string): Promise<string | null> {
  const hit = cache.get(id);
  if (hit) return hit;
  const photo = await getPhoto(db, id);
  if (!photo) return null;
  const url = URL.createObjectURL(new Blob([photo.data], { type: 'image/jpeg' }));
  cache.set(id, url);
  return url;
}

export function revokePhotoUrl(id: string): void {
  const url = cache.get(id);
  if (url) URL.revokeObjectURL(url);
  cache.delete(id);
}

export function revokeAllPhotoUrls(): void {
  for (const id of [...cache.keys()]) revokePhotoUrl(id);
}
