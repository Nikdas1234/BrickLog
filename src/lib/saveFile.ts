import { Capacitor } from '@capacitor/core';

// True inside the installed Android app, false in the browser.
export const isNativeApp = Capacitor.isNativePlatform();

export type SaveResult = 'downloaded' | 'shared' | 'cancelled';

const CHUNK = 768 * 1024;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

// Hands a generated file to the user. A browser downloads it. The Android app has no
// download folder of its own, so the file goes to the app cache and from there into
// Android's share dialog ("Eigene Dateien", Drive, mail …).
export async function saveFile(bytes: Uint8Array, name: string, mime: string): Promise<SaveResult> {
  if (!isNativeApp) {
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return 'downloaded';
  }

  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');

  // Written in pieces: one huge base64 string would not fit through to the native side.
  await Filesystem.writeFile({ path: name, directory: Directory.Cache, data: toBase64(bytes.subarray(0, CHUNK)) });
  for (let offset = CHUNK; offset < bytes.length; offset += CHUNK) {
    await Filesystem.appendFile({
      path: name,
      directory: Directory.Cache,
      data: toBase64(bytes.subarray(offset, offset + CHUNK)),
    });
  }
  const { uri } = await Filesystem.getUri({ path: name, directory: Directory.Cache });

  try {
    await Share.share({ title: name, files: [uri], dialogTitle: 'Sicherung ablegen' });
    return 'shared';
  } catch {
    // The share plugin rejects when the dialog is closed without choosing a target.
    return 'cancelled';
  }
}
