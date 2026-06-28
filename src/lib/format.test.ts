import { expect, test } from 'vitest';
import { fmtDuration, fmtMonthYear, fmtLongDate } from './format';

test('fmtDuration formats ms as m:ss with rounding', () => {
  expect(fmtDuration(245000)).toBe('4:05');
  expect(fmtDuration(100649)).toBe('1:41');
  expect(fmtDuration(0)).toBe('0:00');
  expect(fmtDuration(5000)).toBe('0:05');
  expect(fmtDuration(59500)).toBe('1:00'); // rounds up across the minute
});

test('fmtMonthYear gives abbreviated month + year', () => {
  expect(fmtMonthYear('2026-05-28')).toBe('May 2026');
  expect(fmtMonthYear('2025-01-26')).toBe('Jan 2025');
  expect(fmtMonthYear('2008-12-01')).toBe('Dec 2008');
});

test('fmtLongDate gives full month, no-leading-zero day, year', () => {
  expect(fmtLongDate('2025-01-26')).toBe('January 26, 2025');
  expect(fmtLongDate('2026-05-08')).toBe('May 8, 2026');
});
