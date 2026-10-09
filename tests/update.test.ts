import { expect, test } from 'vitest';
import { decideUpdate, nativeVersionOf, parseManifest, type UpdateManifest } from '../src/lib/update';

const RELEASE = 'https://github.com/Nikdas1234/BrickLog/releases/download/apk/';

const manifest = (overrides: Partial<UpdateManifest> = {}): UpdateManifest => ({
  build: 12,
  version: '1.5.0',
  native: 1,
  bundleId: '1.5.0-b12',
  bundleUrl: `${RELEASE}bundle.zip`,
  bundleSha256: 'a'.repeat(64),
  apkUrl: `${RELEASE}BrickLog.apk`,
  ...overrides,
});

test('a complete manifest is accepted', () => {
  expect(parseManifest(manifest())).toEqual(manifest());
});

test('broken manifests are rejected', () => {
  expect(parseManifest(null)).toBeNull();
  expect(parseManifest('text')).toBeNull();
  expect(parseManifest({})).toBeNull();
  expect(parseManifest({ ...manifest(), build: '12' })).toBeNull();
  expect(parseManifest({ ...manifest(), build: -1 })).toBeNull();
  expect(parseManifest({ ...manifest(), native: 1.5 })).toBeNull();
  expect(parseManifest({ ...manifest(), bundleId: '' })).toBeNull();
  expect(parseManifest({ ...manifest(), bundleId: 'public' })).toBeNull();
  expect(parseManifest({ ...manifest(), bundleSha256: 'abc' })).toBeNull();
});

test('downloads from anywhere but our own release are rejected', () => {
  expect(parseManifest({ ...manifest(), bundleUrl: 'https://evil.example/bundle.zip' })).toBeNull();
  expect(parseManifest({ ...manifest(), apkUrl: 'https://github.com/someone/else/releases/download/apk/BrickLog.apk' })).toBeNull();
  expect(parseManifest({ ...manifest(), bundleUrl: 'http://github.com/Nikdas1234/BrickLog/releases/download/apk/bundle.zip' })).toBeNull();
});

test('the shell version sits in the upper digits of the version code', () => {
  expect(nativeVersionOf(5)).toBe(0);
  expect(nativeVersionOf(100_006)).toBe(1);
  expect(nativeVersionOf(299_999)).toBe(2);
  expect(nativeVersionOf(Number.NaN)).toBe(0);
});

test('nothing to do without a manifest or without a newer build', () => {
  expect(decideUpdate(null, 1, 10, [])).toEqual({ kind: 'none' });
  expect(decideUpdate(manifest({ build: 12 }), 1, 12, [])).toEqual({ kind: 'none' });
  expect(decideUpdate(manifest({ build: 11 }), 1, 12, [])).toEqual({ kind: 'none' });
});

test('newer content for the installed shell is loaded by the app itself', () => {
  expect(decideUpdate(manifest(), 1, 11, []).kind).toBe('bundle');
  expect(decideUpdate(manifest({ native: 1 }), 2, 11, []).kind).toBe('bundle');
});

test('content for a newer shell asks for the APK instead', () => {
  expect(decideUpdate(manifest({ native: 2 }), 1, 11, []).kind).toBe('apk');
  expect(decideUpdate(manifest({ native: 1 }), 0, 5, []).kind).toBe('apk');
});

test('a bundle that failed before is not loaded again', () => {
  expect(decideUpdate(manifest(), 1, 11, ['1.5.0-b12'])).toEqual({ kind: 'none' });
  expect(decideUpdate(manifest(), 1, 11, ['1.4.0-b9']).kind).toBe('bundle');
});
