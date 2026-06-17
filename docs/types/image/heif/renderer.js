function vendorUrl(filename) {
  return new URL(`../../../vendor/${filename}`, import.meta.url).href;
}

async function loadLibheif() {
  if (window._libheifReady) return;

  const url = vendorUrl('libheif.js');
  if (!document.querySelector(`script[src="${url}"]`)) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load libheif.js'));
      document.head.appendChild(s);
    });
  }

  // libheif uses instantiateSync so by script onload it should be ready,
  // but poll briefly in case there's a small async gap
  await new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      if (window.libheif && window.libheif.HeifDecoder) {
        resolve();
        return;
      }
      attempts++;
      if (attempts > 100) {
        reject(new Error('libheif did not initialize (HeifDecoder not found)'));
        return;
      }
      setTimeout(check, 50);
    };
    check();
  });

  window._libheifReady = true;
}

function decodeImageToCanvas(image) {
  return new Promise((resolve, reject) => {
    const width = image.get_width();
    const height = image.get_height();
    const imageData = new ImageData(width, height);
    image.display(imageData, (result) => {
      if (!result) {
        reject(new Error('HEIF display() failed'));
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').putImageData(imageData, 0, 0);
      resolve({ canvas, width, height });
    });
  });
}

function makeSpinner() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;align-items:center;justify-content:center;padding:40px;font-size:14px;color:var(--fg-muted,#888)';
  wrap.textContent = 'Decoding HEIC…';
  return wrap;
}

function makeNote(text) {
  const note = document.createElement('div');
  note.style.cssText = 'margin-top:8px;padding:6px 10px;font-size:12px;color:var(--fg-muted,#888);border-left:3px solid var(--border,#ddd)';
  note.textContent = text;
  return note;
}

export async function render(intake, _ctx) {
  const blobUrls = [];

  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:16px;max-width:100%;box-sizing:border-box;';

  const spinner = makeSpinner();
  wrap.appendChild(spinner);

  try {
    await loadLibheif();

    const decoder = new window.libheif.HeifDecoder();
    const images = decoder.decode(intake.bytes);

    if (!images || images.length === 0) {
      throw new Error('No images found in file');
    }

    wrap.removeChild(spinner);

    // Decode primary image (first one)
    const { canvas: primaryCanvas, width, height } = await decodeImageToCanvas(images[0]);

    // Info bar
    const info = document.createElement('div');
    info.style.cssText = 'margin-bottom:10px;font-size:13px;color:var(--fg-muted,#888)';
    const bpp = (() => {
      try { return images[0].get_bits_per_pixel(0); } catch { return null; }
    })();
    let infoText = `${width} × ${height}`;
    if (bpp != null) infoText += ` · ${bpp} bpp`;
    if (images.length > 1) infoText += ` · ${images.length} images in file`;
    info.textContent = infoText;
    wrap.appendChild(info);

    // Primary canvas — scale to fit container
    primaryCanvas.style.cssText = 'max-width:100%;max-height:70vh;display:block;border-radius:4px;';
    wrap.appendChild(primaryCanvas);

    // Download button
    const dlBtn = document.createElement('button');
    dlBtn.textContent = 'Download as PNG';
    dlBtn.style.cssText = 'margin-top:10px;padding:6px 14px;font-size:13px;cursor:pointer;border-radius:4px;border:1px solid var(--border,#ccc);background:var(--bg,#fff);color:var(--fg,#000)';
    dlBtn.onclick = () => {
      primaryCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        blobUrls.push(url);
        const a = document.createElement('a');
        a.href = url;
        const base = intake.filename?.replace(/\.[^.]+$/, '') || 'image';
        a.download = base + '.png';
        a.click();
      }, 'image/png');
    };
    wrap.appendChild(dlBtn);

    // Thumbnail strip for multi-image files (burst shots, thumbnails)
    if (images.length > 1) {
      const strip = document.createElement('div');
      strip.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:14px;';

      const thumbLabel = document.createElement('div');
      thumbLabel.style.cssText = 'width:100%;font-size:12px;color:var(--fg-muted,#888);margin-bottom:4px';
      thumbLabel.textContent = `All ${images.length} images:`;
      strip.appendChild(thumbLabel);

      for (let i = 0; i < images.length; i++) {
        try {
          const { canvas: tc, width: tw, height: th } = await decodeImageToCanvas(images[i]);
          const THUMB_H = 80;
          const scale = THUMB_H / th;
          const thumb = document.createElement('canvas');
          thumb.width = Math.round(tw * scale);
          thumb.height = THUMB_H;
          thumb.style.cssText = 'border-radius:3px;border:2px solid ' + (i === 0 ? 'var(--accent,#4a9eff)' : 'transparent');
          thumb.title = `Image ${i + 1}: ${tw}×${th}`;
          thumb.getContext('2d').drawImage(tc, 0, 0, thumb.width, thumb.height);
          thumb.onclick = () => {
            const ctx = primaryCanvas.getContext('2d');
            primaryCanvas.width = tw;
            primaryCanvas.height = th;
            ctx.drawImage(tc, 0, 0);
            info.textContent = `${tw} × ${th} (image ${i + 1} of ${images.length})`;
            for (const t of strip.querySelectorAll('canvas')) {
              t.style.borderColor = 'transparent';
            }
            thumb.style.borderColor = 'var(--accent,#4a9eff)';
          };
          strip.appendChild(thumb);
        } catch {
          // skip undecodable sub-images
        }
      }
      wrap.appendChild(strip);
    }

    wrap.appendChild(makeNote('HEIC/HEIF decoding via libheif (~800KB). EXIF/GPS metadata not extracted.'));

  } catch (err) {
    wrap.textContent = '';
    const errBox = document.createElement('div');
    errBox.style.cssText = 'padding:16px;color:var(--error,#c00);font-size:13px;';
    errBox.textContent = 'Could not decode HEIC/HEIF file: ' + (err?.message || String(err));
    wrap.appendChild(errBox);
  }

  return {
    parentNode: wrap,
    revoke() {
      for (const u of blobUrls) URL.revokeObjectURL(u);
      blobUrls.length = 0;
    },
  };
}
