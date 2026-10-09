import { expect, test } from 'vitest';
import { euroInput, formatDate, formatEuro, formatMinutes, parseCount, parseEuro, todayIso } from '../src/lib/format';

test('parseEuro accepts comma, dot and thousands separators', () => {
  expect(parseEuro('12,99')).toEqual({ ok: true, cents: 1299 });
  expect(parseEuro('12.99')).toEqual({ ok: true, cents: 1299 });
  expect(parseEuro(' 1.234,50 € ')).toEqual({ ok: true, cents: 123450 });
  expect(parseEuro('40')).toEqual({ ok: true, cents: 4000 });
  expect(parseEuro('0,5')).toEqual({ ok: true, cents: 50 });
});

test('parseEuro treats an empty field as "no price"', () => {
  expect(parseEuro('')).toEqual({ ok: true, cents: null });
  expect(parseEuro('   ')).toEqual({ ok: true, cents: null });
});

test('parseEuro rejects nonsense instead of storing 0', () => {
  expect(parseEuro('abc')).toEqual({ ok: false });
  expect(parseEuro('-5')).toEqual({ ok: false });
  expect(parseEuro('12,999')).toEqual({ ok: false });
  expect(parseEuro('12,9,9')).toEqual({ ok: false });
});

test('formatEuro', () => {
  expect(formatEuro(1299)).toBe('12,99 €');
  expect(formatEuro(123450)).toBe('1.234,50 €');
  expect(formatEuro(5)).toBe('0,05 €');
  expect(formatEuro(null)).toBe('–');
});

test('euroInput round-trips through parseEuro', () => {
  expect(euroInput(123450)).toBe('1234,50');
  expect(euroInput(null)).toBe('');
  expect(parseEuro(euroInput(123450))).toEqual({ ok: true, cents: 123450 });
});

test('dates', () => {
  expect(formatDate('2026-10-09')).toBe('09.10.2026');
  expect(formatDate(null)).toBe('–');
  expect(todayIso(new Date(2026, 9, 9, 23, 30))).toBe('2026-10-09');
  expect(todayIso(new Date(2026, 0, 5, 0, 10))).toBe('2026-01-05');
});

test('formatMinutes', () => {
  expect(formatMinutes(135)).toBe('2 h 15 min');
  expect(formatMinutes(45)).toBe('45 min');
  expect(formatMinutes(120)).toBe('2 h');
});

test('parseCount', () => {
  expect(parseCount('1234')).toBe(1234);
  expect(parseCount('1.234')).toBe(1234);
  expect(parseCount('')).toBeNull();
  expect(parseCount('12,5')).toBeUndefined();
  expect(parseCount('-3')).toBeUndefined();
  expect(parseCount('abc')).toBeUndefined();
});
