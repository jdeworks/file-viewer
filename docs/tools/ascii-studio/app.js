// Standalone ASCII Studio harness. Reuses the exact same self-contained modules
// the file viewer uses (../../types/image/ascii/*). Image is the single view;
// the webcam is reached only through the studio's own 📷 Camera toolbar button
// (which lazy-loads webcam.js), exactly like the in-viewer studio. No build
// step: open index.html directly.

import { mountAsciiStudio } from '../../types/image/ascii/studio.js';

const $ = (id) => document.getElementById(id);
let studio = null;

function ensureStudio() {
  if (!studio) studio = mountAsciiStudio($('studio'), { filename: 'image' });
  return studio;
}

// Some hosts/CDNs serve images with a generic content-type (application/octet-stream),
// which would make a strict `image/*` check reject a perfectly valid file. The studio
// decodes bytes via createImageBitmap/Image (which sniff content, not the declared
// MIME), so recover an image MIME from the extension when the server's type is missing.
const IMAGE_EXT_MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', bmp: 'image/bmp', avif: 'image/avif', svg: 'image/svg+xml',
  tif: 'image/tiff', tiff: 'image/tiff', ico: 'image/x-icon',
};
function imageMimeFor(name, declared) {
  if (declared && declared.startsWith('image/')) return declared;
  const ext = (String(name).split('.').pop() || '').toLowerCase();
  return IMAGE_EXT_MIME[ext] || '';
}

async function loadFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const bytes = new Uint8Array(await file.arrayBuffer());
  ensureStudio().setImage({ bytes, mime: file.type });
}

async function loadExampleSample(name) {
  const clean = String(name || '').replace(/^\/?docs\/examples\//, '').replace(/^\/?examples\//, '');
  if (!clean || clean.includes('..') || clean.includes('\\')) return false;
  const res = await fetch('../../examples/' + clean).catch(() => null);
  if (!res?.ok) return false;
  const blob = await res.blob();
  const mime = imageMimeFor(clean, blob.type);
  if (!mime) return false; // fetched OK but not a recognizable image
  await loadFile(new File([blob], clean.split('/').pop() || 'sample', { type: mime }));
  return true;
}

// A tiny generated test pattern so the page is useful with no upload.
function loadSample() {
  const c = document.createElement('canvas');
  c.width = 320; c.height = 320;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 320, 320);
  grad.addColorStop(0, '#1b2845'); grad.addColorStop(1, '#ff7e5f');
  g.fillStyle = grad; g.fillRect(0, 0, 320, 320);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(160, 130, 70, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#222'; g.font = 'bold 48px sans-serif'; g.textAlign = 'center';
  g.fillText('ASCII', 160, 260);
  ensureStudio().setImage({ source: c });
}

// File input + drag/drop
$('pick').addEventListener('click', () => $('file').click());
$('sample').addEventListener('click', loadSample);
$('file').addEventListener('change', (e) => loadFile(e.target.files[0]));
const drop = $('drop');
['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('over')));
drop.addEventListener('drop', (e) => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); });

const initialSample = new URLSearchParams(location.search).get('sample');
if (initialSample) {
  loadExampleSample(initialSample).then((ok) => {
    if (!ok) { console.warn('ASCII Studio: sample "' + initialSample + '" could not be loaded; showing the generated placeholder.'); loadSample(); }
  });
} else loadSample();
