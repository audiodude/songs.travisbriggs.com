import { expect, test } from 'vitest';
import { parseFrontmatter } from './parse-frontmatter.mjs';

test('parses legacy frontmatter + note body', () => {
  const raw = "title: Monthly\ndate: 2026/05/28\nduration: 245000\ntags: ['electronic', 'breakbeat']\n\nYes, this track...";
  const { meta, note } = parseFrontmatter(raw);
  expect(meta.title).toBe('Monthly');
  expect(meta.date).toBe('2026-05-28');
  expect(meta.duration).toBe(245000);
  expect(meta.tags).toEqual(['electronic', 'breakbeat']);
  expect(meta.hidden).toBe(false);
  expect(note.trim()).toBe('Yes, this track...');
});

test('parses hidden flag and empty tags', () => {
  const raw = 'title: X\ndate: 2020/01/01\nduration: 0\ntags: []\nhidden: true\n\n';
  const { meta, note } = parseFrontmatter(raw);
  expect(meta.hidden).toBe(true);
  expect(meta.tags).toEqual([]);
  expect(note).toBe('');
});

test('keeps colons in titles and multi-paragraph notes', () => {
  const raw = "title: Trash on the Nash (tional Mall)\ndate: 2025/01/26\nduration: 100649\ntags: ['folk', 'demo']\n\nLine one.\n\nLine two.";
  const { meta, note } = parseFrontmatter(raw);
  expect(meta.title).toBe('Trash on the Nash (tional Mall)');
  expect(meta.date).toBe('2025-01-26');
  expect(note).toBe('Line one.\n\nLine two.');
});
