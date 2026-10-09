import type { CatalogEntry } from './catalog';
import { isNativeApp } from './saveFile';

// Whether the picture of this catalog entry can be stored as a cover here. Shops that
// do not allow other web pages to read their pictures only work inside the Android app,
// which downloads without the browser's restrictions.
export function canDownloadImage(entry: CatalogEntry): boolean {
  return entry.image !== null && (isNativeApp || entry.imageCors);
}

// Needs an internet connection. Returns null when the picture cannot be loaded.
export async function downloadCatalogImage(entry: CatalogEntry): Promise<Blob | null> {
  if (!entry.image || !canDownloadImage(entry)) return null;
  try {
    if (isNativeApp) {
      const { CapacitorHttp } = await import('@capacitor/core');
      const response = await CapacitorHttp.get({ url: entry.image, responseType: 'blob' });
      if (response.status !== 200 || typeof response.data !== 'string') return null;
      // The native side hands binary data over as base64 text.
      const binary = atob(response.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes]);
    }
    const response = await fetch(entry.image);
    return response.ok ? await response.blob() : null;
  } catch {
    return null;
  }
}
