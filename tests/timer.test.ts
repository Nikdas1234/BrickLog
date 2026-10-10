import { expect, test } from 'vitest';
import { elapsedMs, formatClock, parseTimers, pauseTimer, resumeTimer, startTimer, timerMinutes } from '../src/lib/timer';

const MIN = 60_000;
const T0 = 1_800_000_000_000;

test('a running stopwatch counts from its start', () => {
  const timer = startTimer(T0);
  expect(elapsedMs(timer, T0)).toBe(0);
  expect(elapsedMs(timer, T0 + 5 * MIN)).toBe(5 * MIN);
});

test('time stands still while paused and continues after resuming', () => {
  let timer = startTimer(T0);
  timer = pauseTimer(timer, T0 + 10 * MIN);
  expect(timer.runningSince).toBeNull();
  expect(elapsedMs(timer, T0 + 40 * MIN)).toBe(10 * MIN);

  timer = resumeTimer(timer, T0 + 40 * MIN);
  expect(elapsedMs(timer, T0 + 45 * MIN)).toBe(15 * MIN);

  timer = pauseTimer(timer, T0 + 50 * MIN);
  expect(elapsedMs(timer, T0 + 99 * MIN)).toBe(20 * MIN);
});

test('pausing twice or resuming twice changes nothing', () => {
  const paused = pauseTimer(startTimer(T0), T0 + 3 * MIN);
  expect(pauseTimer(paused, T0 + 30 * MIN)).toEqual(paused);
  const running = resumeTimer(paused, T0 + 30 * MIN);
  expect(resumeTimer(running, T0 + 60 * MIN)).toEqual(running);
});

test('a clock that was set back does not produce negative time', () => {
  const timer = resumeTimer(pauseTimer(startTimer(T0), T0 + 8 * MIN), T0 + 20 * MIN);
  expect(elapsedMs(timer, T0)).toBe(8 * MIN);
});

test('the time survives being stored and read back, as when the app was closed', () => {
  const stored = JSON.stringify({ set1: startTimer(T0) });
  const timers = parseTimers(stored);
  expect(elapsedMs(timers.set1, T0 + 90 * MIN)).toBe(90 * MIN);
});

test('building time is rounded to whole minutes, with at least one', () => {
  expect(timerMinutes(0)).toBe(0);
  expect(timerMinutes(5_000)).toBe(1);
  expect(timerMinutes(89_000)).toBe(1);
  expect(timerMinutes(90_000)).toBe(2);
  expect(timerMinutes(45 * MIN + 20_000)).toBe(45);
  expect(timerMinutes(135 * MIN)).toBe(135);
});

test('formatClock', () => {
  expect(formatClock(0)).toBe('0:00');
  expect(formatClock(59_999)).toBe('0:59');
  expect(formatClock(185_000)).toBe('3:05');
  expect(formatClock(3_725_000)).toBe('1:02:05');
  expect(formatClock(-5)).toBe('0:00');
});

test('parseTimers drops everything that is not a stopwatch', () => {
  expect(parseTimers(null)).toEqual({});
  expect(parseTimers('kein json')).toEqual({});
  expect(parseTimers('[1,2]')).toEqual({});
  expect(
    parseTimers(
      JSON.stringify({
        gut: { accumulatedMs: 1000, runningSince: null },
        läuft: { accumulatedMs: 0, runningSince: T0, extra: 'x' },
        negativ: { accumulatedMs: -1, runningSince: null },
        text: { accumulatedMs: '5', runningSince: null },
        ohneStart: { accumulatedMs: 5 },
        leer: null,
      }),
    ),
  ).toEqual({
    gut: { accumulatedMs: 1000, runningSince: null },
    läuft: { accumulatedMs: 0, runningSince: T0 },
  });
});
