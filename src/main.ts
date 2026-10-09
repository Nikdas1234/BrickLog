import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { openBrickDb, type BrickDb } from './lib/db';
import { isNativeApp } from './lib/saveFile';
import { startUpdates } from './lib/updater.svelte';

const target = document.getElementById('app')!;

let db: BrickDb | null = null;
try {
  db = await openBrickDb();
} catch (error) {
  // The stored data was written by a newer version than this one, e.g. after an older
  // APK was installed or an update was rolled back. Opening it here would risk damage.
  const tooOld = error instanceof DOMException && error.name === 'VersionError';
  target.innerHTML = `<main class="page"><h1>BrickLog</h1><p style="margin-top:16px">${
    tooOld
      ? 'Diese Fassung der App ist älter als deine gespeicherten Daten und kann sie nicht öffnen. Deine Daten sind unverändert. Bitte installiere die neueste Fassung:'
      : 'Die gespeicherten Daten lassen sich nicht öffnen. Bitte starte die App neu. Hilft das nicht, installiere die neueste Fassung:'
  }</p><p style="margin-top:16px"><a class="btn primary" href="https://github.com/Nikdas1234/BrickLog/releases/download/apk/BrickLog.apk">BrickLog herunterladen</a></p></main>`;
}

if (db) {
  // Asks the browser not to evict our data when storage runs low.
  void navigator.storage?.persist?.();

  // Android's back button: one step back inside the app, and out of the app from the
  // first screen.
  if (isNativeApp) {
    const { App: NativeApp } = await import('@capacitor/app');
    await NativeApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) history.back();
      else void NativeApp.exitApp();
    });
  }

  mount(App, { target, props: { db } });

  // Only now, with the app on screen, is this content confirmed as working.
  const opened = db;
  void startUpdates(() => opened.close());
}
