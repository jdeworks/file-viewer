import { loadGlobal, vendor } from '../../../core/script-loader.js';

export async function render(intake, _ctx) {
  const wrap = document.createElement('div');
  wrap.style.cssText = [
    'display:flex', 'flex-direction:column', 'align-items:center',
    'justify-content:center', 'min-height:200px', 'padding:24px',
    'box-sizing:border-box', 'background:var(--bg-1,#1e1e1e)',
    'color:var(--fg,#ccc)', 'font-family:var(--font-ui,sans-serif)',
  ].join(';');

  let JSZip;
  try {
    JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  } catch (e) {
    wrap.textContent = 'Could not load ZIP library: ' + e.message;
    return { parentNode: wrap, revoke() {} };
  }

  let zip;
  try {
    zip = await JSZip.loadAsync(intake.bytes);
  } catch (e) {
    wrap.textContent = 'Could not read Procreate archive: ' + e.message;
    return { parentNode: wrap, revoke() {} };
  }

  // Find thumbnail — try common paths
  const thumbnailPaths = ['thumbnail.png', 'QuickLook/Thumbnail.png'];
  let thumbFile = null;
  for (const p of thumbnailPaths) {
    const candidate = zip.file(p) || zip.file(p.toLowerCase()) || zip.file(p.toUpperCase());
    if (candidate) { thumbFile = candidate; break; }
  }

  // Case-insensitive fallback scan
  if (!thumbFile) {
    for (const name of Object.keys(zip.files)) {
      if (/thumbnail\.png$/i.test(name) && !zip.files[name].dir) {
        thumbFile = zip.files[name];
        break;
      }
    }
  }

  if (!thumbFile) {
    const msg = document.createElement('div');
    msg.style.cssText = 'text-align:center;opacity:0.7;padding:32px;';
    msg.textContent = 'Procreate thumbnail not found in archive';
    wrap.appendChild(msg);
    return { parentNode: wrap, revoke() {} };
  }

  let thumbBytes;
  try {
    thumbBytes = await thumbFile.async('arraybuffer');
  } catch (e) {
    wrap.textContent = 'Could not read thumbnail: ' + e.message;
    return { parentNode: wrap, revoke() {} };
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(new Blob([thumbBytes], { type: 'image/png' }));
  } catch (e) {
    wrap.textContent = 'Could not decode thumbnail image: ' + e.message;
    return { parentNode: wrap, revoke() {} };
  }

  const W = bitmap.width;
  const H = bitmap.height;

  // Container for checkerboard + image
  const imgWrap = document.createElement('div');
  imgWrap.style.cssText = [
    'position:relative', 'display:inline-block',
    'max-width:100%', 'max-height:70vh',
    'border-radius:6px', 'overflow:hidden',
    'box-shadow:0 4px 24px rgba(0,0,0,0.5)',
  ].join(';');

  // Checkerboard background canvas
  const checker = document.createElement('canvas');
  checker.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  const tileSize = 12;
  checker.width = tileSize * 2;
  checker.height = tileSize * 2;
  const cc = checker.getContext('2d');
  cc.fillStyle = '#888';
  cc.fillRect(0, 0, tileSize * 2, tileSize * 2);
  cc.fillStyle = '#bbb';
  cc.fillRect(0, 0, tileSize, tileSize);
  cc.fillRect(tileSize, tileSize, tileSize, tileSize);

  // Main image canvas
  const imgCanvas = document.createElement('canvas');
  imgCanvas.width = W;
  imgCanvas.height = H;
  imgCanvas.style.cssText = [
    'position:relative', 'display:block',
    'max-width:min(100%,800px)', 'max-height:70vh',
    'width:auto', 'height:auto',
    'image-rendering:auto',
  ].join(';');
  imgCanvas.getContext('2d').drawImage(bitmap, 0, 0);

  imgWrap.style.backgroundImage = `url(${checker.toDataURL()})`;
  imgWrap.style.backgroundSize = (tileSize * 2) + 'px ' + (tileSize * 2) + 'px';

  imgWrap.appendChild(imgCanvas);

  const caption = document.createElement('div');
  caption.style.cssText = [
    'margin-top:12px', 'font-size:12px', 'opacity:0.55',
    'letter-spacing:0.03em', 'text-align:center',
  ].join(';');
  caption.textContent = 'Procreate · thumbnail preview · ' + W + '×' + H + ' px';

  wrap.appendChild(imgWrap);
  wrap.appendChild(caption);

  return {
    parentNode: wrap,
    revoke() { bitmap.close?.(); },
  };
}
