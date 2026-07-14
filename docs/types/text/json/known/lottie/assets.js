import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
import { sanitizeSvg } from '../../../../image/svg-sanitize.js';
import { hasExpressions } from './model.js';

export const ASSET_LIMITS = Object.freeze({ count: 64, perFile: 10 * 1024 * 1024, total: 32 * 1024 * 1024 });

function cleanExistingPath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/{2,}/g, '/');
}

export function resolveAssetPath(currentPath, prefix, filename) {
  const raw = String(prefix || '') + String(filename || '');
  if (!raw || /\\/.test(raw) || /[?#]/.test(raw) || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(raw)) return null;
  const pieces = raw.split('/');
  if (pieces.some((part) => part === '..' || part === '')) return null;
  const current = cleanExistingPath(currentPath);
  const base = current.includes('/') ? current.slice(0, current.lastIndexOf('/') + 1) : '';
  return cleanExistingPath(base + pieces.filter((part) => part !== '.').join('/'));
}

function folderIndex(folder) {
  const map = new Map();
  for (const entry of folder?.files || []) {
    const path = cleanExistingPath(entry.path || entry.file?.webkitRelativePath || entry.file?.name);
    if (!path) continue;
    if (!map.has(path)) map.set(path, []);
    map.get(path).push(entry.file);
  }
  return map;
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(bytes.length, i + chunk)));
  }
  return btoa(binary);
}

function sniffImage(bytes) {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 6) {
    const sig = String.fromCharCode(...bytes.subarray(0, 6));
    if (sig === 'GIF87a' || sig === 'GIF89a') return 'image/gif';
  }
  if (bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF'
      && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP') return 'image/webp';
  const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, Math.min(bytes.length, 1024)))
    .replace(/^\uFEFF/, '').trimStart().toLowerCase();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'image/svg+xml';
  return null;
}

async function safeImageDataUrl(bytes) {
  if (bytes.length > ASSET_LIMITS.perFile) throw new Error('asset exceeds the 10 MiB per-file limit');
  const mime = sniffImage(bytes);
  if (!mime) throw new Error('asset is not a supported PNG, JPEG, GIF, WebP, or SVG image');
  if (mime !== 'image/svg+xml') return { url: `data:${mime};base64,${bytesToBase64(bytes)}`, size: bytes.length, mime };

  const source = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const DOMPurify = await loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify');
  DOMPurify.removed = [];
  const purified = DOMPurify.sanitize(source, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ALLOWED_URI_REGEXP: /^(?:#|data:image\/(?:png|jpeg|gif|webp);base64,)/i,
  });
  const clean = sanitizeSvg(purified);
  return { url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(clean), size: bytes.length, mime };
}

async function fileImageDataUrl(file) {
  if (!file || !Number.isFinite(file.size) || file.size > ASSET_LIMITS.perFile) {
    throw new Error('asset exceeds the 10 MiB per-file limit');
  }
  return safeImageDataUrl(new Uint8Array(await file.arrayBuffer()));
}

function embeddedBytes(url) {
  const match = String(url).match(/^data:([^;,]+)(;base64)?,([\s\S]*)$/i);
  if (!match || !/^image\//i.test(match[1])) throw new Error('embedded asset is not an image data URL');
  if (match[2]) {
    const binary = atob(match[3].replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  return new TextEncoder().encode(decodeURIComponent(match[3]));
}

function stripNetworkFields(data, warnings) {
  if (Object.prototype.hasOwnProperty.call(data, 'segments')) {
    delete data.segments;
    warnings.push('External animation segments were blocked.');
  }
  for (const font of data.fonts?.list || []) {
    if (font && typeof font === 'object' && font.fPath) {
      delete font.fPath;
      warnings.push('External font paths were blocked; browser fallback fonts are used.');
    }
  }
}

function deepClone(value) {
  try { return structuredClone(value); }
  catch { return JSON.parse(JSON.stringify(value)); }
}

export async function prepareAnimation(animation, { folder = null, supplied = new Map() } = {}) {
  const data = deepClone(animation);
  const warnings = [];
  const missing = [];
  const blocked = [];
  stripNetworkFields(data, warnings);
  if (hasExpressions(data)) warnings.push('Expressions were detected but are disabled by the expression-free player.');

  const index = folderIndex(folder);
  const fileAssets = (data.assets || []).filter((asset) => asset && typeof asset === 'object' && typeof asset.p === 'string' && asset.p);
  if (fileAssets.length > ASSET_LIMITS.count) {
    blocked.push({ ref: 'assets', reason: `animation references more than ${ASSET_LIMITS.count} external or embedded assets` });
  }

  let total = 0;
  for (const asset of fileAssets.slice(0, ASSET_LIMITS.count)) {
    const ref = String(asset.u || '') + asset.p;
    let target = null;
    try {
      let converted;
      if (/^data:/i.test(asset.p)) {
        converted = await safeImageDataUrl(embeddedBytes(asset.p));
      } else {
        if (asset.t === 3 || asset.t === 'audio') throw new Error('audio assets are not supported');
        target = resolveAssetPath(folder?.currentPath, asset.u, asset.p);
        if (!target) throw new Error('asset path is absolute, remote, ambiguous, or traverses outside the animation folder');
        const candidates = index.get(target) || [];
        if (candidates.length > 1) throw new Error('multiple loaded files have the same asset path');
        const file = supplied.get(target) || candidates[0];
        if (!file) {
          missing.push({ assetId: asset.id || '', ref, target, reason: 'referenced image was not loaded' });
          asset.p = '';
          asset.u = '';
          continue;
        }
        converted = await fileImageDataUrl(file);
      }
      total += converted.size;
      if (total > ASSET_LIMITS.total) throw new Error('combined image assets exceed the 32 MiB limit');
      asset.p = converted.url;
      asset.u = '';
      asset.e = 1;
    } catch (error) {
      blocked.push({ assetId: asset.id || '', ref, target, reason: error.message });
      asset.p = '';
      asset.u = '';
    }
  }
  return { data, warnings: [...new Set(warnings)], missing, blocked, assetBytes: total };
}

export function assignDroppedFiles(files, missing, supplied) {
  const unresolved = missing || [];
  const byBasename = new Map();
  for (const item of unresolved) {
    const base = item.target.split('/').pop();
    if (!byBasename.has(base)) byBasename.set(base, []);
    byBasename.get(base).push(item);
  }
  let matched = 0;
  for (const file of files || []) {
    const relative = cleanExistingPath(file.webkitRelativePath || file.name);
    let targets = unresolved.filter((item) => relative === item.target || item.target.endsWith('/' + relative));
    if (!targets.length) targets = byBasename.get(file.name) || [];
    if (targets.length !== 1) continue;
    supplied.set(targets[0].target, file);
    matched += 1;
  }
  return matched;
}
