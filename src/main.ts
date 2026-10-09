import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { openBrickDb } from './lib/db';
import { isNativeApp } from './lib/saveFile';

const db = await openBrickDb();

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

mount(App, { target: document.getElementById('app')!, props: { db } });
