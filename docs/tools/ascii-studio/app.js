// Standalone ASCII Studio harness. Reuses the exact same self-contained modules
// the file viewer uses (../../types/image/ascii/*). Image is the single view;
// the webcam is reached only through the studio's own 📷 Camera toolbar button
// (which lazy-loads webcam.js), exactly like the in-viewer studio. No build
// step: open index.html directly.

import { mountAsciiStudio } from '../../types/image/ascii/studio.js';

const $ = (id) => document.getElementById(id);
let studio = null;

export const SAMPLE_IMAGES = Object.freeze([
  { name: 'sample.png', label: 'PNG' },
  { name: 'sample.jpg', label: 'JPEG' },
  { name: 'sample.jpeg', label: 'JPEG (alternate)' },
  { name: 'sample.gif', label: 'GIF' },
  { name: 'sample.webp', label: 'WebP' },
  { name: 'sample.bmp', label: 'Bitmap' },
  { name: 'sample.avif', label: 'AVIF' },
]);

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
  const mime = imageMimeFor(file?.name, file?.type);
  if (!file || !mime) return false;
  const bytes = new Uint8Array(await file.arrayBuffer());
  return ensureStudio().setImage({ bytes, mime, filename: file.name });
}

let sampleRequest = 0;
let sampleAbort = null;
async function loadExampleSample(name) {
  const request = ++sampleRequest;
  sampleAbort?.abort();
  sampleAbort = new AbortController();
  const clean = String(name || '').replace(/^\/?docs\/examples\//, '').replace(/^\/?examples\//, '');
  if (!clean || clean.includes('..') || clean.includes('\\') || !/^[a-zA-Z0-9_./ -]+$/.test(clean)) return false;
  const res = await fetch('../../examples/' + clean, { signal: sampleAbort.signal }).catch(() => null);
  if (request !== sampleRequest) return false;
  if (!res?.ok) return false;
  const blob = await res.blob();
  const mime = imageMimeFor(clean, blob.type);
  if (!mime) return false; // fetched OK but not a recognizable image
  const loaded = await loadFile(new File([blob], clean.split('/').pop() || 'sample', { type: mime }));
  return request === sampleRequest && !!loaded;
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
  ensureStudio().setImage({ source: c, filename: 'sample.png' });
}

const sampleDialog = $('sample-dialog');
const sampleGrid = $('sample-grid');
const sampleError = $('sample-error');
for (const sample of SAMPLE_IMAGES) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sample-card';
  button.dataset.sample = sample.name;
  const preview = document.createElement('img');
  preview.src = '../../examples/' + sample.name;
  preview.alt = '';
  preview.loading = 'lazy';
  const label = document.createElement('span');
  label.textContent = `${sample.label} · ${sample.name}`;
  button.append(preview, label);
  button.addEventListener('click', async () => {
    sampleError.textContent = '';
    sampleGrid.querySelectorAll('button').forEach((entry) => { entry.disabled = true; });
    button.setAttribute('aria-busy', 'true');
    const ok = await loadExampleSample(sample.name).catch(() => false);
    sampleGrid.querySelectorAll('button').forEach((entry) => { entry.disabled = false; });
    button.removeAttribute('aria-busy');
    if (ok) sampleDialog.close();
    else sampleError.textContent = `Could not load ${sample.name}. The current image was kept.`;
  });
  sampleGrid.append(button);
}

function openSampleGallery() {
  sampleError.textContent = '';
  if (typeof sampleDialog.showModal === 'function') sampleDialog.showModal();
  else sampleDialog.setAttribute('open', '');
  sampleGrid.querySelector('button')?.focus();
}

// File input + drag/drop
$('pick').addEventListener('click', () => $('file').click());
$('sample').addEventListener('click', openSampleGallery);
$('sample-close').addEventListener('click', () => sampleDialog.close());
$('file').addEventListener('change', (e) => loadFile(e.target.files[0]));
const drop = $('drop');
['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('over')));
drop.addEventListener('drop', (e) => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); });

loadSample();
const initialSample = new URLSearchParams(location.search).get('sample');
if (initialSample) {
  loadExampleSample(initialSample).then((ok) => {
    if (!ok) console.warn('ASCII Studio: sample "' + initialSample + '" could not be loaded; keeping the generated placeholder.');
  });
}
