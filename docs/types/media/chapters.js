import { parseSubtitles } from './subtitles.js';

export const CHAPTER_SIDECAR_MAX_BYTES = 1024 * 1024;

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cleanTitle(title, fallback) {
  const text = String(title || '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

export function normalizeChapters(chapters, duration) {
  if (!Array.isArray(chapters) || !chapters.length) return [];
  const dur = finiteNumber(duration);
  const max = dur !== null && dur >= 0 ? dur : null;
  const sorted = chapters
    .map((chapter, originalIndex) => {
      const start = finiteNumber(chapter?.start);
      if (start === null) return null;
      const clamped = Math.max(0, max === null ? start : Math.min(start, max));
      return {
        ...chapter,
        start: clamped,
        originalIndex,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start || a.originalIndex - b.originalIndex);

  const out = [];
  for (const chapter of sorted) {
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev.start - chapter.start) < 0.001) continue;
    out.push({
      ...chapter,
      title: cleanTitle(chapter.title, `Chapter ${out.length + 1}`),
    });
  }

  for (let i = 0; i < out.length; i += 1) {
    const next = out[i + 1];
    const ownEnd = finiteNumber(out[i].end);
    const clampedOwnEnd = ownEnd === null ? null : Math.max(out[i].start, max === null ? ownEnd : Math.min(ownEnd, max));
    const end = next ? next.start : (max ?? clampedOwnEnd);
    out[i].end = end !== null && end >= out[i].start ? end : null;
    delete out[i].originalIndex;
  }
  return out;
}

function safeNamePart(value, fallback) {
  const text = String(value || '').replace(/\.[^.]+$/, '').trim() || fallback;
  const ascii = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const safe = ascii
    .replace(/['"`]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  return safe || fallback;
}

export function chapterFilename(base, chapter, index) {
  const book = safeNamePart(base, 'Audio');
  const title = safeNamePart(chapter?.title, `Chapter_${index + 1}`);
  const n = String(index + 1).padStart(2, '0');
  return `${book}_${n}_${title}.mp3`;
}

function basename(path) {
  return String(path || '').split('/').pop() || '';
}

function dirname(path) {
  const text = String(path || '');
  const i = text.lastIndexOf('/');
  return i >= 0 ? text.slice(0, i) : '';
}

function stripExt(name) {
  return String(name || '').replace(/\.[^.]+$/, '');
}

function extname(name) {
  const m = /\.([^.]+)$/.exec(String(name || ''));
  return m ? m[1].toLowerCase() : '';
}

function cleanCueTitle(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseLooseTimestamp(value) {
  const s = String(value || '').trim();
  const withFraction = /^(?:(\d+):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?$/.exec(s);
  if (withFraction) {
    const [, h, mm, ss, ms = '0'] = withFraction;
    return (h ? Number(h) * 3600 : 0) + Number(mm) * 60 + Number(ss) + Number(ms.padEnd(3, '0')) / 1000;
  }
  const minutes = /^(\d{1,4}):(\d{2})$/.exec(s);
  if (minutes) return Number(minutes[1]) * 60 + Number(minutes[2]);
  const plain = Number(s);
  return Number.isFinite(plain) && plain >= 0 ? plain : NaN;
}

export function parseWebVttChapters(raw) {
  return parseSubtitles(raw)
    .map((cue) => ({
      start: cue.start,
      end: cue.end,
      title: cleanCueTitle(cue.text),
    }))
    .filter((chapter) => Number.isFinite(chapter.start) && chapter.title);
}

export function parseFfmetadataChapters(raw) {
  const lines = String(raw || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const chapters = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    const timebase = current.TIMEBASE || '1/1000';
    const m = /^(\d+)\s*\/\s*(\d+)$/.exec(timebase);
    const scale = m && Number(m[2]) !== 0 ? Number(m[1]) / Number(m[2]) : 0.001;
    const startRaw = finiteNumber(current.START);
    if (startRaw === null) { current = null; return; }
    const chapter = {
      start: startRaw * scale,
      title: cleanTitle(current.title || current.TITLE, ''),
    };
    const endRaw = finiteNumber(current.END);
    if (endRaw !== null && endRaw >= startRaw) chapter.end = endRaw * scale;
    if (Number.isFinite(chapter.start)) chapters.push(chapter);
    current = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;
    const section = /^\[([^\]]+)\]$/.exec(trimmed);
    if (section) {
      flush();
      current = section[1].toUpperCase() === 'CHAPTER' ? {} : null;
      continue;
    }
    if (!current) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    current[key] = value;
  }
  flush();
  return chapters;
}

export function parseTextChapterLines(raw) {
  const chapters = [];
  const lines = String(raw || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  for (const line of lines) {
    const trimmed = line.trim().replace(/^[-*]\s+/, '');
    if (!trimmed || /^#{1,6}\s*$/.test(trimmed)) continue;
    const m = /^(?:#{1,6}\s*)?(\d+(?::\d{2}){1,2}(?:[.,]\d{1,3})?|\d+(?:\.\d+)?)\s*(?:[-–—:]\s+|\s+)(.+)$/.exec(trimmed);
    if (!m) continue;
    const start = parseLooseTimestamp(m[1]);
    const title = cleanCueTitle(m[2]);
    if (!Number.isFinite(start) || !title) continue;
    chapters.push({ start, title });
  }
  return chapters;
}

export function parseChapterSidecar(raw, filename = '') {
  const name = basename(filename).toLowerCase();
  const ext = extname(name);
  const text = String(raw || '');
  const parsers = [];
  if (ext === 'vtt' || /^\s*WEBVTT\b/i.test(text)) parsers.push(parseWebVttChapters);
  if (ext === 'ffmetadata' || /\[CHAPTER\]/i.test(text)) parsers.push(parseFfmetadataChapters);
  parsers.push(parseTextChapterLines);

  for (const parse of parsers) {
    const chapters = parse(text);
    if (chapters.length) return chapters;
  }
  return [];
}

export function findChapterSidecars(folderFiles, currentPath, currentFile) {
  if (!Array.isArray(folderFiles) || !folderFiles.length) return [];
  const path = currentPath || currentFile?.name || '';
  const dir = dirname(path);
  const base = stripExt(basename(path)).toLowerCase();
  if (!base) return [];
  const allowedExts = new Set(['vtt', 'ffmetadata', 'txt', 'md']);
  const explicitSuffixes = new Set([
    base,
    `${base}.chapters`,
    `${base}.chapter`,
    `${base}.toc`,
    `${base}.ctoc`,
  ]);
  const genericNames = new Set(['chapters', 'chapter', 'toc', 'ctoc']);
  const out = [];

  for (const entry of folderFiles) {
    const entryPath = entry?.path || entry?.file?.name || '';
    if (!entryPath || dirname(entryPath) !== dir) continue;
    if (entry?.file === currentFile || entryPath === path) continue;
    const name = basename(entryPath);
    const ext = extname(name);
    if (!allowedExts.has(ext)) continue;
    const stem = stripExt(name).toLowerCase();
    let rank = null;
    if (explicitSuffixes.has(stem)) rank = stem === base ? 0 : 1;
    else if (genericNames.has(stem)) rank = 2;
    if (rank === null) continue;
    out.push({ ...entry, rank, path: entryPath });
  }

  return out.sort((a, b) => a.rank - b.rank || String(a.path).localeCompare(String(b.path)));
}
