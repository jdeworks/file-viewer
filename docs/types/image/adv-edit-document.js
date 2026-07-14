// Durable, renderer-independent document contract for the advanced image overlay. Konva remains
// an implementation detail: documents name supported object types and a bounded set of portable
// attributes, plus explicit local image assets. Version 1 can also ingest the old Layer.toJSON()
// snapshots so existing in-memory/history integrations have a migration path.

export const OVERLAY_FORMAT = 'file-viewer/image-overlay';
export const OVERLAY_VERSION = 1;

const MAX_OBJECTS = 500;
const MAX_DEPTH = 8;
const MAX_ASSETS = 64;
const MAX_ASSET_CHARS = 24 * 1024 * 1024;
const MAX_TOTAL_ASSET_CHARS = 64 * 1024 * 1024;

export const OBJECT_TYPES = Object.freeze([
  'Rect', 'Circle', 'Ellipse', 'Ring', 'Wedge', 'Arc', 'Line', 'Arrow',
  'RegularPolygon', 'Star', 'Label', 'Text', 'Tag', 'Group', 'Image',
]);

const ATTRS = new Set([
  // Identity / interaction / transform.
  'name', 'layerName', 'locked', 'x', 'y', 'width', 'height', 'scaleX', 'scaleY',
  'rotation', 'skewX', 'skewY', 'offsetX', 'offsetY', 'opacity', 'visible', 'draggable',
  'globalCompositeOperation',
  // Shape/text appearance.
  'fill', 'stroke', 'strokeWidth', 'dash', 'lineCap', 'lineJoin', 'hitStrokeWidth',
  'shadowBlur', 'shadowColor', 'shadowOpacity', 'shadowOffsetX', 'shadowOffsetY',
  'cornerRadius', 'radius', 'radiusX', 'radiusY', 'innerRadius', 'outerRadius',
  'angle', 'clockwise', 'sides', 'numPoints', 'points', 'closed', 'tension',
  'pointerLength', 'pointerWidth', 'pointerAtBeginning', 'pointerAtEnding',
  'text', 'fontFamily', 'fontSize', 'fontStyle', 'textDecoration', 'align',
  'verticalAlign', 'lineHeight', 'wrap', 'padding',
  // Portable fill descriptors. Runtime HTMLImageElement/canvas attributes are never included.
  'fillPriority', 'fillLinearGradientStartPoint', 'fillLinearGradientEndPoint',
  'fillLinearGradientColorStops', 'fillRadialGradientStartPoint',
  'fillRadialGradientEndPoint', 'fillRadialGradientStartRadius',
  'fillRadialGradientEndRadius', 'fillRadialGradientColorStops', 'fillPatternRepeat',
  'fillPatternScaleX', 'fillPatternScaleY', 'fillPatternOffsetX', 'fillPatternOffsetY',
  // File Viewer composition semantics.
  'assetId', 'patternAssetId', 'fillKind', 'fillColor2', 'fillAngle',
  'filterKind', 'filterValue', 'cropLeft', 'cropTop', 'cropRight', 'cropBottom',
  'sourceWidth', 'sourceHeight',
]);

const SAFE_COMPOSITES = new Set([
  'source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge',
  'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion',
]);
const SAFE_FILTERS = new Set(['none', 'grayscale', 'invert', 'sepia', 'blur', 'brighten', 'contrast']);
const SAFE_FILLS = new Set(['solid', 'linear', 'radial', 'pattern']);

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function portableValue(value, depth = 0) {
  if (depth > 4) return undefined;
  if (value == null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (Array.isArray(value)) {
    const output = value.slice(0, 4096).map((item) => portableValue(item, depth + 1));
    return output.some((item) => item === undefined) ? undefined : output;
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const output = {};
    for (const [key, item] of Object.entries(value).slice(0, 64)) {
      const clean = portableValue(item, depth + 1);
      if (clean !== undefined) output[key] = clean;
    }
    return output;
  }
  return undefined;
}

function cleanAttrs(source = {}, { topLevel = false } = {}) {
  const attrs = {};
  for (const [key, value] of Object.entries(source || {})) {
    if (!ATTRS.has(key)) continue;
    const clean = portableValue(value);
    if (clean !== undefined) attrs[key] = clean;
  }
  if (topLevel) attrs.name = 'obj';
  else if (typeof attrs.name === 'string' && attrs.name.includes('obj')) delete attrs.name;
  if (!SAFE_COMPOSITES.has(attrs.globalCompositeOperation)) attrs.globalCompositeOperation = 'source-over';
  if (!SAFE_FILTERS.has(attrs.filterKind)) attrs.filterKind = 'none';
  if (!SAFE_FILLS.has(attrs.fillKind)) attrs.fillKind = 'solid';
  return attrs;
}

function nodeChildren(node) {
  const children = typeof node?.getChildren === 'function' ? node.getChildren() : node?.children;
  if (!children) return [];
  return Array.isArray(children) ? children : Array.from(children);
}

export function overlayObjectFromNode(node, depth = 0) {
  if (!node || depth > MAX_DEPTH) return null;
  const type = node.getClassName?.() || node.className || node.type;
  if (!OBJECT_TYPES.includes(type)) return null;
  const attrs = cleanAttrs(node.getAttrs?.() || node.attrs || {}, { topLevel: depth === 0 });
  const children = nodeChildren(node)
    .map((child) => overlayObjectFromNode(child, depth + 1))
    .filter(Boolean);
  return { type, attrs, ...(children.length ? { children } : {}) };
}

function normalizeObject(input, depth, count) {
  if (!input || typeof input !== 'object' || depth > MAX_DEPTH) throw new Error('Overlay object nesting is too deep.');
  const type = input.type || input.className;
  if (!OBJECT_TYPES.includes(type)) throw new Error(`Unsupported overlay object type: ${String(type || 'unknown')}.`);
  count.value += 1;
  if (count.value > MAX_OBJECTS) throw new Error(`Overlay documents are limited to ${MAX_OBJECTS} objects.`);
  const children = (input.children || []).map((child) => normalizeObject(child, depth + 1, count));
  return { type, attrs: cleanAttrs(input.attrs, { topLevel: depth === 0 }), ...(children.length ? { children } : {}) };
}

function normalizeAsset(asset) {
  const id = String(asset?.id || '').slice(0, 120);
  const dataUrl = String(asset?.dataUrl || '');
  if (!id) throw new Error('Overlay asset is missing an id.');
  if (!/^data:image\/(?:avif|bmp|gif|jpeg|png|webp|x-icon|vnd\.microsoft\.icon)(?:;[^,]*)?,/i.test(dataUrl)) {
    throw new Error(`Overlay asset ${id} is not a supported embedded image data URL (bitmap formats only).`);
  }
  if (dataUrl.length > MAX_ASSET_CHARS) throw new Error(`Overlay asset ${id} exceeds the 24 MB document limit.`);
  return {
    id,
    name: String(asset?.name || 'local image').slice(0, 240),
    mime: String(asset?.mime || dataUrl.slice(5, dataUrl.indexOf(';') > 0 ? dataUrl.indexOf(';') : dataUrl.indexOf(','))).slice(0, 120),
    width: Math.max(1, Math.round(finite(asset?.width, 1))),
    height: Math.max(1, Math.round(finite(asset?.height, 1))),
    dataUrl,
  };
}

function normalizeCurrentDocument(input) {
  if (Number(input.version) !== OVERLAY_VERSION) {
    throw new Error(`Unsupported overlay document version ${String(input.version)}; this viewer supports version ${OVERLAY_VERSION}.`);
  }
  const count = { value: 0 };
  const objects = (input.objects || []).map((object) => normalizeObject(object, 0, count));
  const assets = (input.assets || []).map(normalizeAsset);
  if (assets.length > MAX_ASSETS) throw new Error(`Overlay documents are limited to ${MAX_ASSETS} embedded assets.`);
  if (assets.reduce((sum, asset) => sum + asset.dataUrl.length, 0) > MAX_TOTAL_ASSET_CHARS) {
    throw new Error('Overlay embedded assets exceed the 64 MB document limit.');
  }
  const ids = new Set();
  for (const asset of assets) {
    if (ids.has(asset.id)) throw new Error(`Duplicate overlay asset id: ${asset.id}.`);
    ids.add(asset.id);
  }
  return {
    format: OVERLAY_FORMAT,
    version: OVERLAY_VERSION,
    canvas: {
      width: Math.max(1, Math.round(finite(input.canvas?.width, 1))),
      height: Math.max(1, Math.round(finite(input.canvas?.height, 1))),
    },
    viewport: {
      width: Math.max(1, Math.round(finite(input.viewport?.width, input.canvas?.width || 1))),
      height: Math.max(1, Math.round(finite(input.viewport?.height, input.canvas?.height || 1))),
    },
    objects,
    assets,
  };
}

function legacyRoot(input) {
  if (input?.className === 'Stage') return (input.children || []).find((child) => child.className === 'Layer') || input;
  return input;
}

function migrateLegacyKonva(input) {
  const root = legacyRoot(input);
  if (!root || !['Layer', 'Stage'].includes(root.className)) return null;
  const count = { value: 0 };
  const objects = (root.children || [])
    .filter((child) => child?.className !== 'Transformer' && String(child?.attrs?.name || '').includes('obj'))
    .map((child) => normalizeObject({ type: child.className, attrs: child.attrs, children: child.children }, 0, count));
  return {
    format: OVERLAY_FORMAT,
    version: OVERLAY_VERSION,
    canvas: { width: 1, height: 1 },
    viewport: { width: 1, height: 1 },
    objects,
    assets: [],
  };
}

export function migrateOverlayDocument(input) {
  let parsed = input;
  if (typeof input === 'string') {
    try { parsed = JSON.parse(input); }
    catch { throw new Error('Overlay document is not valid JSON.'); }
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Overlay document must be a JSON object.');
  if (parsed.format === OVERLAY_FORMAT) return normalizeCurrentDocument(parsed);
  const migrated = migrateLegacyKonva(parsed);
  if (migrated) return migrated;
  throw new Error('This is neither a File Viewer overlay document nor a supported legacy Konva layer snapshot.');
}

export function createOverlayDocument({ nodes = [], assets = [], canvasWidth = 1, canvasHeight = 1, viewportWidth = 1, viewportHeight = 1 } = {}) {
  const objects = nodes.map((node) => overlayObjectFromNode(node)).filter(Boolean);
  return normalizeCurrentDocument({
    format: OVERLAY_FORMAT,
    version: OVERLAY_VERSION,
    canvas: { width: canvasWidth, height: canvasHeight },
    viewport: { width: viewportWidth, height: viewportHeight },
    objects,
    assets,
  });
}

export function overlayDocumentJson(documentModel) {
  return JSON.stringify(migrateOverlayDocument(documentModel), null, 2) + '\n';
}
