// Local-asset composition controls for Adv Edit. Imported images are decoded and repainted into
// bounded PNG canvases before becoming objects or patterns, which strips metadata/active SVG
// content and keeps the durable document self-contained and network-silent.

const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_PIXELS = 4 * 1024 * 1024;
const MAX_SIDE = 4096;
const BITMAP_EXT = /\.(?:avif|bmp|gif|ico|jpe?g|png|webp)$/i;
const BITMAP_MIME = /^image\/(?:avif|bmp|gif|jpeg|png|webp|x-icon|vnd\.microsoft\.icon)$/i;
const FILTERS = new Set(['none', 'grayscale', 'invert', 'sepia', 'blur', 'brighten', 'contrast']);
const FILLS = new Set(['solid', 'linear', 'radial', 'pattern']);

function sourceSize(source) {
  return {
    width: Number(source?.naturalWidth || source?.videoWidth || source?.width || 0),
    height: Number(source?.naturalHeight || source?.videoHeight || source?.height || 0),
  };
}

function boundedCanvas(source) {
  const size = sourceSize(source);
  if (!(size.width > 0 && size.height > 0)) throw new Error('The local image has no decodable pixels.');
  const scale = Math.min(1, MAX_SIDE / size.width, MAX_SIDE / size.height, Math.sqrt(MAX_PIXELS / (size.width * size.height)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(size.width * scale));
  canvas.height = Math.max(1, Math.round(size.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('A canvas context is unavailable for this local image.');
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function decodeBlob(blob) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(blob); }
    catch { /* fall through to the browser image decoder */ }
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function dataUrlBlob(dataUrl) {
  const comma = dataUrl.indexOf(',');
  const header = dataUrl.slice(5, comma);
  const mime = header.split(';')[0] || 'image/png';
  const raw = header.includes(';base64') ? atob(dataUrl.slice(comma + 1)) : decodeURIComponent(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function assetId() {
  return globalThis.crypto?.randomUUID?.() || `asset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function clamp(value, min, max) {
  const number = Number(value);
  return Math.max(min, Math.min(max, Number.isFinite(number) ? number : min));
}

export function cropRect(attrs = {}) {
  const width = Math.max(1, Number(attrs.sourceWidth) || 1);
  const height = Math.max(1, Number(attrs.sourceHeight) || 1);
  const left = clamp(attrs.cropLeft, 0, 95);
  const top = clamp(attrs.cropTop, 0, 95);
  const right = Math.min(clamp(attrs.cropRight, 0, 95), 95 - left);
  const bottom = Math.min(clamp(attrs.cropBottom, 0, 95), 95 - top);
  return {
    x: width * left / 100,
    y: height * top / 100,
    width: Math.max(1, width * (100 - left - right) / 100),
    height: Math.max(1, height * (100 - top - bottom) / 100),
    left, top, right, bottom,
  };
}

function localBounds(node) {
  const cls = node?.getClassName?.();
  if (cls === 'Circle' || cls === 'Wedge' || cls === 'RegularPolygon') {
    const radius = Number(node.radius?.() || 1);
    return { x: -radius, y: -radius, width: radius * 2, height: radius * 2 };
  }
  if (cls === 'Ellipse') {
    const x = Number(node.radiusX?.() || 1), y = Number(node.radiusY?.() || 1);
    return { x: -x, y: -y, width: x * 2, height: y * 2 };
  }
  if (['Ring', 'Arc', 'Star'].includes(cls)) {
    const radius = Number(node.outerRadius?.() || 1);
    return { x: -radius, y: -radius, width: radius * 2, height: radius * 2 };
  }
  return { x: 0, y: 0, width: Math.max(1, Number(node?.width?.() || 1)), height: Math.max(1, Number(node?.height?.() || 1)) };
}

function fillGeometry(node, angleDegrees) {
  const box = localBounds(node);
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const radians = clamp(angleDegrees, 0, 359) * Math.PI / 180;
  const reach = Math.sqrt(box.width ** 2 + box.height ** 2) / 2;
  const dx = Math.cos(radians) * reach, dy = Math.sin(radians) * reach;
  return {
    start: { x: cx - dx, y: cy - dy },
    end: { x: cx + dx, y: cy + dy },
    center: { x: cx, y: cy },
    radius: Math.max(1, Math.max(box.width, box.height) / 2),
  };
}

export function mountAdvComposition({ Konva, tb, $, getSelected, primary, layer, snap, markDirty, addImageObject, syncToolbar }) {
  const assets = new Map();
  const pendingCache = new Set();
  let cacheFrame = 0;

  function setStatus(message, error = false) {
    const status = $('.imgv-adv-doc-status');
    if (!status) return;
    status.textContent = message;
    status.style.color = error ? 'var(--danger,#b42318)' : '';
  }

  function registerSource(source, { id = assetId(), name = 'Pasted image' } = {}) {
    const canvas = boundedCanvas(source);
    const record = {
      id,
      name: String(name || 'Local image').slice(0, 240),
      mime: 'image/png',
      width: canvas.width,
      height: canvas.height,
      dataUrl: canvas.toDataURL('image/png'),
      image: canvas,
    };
    assets.set(id, record);
    return record;
  }

  async function recordFromFile(file) {
    if (!file || file.size > MAX_FILE_BYTES) throw new Error('Local overlay images are limited to 16 MB each.');
    if (!(BITMAP_MIME.test(file.type || '') || (!(file.type || '') && BITMAP_EXT.test(file.name || '')))) {
      throw new Error('Choose a browser-decodable bitmap (PNG, JPEG, WebP, GIF, BMP, AVIF, or ICO). SVG and remote assets are intentionally excluded.');
    }
    const decoded = await decodeBlob(file);
    try { return registerSource(decoded, { name: file.name || 'Local image' }); }
    finally { decoded.close?.(); }
  }

  async function importAssets(records = []) {
    for (const source of records) {
      if (!BITMAP_MIME.test(source.mime || '') || !/^data:image\//i.test(source.dataUrl || '')) {
        throw new Error(`Overlay asset ${source.id || ''} is not a supported embedded bitmap.`);
      }
      const decoded = await decodeBlob(dataUrlBlob(source.dataUrl));
      const size = sourceSize(decoded);
      assets.get(source.id)?.image?.close?.();
      assets.set(source.id, { ...source, width: size.width, height: size.height, image: decoded });
    }
  }

  function referencedAssetIds(nodes) {
    const ids = new Set();
    const visit = (node) => {
      const asset = node?.getAttr?.('assetId'), pattern = node?.getAttr?.('patternAssetId');
      if (asset) ids.add(asset);
      if (pattern) ids.add(pattern);
      const children = node?.getChildren?.() || [];
      Array.from(children).forEach(visit);
    };
    nodes.forEach(visit);
    return ids;
  }

  function exportAssets(nodes) {
    const used = referencedAssetIds(nodes);
    return [...used].map((id) => assets.get(id)).filter(Boolean).map(({ image, ...record }) => record);
  }

  function applyCrop(node) {
    if (node?.getClassName?.() !== 'Image') return;
    const asset = assets.get(node.getAttr('assetId'));
    if (asset && node.image?.() !== asset.image) node.image(asset.image);
    const crop = cropRect({ ...node.getAttrs(), sourceWidth: asset?.width || node.getAttr('sourceWidth'), sourceHeight: asset?.height || node.getAttr('sourceHeight') });
    node.setAttrs({ sourceWidth: asset?.width || crop.width, sourceHeight: asset?.height || crop.height, cropLeft: crop.left, cropTop: crop.top, cropRight: crop.right, cropBottom: crop.bottom });
    node.crop({ x: crop.x, y: crop.y, width: crop.width, height: crop.height });
  }

  function applyFill(node) {
    if (!node?.fillPriority) return;
    const kind = FILLS.has(node.getAttr('fillKind')) ? node.getAttr('fillKind') : 'solid';
    const color1 = node.fill?.() || '#3388ff';
    const color2 = node.getAttr('fillColor2') || '#9b5cff';
    const geometry = fillGeometry(node, node.getAttr('fillAngle') || 0);
    node.setAttr('fillKind', kind);
    if (kind === 'linear') {
      node.fillPriority('linear-gradient');
      node.fillLinearGradientStartPoint(geometry.start);
      node.fillLinearGradientEndPoint(geometry.end);
      node.fillLinearGradientColorStops([0, color1, 1, color2]);
    } else if (kind === 'radial') {
      node.fillPriority('radial-gradient');
      node.fillRadialGradientStartPoint(geometry.center);
      node.fillRadialGradientEndPoint(geometry.center);
      node.fillRadialGradientStartRadius(0);
      node.fillRadialGradientEndRadius(geometry.radius);
      node.fillRadialGradientColorStops([0, color1, 1, color2]);
    } else if (kind === 'pattern') {
      const asset = assets.get(node.getAttr('patternAssetId'));
      if (asset) {
        node.fillPatternImage(asset.image);
        node.fillPatternRepeat('repeat');
        if (!node.getAttr('fillPatternScaleX')) {
          const scale = Math.min(1, 96 / Math.max(asset.width, asset.height));
          node.fillPatternScale({ x: scale, y: scale });
        }
        node.fillPriority('pattern');
      } else node.fillPriority('color');
    } else node.fillPriority('color');
  }

  function filterFunction(kind) {
    return ({ grayscale: Konva.Filters.Grayscale, invert: Konva.Filters.Invert, sepia: Konva.Filters.Sepia, blur: Konva.Filters.Blur, brighten: Konva.Filters.Brighten, contrast: Konva.Filters.Contrast })[kind];
  }

  function refreshNode(node) {
    if (!node || node.isDestroyed?.()) return;
    const kind = FILTERS.has(node.getAttr?.('filterKind')) ? node.getAttr('filterKind') : 'none';
    node.clearCache?.();
    node.filters?.([]);
    if (kind === 'none') return;
    const fn = filterFunction(kind);
    if (!fn) return;
    const amount = clamp(node.getAttr('filterValue'), -100, 100);
    if (kind === 'blur') node.blurRadius(Math.max(0, amount));
    if (kind === 'brighten') node.brightness(amount / 100);
    if (kind === 'contrast') node.contrast(amount);
    try { node.cache(); node.filters([fn]); }
    catch { node.clearCache?.(); node.filters?.([]); }
  }

  function scheduleRefresh(node) {
    if (!node || (node.getAttr?.('filterKind') || 'none') === 'none') return;
    pendingCache.add(node);
    if (cacheFrame) return;
    cacheFrame = requestAnimationFrame(() => {
      cacheFrame = 0;
      pendingCache.forEach(refreshNode);
      pendingCache.clear();
      layer.batchDraw();
    });
  }

  function wireNode(node) {
    const attrs = ['fill', 'stroke', 'strokeWidth', 'width', 'height', 'radius', 'radiusX', 'radiusY', 'innerRadius', 'outerRadius', 'points', 'text', 'fontSize', 'fontFamily', 'padding', 'crop', 'image', 'shadowBlur', 'cornerRadius'];
    const descendants = [];
    const collect = (item) => {
      descendants.push(item);
      Array.from(item?.getChildren?.() || []).forEach(collect);
    };
    collect(node);
    descendants.forEach((child) => {
      child.off?.('.fvComposition');
      child.on?.(attrs.map((attr) => `${attr}Change.fvComposition`).join(' '), () => scheduleRefresh(node));
    });
  }

  function applyRuntime(node) {
    if (!node) return;
    if (node.getClassName?.() === 'Image') applyCrop(node);
    applyFill(node);
    Array.from(node.getChildren?.() || []).forEach(applyRuntime);
    refreshNode(node);
    wireNode(node);
  }

  function mutateSelected(mutate, predicate = () => true) {
    const nodes = getSelected().filter(predicate);
    if (!nodes.length) return;
    snap();
    nodes.forEach((node) => { mutate(node); applyRuntime(node); });
    layer.draw();
    markDirty();
    syncToolbar();
  }

  function sync(node, { fillable = false } = {}) {
    const isImage = node?.getClassName?.() === 'Image';
    tb.querySelectorAll('.imgv-adv-imgctl').forEach((element) => { element.style.display = isImage ? '' : 'none'; });
    if (isImage) {
      const crop = cropRect(node.getAttrs());
      $('.imgv-adv-cropl').value = Math.round(crop.left);
      $('.imgv-adv-cropt').value = Math.round(crop.top);
      $('.imgv-adv-cropr').value = Math.round(crop.right);
      $('.imgv-adv-cropb').value = Math.round(crop.bottom);
      $('.imgv-adv-framec').value = node.stroke?.() || '#ffffff';
      $('.imgv-adv-framew').value = Math.round(node.strokeWidth?.() || 0);
      $('.imgv-adv-framecorner').value = Math.round(node.cornerRadius?.() || 0);
    }
    if (node) {
      const kind = FILTERS.has(node.getAttr('filterKind')) ? node.getAttr('filterKind') : 'none';
      $('.imgv-adv-filter').value = kind;
      $('.imgv-adv-filteramount').value = node.getAttr('filterValue') ?? (kind === 'blur' ? 12 : 20);
      $('.imgv-adv-filtervalue').style.display = ['blur', 'brighten', 'contrast'].includes(kind) ? '' : 'none';
      const fillKind = FILLS.has(node.getAttr('fillKind')) ? node.getAttr('fillKind') : 'solid';
      $('.imgv-adv-fillkind').value = fillKind;
      $('.imgv-adv-fill2').value = node.getAttr('fillColor2') || '#9b5cff';
      $('.imgv-adv-fillangle').value = Math.round(node.getAttr('fillAngle') || 0);
      tb.querySelectorAll('.imgv-adv-filldetail').forEach((element) => { element.style.display = fillable && ['linear', 'radial'].includes(fillKind) ? '' : 'none'; });
      $('.imgv-adv-pattern').style.display = fillable && fillKind === 'pattern' ? '' : 'none';
      const pattern = assets.get(node.getAttr('patternAssetId'));
      $('.imgv-adv-pattern').textContent = pattern ? `Pattern: ${pattern.name.slice(0, 18)}` : 'Pattern…';
    }
  }

  $('.imgv-adv-image').addEventListener('click', () => $('.imgv-adv-image-file').click());
  $('.imgv-adv-image-file').addEventListener('change', async () => {
    const file = $('.imgv-adv-image-file').files?.[0];
    $('.imgv-adv-image-file').value = '';
    if (!file) return;
    try { const asset = await recordFromFile(file); addImageObject(asset); setStatus(`Added ${asset.name}.`); }
    catch (error) { setStatus(error.message || String(error), true); }
  });
  $('.imgv-adv-pattern').addEventListener('click', () => $('.imgv-adv-pattern-file').click());
  $('.imgv-adv-pattern-file').addEventListener('change', async () => {
    const file = $('.imgv-adv-pattern-file').files?.[0];
    $('.imgv-adv-pattern-file').value = '';
    if (!file) return;
    try {
      const asset = await recordFromFile(file);
      mutateSelected((node) => { node.setAttrs({ patternAssetId: asset.id, fillKind: 'pattern' }); }, (node) => !['Image', 'Line', 'Arrow', 'Group', 'Label'].includes(node.getClassName?.()));
      setStatus(`Embedded ${asset.name} as a local pattern.`);
    } catch (error) { setStatus(error.message || String(error), true); }
  });

  const cropInputs = [['.imgv-adv-cropl', 'cropLeft'], ['.imgv-adv-cropt', 'cropTop'], ['.imgv-adv-cropr', 'cropRight'], ['.imgv-adv-cropb', 'cropBottom']];
  cropInputs.forEach(([selector, attr]) => $(selector).addEventListener('change', () => mutateSelected((node) => node.setAttr(attr, clamp($(selector).value, 0, 95)), (node) => node.getClassName?.() === 'Image')));
  $('.imgv-adv-cropreset').addEventListener('click', () => mutateSelected((node) => node.setAttrs({ cropLeft: 0, cropTop: 0, cropRight: 0, cropBottom: 0 }), (node) => node.getClassName?.() === 'Image'));
  $('.imgv-adv-framec').addEventListener('input', () => mutateSelected((node) => node.stroke($('.imgv-adv-framec').value), (node) => node.getClassName?.() === 'Image'));
  $('.imgv-adv-framew').addEventListener('change', () => mutateSelected((node) => node.strokeWidth(clamp($('.imgv-adv-framew').value, 0, 100)), (node) => node.getClassName?.() === 'Image'));
  $('.imgv-adv-framecorner').addEventListener('change', () => mutateSelected((node) => node.cornerRadius(clamp($('.imgv-adv-framecorner').value, 0, 500)), (node) => node.getClassName?.() === 'Image'));
  $('.imgv-adv-fillkind').addEventListener('change', () => mutateSelected((node) => node.setAttr('fillKind', $('.imgv-adv-fillkind').value)));
  $('.imgv-adv-fill2').addEventListener('input', () => mutateSelected((node) => node.setAttr('fillColor2', $('.imgv-adv-fill2').value)));
  $('.imgv-adv-fillangle').addEventListener('change', () => mutateSelected((node) => node.setAttr('fillAngle', clamp($('.imgv-adv-fillangle').value, 0, 359))));
  $('.imgv-adv-filter').addEventListener('change', () => mutateSelected((node) => node.setAttr('filterKind', $('.imgv-adv-filter').value)));
  $('.imgv-adv-filteramount').addEventListener('input', () => mutateSelected((node) => node.setAttr('filterValue', clamp($('.imgv-adv-filteramount').value, -100, 100))));

  return {
    registerSource,
    importAssets,
    exportAssets,
    hasAsset: (id) => assets.has(id),
    applyRuntime,
    refreshNode,
    wireNode,
    sync,
    setStatus,
    destroy() {
      if (cacheFrame) cancelAnimationFrame(cacheFrame);
      assets.forEach((asset) => asset.image?.close?.());
      assets.clear();
    },
  };
}
