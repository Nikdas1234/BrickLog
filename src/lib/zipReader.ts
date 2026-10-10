import { inflateSync } from 'fflate';

// Reads a ZIP file without loading it into memory. Only the table of contents at the
// end of the file is read up front; every entry is then cut out of the file on demand.
// For entries stored without compression (how we save photos and videos) that cut is a
// plain slice of the file, so even a video of several hundred megabytes never has to
// pass through memory.

export class ZipFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZipFormatError';
  }
}

export interface ZipEntry {
  name: string;
  size: number;
  // The content as a file slice. Only possible for entries stored without compression.
  slice(type?: string): Promise<Blob>;
  // The content in memory, decompressed if necessary. For small entries.
  bytes(): Promise<Uint8Array>;
}

const END_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const END_MIN = 22;
const END_MAX = END_MIN + 0xffff;
const TOO_BIG = 0xffffffff;

const view = async (blob: Blob) => new DataView(await blob.arrayBuffer());

export async function readZip(file: Blob): Promise<Map<string, ZipEntry>> {
  if (file.size < END_MIN) throw new ZipFormatError('too small for a zip file');

  // The end record sits at the very end, behind an optional comment.
  const tailStart = Math.max(0, file.size - END_MAX);
  const tail = await view(file.slice(tailStart));
  let end = -1;
  for (let i = tail.byteLength - END_MIN; i >= 0; i--) {
    if (tail.getUint32(i, true) === END_SIGNATURE) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new ZipFormatError('no end record');

  const count = tail.getUint16(end + 10, true);
  const directorySize = tail.getUint32(end + 12, true);
  const directoryOffset = tail.getUint32(end + 16, true);
  if (count === 0xffff || directorySize === TOO_BIG || directoryOffset === TOO_BIG) {
    throw new ZipFormatError('zip64 is not supported');
  }
  if (directoryOffset + directorySize > file.size) throw new ZipFormatError('directory outside the file');

  const directory = await view(file.slice(directoryOffset, directoryOffset + directorySize));
  const decoder = new TextDecoder();
  const entries = new Map<string, ZipEntry>();
  let position = 0;
  for (let i = 0; i < count; i++) {
    if (position + 46 > directory.byteLength || directory.getUint32(position, true) !== CENTRAL_SIGNATURE) {
      throw new ZipFormatError('broken directory entry');
    }
    const method = directory.getUint16(position + 10, true);
    const compressedSize = directory.getUint32(position + 20, true);
    const size = directory.getUint32(position + 24, true);
    const nameLength = directory.getUint16(position + 28, true);
    const extraLength = directory.getUint16(position + 30, true);
    const commentLength = directory.getUint16(position + 32, true);
    const localOffset = directory.getUint32(position + 42, true);
    if (compressedSize === TOO_BIG || size === TOO_BIG || localOffset === TOO_BIG) {
      throw new ZipFormatError('zip64 is not supported');
    }
    const name = decoder.decode(
      new Uint8Array(directory.buffer, directory.byteOffset + position + 46, nameLength),
    );
    position += 46 + nameLength + extraLength + commentLength;

    // Where the content starts is only known from the entry's own header in the file.
    const content = async (type?: string): Promise<Blob> => {
      const header = await view(file.slice(localOffset, localOffset + 30));
      if (header.byteLength < 30 || header.getUint32(0, true) !== LOCAL_SIGNATURE) {
        throw new ZipFormatError(`broken entry: ${name}`);
      }
      const start = localOffset + 30 + header.getUint16(26, true) + header.getUint16(28, true);
      if (start + compressedSize > file.size) throw new ZipFormatError(`entry outside the file: ${name}`);
      return file.slice(start, start + compressedSize, type);
    };

    entries.set(name, {
      name,
      size,
      slice(type) {
        if (method !== 0) throw new ZipFormatError(`entry is compressed: ${name}`);
        return content(type);
      },
      async bytes() {
        const raw = new Uint8Array(await (await content()).arrayBuffer());
        if (method === 0) return raw;
        if (method !== 8) throw new ZipFormatError(`unknown compression: ${name}`);
        try {
          return inflateSync(raw, { out: new Uint8Array(size) });
        } catch {
          throw new ZipFormatError(`cannot decompress: ${name}`);
        }
      },
    });
  }
  return entries;
}
