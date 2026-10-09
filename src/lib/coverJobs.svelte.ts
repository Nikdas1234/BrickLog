import type { CatalogEntry } from './catalog';
import { downloadCatalogImage } from './catalogImage';
import { replaceCover, type BrickDb } from './db';
import { resizeToJpeg } from './photos';

// Covers taken from a catalog are fetched after the set has been saved, so saving never
// waits for the network. `pending` lists the sets still waiting for their picture;
// `finished` counts up whenever one is done, which tells open pages to refresh.
export const coverJobs = $state<{ pending: string[]; finished: number }>({ pending: [], finished: 0 });

export function startCoverDownload(db: BrickDb, setId: string, entry: CatalogEntry): void {
  coverJobs.pending.push(setId);
  void (async () => {
    try {
      const blob = await downloadCatalogImage(entry);
      if (blob) {
        const resized = await resizeToJpeg(new File([blob], 'katalogbild'));
        await replaceCover(db, { id: crypto.randomUUID(), setId, createdAt: new Date().toISOString(), ...resized });
      }
    } catch {
      // No connection or an unreadable picture: the cover can be added on the set page.
    } finally {
      coverJobs.pending = coverJobs.pending.filter((id) => id !== setId);
      coverJobs.finished++;
    }
  })();
}
