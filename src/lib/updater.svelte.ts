import { decideUpdate, MANIFEST_URL, nativeVersionOf, parseManifest } from './update';
import { isNativeApp } from './saveFile';

export const updateState = $state<{
  status: 'idle' | 'apk' | 'bundleReady';
  version: string;
  apkUrl: string;
  // "Später" was tapped: the notice stays away until the app is started again.
  dismissed: boolean;
}>({
  status: 'idle',
  version: '',
  apkUrl: '',
  dismissed: false,
});

// Android keeps apps in memory for days, so we also look when the app comes back to the
// foreground, but not more often than this.
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
let lastCheck = 0;
let releaseDatabase: () => void = () => {};

async function check(): Promise<void> {
  if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return;
  lastCheck = Date.now();
  try {
    const [{ CapacitorHttp }, { App }, { LiveUpdate }] = await Promise.all([
      import('@capacitor/core'),
      import('@capacitor/app'),
      import('@capawesome/capacitor-live-update'),
    ]);
    const response = await CapacitorHttp.get({ url: MANIFEST_URL, connectTimeout: 15_000, readTimeout: 15_000 });
    if (response.status !== 200) throw new Error(`status ${response.status}`);
    const manifest = parseManifest(typeof response.data === 'string' ? JSON.parse(response.data) : response.data);
    const [info, blocked] = await Promise.all([App.getInfo(), LiveUpdate.getBlockedBundles()]);

    const decision = decideUpdate(manifest, nativeVersionOf(Number(info.build)), __BUILD__, blocked.bundleIds);
    if (decision.kind === 'apk') {
      updateState.version = decision.manifest.version;
      updateState.apkUrl = decision.manifest.apkUrl;
      updateState.status = 'apk';
    } else if (decision.kind === 'bundle') {
      const { bundleId, bundleUrl, bundleSha256, version } = decision.manifest;
      const { bundleIds } = await LiveUpdate.getBundles();
      if (!bundleIds.includes(bundleId)) {
        await LiveUpdate.downloadBundle({ url: bundleUrl, bundleId, checksum: bundleSha256 });
      }
      // Takes effect at the next start of the app, or right away via applyUpdateNow().
      await LiveUpdate.setNextBundle({ bundleId });
      updateState.version = version;
      updateState.status = 'bundleReady';
    }
  } catch {
    // Offline or the release is being replaced right now: try again next time.
    lastCheck = 0;
  }
}

// Called once after the app is on screen. `closeDatabase` lets a reload start cleanly.
export async function startUpdates(closeDatabase: () => void): Promise<void> {
  if (!isNativeApp) return;
  releaseDatabase = closeDatabase;
  const [{ App }, { LiveUpdate }] = await Promise.all([
    import('@capacitor/app'),
    import('@capawesome/capacitor-live-update'),
  ]);
  // Tells the plugin that this content started fine. Without this call within the
  // configured time it falls back to the content built into the APK.
  await LiveUpdate.ready().catch(() => {});
  void check();
  await App.addListener('resume', () => void check());
}

export async function applyUpdateNow(): Promise<void> {
  const { LiveUpdate } = await import('@capawesome/capacitor-live-update');
  releaseDatabase();
  await LiveUpdate.reload();
}
