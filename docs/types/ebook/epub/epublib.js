// Hand-rolled EPUB structure reader (no ebook lib). An EPUB is a zip:
//   META-INF/container.xml  → points at the OPF package document
//   <book>.opf              → metadata + manifest (id→file) + spine (reading order)
//   nav.xhtml / toc.ncx     → table of contents
// We parse those with the platform DOMParser and hand back a flat, render-ready structure.
// Resource bytes are pulled lazily by the renderer (one chapter at a time — books are big).
import { loadGlobal, vendor } from '../../../core/script-loader.js';

const XML = (s) => new DOMParser().parseFromString(s, 'application/xml');

// Resolve an href that is relative to `fromPath` (a zip path) into an absolute zip path.
export function resolvePath(fromPath, href) {
  const base = fromPath.includes('/') ? fromPath.slice(0, fromPath.lastIndexOf('/') + 1) : '';
  const url = (href || '').split('#')[0];
  if (!url) return '';
  const parts = (base + url).split('/');
  const out = [];
  for (const p of parts) {
    if (p === '' || p === '.') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}

export function splitFrag(href) {
  const i = (href || '').indexOf('#');
  return i < 0 ? { path: href || '', frag: '' } : { path: href.slice(0, i), frag: href.slice(i + 1) };
}

export async function parseEpub(intake) {
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const zip = await JSZip.loadAsync(intake.bytes);

  const readText = (path) => { const f = zip.file(path); return f ? f.async('text') : Promise.resolve(null); };
  const readU8 = (path) => { const f = zip.file(path); return f ? f.async('uint8array') : Promise.resolve(null); };

  // 1) container.xml → OPF path
  const containerXml = await readText('META-INF/container.xml');
  if (!containerXml) throw new Error('Not an EPUB (no META-INF/container.xml)');
  const rootfile = XML(containerXml).querySelector('rootfile');
  const opfPath = rootfile && rootfile.getAttribute('full-path');
  if (!opfPath) throw new Error('EPUB container has no rootfile');

  // 2) OPF: metadata + manifest + spine
  const opfXml = await readText(opfPath);
  if (!opfXml) throw new Error('EPUB package file missing: ' + opfPath);
  const opf = XML(opfXml);
  const get = (sel) => { const el = opf.querySelector(sel); return el ? el.textContent.trim() : ''; };
  const title = get('metadata > title') || get('title') || intake.filename;
  const creator = get('metadata > creator') || get('creator') || '';
  const metadata = {
    title,
    creator,
    language: get('metadata > language') || get('language'),
    publisher: get('metadata > publisher') || get('publisher'),
    date: get('metadata > date') || get('date'),
    identifier: get('metadata > identifier') || get('identifier'),
    rights: get('metadata > rights') || get('rights'),
    description: get('metadata > description') || get('description'),
  };

  // manifest: id → { path (absolute zip path), type, props }
  const manifest = {};
  for (const item of opf.querySelectorAll('manifest > item')) {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (!id || !href) continue;
    manifest[id] = {
      path: resolvePath(opfPath, href),
      type: item.getAttribute('media-type') || '',
      props: item.getAttribute('properties') || '',
    };
  }

  // spine: ordered reading list of manifest items
  const spine = [];
  for (const ref of opf.querySelectorAll('spine > itemref')) {
    const id = ref.getAttribute('idref');
    const m = manifest[id];
    if (m && m.path) spine.push({ id, path: m.path, type: m.type });
  }

  // 3) Table of contents — prefer EPUB3 nav, fall back to EPUB2 NCX.
  let toc = [];
  const navItem = Object.values(manifest).find((m) => /\bnav\b/.test(m.props));
  if (navItem) {
    toc = await parseNav(await readText(navItem.path), navItem.path);
  }
  if (!toc.length) {
    const spineEl = opf.querySelector('spine');
    const ncxId = spineEl && spineEl.getAttribute('toc');
    const ncx = (ncxId && manifest[ncxId]) || Object.values(manifest).find((m) => /ncx/.test(m.type));
    if (ncx) toc = await parseNcx(await readText(ncx.path), ncx.path);
  }
  // Last resort: derive a flat TOC from the spine.
  if (!toc.length) toc = spine.map((s, i) => ({ label: 'Section ' + (i + 1), path: s.path, frag: '' }));

  return { zip, title, creator, metadata, opfPath, manifest, spine, toc, readText, readU8 };
}

function parseNav(xhtml, navPath) {
  if (!xhtml) return [];
  const doc = new DOMParser().parseFromString(xhtml, 'application/xhtml+xml');
  // The "toc" nav, or the first nav, or any list of links.
  const navs = [...doc.querySelectorAll('nav')];
  const tocNav = navs.find((n) => /toc/i.test(n.getAttribute('epub:type') || n.getAttribute('type') || '')) || navs[0] || doc;
  const out = [];
  for (const a of tocNav.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    const { path, frag } = splitFrag(href);
    out.push({ label: a.textContent.trim() || 'Untitled', path: resolvePath(navPath, path), frag });
  }
  return out;
}

function parseNcx(xml, ncxPath) {
  if (!xml) return [];
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const out = [];
  for (const np of doc.querySelectorAll('navPoint')) {
    const label = (np.querySelector('navLabel > text') || {}).textContent || '';
    const src = (np.querySelector('content') || {}).getAttribute?.('src') || '';
    if (!src) continue;
    const { path, frag } = splitFrag(src);
    out.push({ label: label.trim() || 'Untitled', path: resolvePath(ncxPath, path), frag });
  }
  return out;
}

const IMG_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', bmp: 'image/bmp' };
export function guessMime(path, fallback) {
  const ext = path.includes('.') ? path.split('.').pop().toLowerCase() : '';
  return IMG_MIME[ext] || fallback || 'application/octet-stream';
}
