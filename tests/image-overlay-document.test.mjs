import assert from 'node:assert/strict';

import {
  OVERLAY_FORMAT,
  OVERLAY_VERSION,
  createOverlayDocument,
  migrateOverlayDocument,
  overlayDocumentJson,
} from '../docs/types/image/adv-edit-document.js';

function node(type, attrs = {}, children = []) {
  return {
    getClassName: () => type,
    getAttrs: () => attrs,
    getChildren: () => children,
  };
}

const model = createOverlayDocument({
  canvasWidth: 800,
  canvasHeight: 600,
  viewportWidth: 400,
  viewportHeight: 300,
  nodes: [
    node('Rect', {
      name: 'obj selected', x: 20, y: 30, width: 120, height: 80,
      fill: '#123456', fillKind: 'linear', fillColor2: '#abcdef', fillAngle: 45,
      globalCompositeOperation: 'multiply', filterKind: 'contrast', filterValue: 15,
      listening: false, image: { unsafe: true }, filters: [() => {}],
    }),
    node('Label', { name: 'obj', x: 5, y: 6 }, [
      node('Tag', { fill: '#000000', opacity: 0.6 }),
      node('Text', { text: 'Portable', fontSize: 24, fill: '#ffffff' }),
    ]),
  ],
  assets: [{
    id: 'asset-1', name: 'sticker.png', mime: 'image/png', width: 2, height: 2,
    dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
  }],
});

assert.equal(model.format, OVERLAY_FORMAT);
assert.equal(model.version, OVERLAY_VERSION);
assert.deepEqual(model.canvas, { width: 800, height: 600 });
assert.equal(model.objects.length, 2);
assert.equal(model.objects[0].attrs.globalCompositeOperation, 'multiply');
assert.equal(model.objects[0].attrs.filterKind, 'contrast');
assert.equal('image' in model.objects[0].attrs, false, 'runtime image objects never leak into the document');
assert.equal('filters' in model.objects[0].attrs, false, 'runtime filter functions never leak into the document');
assert.equal(model.objects[1].children[1].attrs.text, 'Portable');
assert.equal(model.objects[1].children[1].attrs.name, undefined, 'nested Konva children do not become top-level selectable objects');
assert.match(overlayDocumentJson(model), /"file-viewer\/image-overlay"/);

const legacy = migrateOverlayDocument(JSON.stringify({
  attrs: {},
  className: 'Layer',
  children: [
    { attrs: { rotateEnabled: true }, className: 'Transformer' },
    { attrs: { name: 'obj', x: 10, y: 20, fill: '#f00' }, className: 'Rect' },
  ],
}));
assert.equal(legacy.format, OVERLAY_FORMAT);
assert.equal(legacy.objects.length, 1);
assert.equal(legacy.objects[0].type, 'Rect');
assert.deepEqual(legacy.objects[0].attrs.x, 10);

assert.throws(() => migrateOverlayDocument({ format: OVERLAY_FORMAT, version: 99, objects: [] }), /Unsupported overlay document version/);
assert.throws(() => migrateOverlayDocument({ format: OVERLAY_FORMAT, version: 1, objects: [{ type: 'Script', attrs: {} }] }), /Unsupported overlay object type/);
assert.throws(() => migrateOverlayDocument({
  format: OVERLAY_FORMAT,
  version: 1,
  objects: [],
  assets: [{ id: 'remote', dataUrl: 'https://example.test/a.png' }],
}), /embedded image data URL/);
assert.throws(() => migrateOverlayDocument({
  format: OVERLAY_FORMAT,
  version: 1,
  objects: [],
  assets: [{ id: 'active-svg', dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+' }],
}), /bitmap formats only/);

console.log('image overlay document: versioned schema, runtime stripping, bounds, and legacy migration verified');
