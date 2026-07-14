// Versioned overlay document bridge. History snapshots and downloaded files use the same small
// renderer-independent model; only downloaded files embed referenced local bitmap assets.
import { createOverlayDocument, migrateOverlayDocument, overlayDocumentJson, OVERLAY_FORMAT } from './adv-edit-document.js';

const MAX_DOCUMENT_BYTES = 70 * 1024 * 1024;

function parseForKind(input) {
  if (typeof input !== 'string') return input;
  try { return JSON.parse(input); }
  catch { return null; }
}

export function createAdvDocumentIO({
  Konva, tb, layer, tr, getObjects, wireObject, composition, select, markDirty,
  refreshLayers, snap, canvasWidth, canvasHeight, viewportWidth, viewportHeight,
}) {
  function model(includeAssets = false) {
    const nodes = getObjects();
    return createOverlayDocument({
      nodes,
      assets: includeAssets ? composition.exportAssets(nodes) : [],
      canvasWidth: canvasWidth(),
      canvasHeight: canvasHeight(),
      viewportWidth: viewportWidth(),
      viewportHeight: viewportHeight(),
    });
  }

  function constructObject(object) {
    const Constructor = Konva[object.type];
    if (typeof Constructor !== 'function') throw new Error(`This Konva build cannot create ${object.type} overlay objects.`);
    if (object.type === 'Image' && !composition.hasAsset(object.attrs.assetId)) return null;
    const node = new Constructor({ ...object.attrs });
    (object.children || []).forEach((childModel) => {
      const child = constructObject(childModel);
      if (child) node.add(child);
    });
    composition.applyRuntime(node);
    return node;
  }

  function missingImageCount(objects) {
    let count = 0;
    const visit = (object) => {
      if (object.type === 'Image' && !composition.hasAsset(object.attrs.assetId)) count += 1;
      (object.children || []).forEach(visit);
    };
    objects.forEach(visit);
    return count;
  }

  function rebuild(documentModel) {
    const document = migrateOverlayDocument(documentModel);
    select(null);
    getObjects().forEach((node) => node.destroy());
    const legacyCoordinates = document.canvas.width === 1 && document.canvas.height === 1
      && document.viewport.width === 1 && document.viewport.height === 1;
    const sx = legacyCoordinates ? 1 : viewportWidth() / document.viewport.width;
    const sy = legacyCoordinates ? 1 : viewportHeight() / document.viewport.height;
    const omittedImages = missingImageCount(document.objects);
    document.objects.forEach((object) => {
      const node = constructObject(object);
      if (!node) return;
      node.setAttrs({
        x: (Number(node.x()) || 0) * sx,
        y: (Number(node.y()) || 0) * sy,
        scaleX: (Number(node.scaleX()) || 1) * sx,
        scaleY: (Number(node.scaleY()) || 1) * sy,
        draggable: !node.getAttr('locked') && node.getAttr('draggable') !== false,
      });
      wireObject(node);
      layer.add(node);
    });
    layer.add(tr);
    tr.moveToTop();
    layer.draw();
    refreshLayers();
    markDirty();
    return { document, omittedImages };
  }

  function clearDocument() {
    select(null);
    getObjects().forEach((node) => node.destroy());
    layer.add(tr);
    tr.moveToTop();
    layer.draw();
    refreshLayers();
    markDirty();
  }

  async function importDocument(input) {
    const raw = parseForKind(input);
    const wasLegacy = raw && raw.format !== OVERLAY_FORMAT;
    const document = migrateOverlayDocument(input);
    await composition.importAssets(document.assets);
    snap();
    const result = rebuild(document);
    const suffix = result.omittedImages ? ` ${result.omittedImages} legacy image object(s) had no embedded bitmap and were omitted.` : '';
    composition.setStatus(`${wasLegacy ? 'Migrated legacy overlay' : `Loaded overlay v${document.version}`} (${document.objects.length} object${document.objects.length === 1 ? '' : 's'}).${suffix}`, !!result.omittedImages);
    return result;
  }

  function installControls() {
    const save = tb.querySelector('.imgv-adv-save');
    const load = tb.querySelector('.imgv-adv-load');
    const input = tb.querySelector('.imgv-adv-load-file');
    save?.addEventListener('click', () => {
      try {
        const json = overlayDocumentJson(model(true));
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'image-overlay.fv-overlay.json';
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        composition.setStatus('Saved a portable editable overlay document.');
      } catch (error) { composition.setStatus(error.message || String(error), true); }
    });
    load?.addEventListener('click', () => input?.click());
    input?.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      if (file.size > MAX_DOCUMENT_BYTES) {
        composition.setStatus('Overlay documents are limited to 70 MB.', true);
        return;
      }
      load.disabled = true;
      try { await importDocument(await file.text()); }
      catch (error) { composition.setStatus(error.message || String(error), true); }
      load.disabled = false;
    });
  }

  installControls();
  return {
    snapshot: () => model(false),
    restore: (document) => { if (document) rebuild(document); else clearDocument(); },
    exportDocument: () => model(true),
    importDocument,
  };
}
