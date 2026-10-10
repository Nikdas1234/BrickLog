import { Capacitor } from '@capacitor/core';

// True inside the installed Android app, false in the browser.
export const isNativeApp = Capacitor.isNativePlatform();

export type SaveResult = 'downloaded' | 'shared' | 'cancelled';

// A file that is written piece by piece, so that a large backup never has to fit into
// memory as a whole.
export interface FileSink {
  write(chunk: Uint8Array): Promise<void>;
  // Hands the finished file to the user.
  finish(): Promise<SaveResult>;
}

// The native side takes data as base64 text; pieces of this size keep each hand-over
// small without needing thousands of them.
const NATIVE_PIECE = 768 * 1024;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

// A browser downloads the file. The Android app has no download folder of its own, so
// the file goes to the app cache and from there into Android's share dialog
// ("Eigene Dateien", Drive, mail …).
export async function openFileSink(name: string, mime: string): Promise<FileSink> {
  if (!isNativeApp) {
    // The browser keeps these parts on disk once they get large.
    const parts: Blob[] = [];
    return {
      async write(chunk) {
        parts.push(new Blob([chunk as BlobPart]));
      },
      async finish() {
        const url = URL.createObjectURL(new Blob(parts, { type: mime }));
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        return 'downloaded';
      },
    };
  }

  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const target = { path: name, directory: Directory.Cache };

  // Earlier backups would otherwise pile up in the cache, each as large as all videos.
  try {
    const { files } = await Filesystem.readdir({ path: '', directory: Directory.Cache });
    for (const file of files) {
      if (file.type === 'file' && /^BrickLog-Sicherung_.*\.zip$/.test(file.name)) {
        await Filesystem.deleteFile({ path: file.name, directory: Directory.Cache });
      }
    }
  } catch {
    // Nothing to clean up.
  }

  let waiting: Uint8Array[] = [];
  let waitingBytes = 0;
  let started = false;
  const flush = async () => {
    const piece = new Uint8Array(waitingBytes);
    let offset = 0;
    for (const chunk of waiting) {
      piece.set(chunk, offset);
      offset += chunk.length;
    }
    waiting = [];
    waitingBytes = 0;
    const data = toBase64(piece);
    if (started) await Filesystem.appendFile({ ...target, data });
    else await Filesystem.writeFile({ ...target, data });
    started = true;
  };

  return {
    async write(chunk) {
      waiting.push(chunk);
      waitingBytes += chunk.length;
      if (waitingBytes >= NATIVE_PIECE) await flush();
    },
    async finish() {
      if (waitingBytes > 0 || !started) await flush();
      const { uri } = await Filesystem.getUri(target);
      try {
        await Share.share({ title: name, files: [uri], dialogTitle: 'Sicherung ablegen' });
        return 'shared';
      } catch {
        // The share plugin rejects when the dialog is closed without choosing a target.
        return 'cancelled';
      }
    },
  };
}
