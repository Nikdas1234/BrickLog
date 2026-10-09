import { expect, test } from 'vitest';
import { fitWithin, PhotoDecodeError, resizeToJpeg } from '../src/lib/photos';

test('fitWithin scales the longer edge down to the limit', () => {
  expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
  expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
});

test('fitWithin never enlarges and never returns 0', () => {
  expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  expect(fitWithin(1601, 1, 1600)).toEqual({ width: 1600, height: 1 });
  expect(fitWithin(8000, 2, 1600)).toEqual({ width: 1600, height: 1 });
});

test('an undecodable file is reported by name', async () => {
  const file = new File([new Uint8Array([1, 2, 3])], 'urlaub.heic');
  const failingDecode = () => Promise.reject(new Error('unsupported'));
  const error = await resizeToJpeg(file, 1600, failingDecode).catch((e) => e);
  expect(error).toBeInstanceOf(PhotoDecodeError);
  expect(error.fileName).toBe('urlaub.heic');
});
