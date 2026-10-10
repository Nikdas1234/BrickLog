// The stopwatch for building time. It does not count in the background: it only
// remembers when it was started and how much time was collected before the last pause.
// The elapsed time is worked out from the clock whenever it is needed, so it stays right
// when the app is closed or the phone is locked.

export interface BuildTimer {
  // Time collected in earlier running phases, in milliseconds.
  accumulatedMs: number;
  // Start of the current running phase as a timestamp, or null while paused.
  runningSince: number | null;
}

export const startTimer = (now: number): BuildTimer => ({ accumulatedMs: 0, runningSince: now });

export function pauseTimer(timer: BuildTimer, now: number): BuildTimer {
  if (timer.runningSince === null) return timer;
  return { accumulatedMs: elapsedMs(timer, now), runningSince: null };
}

export function resumeTimer(timer: BuildTimer, now: number): BuildTimer {
  return timer.runningSince === null ? { ...timer, runningSince: now } : timer;
}

export function elapsedMs(timer: BuildTimer, now: number): number {
  // A clock set back in the meantime must not produce negative time.
  const running = timer.runningSince === null ? 0 : Math.max(0, now - timer.runningSince);
  return timer.accumulatedMs + running;
}

// Building time is entered in whole minutes. Any measured time counts as at least one.
export function timerMinutes(ms: number): number {
  return ms <= 0 ? 0 : Math.max(1, Math.round(ms / 60_000));
}

// 3 725 000 → '1:02:05', 185 000 → '3:05'
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = (total % 60).toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

// Reads the stored stopwatches (one per set) and drops anything that is not one.
export function parseTimers(json: string | null): Record<string, BuildTimer> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json ?? '{}');
  } catch {
    return {};
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
  const timers: Record<string, BuildTimer> = {};
  for (const [setId, value] of Object.entries(parsed)) {
    const timer = value as Partial<BuildTimer> | null;
    if (
      timer &&
      typeof timer.accumulatedMs === 'number' &&
      Number.isFinite(timer.accumulatedMs) &&
      timer.accumulatedMs >= 0 &&
      (timer.runningSince === null || (typeof timer.runningSince === 'number' && Number.isFinite(timer.runningSince)))
    ) {
      timers[setId] = { accumulatedMs: timer.accumulatedMs, runningSince: timer.runningSince };
    }
  }
  return timers;
}
