import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { openBrickDb } from './lib/db';

const db = await openBrickDb();

// Asks the browser not to evict our data when storage runs low.
void navigator.storage?.persist?.();

mount(App, { target: document.getElementById('app')!, props: { db } });
