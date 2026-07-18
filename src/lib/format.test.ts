import { expect, test } from 'vitest';
import { fmtDuration, fmtMonthYear, fmtLongDate, stripMarkdown, metaDescription } from './format';

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

test('stripMarkdown unwraps links and drops formatting markers', () => {
  // the interoutter case from the social-card preview
  expect(
    stripMarkdown('I think that my [Suno adventures](https://null.dangerthirdrail.com) have made me want to explore.'),
  ).toBe('I think that my Suno adventures have made me want to explore.');
  expect(stripMarkdown('**bold** and _italic_ and `code` and ~~gone~~')).toBe('bold and italic and code and gone');
  expect(stripMarkdown('![alt text](/img.png) after')).toBe('alt text after');
  expect(stripMarkdown('# Heading\n\n> quote\n\n- item one\n- item two')).toBe('Heading quote item one item two');
  expect(stripMarkdown('line one\n\nline two')).toBe('line one line two');
});

test('metaDescription strips markdown and caps length on a word boundary', () => {
  expect(metaDescription('A [link](http://x.com) here.')).toBe('A link here.');
  const words = Array.from({ length: 60 }, (_, i) => `w${i}`).join(' '); // distinct words, > 160 chars
  const out = metaDescription(words);
  expect(out.length).toBeLessThanOrEqual(160);
  expect(out.endsWith('…')).toBe(true);
  const prefix = out.slice(0, -1); // drop the ellipsis
  expect(words.startsWith(prefix)).toBe(true); // a real prefix of the input
  expect(words[prefix.length]).toBe(' '); // cut fell exactly on a word boundary
});
