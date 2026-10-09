import { getContext, setContext } from 'svelte';
import type { BrickDb } from './db';

const KEY = 'db';

export function provideDb(db: BrickDb): void {
  setContext(KEY, db);
}

export function getDb(): BrickDb {
  return getContext<BrickDb>(KEY);
}
