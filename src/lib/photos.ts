export const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

export class PhotoDecodeError extends Error {
  fileName: string;
  constructor(fileName: string) {
    super(`Photo could not be decoded: ${fileName}`);
    this.name = 'PhotoDecodeError';
    this.fileName = fileName;
  }
}

export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export interface DecodedImage {
  width: number;
  height: number;
  source: CanvasImageSource;
  close?: () => void;
}

export type Decoder = (file: Blob) => Promise<DecodedImage>;

// 'from-image' applies the EXIF rotation, so portrait photos stay portrait.
const browserDecode: Decoder = async (file) => {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  return { width: bitmap.width, height: bitmap.height, source: bitmap, close: () => bitmap.close() };
};

export async function resizeToJpeg(
  file: File,
  maxEdge: number = MAX_EDGE,
  decode: Decoder = browserDecode,
): Promise<{ data: ArrayBuffer; width: number; height: number }> {
  let image: DecodedImage;
  try {
    image = await decode(file);
  } catch {
    throw new PhotoDecodeError(file.name);
  }
  try {
    const { width, height } = fitWithin(image.width, image.height, maxEdge);
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext('2d')!.drawImage(image.source, 0, 0, width, height);
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
    return { data: await blob.arrayBuffer(), width, height };
  } finally {
    image.close?.();
  }
}
