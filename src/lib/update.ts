// How the Android app learns about new versions.
//
// Every build publishes three files next to each other: the APK, a zip with the web
// content of the app ("bundle") and version.json describing both. The app reads
// version.json and then either
//   - loads the new bundle itself (the normal case: screens, catalogs, fixes), or
//   - asks the user to install the new APK, when the Android shell itself changed and
//     the new content would not run in the installed one.

const RELEASE = 'https://github.com/Nikdas1234/BrickLog/releases/download/apk/';
export const MANIFEST_URL = `${RELEASE}version.json`;

export interface UpdateManifest {
  // Running number of the build; higher means newer.
  build: number;
  version: string;
  // Version of the Android shell this content was built for.
  native: number;
  bundleId: string;
  bundleUrl: string;
  bundleSha256: string;
  apkUrl: string;
}

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;
// Downloads are only ever taken from our own release, whatever the file says.
const isOurFile = (value: unknown): value is string => typeof value === 'string' && value.startsWith(RELEASE);

export function parseManifest(value: unknown): UpdateManifest | null {
  if (typeof value !== 'object' || value === null) return null;
  const m = value as Record<string, unknown>;
  if (
    !isCount(m.build) ||
    !isCount(m.native) ||
    typeof m.version !== 'string' ||
    typeof m.bundleId !== 'string' ||
    m.bundleId === '' ||
    m.bundleId === 'public' ||
    typeof m.bundleSha256 !== 'string' ||
    !/^[0-9a-f]{64}$/.test(m.bundleSha256) ||
    !isOurFile(m.bundleUrl) ||
    !isOurFile(m.apkUrl)
  ) {
    return null;
  }
  return m as unknown as UpdateManifest;
}

// The APK's version code carries the shell version in its upper digits:
// code = shell version * 100000 + build number. APKs from before this scheme have
// codes below 100000 and therefore shell version 0.
export const NATIVE_STEP = 100_000;
export function nativeVersionOf(versionCode: number): number {
  return Number.isFinite(versionCode) ? Math.floor(versionCode / NATIVE_STEP) : 0;
}

export type UpdateDecision =
  | { kind: 'none' }
  | { kind: 'apk'; manifest: UpdateManifest }
  | { kind: 'bundle'; manifest: UpdateManifest };

export function decideUpdate(
  manifest: UpdateManifest | null,
  installedNative: number,
  runningBuild: number,
  blockedBundles: string[],
): UpdateDecision {
  if (!manifest || manifest.build <= runningBuild) return { kind: 'none' };
  // Content for a newer shell would not run here: the APK has to come first.
  if (manifest.native > installedNative) return { kind: 'apk', manifest };
  // A bundle that already failed to start once is not tried again.
  if (blockedBundles.includes(manifest.bundleId)) return { kind: 'none' };
  return { kind: 'bundle', manifest };
}
