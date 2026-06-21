// Standalone ASCII Studio harness. Reuses the exact same self-contained modules
// the file viewer uses (../../types/image/ascii/*) — image conversion via the
// studio, live conversion via the webcam consumer. No build step: open
// index.html directly.

import { mountAsciiStudio } from '../../types/image/ascii/studio.js';

const $ = (id) => document.getElementById(id);
let studio = null;
let webcamMounted = false;

function ensureStudio() {
  if (!studio) studio = mountAsciiStudio($('studio'), { filename: 'image' });
  return studio;
}

async function loadFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const bytes = new Uint8Array(await file.arrayBuffer());
  ensureStudio().setImage({ bytes, mime: file.type });
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

// Tabs
function show(view) {
  const isImg = view === 'image';
  $('image-view').hidden = !isImg;
  $('webcam-view').hidden = isImg;
  $('tab-image').classList.toggle('active', isImg);
  $('tab-webcam').classList.toggle('active', !isImg);
  if (!isImg && !webcamMounted) {
    webcamMounted = true;
    import('../../types/image/ascii/webcam.js').then(({ mountAsciiWebcam }) => mountAsciiWebcam($('webcam'), {}));
  }
}
$('tab-image').addEventListener('click', () => show('image'));
$('tab-webcam').addEventListener('click', () => show('webcam'));

// File input + drag/drop
$('pick').addEventListener('click', () => $('file').click());
$('sample').addEventListener('click', loadSample);
$('file').addEventListener('change', (e) => loadFile(e.target.files[0]));
const drop = $('drop');
['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('over')));
drop.addEventListener('drop', (e) => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); });

loadSample();
