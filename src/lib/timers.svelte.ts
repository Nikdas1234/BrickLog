import { parseTimers, pauseTimer, resumeTimer, startTimer, type BuildTimer } from './timer';

// One stopwatch per set, kept in the browser's small key-value storage so that it
// survives closing the app. It is not part of the backup: a half-measured building
// session is not worth carrying to another phone.
const KEY = 'bricklog.timers';

function read(): Record<string, BuildTimer> {
  try {
    return parseTimers(localStorage.getItem(KEY));
  } catch {
    return {};
  }
}

export const timers = $state<Record<string, BuildTimer>>(read());

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(timers));
  } catch {
    // Storage unavailable: the stopwatch still works until the app is closed.
  }
}

export function startBuildTimer(setId: string) {
  timers[setId] = startTimer(Date.now());
  persist();
}

export function pauseBuildTimer(setId: string) {
  if (!timers[setId]) return;
  timers[setId] = pauseTimer(timers[setId], Date.now());
  persist();
}

export function resumeBuildTimer(setId: string) {
  if (!timers[setId]) return;
  timers[setId] = resumeTimer(timers[setId], Date.now());
  persist();
}

export function discardBuildTimer(setId: string) {
  delete timers[setId];
  persist();
}
