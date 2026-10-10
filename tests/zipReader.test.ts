import { strToU8, zipSync } from 'fflate';
import { expect, test } from 'vitest';
import { readZip, ZipFormatError } from '../src/lib/zipReader';
import { bytesOf } from './helpers';

const TEXT = 'Noppen '.repeat(400);

const sample = () =>
  new Blob([
    zipSync(
      {
        'text.txt': strToU8(TEXT),
        'ordner/stored.bin': [new Uint8Array([1, 2, 3, 4, 5]), { level: 0 }],
        'leer.bin': [new Uint8Array(0), { level: 0 }],
        'größe-ä.txt': strToU8('umlaut'),
      },
      { comment: 'ein Kommentar am Ende' },
    ) as BlobPart,
  ]);

test('lists the entries with their sizes', async () => {
  const files = await readZip(sample());
  expect([...files.keys()].sort()).toEqual(['größe-ä.txt', 'leer.bin', 'ordner/stored.bin', 'text.txt']);
  expect(files.get('text.txt')!.size).toBe(TEXT.length);
  expect(files.get('ordner/stored.bin')!.size).toBe(5);
});

test('reads compressed and stored entries into memory', async () => {
  const files = await readZip(sample());
  expect(new TextDecoder().decode(await files.get('text.txt')!.bytes())).toBe(TEXT);
  expect([...(await files.get('ordner/stored.bin')!.bytes())]).toEqual([1, 2, 3, 4, 5]);
  expect((await files.get('leer.bin')!.bytes()).length).toBe(0);
});

test('a stored entry is cut straight out of the file', async () => {
  const files = await readZip(sample());
  const slice = await files.get('ordner/stored.bin')!.slice('video/mp4');
  expect(slice.type).toBe('video/mp4');
  expect(await bytesOf(slice)).toEqual([1, 2, 3, 4, 5]);
});

test('a compressed entry cannot be cut out as a slice', async () => {
  const files = await readZip(sample());
  expect(() => files.get('text.txt')!.slice()).toThrow(ZipFormatError);
});

test('files that are no zip are rejected', async () => {
  await expect(readZip(new Blob([]))).rejects.toBeInstanceOf(ZipFormatError);
  await expect(readZip(new Blob(['x'.repeat(5000)]))).rejects.toBeInstanceOf(ZipFormatError);
  const whole = sample();
  await expect(readZip(whole.slice(0, whole.size - 40))).rejects.toBeInstanceOf(ZipFormatError);
});

test('an entry whose content was cut off is reported when it is read', async () => {
  const whole = new Uint8Array(await sample().arrayBuffer());
  // Overwrite the first entry's header signature; the directory at the end stays intact.
  whole.set([0, 0, 0, 0], 0);
  const files = await readZip(new Blob([whole as BlobPart]));
  await expect(files.get('text.txt')!.bytes()).rejects.toBeInstanceOf(ZipFormatError);
});
