// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/types/image/renderer.js (+ the edit modules it statically imports) by
// build/image/build.mjs. Rebuild:  node build/image/build.mjs  (run by scripts/check.sh).
// Exports render(). Shared core/* modules + every dynamic import() (jxl-decode, ascii/studio,
// ascii-screensaver, compare-view, gifuct/jxl wasm) + the new-URL HTML templates stay external —
// they are NOT inlined here. index.js's loadRenderer imports THIS file.


// ../../docs/types/image/renderer.js
import { loadGlobal as loadGlobal2, vendor as vendor2 } from "../../core/script-loader.js";
import { loadTemplate, fill } from "../../core/template.js";

// ../../docs/types/image/imglib.js
var EXT_MIME = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  avif: "image/avif",
  jxl: "image/jxl",
  ico: "image/x-icon",
  svg: "image/svg+xml"
};
function isSvg(intake) {
  if ((intake.filename || "").toLowerCase().endsWith(".svg")) return true;
  if (intake.isBinary) return false;
  const t = (intake.text || "").trim();
  return t.startsWith("<svg") || t.startsWith("<?xml") && t.includes("<svg");
}
function mimeFor(intake) {
  if ((intake.mimeType || "").startsWith("image/")) return intake.mimeType;
  const ext = (intake.filename || "").toLowerCase().split(".").pop();
  return EXT_MIME[ext] || "application/octet-stream";
}
function dimensions(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// ../../docs/types/image/renderer.js
import { recordStage3AsciiActivation } from "../../games/metagame/viewer-actions.js";

// ../../docs/types/image/edit-els.js
function queryEls(host, canEdit) {
  const q = (sel) => host.querySelector(sel);
  const qe = (sel) => canEdit ? host.querySelector(sel) : null;
  return {
    img: q(".imgv-img"),
    note: q(".imgv-note"),
    zoomLabel: q(".imgv-zoom"),
    asciiBtn: q(".imgv-ascii-btn"),
    asciiOut: q(".imgv-ascii-out"),
    editInput: q(".imgv-text-input"),
    editSize: q(".imgv-text-size"),
    editColor: q(".imgv-text-color"),
    editApply: q(".imgv-text-apply"),
    editReset: q(".imgv-text-reset"),
    pencilBtn: qe(".imgv-pencil"),
    eraserBtn: qe(".imgv-eraser"),
    fillBtn: qe(".imgv-fill"),
    fillTol: qe(".imgv-fill-tol"),
    fillTolV: qe(".imgv-fill-tolv"),
    fillMode: qe(".imgv-fill-mode"),
    fillPercep: qe(".imgv-fill-percep"),
    fillFeather: qe(".imgv-fill-feather"),
    fillOpts: canEdit ? host.querySelectorAll(".imgv-fill-opt") : [],
    selectBtn: qe(".imgv-select"),
    marqueeBtn: qe(".imgv-marquee"),
    ellipseBtn: qe(".imgv-ellipse"),
    lassoBtn: qe(".imgv-lasso"),
    deselectBtn: qe(".imgv-deselect"),
    selInvertBtn: qe(".imgv-sel-invert"),
    selCutBtn: qe(".imgv-sel-cut"),
    moveBtn: qe(".imgv-sel-move"),
    drawColorPicker: qe(".imgv-draw-color"),
    drawSizePicker: qe(".imgv-draw-size"),
    undoBtn: qe(".imgv-undo"),
    redoBtn: qe(".imgv-redo"),
    exportFmt: qe(".imgv-export-fmt"),
    editFont: qe(".imgv-text-font"),
    bgBtn: qe(".imgv-bg-btn"),
    bgTol: qe(".imgv-bg-tol"),
    bgOk: qe(".imgv-bg-ok"),
    bgX: qe(".imgv-bg-x"),
    cropBtn: qe(".imgv-crop-btn"),
    cropApplyBtn: qe(".imgv-crop-apply"),
    cropCancelBtn: qe(".imgv-crop-cancel"),
    resizeBtn: qe(".imgv-resize-btn"),
    resizePanel: qe(".imgv-resize-panel"),
    resizeW: qe(".imgv-resize-w"),
    resizeH: qe(".imgv-resize-h"),
    resizeLock: qe(".imgv-resize-lock"),
    resizeApplyBtn: qe(".imgv-resize-apply"),
    resizeCancelBtn: qe(".imgv-resize-cancel"),
    expandBtn: qe(".imgv-expand-btn"),
    expandPanel: qe(".imgv-expand-panel"),
    expandPad: qe(".imgv-expand-pad"),
    expandTransparent: qe(".imgv-expand-transparent"),
    expandColor: qe(".imgv-expand-color"),
    expandApplyBtn: qe(".imgv-expand-apply"),
    expandCancelBtn: qe(".imgv-expand-cancel"),
    rotLBtn: qe(".imgv-rot-l"),
    rotRBtn: qe(".imgv-rot-r"),
    flipHBtn: qe(".imgv-flip-h"),
    flipVBtn: qe(".imgv-flip-v"),
    filtersBtn: qe(".imgv-filters-btn"),
    filtersPanel: qe(".imgv-filters-panel"),
    fBrightness: qe(".imgv-f-brightness"),
    fContrast: qe(".imgv-f-contrast"),
    fSaturation: qe(".imgv-f-saturation"),
    fHue: qe(".imgv-f-hue"),
    fApplyBtn: qe(".imgv-f-apply"),
    fResetBtn: qe(".imgv-f-reset"),
    levelsBtn: qe(".imgv-levels-btn"),
    levelsPanel: qe(".imgv-levels-panel"),
    lvBlack: qe(".imgv-lv-black"),
    lvWhite: qe(".imgv-lv-white"),
    lvGamma: qe(".imgv-lv-gamma"),
    lvApply: qe(".imgv-lv-apply"),
    lvCancel: qe(".imgv-lv-cancel"),
    presetGrey: qe(".imgv-preset-grey"),
    presetSepia: qe(".imgv-preset-sepia"),
    presetInvert: qe(".imgv-preset-invert")
  };
}

// ../../docs/types/image/view-controller.js
function createView(ctx) {
  const { host, img, zoomLabel } = ctx;
  let natural = 0, fit = true, zoom = 1;
  let panX = 0, panY = 0;
  function applyPan() {
    const t = `translate3d(${panX}px, ${panY}px, 0)`;
    img.style.transform = t;
    const overlay = ctx.getOverlayEl?.();
    if (overlay) overlay.style.transform = t;
    ctx.getAdv?.()?.relayout();
  }
  function nudgeRepaint() {
    requestAnimationFrame(() => {
      void img.offsetWidth;
      img.style.transform = `translate3d(${panX}px, ${panY}px, 0.001px)`;
      requestAnimationFrame(applyPan);
    });
  }
  img.addEventListener("load", nudgeRepaint);
  function apply() {
    host.querySelector(".imgv-fit").classList.toggle("active", fit);
    if (fit || !natural) {
      img.style.width = "";
      img.style.maxWidth = "";
      img.style.maxHeight = "";
      zoomLabel.textContent = "fit";
    } else {
      img.style.maxWidth = "none";
      img.style.maxHeight = "none";
      img.style.width = Math.round(natural * zoom) + "px";
      zoomLabel.textContent = Math.round(zoom * 100) + "%";
    }
    ctx.syncOverlay?.();
    applyPan();
  }
  function resetView() {
    panX = 0;
    panY = 0;
  }
  function setNatural(n) {
    natural = n;
    apply();
  }
  host.querySelector(".imgv-fit").addEventListener("click", () => {
    fit = true;
    resetView();
    apply();
  });
  host.querySelector(".imgv-100").addEventListener("click", () => {
    fit = false;
    zoom = 1;
    resetView();
    apply();
  });
  host.querySelector(".imgv-up").addEventListener("click", () => {
    fit = false;
    zoom = Math.min(16, zoom * 1.25);
    apply();
  });
  host.querySelector(".imgv-dn").addEventListener("click", () => {
    fit = false;
    zoom = Math.max(0.1, zoom / 1.25);
    apply();
  });
  const stageEl = host.querySelector(".imgv-stage");
  stageEl.style.overflow = "hidden";
  let dragLastX = 0, dragLastY = 0;
  const onPanMove = (e) => {
    panX += e.clientX - dragLastX;
    panY += e.clientY - dragLastY;
    dragLastX = e.clientX;
    dragLastY = e.clientY;
    applyPan();
  };
  const onPanUp = () => {
    stageEl.style.cursor = "";
    window.removeEventListener("mousemove", onPanMove);
    window.removeEventListener("mouseup", onPanUp);
  };
  stageEl.addEventListener("mousedown", (e) => {
    if (e.button === 0 && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      startCtrlZoom(e);
      return;
    }
    const leftPan = e.button === 0 && !ctx.isEditModeActive?.();
    const midPan = e.button === 1;
    if (!leftPan && !midPan) return;
    dragLastX = e.clientX;
    dragLastY = e.clientY;
    stageEl.style.cursor = "grabbing";
    e.preventDefault();
    window.addEventListener("mousemove", onPanMove);
    window.addEventListener("mouseup", onPanUp);
  });
  function zoomAt(factor, clientX, clientY) {
    const r = stageEl.getBoundingClientRect();
    const prev = fit ? img.offsetWidth / (natural || img.offsetWidth) : zoom;
    fit = false;
    zoom = Math.max(0.1, Math.min(16, prev * factor));
    const k = zoom / prev;
    const cx = clientX == null ? r.left + r.width / 2 : clientX;
    const cy = clientY == null ? r.top + r.height / 2 : clientY;
    const relX = cx - r.left - (r.width / 2 + panX);
    const relY = cy - r.top - (r.height / 2 + panY);
    panX += relX * (1 - k);
    panY += relY * (1 - k);
    apply();
  }
  stageEl.addEventListener("wheel", (e) => {
    e.preventDefault();
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
  }, { passive: false });
  function startCtrlZoom(e) {
    const ax = e.clientX, ay = e.clientY;
    let lastY = e.clientY;
    stageEl.style.cursor = "ns-resize";
    const move = (ev) => {
      const dy = lastY - ev.clientY;
      lastY = ev.clientY;
      if (dy) zoomAt(Math.exp(dy * 6e-3), ax, ay);
    };
    const up = () => {
      stageEl.style.cursor = "";
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }
  function onZoomKey(e) {
    if (ctx.isAscii?.() || !host.isConnected || !(e.ctrlKey || e.metaKey)) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomAt(1.25);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      zoomAt(1 / 1.25);
    }
  }
  document.addEventListener("keydown", onZoomKey);
  return {
    apply,
    applyPan,
    resetView,
    zoomAt,
    setNatural,
    teardown() {
      document.removeEventListener("keydown", onZoomKey);
    }
  };
}

// ../../docs/types/image/fill.js
function hexToRgba(hex) {
  const h = (hex || "#ff0000").replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
}
function lumAt(src, i) {
  return 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
}
function sobelMag(src, w, h) {
  const lum = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) lum[p] = lumAt(src, p << 2);
  const clamp = (v, max) => v < 0 ? 0 : v > max ? max : v;
  const L = (x, y) => lum[clamp(y, h - 1) * w + clamp(x, w - 1)];
  const mag = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const gx = L(x + 1, y - 1) + 2 * L(x + 1, y) + L(x + 1, y + 1) - (L(x - 1, y - 1) + 2 * L(x - 1, y) + L(x - 1, y + 1));
    const gy = L(x - 1, y + 1) + 2 * L(x, y + 1) + L(x + 1, y + 1) - (L(x - 1, y - 1) + 2 * L(x, y - 1) + L(x + 1, y - 1));
    mag[y * w + x] = Math.sqrt(gx * gx + gy * gy);
  }
  return mag;
}
function applyFill(data, mask, w, h, fill2, feather) {
  if (!feather) {
    for (let p = 0; p < w * h; p++) if (mask[p]) {
      const i = p << 2;
      data[i] = fill2[0];
      data[i + 1] = fill2[1];
      data[i + 2] = fill2[2];
      data[i + 3] = fill2[3];
    }
    return;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let cov;
    if (mask[y * w + x]) {
      cov = 1;
    } else {
      let c = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        n++;
        if (mask[yy * w + xx]) c++;
      }
      cov = n ? c / n : 0;
    }
    if (cov <= 0) continue;
    const i = y * w + x << 2;
    data[i] = Math.round(data[i] * (1 - cov) + fill2[0] * cov);
    data[i + 1] = Math.round(data[i + 1] * (1 - cov) + fill2[1] * cov);
    data[i + 2] = Math.round(data[i + 2] * (1 - cov) + fill2[2] * cov);
    if (cov >= 1) data[i + 3] = fill2[3];
  }
}
function floodFill(data, w, h, x0, y0, fill2, tol, opts = {}) {
  if (typeof opts === "boolean") opts = { mode: opts ? "shade" : "seed" };
  const seen = computeRegionMask(data, w, h, x0, y0, tol, opts);
  if (!seen) return 0;
  let cnt = 0;
  for (let p = 0; p < w * h; p++) if (seen[p]) cnt++;
  applyFill(data, seen, w, h, fill2, !!opts.feather);
  return cnt;
}
function computeRegionMask(data, w, h, x0, y0, tol, opts = {}) {
  if (typeof opts === "boolean") opts = { mode: opts ? "shade" : "seed" };
  const { mode = "seed", perceptual = false } = opts;
  if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) return null;
  const src = Uint8ClampedArray.from(data);
  const idx = (x, y) => y * w + x;
  const at = (x, y) => idx(x, y) << 2;
  const tol2 = tol * tol;
  const dist2 = perceptual ? (i, r, g, b) => {
    const rr = (src[i] + r) * 0.5, dr = src[i] - r, dg = src[i + 1] - g, db = src[i + 2] - b;
    return ((2 + rr / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rr) / 256) * db * db) / 3;
  } : (i, r, g, b) => {
    const dr = src[i] - r, dg = src[i + 1] - g, db = src[i + 2] - b;
    return dr * dr + dg * dg + db * db;
  };
  const sobel = mode === "region" ? sobelMag(src, w, h) : null;
  const edgeTol = tol * 4;
  const seed = at(x0, y0);
  const sr = src[seed], sg = src[seed + 1], sb = src[seed + 2];
  const accept = (nx, ny, fromI) => {
    if (mode === "region") return sobel[idx(nx, ny)] <= edgeTol;
    const ni = at(nx, ny);
    if (mode === "shade") return dist2(ni, src[fromI], src[fromI + 1], src[fromI + 2]) <= tol2;
    return dist2(ni, sr, sg, sb) <= tol2;
  };
  const seen = new Uint8Array(w * h);
  const st = [x0 | 0, y0 | 0];
  seen[idx(x0, y0)] = 1;
  while (st.length) {
    const y = st.pop(), x = st.pop();
    const fromI = at(x, y);
    const nb = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (let k = 0; k < 4; k++) {
      const nx = nb[k][0], ny = nb[k][1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const p = idx(nx, ny);
      if (seen[p]) continue;
      if (accept(nx, ny, fromI)) {
        seen[p] = 1;
        st.push(nx, ny);
      }
    }
  }
  return seen;
}
function clipToBase(editedData, baseData, mask) {
  for (let p = 0; p < mask.length; p++) {
    if (mask[p]) continue;
    const i = p << 2;
    editedData[i] = baseData[i];
    editedData[i + 1] = baseData[i + 1];
    editedData[i + 2] = baseData[i + 2];
    editedData[i + 3] = baseData[i + 3];
  }
}
function bgFloodFill(srcData, w, h, sx, sy, tol) {
  const threshold = tol * 4.42;
  const dst = new Uint8ClampedArray(srcData.data);
  const si = (sy * w + sx) * 4;
  const r0 = dst[si], g0 = dst[si + 1], b0 = dst[si + 2];
  const visited = new Uint8Array(w * h);
  const stack = [sy * w + sx];
  while (stack.length) {
    const pos = stack.pop();
    if (visited[pos]) continue;
    visited[pos] = 1;
    const pi = pos * 4;
    const dr = dst[pi] - r0, dg = dst[pi + 1] - g0, db = dst[pi + 2] - b0;
    if (Math.sqrt(dr * dr + dg * dg + db * db) > threshold) continue;
    dst[pi + 3] = 0;
    const x = pos % w, y = pos / w | 0;
    if (x > 0) stack.push(pos - 1);
    if (x < w - 1) stack.push(pos + 1);
    if (y > 0) stack.push(pos - w);
    if (y < h - 1) stack.push(pos + w);
  }
  return dst;
}

// ../../docs/types/image/draw-overlay.js
function createDrawTools(ctx) {
  const { host, img, mime, core, els } = ctx;
  const {
    pencilBtn,
    eraserBtn,
    fillBtn,
    fillTol,
    fillTolV,
    fillMode,
    fillPercep,
    fillFeather,
    fillOpts,
    drawColorPicker,
    drawSizePicker,
    undoBtn,
    redoBtn
  } = els;
  const selection = () => ctx.getSelection?.();
  let drawMode = null, isEraserStroke = false;
  let drawOverlay = null, drawOCtx = null, isPointerDown = false, lastPt = null, brushCursor = null;
  function syncOverlay() {
    selection()?.syncOverlay();
    if (!drawOverlay) return;
    drawOverlay.style.left = img.offsetLeft + "px";
    drawOverlay.style.top = img.offsetTop + "px";
    drawOverlay.style.width = img.offsetWidth + "px";
    drawOverlay.style.height = img.offsetHeight + "px";
  }
  function buildOverlay() {
    const stage = host.querySelector(".imgv-stage");
    stage.style.position = "relative";
    drawOverlay = document.createElement("canvas");
    drawOverlay.style.cssText = "position:absolute;pointer-events:none;touch-action:none;z-index:2;";
    stage.appendChild(drawOverlay);
    drawOCtx = drawOverlay.getContext("2d");
    brushCursor = document.createElement("div");
    brushCursor.className = "imgv-brush-cursor";
    brushCursor.style.cssText = "position:absolute;border:1px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.6);border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);z-index:3;display:none;mix-blend-mode:difference;";
    stage.appendChild(brushCursor);
    img.addEventListener("load", () => {
      if (drawOverlay && !isEraserStroke) {
        drawOverlay.width = img.naturalWidth || 1;
        drawOverlay.height = img.naturalHeight || 1;
      }
      syncOverlay();
      ctx.applyPan();
    });
    if (img.naturalWidth) {
      drawOverlay.width = img.naturalWidth;
      drawOverlay.height = img.naturalHeight;
    }
    syncOverlay();
    ctx.applyPan();
    drawOverlay.addEventListener("mousedown", onPDown);
    drawOverlay.addEventListener("mousemove", onPMove);
    drawOverlay.addEventListener("mouseup", onPUp);
    drawOverlay.addEventListener("mouseleave", () => {
      hideBrushCursor();
      if (isPointerDown) {
        isPointerDown = false;
        commitDraw();
      }
    });
    drawOverlay.addEventListener("touchstart", onPDown, { passive: false });
    drawOverlay.addEventListener("touchmove", onPMove, { passive: false });
    drawOverlay.addEventListener("touchend", onPUp);
  }
  function moveBrushCursor(e) {
    if (!brushCursor || drawMode !== "pencil" && drawMode !== "eraser") {
      hideBrushCursor();
      return;
    }
    const stageR = host.querySelector(".imgv-stage").getBoundingClientRect();
    const d = parseInt(drawSizePicker?.value || "8", 10);
    brushCursor.style.width = d + "px";
    brushCursor.style.height = d + "px";
    brushCursor.style.left = e.clientX - stageR.left + "px";
    brushCursor.style.top = e.clientY - stageR.top + "px";
    brushCursor.style.display = "block";
  }
  function hideBrushCursor() {
    if (brushCursor) brushCursor.style.display = "none";
  }
  function setDrawMode(mode) {
    drawMode = drawMode === mode ? null : mode;
    if (drawMode) selection()?.setActive(false);
    pencilBtn?.classList.toggle("active", drawMode === "pencil");
    eraserBtn?.classList.toggle("active", drawMode === "eraser");
    fillBtn?.classList.toggle("active", drawMode === "fill");
    fillOpts.forEach((el) => {
      el.hidden = !(drawMode === "fill" || selection()?.isActive());
    });
    if (!drawOverlay && drawMode) buildOverlay();
    if (drawOverlay) {
      drawOverlay.style.pointerEvents = drawMode ? "auto" : "none";
      drawOverlay.style.cursor = drawMode === "eraser" ? "cell" : drawMode === "fill" ? "crosshair" : drawMode === "pencil" ? "none" : "";
    }
    if (drawMode !== "pencil" && drawMode !== "eraser") hideBrushCursor();
    img.style.pointerEvents = drawMode ? "none" : "";
  }
  function ptToCanvas(e) {
    const r = drawOverlay.getBoundingClientRect();
    const sx = drawOverlay.width / r.width, sy = drawOverlay.height / r.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy };
  }
  function getCanvasBrushSize() {
    const displayPx = parseInt(drawSizePicker?.value || "8", 10);
    if (!drawOverlay) return displayPx;
    const r = drawOverlay.getBoundingClientRect();
    const scale = r.width > 0 ? drawOverlay.width / r.width : 1;
    return Math.max(1, Math.round(displayPx * scale));
  }
  function applyStrokeStyle(sz) {
    drawOCtx.globalCompositeOperation = isEraserStroke ? "destination-out" : "source-over";
    drawOCtx.strokeStyle = drawColorPicker?.value || "#ff0000";
    drawOCtx.fillStyle = drawColorPicker?.value || "#ff0000";
    drawOCtx.lineWidth = sz;
    drawOCtx.lineCap = "round";
    drawOCtx.lineJoin = "round";
  }
  async function onPDown(e) {
    if (!drawMode || !drawOverlay) return;
    e.preventDefault();
    if (drawMode === "fill") {
      await doFill(e);
      return;
    }
    isPointerDown = true;
    isEraserStroke = drawMode === "eraser";
    core.pushUndo();
    if (isEraserStroke) {
      drawOverlay.width = img.naturalWidth;
      drawOverlay.height = img.naturalHeight;
      if (mime === "image/jpeg") {
        drawOCtx.fillStyle = "#fff";
        drawOCtx.fillRect(0, 0, drawOverlay.width, drawOverlay.height);
      }
      drawOCtx.drawImage(img, 0, 0);
    } else if (!drawOverlay.width || !img.naturalWidth) {
      drawOverlay.width = img.naturalWidth || 1;
      drawOverlay.height = img.naturalHeight || 1;
    }
    if (!isEraserStroke && img.naturalWidth && drawOverlay.width !== img.naturalWidth) {
      drawOverlay.width = img.naturalWidth;
      drawOverlay.height = img.naturalHeight;
    }
    lastPt = ptToCanvas(e);
    const sz = getCanvasBrushSize();
    applyStrokeStyle(sz);
    drawOCtx.beginPath();
    drawOCtx.arc(lastPt.x, lastPt.y, sz / 2, 0, Math.PI * 2);
    drawOCtx.fill();
  }
  function onPMove(e) {
    moveBrushCursor(e);
    if (!isPointerDown || !drawOCtx) return;
    e.preventDefault();
    const pt = ptToCanvas(e);
    const sz = getCanvasBrushSize();
    applyStrokeStyle(sz);
    drawOCtx.beginPath();
    drawOCtx.moveTo(lastPt.x, lastPt.y);
    drawOCtx.lineTo(pt.x, pt.y);
    drawOCtx.stroke();
    lastPt = pt;
  }
  async function doFill(e) {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext("2d", { willReadFrequently: true });
    if (mime === "image/jpeg") {
      g.fillStyle = "#fff";
      g.fillRect(0, 0, c.width, c.height);
    }
    g.drawImage(img, 0, 0);
    const id = g.getImageData(0, 0, c.width, c.height);
    const pt = ptToCanvas(e);
    const sel = selection();
    const before = sel?.hasSelection() ? Uint8ClampedArray.from(id.data) : null;
    const filled = floodFill(
      id.data,
      c.width,
      c.height,
      Math.round(pt.x),
      Math.round(pt.y),
      hexToRgba(drawColorPicker?.value),
      parseInt(fillTol?.value || "0", 10),
      { mode: fillMode?.value || "seed", perceptual: !!fillPercep?.checked, feather: !!fillFeather?.checked }
    );
    if (!filled) return;
    if (before) sel.clipFillInPlace(id.data, before);
    g.putImageData(id, 0, 0);
    const targetMime = core.getExportMime();
    core.pushUndo();
    const blob = await new Promise((r) => c.toBlob(r, targetMime, targetMime === "image/jpeg" ? 0.92 : void 0));
    core.commitBlob(blob, { mime: targetMime });
  }
  async function commitDraw() {
    if (!drawOverlay || !drawOverlay.width) return;
    const targetMime = core.getExportMime();
    let blob;
    if (isEraserStroke) {
      await selection()?.clipCanvas(drawOverlay, img);
      blob = await new Promise((r) => drawOverlay.toBlob(r, targetMime, targetMime === "image/jpeg" ? 0.92 : void 0));
    } else {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const g = c.getContext("2d");
      if (mime === "image/jpeg") {
        g.fillStyle = "#fff";
        g.fillRect(0, 0, c.width, c.height);
      }
      g.drawImage(img, 0, 0);
      g.drawImage(drawOverlay, 0, 0);
      await selection()?.clipCanvas(c, img);
      blob = await new Promise((r) => c.toBlob(r, targetMime, targetMime === "image/jpeg" ? 0.92 : void 0));
    }
    drawOCtx.clearRect(0, 0, drawOverlay.width, drawOverlay.height);
    core.commitBlob(blob, { mime: targetMime });
  }
  async function onPUp() {
    if (isPointerDown) {
      isPointerDown = false;
      await commitDraw();
    }
  }
  if (pencilBtn) {
    pencilBtn.addEventListener("click", () => setDrawMode("pencil"));
    eraserBtn.addEventListener("click", () => setDrawMode("eraser"));
    fillBtn?.addEventListener("click", () => setDrawMode("fill"));
    fillTol?.addEventListener("input", () => {
      if (fillTolV) fillTolV.textContent = fillTol.value;
    });
    undoBtn?.addEventListener("click", core.doUndo);
    redoBtn?.addEventListener("click", core.doRedo);
  }
  return {
    syncOverlay,
    setDrawMode,
    isDrawMode: () => !!drawMode,
    getOverlayEl: () => drawOverlay
  };
}

// ../../docs/types/image/editor-core.js
var CANVAS_ENCODABLE = /* @__PURE__ */ new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);
function createEditCore({ img, url, mime, ctx, els }) {
  const { editReset, exportFmt, undoBtn, redoBtn, dirtyIndicator } = els;
  let editedUrl = null, editedBlob = null;
  const undoStack = [];
  const redoStack = [];
  let overlayHooks = null;
  function setOverlayHooks(h) {
    overlayHooks = h;
  }
  const snapOverlay = () => overlayHooks?.snapshot() ?? null;
  function getExportMime() {
    const m = exportFmt?.value || mime;
    return CANVAS_ENCODABLE.has(m) ? m : "image/png";
  }
  function pushUndo() {
    undoStack.push({ blob: editedBlob || null, url: editedUrl || null, overlay: snapOverlay() });
    redoStack.forEach((s) => {
      if (s.url) URL.revokeObjectURL(s.url);
    });
    redoStack.length = 0;
    if (undoBtn) undoBtn.hidden = false;
    if (redoBtn) redoBtn.hidden = true;
    dirtyIndicator?.removeAttribute("hidden");
  }
  function applyEditState(state) {
    editedBlob = state.blob;
    editedUrl = state.url;
    if (editedUrl) {
      img.src = editedUrl;
      ctx.onBinaryEdit?.({ dirty: true, mimeType: getExportMime(), getBytes: async () => new Uint8Array(await editedBlob.arrayBuffer()) });
    } else {
      img.src = url;
      if (editReset) editReset.hidden = true;
      ctx.onBinaryEdit?.(null);
    }
    if (undoBtn) undoBtn.hidden = undoStack.length === 0;
    if (redoBtn) redoBtn.hidden = redoStack.length === 0;
    if (overlayHooks && "overlay" in state) overlayHooks.restore(state.overlay);
  }
  function doUndo() {
    const prev = undoStack.pop();
    if (!prev) return;
    redoStack.push({ blob: editedBlob || null, url: editedUrl || null, overlay: snapOverlay() });
    applyEditState(prev);
  }
  function doRedo() {
    const next = redoStack.pop();
    if (!next) return;
    undoStack.push({ blob: editedBlob || null, url: editedUrl || null, overlay: snapOverlay() });
    applyEditState(next);
  }
  async function loadBase() {
    const base = new Image();
    base.decoding = "async";
    base.src = editedUrl || url;
    await base.decode();
    return base;
  }
  function commitBlob(blob, { mime: mt } = {}) {
    if (!blob) return false;
    editedBlob = blob;
    editedUrl = URL.createObjectURL(blob);
    img.src = editedUrl;
    if (editReset) editReset.hidden = false;
    const finalMime = mt || getExportMime();
    ctx.onBinaryEdit?.({ dirty: true, mimeType: finalMime, getBytes: async () => new Uint8Array(await blob.arrayBuffer()) });
    return true;
  }
  async function commitCanvas(canvas) {
    const mt = getExportMime();
    const blob = await new Promise((r) => canvas.toBlob(r, mt, mt === "image/jpeg" ? 0.92 : void 0));
    return commitBlob(blob, { mime: mt });
  }
  function reset() {
    [...undoStack, ...redoStack].forEach((s) => {
      if (s.url) URL.revokeObjectURL(s.url);
    });
    undoStack.length = 0;
    redoStack.length = 0;
    if (undoBtn) undoBtn.hidden = true;
    if (redoBtn) redoBtn.hidden = true;
    if (editedUrl) URL.revokeObjectURL(editedUrl);
    editedUrl = null;
    editedBlob = null;
    img.src = url;
    img.style.filter = "";
    if (editReset) editReset.hidden = true;
    if (dirtyIndicator) dirtyIndicator.hidden = true;
    ctx.onBinaryEdit?.(null);
  }
  function revoke() {
    if (editedUrl) URL.revokeObjectURL(editedUrl);
    [...undoStack, ...redoStack].forEach((s) => {
      if (s.url) URL.revokeObjectURL(s.url);
    });
  }
  return {
    getExportMime,
    pushUndo,
    applyEditState,
    doUndo,
    doRedo,
    loadBase,
    commitBlob,
    commitCanvas,
    reset,
    revoke,
    setOverlayHooks,
    get editedUrl() {
      return editedUrl;
    },
    get editedBlob() {
      return editedBlob;
    }
  };
}

// ../../docs/types/image/levels.js
function buildLevelsLUT(black = 0, white = 255, gamma = 1) {
  black = Math.max(0, Math.min(254, black | 0));
  white = Math.max(black + 1, Math.min(255, white | 0));
  gamma = gamma > 0 ? gamma : 1;
  const lut = new Uint8ClampedArray(256);
  const range = white - black, inv = 1 / gamma;
  for (let i = 0; i < 256; i++) {
    let t = (i - black) / range;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    lut[i] = Math.round(Math.pow(t, inv) * 255);
  }
  return lut;
}
function applyLevels(data, lut) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]];
    data[i + 1] = lut[data[i + 1]];
    data[i + 2] = lut[data[i + 2]];
  }
}

// ../../docs/types/image/edit-filters.js
function mountFilters({ img, mime, core, els }) {
  const { filtersBtn, filtersPanel, fBrightness, fContrast, fSaturation, fHue, fApplyBtn, fResetBtn } = els;
  const { levelsBtn, levelsPanel, lvBlack, lvWhite, lvGamma, lvApply, lvCancel } = els;
  const { presetGrey, presetSepia, presetInvert } = els;
  filtersBtn?.addEventListener("click", () => {
    if (filtersPanel) filtersPanel.hidden = !filtersPanel.hidden;
  });
  const filterString = () => `brightness(${fBrightness.value}%) contrast(${fContrast.value}%) saturate(${fSaturation.value}%) hue-rotate(${fHue?.value || 0}deg)`;
  const updateFilterPreview = () => {
    img.style.filter = filterString();
  };
  fBrightness?.addEventListener("input", updateFilterPreview);
  fContrast?.addEventListener("input", updateFilterPreview);
  fSaturation?.addEventListener("input", updateFilterPreview);
  fHue?.addEventListener("input", updateFilterPreview);
  fApplyBtn?.addEventListener("click", async () => {
    const filter = filterString();
    img.style.filter = "";
    const base = await core.loadBase();
    const canvas = document.createElement("canvas");
    canvas.width = base.naturalWidth;
    canvas.height = base.naturalHeight;
    const g = canvas.getContext("2d");
    if (mime === "image/jpeg") {
      g.fillStyle = "#fff";
      g.fillRect(0, 0, canvas.width, canvas.height);
    }
    g.filter = filter;
    g.drawImage(base, 0, 0);
    g.filter = "none";
    core.pushUndo();
    await core.commitCanvas(canvas);
  });
  fResetBtn?.addEventListener("click", () => {
    if (fBrightness) fBrightness.value = "100";
    if (fContrast) fContrast.value = "100";
    if (fSaturation) fSaturation.value = "100";
    if (fHue) fHue.value = "0";
    img.style.filter = "";
  });
  let lvSrc = null, lvW = 0, lvH = 0, lvOpenSrc = null, lvPrevUrl = null, lvRaf = 0;
  function lvProcessed() {
    const lut = buildLevelsLUT(+lvBlack.value, +lvWhite.value, +lvGamma.value / 100);
    const out = new ImageData(new Uint8ClampedArray(lvSrc.data), lvW, lvH);
    applyLevels(out.data, lut);
    const c = document.createElement("canvas");
    c.width = lvW;
    c.height = lvH;
    c.getContext("2d").putImageData(out, 0, 0);
    return c;
  }
  function lvPreview() {
    if (lvRaf || !lvSrc) return;
    lvRaf = requestAnimationFrame(() => {
      lvRaf = 0;
      if (!lvSrc) return;
      lvProcessed().toBlob((blob) => {
        if (!blob || !lvSrc) return;
        const u = URL.createObjectURL(blob);
        if (lvPrevUrl) URL.revokeObjectURL(lvPrevUrl);
        lvPrevUrl = u;
        img.src = u;
      }, mime === "image/jpeg" ? "image/jpeg" : "image/png");
    });
  }
  function lvClose(applied) {
    if (levelsPanel) levelsPanel.hidden = true;
    if (lvPrevUrl) {
      URL.revokeObjectURL(lvPrevUrl);
      lvPrevUrl = null;
    }
    if (!applied && lvOpenSrc) img.src = lvOpenSrc;
    lvSrc = null;
  }
  levelsBtn?.addEventListener("click", async () => {
    if (!levelsPanel) return;
    if (!levelsPanel.hidden) {
      lvClose(false);
      levelsBtn.classList.remove("active");
      return;
    }
    const base = await core.loadBase();
    lvW = base.naturalWidth;
    lvH = base.naturalHeight;
    const c = document.createElement("canvas");
    c.width = lvW;
    c.height = lvH;
    const g = c.getContext("2d", { willReadFrequently: true });
    if (mime === "image/jpeg") {
      g.fillStyle = "#fff";
      g.fillRect(0, 0, lvW, lvH);
    }
    g.drawImage(base, 0, 0);
    lvSrc = g.getImageData(0, 0, lvW, lvH);
    lvOpenSrc = img.src;
    if (lvBlack) lvBlack.value = "0";
    if (lvWhite) lvWhite.value = "255";
    if (lvGamma) lvGamma.value = "100";
    levelsPanel.hidden = false;
    levelsBtn.classList.add("active");
  });
  [lvBlack, lvWhite, lvGamma].forEach((s) => s?.addEventListener("input", lvPreview));
  lvApply?.addEventListener("click", async () => {
    if (!lvSrc) return;
    const c = lvProcessed();
    core.pushUndo();
    await core.commitCanvas(c);
    lvClose(true);
    levelsBtn?.classList.remove("active");
  });
  lvCancel?.addEventListener("click", () => {
    lvClose(false);
    levelsBtn?.classList.remove("active");
  });
  async function applyPreset(filter) {
    const base = await core.loadBase();
    const canvas = document.createElement("canvas");
    canvas.width = base.naturalWidth;
    canvas.height = base.naturalHeight;
    const g = canvas.getContext("2d");
    if (mime === "image/jpeg") {
      g.fillStyle = "#fff";
      g.fillRect(0, 0, canvas.width, canvas.height);
    }
    g.filter = filter;
    g.drawImage(base, 0, 0);
    g.filter = "none";
    core.pushUndo();
    await core.commitCanvas(canvas);
  }
  presetGrey?.addEventListener("click", () => applyPreset("grayscale(1)"));
  presetSepia?.addEventListener("click", () => applyPreset("sepia(1)"));
  presetInvert?.addEventListener("click", () => applyPreset("invert(1)"));
}

// ../../docs/types/image/edit-text.js
function mountTextTool({ host, img, mime, core, els }) {
  const { editInput, editSize, editColor, editFont, editApply } = els;
  let textDragDiv = null, textCommitBtn = null, textCancelBtn = null;
  async function commitText(nx, ny) {
    const text = (editInput?.value || "").trim();
    if (!text) return;
    const base = await core.loadBase();
    const canvas = document.createElement("canvas");
    canvas.width = base.naturalWidth;
    canvas.height = base.naturalHeight;
    const g = canvas.getContext("2d");
    if (mime === "image/jpeg") {
      g.fillStyle = "#fff";
      g.fillRect(0, 0, canvas.width, canvas.height);
    }
    g.drawImage(base, 0, 0);
    const size = Math.max(8, Math.min(240, parseInt(editSize?.value, 10) || 32));
    const fontFamily = editFont?.value || "system-ui,sans-serif";
    g.font = `700 ${size}px ${fontFamily}`;
    g.textBaseline = "alphabetic";
    g.lineJoin = "round";
    g.strokeStyle = "rgba(0,0,0,.72)";
    g.lineWidth = Math.max(3, Math.round(size / 8));
    g.fillStyle = editColor?.value || "#ffffff";
    const px = Math.round((nx ?? 0.5) * canvas.width);
    const py = Math.round((ny ?? 0.5) * canvas.height);
    const maxW = Math.round(canvas.width * 0.8);
    g.strokeText(text, px, py, maxW);
    g.fillText(text, px, py, maxW);
    core.pushUndo();
    await core.commitCanvas(canvas);
  }
  function exitPlaceMode() {
    if (textDragDiv) {
      textDragDiv.remove();
      textDragDiv = null;
    }
    if (textCommitBtn) {
      textCommitBtn.remove();
      textCommitBtn = null;
    }
    if (textCancelBtn) {
      textCancelBtn.remove();
      textCancelBtn = null;
    }
    if (editApply) {
      editApply.textContent = "Add text";
      editApply.classList.remove("active");
    }
  }
  function enterPlaceMode() {
    const text = (editInput?.value || "").trim();
    if (!text) {
      editInput?.focus();
      return;
    }
    if (textDragDiv) {
      exitPlaceMode();
      return;
    }
    if (editApply) {
      editApply.textContent = "Cancel";
      editApply.classList.add("active");
    }
    const stage = host.querySelector(".imgv-stage");
    stage.style.position = "relative";
    const fontSize = Math.max(8, Math.min(240, parseInt(editSize?.value, 10) || 32));
    const fontFamily = editFont?.value || "system-ui,sans-serif";
    const color = editColor?.value || "#ffffff";
    textDragDiv = document.createElement("div");
    textDragDiv.textContent = text;
    textDragDiv.style.cssText = [
      "position:absolute",
      "z-index:10",
      "cursor:move",
      "user-select:none",
      `font-size:${fontSize}px`,
      `font-family:${fontFamily}`,
      `color:${color}`,
      "font-weight:700",
      "background:rgba(255,255,255,0.15)",
      "padding:2px 4px",
      "border-radius:3px",
      "white-space:nowrap",
      "touch-action:none"
    ].join(";");
    stage.appendChild(textDragDiv);
    requestAnimationFrame(() => {
      const stageR = stage.getBoundingClientRect();
      const imgR = img.getBoundingClientRect();
      const textR = textDragDiv.getBoundingClientRect();
      const cx = imgR.left - stageR.left + (imgR.width - textR.width) / 2;
      const cy = imgR.top - stageR.top + imgR.height / 3;
      textDragDiv.style.left = Math.max(0, cx) + "px";
      textDragDiv.style.top = Math.max(0, cy) + "px";
    });
    let dragOffX = 0, dragOffY = 0, dragging = false;
    textDragDiv.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      textDragDiv.setPointerCapture(e.pointerId);
      const r = textDragDiv.getBoundingClientRect();
      dragOffX = e.clientX - r.left;
      dragOffY = e.clientY - r.top;
      dragging = true;
    });
    textDragDiv.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      e.preventDefault();
      const stageR = stage.getBoundingClientRect();
      const x = e.clientX - stageR.left - dragOffX;
      const y = e.clientY - stageR.top - dragOffY;
      textDragDiv.style.left = x + "px";
      textDragDiv.style.top = y + "px";
    });
    textDragDiv.addEventListener("pointerup", () => {
      dragging = false;
    });
    const bar = host.querySelector(".imgv-bar");
    textCommitBtn = document.createElement("button");
    textCommitBtn.textContent = "Commit text";
    textCommitBtn.className = "imgv-text-commit";
    textCommitBtn.title = "Place the text at its current position";
    bar.appendChild(textCommitBtn);
    textCancelBtn = document.createElement("button");
    textCancelBtn.textContent = "Cancel";
    textCancelBtn.className = "imgv-text-cancel-place";
    textCancelBtn.title = "Cancel text placement";
    bar.appendChild(textCancelBtn);
    textCommitBtn.addEventListener("click", () => {
      const imgR = img.getBoundingClientRect();
      const divR = textDragDiv.getBoundingClientRect();
      const nx = (divR.left - imgR.left) / imgR.width;
      const ny = (divR.bottom - imgR.top) / imgR.height;
      exitPlaceMode();
      commitText(nx, ny).catch((err) => {
        if (editApply) editApply.title = err.message || String(err);
      });
    });
    textCancelBtn.addEventListener("click", exitPlaceMode);
  }
  editApply?.addEventListener("click", enterPlaceMode);
  return { isActive: () => !!textDragDiv, exitPlaceMode };
}

// ../../docs/types/image/geometry-affine.js
function affineForGeometry(type, w, h, p = {}) {
  switch (type) {
    case "rotateCW":
      return [0, 1, -1, 0, h, 0];
    // (x,y) → (h - y, x)
    case "rotateCCW":
      return [0, -1, 1, 0, 0, w];
    // (x,y) → (y, w - x)
    case "flipH":
      return [-1, 0, 0, 1, w, 0];
    // (x,y) → (w - x, y)
    case "flipV":
      return [1, 0, 0, -1, 0, h];
    // (x,y) → (x, h - y)
    case "crop":
      return [1, 0, 0, 1, -(p.x1 || 0), -(p.y1 || 0)];
    // shift origin to the crop corner
    case "resize":
      return [(p.tw || w) / w, 0, 0, (p.th || h) / h, 0, 0];
    case "expand":
      return [1, 0, 0, 1, p.pad || 0, p.pad || 0];
    // content shifts in by the pad
    default:
      return [1, 0, 0, 1, 0, 0];
  }
}

// ../../docs/types/image/edit-geometry.js
function mountGeometry({ host, img, url, mime, core, view, els, onGeometry }) {
  const {
    rotLBtn,
    rotRBtn,
    flipHBtn,
    flipVBtn,
    cropBtn,
    cropApplyBtn,
    cropCancelBtn,
    resizeBtn,
    resizePanel,
    resizeW,
    resizeH,
    resizeLock,
    resizeApplyBtn,
    resizeCancelBtn,
    expandBtn,
    expandPanel,
    expandPad,
    expandTransparent,
    expandColor,
    expandApplyBtn,
    expandCancelBtn
  } = els;
  const resizeUnit = host.querySelector(".imgv-resize-unit");
  const resizeResample = host.querySelector(".imgv-resize-resample");
  async function applyTransform(transformFn, newW, newH, opKind) {
    const base = await core.loadBase();
    const srcW = base.naturalWidth, srcH = base.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = newW(srcW, srcH);
    canvas.height = newH(srcW, srcH);
    const g = canvas.getContext("2d");
    if (mime === "image/jpeg") {
      g.fillStyle = "#fff";
      g.fillRect(0, 0, canvas.width, canvas.height);
    }
    transformFn(g, srcW, srcH, canvas.width, canvas.height);
    g.drawImage(base, 0, 0);
    core.pushUndo();
    if (!await core.commitCanvas(canvas)) return;
    view.setNatural(canvas.width);
    onGeometry?.(affineForGeometry(opKind, srcW, srcH));
  }
  rotLBtn?.addEventListener("click", () => applyTransform(
    (g, sw, sh, cw, ch) => {
      g.translate(cw / 2, ch / 2);
      g.rotate(-Math.PI / 2);
      g.translate(-sw / 2, -sh / 2);
    },
    (sw, sh) => sh,
    (sw, sh) => sw,
    "rotateCCW"
  ));
  rotRBtn?.addEventListener("click", () => applyTransform(
    (g, sw, sh, cw, ch) => {
      g.translate(cw / 2, ch / 2);
      g.rotate(Math.PI / 2);
      g.translate(-sw / 2, -sh / 2);
    },
    (sw, sh) => sh,
    (sw, sh) => sw,
    "rotateCW"
  ));
  flipHBtn?.addEventListener("click", () => applyTransform(
    (g, sw, sh, cw, ch) => {
      g.translate(cw, 0);
      g.scale(-1, 1);
    },
    (sw) => sw,
    (sw, sh) => sh,
    "flipH"
  ));
  flipVBtn?.addEventListener("click", () => applyTransform(
    (g, sw, sh, cw, ch) => {
      g.translate(0, ch);
      g.scale(1, -1);
    },
    (sw) => sw,
    (sw, sh) => sh,
    "flipV"
  ));
  let cropMode = false, cropOverlay = null, cropSelBox = null;
  let cropStartX = 0, cropStartY = 0, cropEndX = 0, cropEndY = 0, cropDragging = false, cropHasRegion = false;
  function cropExitMode() {
    cropMode = false;
    cropHasRegion = false;
    cropDragging = false;
    if (cropOverlay) {
      cropOverlay.remove();
      cropOverlay = null;
      cropSelBox = null;
    }
    if (cropBtn) {
      cropBtn.classList.remove("active");
    }
    if (cropApplyBtn) cropApplyBtn.hidden = true;
    if (cropCancelBtn) cropCancelBtn.hidden = true;
  }
  function cropEnterMode() {
    cropMode = true;
    cropHasRegion = false;
    const stage = host.querySelector(".imgv-stage");
    stage.style.position = "relative";
    cropOverlay = document.createElement("div");
    cropOverlay.style.cssText = "position:absolute;inset:0;cursor:crosshair;z-index:5;";
    cropSelBox = document.createElement("div");
    cropSelBox.style.cssText = "position:absolute;border:2px dashed #0af;box-sizing:border-box;background:rgba(0,170,255,0.08);pointer-events:none;display:none;";
    cropOverlay.appendChild(cropSelBox);
    stage.appendChild(cropOverlay);
    if (cropBtn) cropBtn.classList.add("active");
    if (cropCancelBtn) cropCancelBtn.hidden = false;
    cropOverlay.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      cropOverlay.setPointerCapture(e.pointerId);
      const r = img.getBoundingClientRect();
      cropStartX = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      cropStartY = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      cropEndX = cropStartX;
      cropEndY = cropStartY;
      cropDragging = true;
      cropHasRegion = false;
      cropSelBox.style.display = "none";
      if (cropApplyBtn) cropApplyBtn.hidden = true;
    });
    cropOverlay.addEventListener("pointermove", (e) => {
      if (!cropDragging) return;
      e.preventDefault();
      const r = img.getBoundingClientRect();
      cropEndX = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      cropEndY = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      const stageR = host.querySelector(".imgv-stage").getBoundingClientRect();
      const imgR = img.getBoundingClientRect();
      const ox = imgR.left - stageR.left;
      const oy = imgR.top - stageR.top;
      const x1 = Math.min(cropStartX, cropEndX) * imgR.width + ox;
      const y1 = Math.min(cropStartY, cropEndY) * imgR.height + oy;
      const x2 = Math.max(cropStartX, cropEndX) * imgR.width + ox;
      const y2 = Math.max(cropStartY, cropEndY) * imgR.height + oy;
      cropSelBox.style.left = x1 + "px";
      cropSelBox.style.top = y1 + "px";
      cropSelBox.style.width = x2 - x1 + "px";
      cropSelBox.style.height = y2 - y1 + "px";
      cropSelBox.style.display = "block";
    });
    cropOverlay.addEventListener("pointerup", (e) => {
      if (!cropDragging) return;
      cropDragging = false;
      const r = img.getBoundingClientRect();
      cropEndX = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      cropEndY = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
      const selW = Math.abs(cropEndX - cropStartX) * nw;
      const selH = Math.abs(cropEndY - cropStartY) * nh;
      if (selW >= 10 && selH >= 10) {
        cropHasRegion = true;
        if (cropApplyBtn) cropApplyBtn.hidden = false;
      }
    });
  }
  async function applyCrop() {
    if (!cropHasRegion) return;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const x1 = Math.round(Math.min(cropStartX, cropEndX) * nw);
    const y1 = Math.round(Math.min(cropStartY, cropEndY) * nh);
    const x2 = Math.round(Math.max(cropStartX, cropEndX) * nw);
    const y2 = Math.round(Math.max(cropStartY, cropEndY) * nh);
    const cw = Math.max(1, x2 - x1), ch = Math.max(1, y2 - y1);
    const base = await core.loadBase();
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const g = canvas.getContext("2d");
    if (mime === "image/jpeg") {
      g.fillStyle = "#fff";
      g.fillRect(0, 0, cw, ch);
    }
    g.drawImage(base, -x1, -y1);
    core.pushUndo();
    if (!await core.commitCanvas(canvas)) return;
    onGeometry?.(affineForGeometry("crop", nw, nh, { x1, y1 }));
    cropExitMode();
  }
  if (cropBtn) {
    cropBtn.addEventListener("click", () => {
      if (cropMode) {
        cropExitMode();
      } else {
        cropEnterMode();
      }
    });
    cropApplyBtn?.addEventListener("click", () => {
      applyCrop().catch((e) => {
        if (cropApplyBtn) cropApplyBtn.title = e.message || String(e);
      });
    });
    cropCancelBtn?.addEventListener("click", cropExitMode);
  }
  const pctMode = () => resizeUnit?.value === "pct";
  function resizePopulate() {
    if (!resizeW || !resizeH) return;
    if (pctMode()) {
      resizeW.value = "100";
      resizeH.value = "100";
    } else {
      resizeW.value = String(img.naturalWidth || "");
      resizeH.value = String(img.naturalHeight || "");
    }
  }
  function resizeTargetPx() {
    const w = parseFloat(resizeW?.value), h = parseFloat(resizeH?.value);
    if (pctMode()) return { tw: Math.round((img.naturalWidth || 0) * w / 100), th: Math.round((img.naturalHeight || 0) * h / 100) };
    return { tw: Math.round(w), th: Math.round(h) };
  }
  if (resizeBtn) {
    resizeBtn.addEventListener("click", () => {
      if (!resizePanel) return;
      const open = resizePanel.hidden === false;
      resizePanel.hidden = open;
      if (!open) resizePopulate();
    });
    resizeUnit?.addEventListener("change", resizePopulate);
    resizeW?.addEventListener("input", () => {
      if (!resizeLock?.checked) return;
      if (pctMode()) {
        if (resizeH) resizeH.value = resizeW.value;
        return;
      }
      const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
      const w = parseInt(resizeW.value, 10);
      if (w > 0 && resizeH) resizeH.value = String(Math.round(w * nh / nw));
    });
    resizeH?.addEventListener("input", () => {
      if (!resizeLock?.checked) return;
      if (pctMode()) {
        if (resizeW) resizeW.value = resizeH.value;
        return;
      }
      const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
      const h = parseInt(resizeH.value, 10);
      if (h > 0 && resizeW) resizeW.value = String(Math.round(h * nw / nh));
    });
    resizeApplyBtn?.addEventListener("click", async () => {
      const { tw, th } = resizeTargetPx();
      if (!tw || !th || tw < 1 || th < 1) return;
      const base = await core.loadBase();
      const ow = base.naturalWidth, oh = base.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;
      const g = canvas.getContext("2d");
      const rs = resizeResample?.value || "high";
      g.imageSmoothingEnabled = rs !== "pixelated";
      if (g.imageSmoothingEnabled) g.imageSmoothingQuality = rs === "medium" ? "medium" : "high";
      if (mime === "image/jpeg") {
        g.fillStyle = "#fff";
        g.fillRect(0, 0, tw, th);
      }
      g.drawImage(base, 0, 0, tw, th);
      core.pushUndo();
      if (!await core.commitCanvas(canvas)) return;
      onGeometry?.(affineForGeometry("resize", ow, oh, { tw, th }));
      if (resizePanel) resizePanel.hidden = true;
    });
    resizeCancelBtn?.addEventListener("click", () => {
      if (resizePanel) resizePanel.hidden = true;
    });
  }
  if (expandBtn) {
    expandBtn.addEventListener("click", () => {
      if (!expandPanel) return;
      expandPanel.hidden = expandPanel.hidden === false;
    });
    expandApplyBtn?.addEventListener("click", async () => {
      const pad = Math.round(parseFloat(expandPad?.value) || 0);
      if (pad <= 0) return;
      const wantTransparent = expandTransparent?.checked !== false;
      const transparent = wantTransparent && mime !== "image/jpeg";
      const base = await core.loadBase();
      const sw = base.naturalWidth, sh = base.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = sw + pad * 2;
      canvas.height = sh + pad * 2;
      const g = canvas.getContext("2d");
      if (!transparent) {
        g.fillStyle = wantTransparent ? "#ffffff" : expandColor?.value || "#ffffff";
        g.fillRect(0, 0, canvas.width, canvas.height);
      }
      g.drawImage(base, pad, pad);
      core.pushUndo();
      if (transparent) {
        const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
        if (!core.commitBlob(blob, { mime: "image/png" })) return;
      } else if (!await core.commitCanvas(canvas)) {
        return;
      }
      view.setNatural(canvas.width);
      onGeometry?.(affineForGeometry("expand", sw, sh, { pad }));
      if (expandPanel) expandPanel.hidden = true;
    });
    expandCancelBtn?.addEventListener("click", () => {
      if (expandPanel) expandPanel.hidden = true;
    });
  }
  return { isActive: () => cropMode };
}

// ../../docs/types/image/edit-bg.js
function mountBg({ img, url, core, els }) {
  const { bgBtn, bgTol, bgOk, bgX, exportFmt } = els;
  const bgTolWrap = bgTol && (bgTol.closest(".imgv-bg-tol-wrap") || bgTol);
  let bgPickMode = false, bgSrcData = null, bgSrcW = 0, bgSrcH = 0, bgPickX = -1, bgPickY = -1, bgPreviewUrl = null;
  function bgFilledImageData() {
    const dst = bgFloodFill(bgSrcData, bgSrcW, bgSrcH, bgPickX, bgPickY, parseInt(bgTol.value, 10));
    return new ImageData(dst, bgSrcW, bgSrcH);
  }
  function bgExitMode() {
    bgPickMode = false;
    bgPickX = bgPickY = -1;
    bgSrcData = null;
    if (bgPreviewUrl) {
      URL.revokeObjectURL(bgPreviewUrl);
      bgPreviewUrl = null;
    }
    bgBtn?.classList.remove("active");
    img.style.cursor = "";
    if (bgTolWrap) bgTolWrap.hidden = true;
    if (bgOk) bgOk.hidden = true;
    if (bgX) bgX.hidden = true;
  }
  function bgRunPreview() {
    if (!bgSrcData || bgPickX < 0) return;
    const filled = bgFilledImageData();
    const c = document.createElement("canvas");
    c.width = bgSrcW;
    c.height = bgSrcH;
    c.getContext("2d").putImageData(filled, 0, 0);
    c.toBlob((blob) => {
      if (!blob) return;
      if (bgPreviewUrl) URL.revokeObjectURL(bgPreviewUrl);
      bgPreviewUrl = URL.createObjectURL(blob);
      img.src = bgPreviewUrl;
    }, "image/png");
  }
  if (bgBtn) {
    bgBtn.addEventListener("click", () => {
      if (bgPickMode) {
        bgExitMode();
        if (core.editedUrl) img.src = core.editedUrl;
        else img.src = url;
        return;
      }
      bgPickMode = true;
      bgPickX = bgPickY = -1;
      bgSrcData = null;
      bgBtn.classList.add("active");
      img.style.cursor = "crosshair";
      bgBtn.title = "Click the background color on the image";
    });
    img.addEventListener("click", async (e) => {
      if (!bgPickMode) return;
      if (bgPickX >= 0) return;
      const base = await core.loadBase();
      const c = document.createElement("canvas");
      c.width = base.naturalWidth;
      c.height = base.naturalHeight;
      const g = c.getContext("2d");
      g.drawImage(base, 0, 0);
      bgSrcData = g.getImageData(0, 0, c.width, c.height);
      bgSrcW = c.width;
      bgSrcH = c.height;
      const r = img.getBoundingClientRect();
      bgPickX = Math.max(0, Math.min(bgSrcW - 1, Math.round((e.clientX - r.left) * bgSrcW / r.width)));
      bgPickY = Math.max(0, Math.min(bgSrcH - 1, Math.round((e.clientY - r.top) * bgSrcH / r.height)));
      if (bgTolWrap) bgTolWrap.hidden = false;
      if (bgOk) bgOk.hidden = false;
      if (bgX) bgX.hidden = false;
      bgRunPreview();
    });
    bgTol?.addEventListener("input", bgRunPreview);
    bgOk?.addEventListener("click", () => {
      if (!bgSrcData || bgPickX < 0) return;
      const filled = bgFilledImageData();
      const c = document.createElement("canvas");
      c.width = bgSrcW;
      c.height = bgSrcH;
      c.getContext("2d").putImageData(filled, 0, 0);
      c.toBlob((blob) => {
        if (!blob) return;
        core.pushUndo();
        if (exportFmt) exportFmt.value = "image/png";
        core.commitBlob(blob, { mime: "image/png" });
        bgExitMode();
      }, "image/png");
    });
    bgX?.addEventListener("click", () => {
      bgExitMode();
      if (core.editedUrl) img.src = core.editedUrl;
      else img.src = url;
    });
  }
  return { isActive: () => bgPickMode, teardown: () => {
    if (bgPreviewUrl) URL.revokeObjectURL(bgPreviewUrl);
  } };
}

// ../../docs/types/image/edit-undo-key.js
var active = null;
var installed = false;
function isTextEntry(t) {
  if (!t) return false;
  if (t.isContentEditable || t.tagName === "TEXTAREA") return true;
  if (t.tagName === "INPUT") return /^(|text|search|url|email|tel|password)$/i.test(t.type || "");
  return false;
}
function onKey(e) {
  if (!active || !active.host.isConnected) return;
  if (active.isEnabled && !active.isEnabled()) return;
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  if (k !== "z" && k !== "y") return;
  if (isTextEntry(e.target)) return;
  e.preventDefault();
  if (k === "y" || k === "z" && e.shiftKey) active.doRedo();
  else active.doUndo();
}
function registerUndoKeys(editor) {
  if (!installed) {
    document.addEventListener("keydown", onKey);
    installed = true;
  }
  active = editor;
  const claim = () => {
    active = editor;
  };
  editor.host.addEventListener("pointerdown", claim, true);
  return () => {
    editor.host.removeEventListener("pointerdown", claim, true);
    if (active === editor) active = null;
  };
}

// ../../docs/types/image/edit-tabs.js
var STYLE_ID = "imgv-tabs-css";
var CSS = `
.imgv-tabs{flex-basis:100%;display:flex;flex-wrap:wrap;gap:2px;align-items:center;border-bottom:1px solid var(--border);padding-bottom:4px;margin-bottom:2px;}
.imgv-edit-tools .imgv-tab{font-size:12px;padding:3px 11px;border:1px solid transparent;border-bottom:none;background:transparent;color:var(--fg);opacity:.62;border-radius:6px 6px 0 0;cursor:pointer;}
.imgv-edit-tools .imgv-tab:hover{opacity:1;background:var(--bg);}
.imgv-edit-tools .imgv-tab.active{opacity:1;font-weight:600;color:var(--accent);border-color:var(--border);background:var(--bg);}
.imgv-tools-persist{margin-left:auto;display:inline-flex;gap:4px;align-items:center;}
.imgv-tabpanel{flex-basis:100%;display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
.imgv-tabpanel[hidden]{display:none;}
.imgv-tab-hint{animation:imgv-tab-blink .7s ease-in-out 3;}
@keyframes imgv-tab-blink{0%,100%{background:transparent;color:var(--fg);}50%{background:var(--accent);color:var(--bg);}}
@media (prefers-reduced-motion: reduce){.imgv-tab-hint{animation:none;}}
/* ASCII + Edit stacked vertically, anchored next to the zoom controls; the edit
   toolbar drops to its own full-width row below so its changing length never
   nudges the view controls. */
.imgv-mode-col{display:inline-flex;flex-direction:column;gap:3px;align-self:center;}
.imgv-mode-col button{white-space:nowrap;}
.imgv-edit-tools{flex-basis:100%;}
/* Checkerboard behind the image so transparent pixels read as transparent. */
.imgv-img.imgv-checker{background-image:linear-gradient(45deg,#b4b4b4 25%,transparent 25%),linear-gradient(-45deg,#b4b4b4 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#b4b4b4 75%),linear-gradient(-45deg,transparent 75%,#b4b4b4 75%);background-size:20px 20px;background-position:0 0,0 10px,10px -10px,-10px 0;}
`;
function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}
function linkProxy(host, proxy) {
  const target = host.querySelector("." + proxy.dataset.link);
  if (!target) {
    proxy.hidden = true;
    return;
  }
  if (proxy.tagName === "INPUT" || proxy.tagName === "SELECT") {
    proxy.value = target.value;
    proxy.addEventListener("input", () => {
      target.value = proxy.value;
      target.dispatchEvent(new Event("input", { bubbles: true }));
    });
    target.addEventListener("input", () => {
      if (proxy.value !== target.value) proxy.value = target.value;
    });
  } else {
    proxy.addEventListener("click", (e) => {
      e.preventDefault();
      target.click();
    });
    const sync = () => {
      proxy.classList.toggle("active", target.classList.contains("active"));
      proxy.hidden = target.hidden;
    };
    new MutationObserver(sync).observe(target, { attributes: true, attributeFilter: ["class", "hidden"] });
    sync();
  }
}
function mountTabs(host) {
  const tabs = [...host.querySelectorAll(".imgv-tab")];
  const panels = [...host.querySelectorAll(".imgv-tabpanel")];
  if (!tabs.length) return { showTab() {
  } };
  injectStyle();
  const showTab = (name) => {
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    panels.forEach((p) => {
      p.hidden = p.dataset.tab !== name;
    });
  };
  const clearHint = () => host.querySelectorAll(".imgv-tab-hint").forEach((t) => t.classList.remove("imgv-tab-hint"));
  tabs.forEach((t) => t.addEventListener("click", () => {
    showTab(t.dataset.tab);
    clearHint();
  }));
  host.querySelectorAll("[data-go-tab]").forEach((el) => el.addEventListener("click", () => {
    showTab(el.dataset.goTab);
    clearHint();
  }));
  host.querySelectorAll("[data-link]").forEach((el) => linkProxy(host, el));
  showTab(tabs[0].dataset.tab);
  tabs.slice(1).forEach((t) => t.classList.add("imgv-tab-hint"));
  return { showTab };
}

// ../../docs/types/image/edit-select.js
function mountSelection({ host, img, mime, els, getFillOpts, onActivate, onCommit }) {
  const { selectBtn, marqueeBtn, ellipseBtn, lassoBtn, moveBtn, deselectBtn } = els;
  if (!selectBtn) return { isActive: () => false, hasSelection: () => false, getMask: () => null, clipFillInPlace() {
  }, async clipCanvas() {
  }, invert() {
  }, toggle() {
  }, setActive() {
  }, setMode() {
  }, clear() {
  }, syncOverlay() {
  }, teardown() {
  } };
  const stage = host.querySelector(".imgv-stage");
  let mode = null;
  let mask = null, mw = 0, mh = 0;
  let ov = null, octx = null;
  let dragging = false, dragStart = null, lassoPts = null;
  let moving = false, moveStart = null, holedCanvas = null, pieceCanvas = null;
  function ensureOverlay() {
    if (ov) return;
    stage.style.position = "relative";
    ov = document.createElement("canvas");
    ov.className = "imgv-sel-overlay";
    ov.style.cssText = "position:absolute;pointer-events:none;touch-action:none;z-index:4;";
    octx = ov.getContext("2d");
    stage.appendChild(ov);
    ov.addEventListener("pointerdown", onDown);
    ov.addEventListener("pointermove", onMove);
    ov.addEventListener("pointerup", onUp);
    syncOverlay();
  }
  const isDrag = (m) => m === "marquee" || m === "ellipse" || m === "lasso";
  function onDown(e) {
    if (mode === "wand") {
      e.preventDefault();
      pickAt(e);
      return;
    }
    if (mode === "move") {
      startMove(e);
      return;
    }
    if (!isDrag(mode)) return;
    e.preventDefault();
    ov.width = img.naturalWidth || 1;
    ov.height = img.naturalHeight || 1;
    syncOverlay();
    dragging = true;
    dragStart = ptToCanvas(e);
    if (mode === "lasso") lassoPts = [dragStart];
    try {
      ov.setPointerCapture(e.pointerId);
    } catch {
    }
  }
  function onMove(e) {
    if (moving) {
      e.preventDefault();
      previewMove(ptToCanvas(e));
      return;
    }
    if (!dragging) return;
    e.preventDefault();
    const pt = ptToCanvas(e);
    if (mode === "lasso") {
      lassoPts.push(pt);
      drawLasso(lassoPts);
    } else drawRubberBand(dragStart, pt, mode);
  }
  function onUp(e) {
    if (moving) {
      dropMove(ptToCanvas(e));
      return;
    }
    if (!dragging) return;
    dragging = false;
    const pt = ptToCanvas(e);
    if (mode === "marquee") setMask(rectMask(dragStart, pt));
    else if (mode === "ellipse") setMask(ellipseMask(dragStart, pt));
    else if (mode === "lasso") {
      const pts = lassoPts;
      lassoPts = null;
      setMask(lassoMask(pts));
    }
  }
  function startMove(e) {
    if (!mask) return;
    e.preventDefault();
    const bc = document.createElement("canvas");
    bc.width = mw;
    bc.height = mh;
    const bg = bc.getContext("2d", { willReadFrequently: true });
    bg.drawImage(img, 0, 0, mw, mh);
    const baseId = bg.getImageData(0, 0, mw, mh);
    pieceCanvas = document.createElement("canvas");
    pieceCanvas.width = mw;
    pieceCanvas.height = mh;
    const pg = pieceCanvas.getContext("2d");
    const pieceId = pg.createImageData(mw, mh);
    for (let p = 0; p < mask.length; p++) {
      if (!mask[p]) continue;
      const i = p << 2;
      pieceId.data[i] = baseId.data[i];
      pieceId.data[i + 1] = baseId.data[i + 1];
      pieceId.data[i + 2] = baseId.data[i + 2];
      pieceId.data[i + 3] = baseId.data[i + 3];
      baseId.data[i + 3] = 0;
    }
    pg.putImageData(pieceId, 0, 0);
    bg.putImageData(baseId, 0, 0);
    holedCanvas = bc;
    moving = true;
    moveStart = ptToCanvas(e);
    try {
      ov.setPointerCapture(e.pointerId);
    } catch {
    }
    previewMove(moveStart);
  }
  function previewMove(pt) {
    const dx = pt.x - moveStart.x, dy = pt.y - moveStart.y;
    octx.clearRect(0, 0, ov.width, ov.height);
    octx.drawImage(holedCanvas, 0, 0);
    octx.drawImage(pieceCanvas, dx, dy);
  }
  async function dropMove(pt) {
    moving = false;
    const dx = pt.x - moveStart.x, dy = pt.y - moveStart.y;
    const out = document.createElement("canvas");
    out.width = mw;
    out.height = mh;
    const og = out.getContext("2d");
    og.drawImage(holedCanvas, 0, 0);
    og.drawImage(pieceCanvas, dx, dy);
    holedCanvas = pieceCanvas = null;
    await onCommit?.(out);
    clear();
  }
  function drawRubberBand(a, b, kind) {
    octx.clearRect(0, 0, ov.width, ov.height);
    octx.strokeStyle = "rgba(0,132,255,0.95)";
    octx.lineWidth = Math.max(1, ov.width / 320);
    octx.setLineDash([ov.width / 60, ov.width / 60]);
    octx.beginPath();
    if (kind === "ellipse") {
      octx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
    } else {
      octx.rect(Math.min(a.x, b.x) + 0.5, Math.min(a.y, b.y) + 0.5, Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    }
    octx.stroke();
    octx.setLineDash([]);
  }
  function drawLasso(pts) {
    octx.clearRect(0, 0, ov.width, ov.height);
    octx.strokeStyle = "rgba(0,132,255,0.95)";
    octx.lineWidth = Math.max(1, ov.width / 320);
    octx.beginPath();
    pts.forEach((q, i) => i ? octx.lineTo(q.x, q.y) : octx.moveTo(q.x, q.y));
    octx.stroke();
  }
  function setMask(res) {
    if (!res) {
      octx.clearRect(0, 0, ov.width, ov.height);
      return;
    }
    mask = res.m;
    mw = res.w;
    mh = res.h;
    render2();
    if (deselectBtn) deselectBtn.hidden = false;
  }
  function rectMask(a, b) {
    const w = img.naturalWidth || 1, h = img.naturalHeight || 1;
    const x0 = Math.max(0, Math.min(w, Math.min(a.x, b.x))), x1 = Math.max(0, Math.min(w, Math.max(a.x, b.x)));
    const y0 = Math.max(0, Math.min(h, Math.min(a.y, b.y))), y1 = Math.max(0, Math.min(h, Math.max(a.y, b.y)));
    if (x1 - x0 < 2 || y1 - y0 < 2) return null;
    const m = new Uint8Array(w * h);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * w + x] = 1;
    return { m, w, h };
  }
  function maskFromPath(draw) {
    const w = img.naturalWidth || 1, h = img.naturalHeight || 1;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.fillStyle = "#fff";
    g.beginPath();
    draw(g);
    g.fill();
    const d = g.getImageData(0, 0, w, h).data;
    const m = new Uint8Array(w * h);
    let any = false;
    for (let p = 0; p < w * h; p++) if (d[(p << 2) + 3] > 127) {
      m[p] = 1;
      any = true;
    }
    return any ? { m, w, h } : null;
  }
  function ellipseMask(a, b) {
    const rx = Math.abs(b.x - a.x) / 2, ry = Math.abs(b.y - a.y) / 2;
    if (rx < 1 || ry < 1) return null;
    return maskFromPath((g) => g.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, rx, ry, 0, 0, Math.PI * 2));
  }
  function lassoMask(pts) {
    if (!pts || pts.length < 3) return null;
    return maskFromPath((g) => {
      pts.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y));
      g.closePath();
    });
  }
  function syncOverlay() {
    if (!ov) return;
    ov.style.left = img.offsetLeft + "px";
    ov.style.top = img.offsetTop + "px";
    ov.style.width = img.offsetWidth + "px";
    ov.style.height = img.offsetHeight + "px";
  }
  function ptToCanvas(e) {
    const r = ov.getBoundingClientRect();
    const sx = ov.width / r.width, sy = ov.height / r.height;
    return { x: Math.round((e.clientX - r.left) * sx), y: Math.round((e.clientY - r.top) * sy) };
  }
  function pickAt(e) {
    const w = img.naturalWidth || 1, h = img.naturalHeight || 1;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true });
    if (mime === "image/jpeg") {
      g.fillStyle = "#fff";
      g.fillRect(0, 0, w, h);
    }
    g.drawImage(img, 0, 0);
    const id = g.getImageData(0, 0, w, h);
    const pt = ptToCanvas(e);
    const o = getFillOpts?.() || {};
    const m = computeRegionMask(id.data, w, h, pt.x, pt.y, o.tol ?? 12, { mode: o.mode || "seed", perceptual: !!o.perceptual });
    if (!m) return;
    mask = m;
    mw = w;
    mh = h;
    render2();
    if (deselectBtn) deselectBtn.hidden = false;
  }
  function render2() {
    ov.width = mw;
    ov.height = mh;
    syncOverlay();
    const out = octx.createImageData(mw, mh);
    const d = out.data;
    for (let p = 0; p < mw * mh; p++) {
      if (!mask[p]) continue;
      const x = p % mw, y = p / mw | 0;
      const edge = x === 0 || y === 0 || x === mw - 1 || y === mh - 1 || !mask[p - 1] || !mask[p + 1] || !mask[p - mw] || !mask[p + mw];
      const i = p << 2;
      d[i] = 0;
      d[i + 1] = 132;
      d[i + 2] = 255;
      d[i + 3] = edge ? 235 : 48;
    }
    octx.putImageData(out, 0, 0);
  }
  function setMode(m) {
    mode = m;
    if (m) ensureOverlay();
    selectBtn.classList.toggle("active", m === "wand");
    marqueeBtn?.classList.toggle("active", m === "marquee");
    ellipseBtn?.classList.toggle("active", m === "ellipse");
    lassoBtn?.classList.toggle("active", m === "lasso");
    moveBtn?.classList.toggle("active", m === "move");
    if (ov) {
      ov.style.pointerEvents = m ? "auto" : "none";
      ov.style.cursor = m === "move" ? "move" : m ? "crosshair" : "";
    }
    if (m) onActivate?.();
  }
  function setActive(on) {
    setMode(on ? "wand" : null);
  }
  function clear() {
    mask = null;
    mw = mh = 0;
    if (octx) octx.clearRect(0, 0, ov.width, ov.height);
    if (deselectBtn) deselectBtn.hidden = true;
  }
  function invert() {
    if (!mask) return;
    for (let p = 0; p < mask.length; p++) mask[p] = mask[p] ? 0 : 1;
    render2();
  }
  function clipFillInPlace(editedData, beforeData) {
    if (!mask || editedData.length !== mask.length << 2) return;
    clipToBase(editedData, beforeData, mask);
  }
  async function clipCanvas(canvas, baseImg) {
    if (!mask || canvas.width !== mw || canvas.height !== mh) return;
    const g = canvas.getContext("2d");
    const ed = g.getImageData(0, 0, mw, mh);
    const bc = document.createElement("canvas");
    bc.width = mw;
    bc.height = mh;
    const bg = bc.getContext("2d", { willReadFrequently: true });
    bg.drawImage(baseImg, 0, 0, mw, mh);
    const base = bg.getImageData(0, 0, mw, mh).data;
    clipToBase(ed.data, base, mask);
    g.putImageData(ed, 0, 0);
  }
  selectBtn.addEventListener("click", () => setMode(mode === "wand" ? null : "wand"));
  marqueeBtn?.addEventListener("click", () => setMode(mode === "marquee" ? null : "marquee"));
  ellipseBtn?.addEventListener("click", () => setMode(mode === "ellipse" ? null : "ellipse"));
  lassoBtn?.addEventListener("click", () => setMode(mode === "lasso" ? null : "lasso"));
  moveBtn?.addEventListener("click", () => setMode(mode === "move" ? null : "move"));
  deselectBtn?.addEventListener("click", clear);
  return {
    isActive: () => mode !== null,
    hasSelection: () => !!mask,
    getMask: () => mask ? { data: mask, w: mw, h: mh } : null,
    setActive,
    setMode,
    toggle: () => setMode(mode ? null : "wand"),
    clipFillInPlace,
    clipCanvas,
    invert,
    clear,
    syncOverlay,
    teardown() {
      ov?.remove();
      ov = null;
      octx = null;
      mask = null;
    }
  };
}

// ../../docs/types/image/adv-edit.js
import { loadGlobal, vendor } from "../../core/script-loader.js";
var konvaPromise = null;
function loadKonva() {
  if (!konvaPromise) konvaPromise = loadGlobal(vendor("konva/konva.min.js"), "Konva");
  return konvaPromise;
}
var DEFAULTS = { text: "Text", fontFamily: "system-ui, sans-serif", fontSize: 48, fill: "#ffffff", bg: "#000000", bgOpacity: 0.5 };
async function mountAdvEdit({ host, img, onDirty, pushUndo }) {
  const Konva = await loadKonva();
  const stageHost = host.querySelector(".imgv-stage");
  let naturalW = img.naturalWidth || 1, naturalH = img.naturalHeight || 1;
  const rect = img.getBoundingClientRect();
  let stageW = Math.max(1, Math.round(rect.width)), stageH = Math.max(1, Math.round(rect.height));
  const container = document.createElement("div");
  container.className = "imgv-adv-stage";
  container.style.cssText = `position:absolute;left:0;top:0;width:${stageW}px;height:${stageH}px;z-index:6;`;
  const hostRect = stageHost.getBoundingClientRect();
  container.style.left = Math.round(rect.left - hostRect.left) + "px";
  container.style.top = Math.round(rect.top - hostRect.top) + "px";
  stageHost.style.position = "relative";
  stageHost.appendChild(container);
  const stage = new Konva.Stage({ container, width: stageW, height: stageH });
  const layer = new Konva.Layer();
  stage.add(layer);
  const tr = new Konva.Transformer({ rotateEnabled: true, keepRatio: false, enabledAnchors: ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"] });
  layer.add(tr);
  let interactive = true;
  let selected = null;
  const markDirty = () => onDirty?.();
  const snap = () => pushUndo?.();
  const bar = host.querySelector(".imgv-bar");
  const tb = document.createElement("span");
  tb.className = "imgv-adv-bar";
  tb.hidden = true;
  tb.style.cssText = "display:none;flex-basis:100%;flex-wrap:wrap;gap:6px;align-items:center;";
  tb.innerHTML = `
    <button class="imgv-adv-add">+ Text</button>
    <button class="imgv-adv-rect" title="Add rectangle">▭</button>
    <button class="imgv-adv-ellipse" title="Add ellipse">◯</button>
    <button class="imgv-adv-line" title="Add line">╱</button>
    <button class="imgv-adv-arrow" title="Add arrow">➤</button>
    <span class="imgv-sep"></span>
    <input class="imgv-adv-text imgv-adv-txtctl" type="text" placeholder="Selected text" style="min-width:120px">
    <label class="imgv-adv-txtctl" style="font-size:.8em">Size <input class="imgv-adv-size" type="number" min="6" max="400" value="${DEFAULTS.fontSize}" style="width:56px"></label>
    <select class="imgv-adv-font imgv-adv-txtctl" title="Font"><option value="system-ui, sans-serif">Sans</option><option value="Georgia, serif">Serif</option><option value="monospace">Mono</option><option value="Impact, sans-serif">Impact</option><option value="cursive">Cursive</option></select>
    <label style="font-size:.8em">Fill <input class="imgv-adv-fill" type="color" value="${DEFAULTS.fill}"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">BG <input class="imgv-adv-bg" type="color" value="${DEFAULTS.bg}"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">BG opacity <input class="imgv-adv-bgop" type="range" min="0" max="100" value="${DEFAULTS.bgOpacity * 100}" style="width:70px"></label>
    <label class="imgv-adv-shpctl" style="font-size:.8em">Stroke <input class="imgv-adv-stroke" type="color" value="#1144aa"></label>
    <label class="imgv-adv-shpctl" style="font-size:.8em">Width <input class="imgv-adv-strokew" type="number" min="0" max="80" value="2" style="width:48px"></label>
    <button class="imgv-adv-del" title="Delete selected">🗑 Delete</button>`;
  bar.appendChild(tb);
  const $ = (s) => tb.querySelector(s);
  function textNodeOf(label) {
    return label.findOne("Text");
  }
  function tagNodeOf(label) {
    return label.findOne("Tag");
  }
  function syncToolbar() {
    const has = !!selected, label = isLabel(selected);
    tb.querySelectorAll(".imgv-adv-txtctl").forEach((el) => {
      el.style.display = label ? "" : "none";
    });
    tb.querySelectorAll(".imgv-adv-shpctl").forEach((el) => {
      el.style.display = has && !label ? "" : "none";
    });
    $(".imgv-adv-del").disabled = !has;
    $(".imgv-adv-fill").disabled = !has;
    if (!has) return;
    if (label) {
      const t = textNodeOf(selected), tag = tagNodeOf(selected);
      $(".imgv-adv-text").value = t.text();
      $(".imgv-adv-size").value = Math.round(t.fontSize());
      $(".imgv-adv-font").value = t.fontFamily();
      $(".imgv-adv-fill").value = rgbToHex(t.fill());
      $(".imgv-adv-bg").value = rgbToHex(tag.fill());
      $(".imgv-adv-bgop").value = Math.round((tag.opacity() ?? 1) * 100);
    } else {
      $(".imgv-adv-fill").value = rgbToHex(selected.fill() || "#3388ff");
      $(".imgv-adv-stroke").value = rgbToHex(selected.stroke() || "#1144aa");
      $(".imgv-adv-strokew").value = Math.round(selected.strokeWidth() || 0);
    }
  }
  function select(label) {
    selected = label;
    tr.nodes(label ? [label] : []);
    layer.draw();
    syncToolbar();
    refreshLayers();
  }
  function placeObject(node) {
    node.name("obj");
    node.on("click tap", (e) => {
      e.cancelBubble = true;
      if (interactive) select(node);
    });
    node.on("dragstart transformstart", () => snap());
    node.on("transformend dragend", () => markDirty());
    layer.add(node);
    select(node);
    markDirty();
  }
  function addShape(type) {
    snap();
    const cx = stageW / 2, cy = stageH / 2;
    const common = { x: cx - 60, y: cy - 40, draggable: true, fill: "#3388ff", stroke: "#1144aa", strokeWidth: 2 };
    let node;
    if (type === "rect") node = new Konva.Rect({ ...common, width: 120, height: 80, cornerRadius: 4 });
    else if (type === "ellipse") node = new Konva.Ellipse({ x: cx, y: cy, radiusX: 60, radiusY: 40, draggable: true, fill: "#3388ff", stroke: "#1144aa", strokeWidth: 2 });
    else if (type === "line") node = new Konva.Line({ points: [cx - 60, cy, cx + 60, cy], stroke: "#1144aa", strokeWidth: 4, hitStrokeWidth: 14, draggable: true });
    else node = new Konva.Arrow({ points: [cx - 60, cy, cx + 60, cy], stroke: "#1144aa", strokeWidth: 4, fill: "#1144aa", pointerLength: 12, pointerWidth: 12, hitStrokeWidth: 14, draggable: true });
    placeObject(node);
  }
  function addText() {
    snap();
    const label = new Konva.Label({ x: stageW / 2 - 60, y: stageH / 2 - 24, draggable: true });
    label.add(new Konva.Tag({ fill: DEFAULTS.bg, opacity: DEFAULTS.bgOpacity, cornerRadius: 4 }));
    label.add(new Konva.Text({ text: DEFAULTS.text, fontFamily: DEFAULTS.fontFamily, fontSize: DEFAULTS.fontSize, fill: DEFAULTS.fill, padding: 6 }));
    placeObject(label);
  }
  const isLabel = (n) => n && n.getClassName && n.getClassName() === "Label";
  stage.on("click tap", (e) => {
    if (e.target === stage && interactive) select(null);
  });
  $(".imgv-adv-add").addEventListener("click", addText);
  $(".imgv-adv-rect").addEventListener("click", () => addShape("rect"));
  $(".imgv-adv-ellipse").addEventListener("click", () => addShape("ellipse"));
  $(".imgv-adv-line").addEventListener("click", () => addShape("line"));
  $(".imgv-adv-arrow").addEventListener("click", () => addShape("arrow"));
  $(".imgv-adv-del").addEventListener("click", () => {
    if (!selected) return;
    snap();
    selected.destroy();
    select(null);
    markDirty();
  });
  $(".imgv-adv-text").addEventListener("input", () => {
    if (isLabel(selected)) {
      textNodeOf(selected).text($(".imgv-adv-text").value);
      layer.draw();
      refreshLayers();
      markDirty();
    }
  });
  $(".imgv-adv-size").addEventListener("input", () => {
    if (isLabel(selected)) {
      textNodeOf(selected).fontSize(parseInt($(".imgv-adv-size").value, 10) || DEFAULTS.fontSize);
      layer.draw();
      markDirty();
    }
  });
  $(".imgv-adv-font").addEventListener("change", () => {
    if (isLabel(selected)) {
      textNodeOf(selected).fontFamily($(".imgv-adv-font").value);
      layer.draw();
      markDirty();
    }
  });
  $(".imgv-adv-fill").addEventListener("input", () => {
    if (!selected) return;
    (isLabel(selected) ? textNodeOf(selected) : selected).fill($(".imgv-adv-fill").value);
    layer.draw();
    markDirty();
  });
  $(".imgv-adv-bg").addEventListener("input", () => {
    if (isLabel(selected)) {
      tagNodeOf(selected).fill($(".imgv-adv-bg").value);
      layer.draw();
      markDirty();
    }
  });
  $(".imgv-adv-bgop").addEventListener("input", () => {
    if (isLabel(selected)) {
      tagNodeOf(selected).opacity((parseInt($(".imgv-adv-bgop").value, 10) || 0) / 100);
      layer.draw();
      markDirty();
    }
  });
  $(".imgv-adv-stroke").addEventListener("input", () => {
    if (selected && !isLabel(selected)) {
      selected.stroke($(".imgv-adv-stroke").value);
      layer.draw();
      markDirty();
    }
  });
  $(".imgv-adv-strokew").addEventListener("input", () => {
    if (selected && !isLabel(selected)) {
      selected.strokeWidth(parseInt($(".imgv-adv-strokew").value, 10) || 0);
      layer.draw();
      markDirty();
    }
  });
  syncToolbar();
  const panel = document.createElement("div");
  panel.className = "imgv-adv-layers";
  panel.hidden = true;
  panel.style.cssText = "position:absolute;top:8px;right:8px;z-index:7;width:172px;max-height:60%;overflow:auto;background:var(--bg-2,#222);color:var(--fg,#eee);border:1px solid var(--border,#444);border-radius:6px;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.3);";
  stageHost.appendChild(panel);
  function labelName(node) {
    if (isLabel(node)) {
      const t = textNodeOf(node)?.text?.();
      if (t && t.trim()) return t.trim().slice(0, 18);
    }
    return { Rect: "Rectangle", Ellipse: "Ellipse", Line: "Line", Arrow: "Arrow", Label: "Text" }[node.getClassName?.()] || "Layer";
  }
  function refreshLayers() {
    const labels = layer.find(".obj").slice().reverse();
    panel.innerHTML = `<div style="padding:5px 8px;font-weight:600;border-bottom:1px solid var(--border,#444)">Layers (${labels.length})</div>`;
    labels.forEach((label) => {
      const row = document.createElement("div");
      row.style.cssText = `display:flex;align-items:center;gap:4px;padding:3px 6px;cursor:pointer;${label === selected ? "background:var(--accent,#2563eb);color:#fff;" : ""}`;
      const eye = document.createElement("button");
      eye.textContent = label.visible() ? "👁" : "🚫";
      eye.title = "Show / hide";
      eye.style.cssText = "background:none;border:none;cursor:pointer;font-size:12px;padding:0";
      eye.addEventListener("click", (e) => {
        e.stopPropagation();
        snap();
        label.visible(!label.visible());
        if (!label.visible() && selected === label) select(null);
        layer.draw();
        refreshLayers();
        markDirty();
      });
      const name = document.createElement("span");
      name.textContent = labelName(label);
      name.style.cssText = "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
      const up = mkMini("↑", "Bring forward", (e) => {
        e.stopPropagation();
        snap();
        label.moveUp();
        tr.moveToTop();
        layer.draw();
        refreshLayers();
        markDirty();
      });
      const dn = mkMini("↓", "Send backward", (e) => {
        e.stopPropagation();
        snap();
        label.moveDown();
        tr.moveToTop();
        layer.draw();
        refreshLayers();
        markDirty();
      });
      const del = mkMini("🗑", "Delete", (e) => {
        e.stopPropagation();
        snap();
        if (selected === label) select(null);
        label.destroy();
        layer.draw();
        refreshLayers();
        markDirty();
      });
      row.append(eye, name, up, dn, del);
      row.addEventListener("click", () => {
        if (label.visible()) select(label);
      });
      panel.appendChild(row);
    });
  }
  function mkMini(txt, title, fn) {
    const b = document.createElement("button");
    b.textContent = txt;
    b.title = title;
    b.style.cssText = "background:none;border:none;color:inherit;cursor:pointer;font-size:11px;padding:0 1px";
    b.addEventListener("click", fn);
    return b;
  }
  function flattenToCanvas() {
    const wasSel = selected;
    select(null);
    const nW = img.naturalWidth || naturalW, nH = img.naturalHeight || naturalH;
    const canvas = document.createElement("canvas");
    canvas.width = nW;
    canvas.height = nH;
    const g = canvas.getContext("2d");
    g.drawImage(img, 0, 0, nW, nH);
    const overlay = stage.toCanvas({ pixelRatio: nW / stageW });
    g.drawImage(overlay, 0, 0, nW, nH);
    if (wasSel) select(wasSel);
    return canvas;
  }
  function relayout() {
    const hostR = stageHost.getBoundingClientRect();
    const r = img.getBoundingClientRect();
    container.style.left = Math.round(r.left - hostR.left) + "px";
    container.style.top = Math.round(r.top - hostR.top) + "px";
    const s = stageW ? r.width / stageW : 1;
    container.style.transformOrigin = "top left";
    container.style.transform = Math.abs(s - 1) < 1e-3 ? "" : `scale(${s})`;
  }
  function rebaseline() {
    naturalW = img.naturalWidth || naturalW;
    naturalH = img.naturalHeight || naturalH;
    const r = img.getBoundingClientRect();
    stageW = Math.max(1, Math.round(r.width));
    stageH = Math.max(1, Math.round(r.height));
    stage.width(stageW);
    stage.height(stageH);
    container.style.width = stageW + "px";
    container.style.height = stageH + "px";
    container.style.transform = "";
    relayout();
  }
  function applyGeometry(affine) {
    const oldK = naturalW / stageW;
    const objs = layer.find(".obj");
    const olds = objs.map((n) => n.getTransform().copy());
    naturalW = img.naturalWidth || naturalW;
    naturalH = img.naturalHeight || naturalH;
    const r = img.getBoundingClientRect();
    stageW = Math.max(1, Math.round(r.width));
    stageH = Math.max(1, Math.round(r.height));
    stage.width(stageW);
    stage.height(stageH);
    container.style.width = stageW + "px";
    container.style.height = stageH + "px";
    container.style.transform = "";
    const newK = naturalW / stageW;
    const Sk = new Konva.Transform([oldK, 0, 0, oldK, 0, 0]);
    const A = new Konva.Transform(affine);
    const InvK = new Konva.Transform([1 / newK, 0, 0, 1 / newK, 0, 0]);
    select(null);
    objs.forEach((node, i) => {
      const d = InvK.copy().multiply(A).multiply(Sk).multiply(olds[i]).decompose();
      node.setAttrs({ x: d.x, y: d.y, rotation: d.rotation, scaleX: d.scaleX, scaleY: d.scaleY, skewX: d.skewX, skewY: d.skewY, offsetX: 0, offsetY: 0 });
    });
    relayout();
    layer.draw();
    refreshLayers();
    markDirty();
  }
  function clear() {
    layer.find(".obj").forEach((n) => n.destroy());
    select(null);
    layer.draw();
    refreshLayers();
    markDirty();
  }
  return {
    addText,
    isEmpty: () => layer.find(".obj").length === 0,
    objectCount: () => layer.find(".obj").length,
    setInteractive(on) {
      interactive = on;
      tb.hidden = !on;
      tb.style.display = on ? "flex" : "none";
      panel.hidden = !on;
      panel.style.display = on ? "block" : "none";
      container.style.pointerEvents = on ? "auto" : "none";
      if (on) refreshLayers();
      else select(null);
    },
    // Overlay history bridge for editor-core's unified undo: serialize the current
    // objects to JSON, and restore a snapshot (null/empty → clear). restore must NOT
    // push its own undo entry (editor-core owns the stack) — rebuild/clear don't.
    serialize: () => layer.toJSON(),
    restore: (json) => {
      if (json) rebuild(json);
      else clear();
    },
    flattenToCanvas,
    relayout,
    rebaseline,
    applyGeometry,
    clear,
    destroy() {
      tr.destroy();
      stage.destroy();
      container.remove();
      tb.remove();
      panel.remove();
    }
  };
  function rebuild(json) {
    layer.destroyChildren();
    const tmp = Konva.Node.create(json);
    tmp.find(".obj").forEach((src) => {
      const node = src.clone();
      node.draggable(true);
      node.on("click tap", (e) => {
        e.cancelBubble = true;
        if (interactive) select(node);
      });
      node.on("dragstart transformstart", () => snap());
      node.on("transformend dragend", () => markDirty());
      layer.add(node);
    });
    layer.add(tr);
    select(null);
    markDirty();
  }
}
function rgbToHex(c) {
  if (typeof c !== "string") return "#000000";
  if (c[0] === "#") return c.length === 7 ? c : c;
  const m = c.match(/\d+/g);
  if (!m) return "#000000";
  return "#" + m.slice(0, 3).map((n) => (+n).toString(16).padStart(2, "0")).join("");
}

// ../../docs/types/image/gif-decode.js
var mod = null;
async function loadGifuct() {
  if (!mod) mod = await import("../../vendor/gifuct/gifuct.esm.js");
  return mod;
}
function compositePatch(full, fullW, frame) {
  const { dims, patch, disposalType } = frame;
  const { top, left, width, height } = dims;
  const prev = disposalType === 3 ? full.slice() : null;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pi = (y * width + x) * 4;
      if (patch[pi + 3] === 0) continue;
      const fi = ((top + y) * fullW + (left + x)) * 4;
      full[fi] = patch[pi];
      full[fi + 1] = patch[pi + 1];
      full[fi + 2] = patch[pi + 2];
      full[fi + 3] = patch[pi + 3];
    }
  }
  return prev;
}
function applyDisposal(full, fullW, frame, prev) {
  const { dims, disposalType } = frame;
  const { top, left, width, height } = dims;
  if (disposalType === 2) {
    for (let y = 0; y < height; y++) {
      const row = ((top + y) * fullW + left) * 4;
      full.fill(0, row, row + width * 4);
    }
  } else if (disposalType === 3 && prev) {
    full.set(prev);
  }
}
async function decodeGifBuffers(bytes) {
  const { parseGIF, decompressFrames } = await loadGifuct();
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const gif = parseGIF(buf);
  const raw = decompressFrames(gif, true);
  const width = gif.lsd.width;
  const height = gif.lsd.height;
  const full = new Uint8ClampedArray(width * height * 4);
  const frames = [];
  for (const frame of raw) {
    const prev = compositePatch(full, width, frame);
    frames.push({ rgba: full.slice(), delayMs: frame.delay || 100 });
    applyDisposal(full, width, frame, prev);
  }
  return { width, height, frames };
}
async function decodeGifFrames(bytes) {
  const { width, height, frames } = await decodeGifBuffers(bytes);
  return {
    width,
    height,
    frames: frames.map(({ rgba, delayMs }) => {
      const canvas = makeCanvas(width, height);
      canvas.getContext("2d").putImageData(new ImageData(rgba, width, height), 0, 0);
      return { canvas, delayMs };
    })
  };
}
function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
async function frameToPngBlob(canvas) {
  if (canvas.convertToBlob) return canvas.convertToBlob({ type: "image/png" });
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

// ../../docs/types/image/gif-anim.js
function mountGifPlayer({ host, bytes, openBlob }) {
  host.innerHTML = "";
  const root = document.createElement("div");
  root.className = "gifv-root";
  root.innerHTML = `
    <div class="gifv-stage"><canvas class="gifv-canvas"></canvas></div>
    <div class="gifv-bar">
      <button class="gifv-play" title="Play / pause" disabled>❚❚</button>
      <input class="gifv-scrub" type="range" min="0" max="0" value="0" step="1" disabled />
      <span class="gifv-count">…</span>
      <label class="gifv-loop"><input class="gifv-loop-chk" type="checkbox" checked /> loop</label>
      <button class="gifv-split" title="Decompose into individual PNG frames" disabled>✂ Split frames</button>
    </div>
    <div class="gifv-frames" hidden></div>`;
  host.appendChild(root);
  injectStyle2();
  const canvas = root.querySelector(".gifv-canvas");
  const cx = canvas.getContext("2d");
  const playBtn = root.querySelector(".gifv-play");
  const scrub = root.querySelector(".gifv-scrub");
  const count = root.querySelector(".gifv-count");
  const loopChk = root.querySelector(".gifv-loop-chk");
  const splitBtn = root.querySelector(".gifv-split");
  const framesBox = root.querySelector(".gifv-frames");
  let frames = [];
  let idx = 0;
  let playing = true;
  let timer = null;
  let destroyed = false;
  function show(i) {
    if (!frames.length) return;
    idx = (i % frames.length + frames.length) % frames.length;
    cx.clearRect(0, 0, canvas.width, canvas.height);
    cx.drawImage(frames[idx].canvas, 0, 0);
    scrub.value = String(idx);
    count.textContent = `${idx + 1}/${frames.length}`;
  }
  function tick() {
    if (destroyed || !playing || frames.length < 2) return;
    timer = setTimeout(() => {
      const next = idx + 1;
      if (next >= frames.length && !loopChk.checked) {
        setPlaying(false);
        return;
      }
      show(next);
      tick();
    }, Math.max(20, frames[idx].delayMs));
  }
  function setPlaying(on) {
    playing = on && frames.length > 1;
    playBtn.textContent = playing ? "❚❚" : "▶";
    clearTimeout(timer);
    if (playing) tick();
  }
  playBtn.addEventListener("click", () => setPlaying(!playing));
  scrub.addEventListener("input", () => {
    setPlaying(false);
    show(Number(scrub.value));
  });
  loopChk.addEventListener("change", () => {
    if (loopChk.checked && !playing) setPlaying(true);
  });
  splitBtn.addEventListener("click", () => splitFrames());
  (async () => {
    let decoded;
    try {
      decoded = await decodeGifFrames(bytes);
    } catch (e) {
      if (destroyed) return;
      count.textContent = "decode failed";
      return;
    }
    if (destroyed) return;
    frames = decoded.frames;
    canvas.width = decoded.width;
    canvas.height = decoded.height;
    scrub.max = String(Math.max(0, frames.length - 1));
    show(0);
    const animated = frames.length > 1;
    playBtn.disabled = !animated;
    scrub.disabled = !animated;
    splitBtn.disabled = frames.length < 1;
    if (animated) setPlaying(true);
    else {
      playBtn.textContent = "▶";
      count.textContent = `1/1`;
    }
  })();
  let splitting = false;
  async function splitFrames() {
    if (splitting || !frames.length) return;
    splitting = true;
    splitBtn.disabled = true;
    framesBox.hidden = false;
    framesBox.innerHTML = '<span class="gifv-frames-h">Frames</span>';
    for (let i = 0; i < frames.length; i++) {
      const blob = await frameToPngBlob(frames[i].canvas);
      if (destroyed) return;
      framesBox.appendChild(buildFrameRow(i, blob));
    }
    splitting = false;
    splitBtn.disabled = false;
  }
  function buildFrameRow(i, blob) {
    const name = `frame-${String(i + 1).padStart(3, "0")}.png`;
    const url = URL.createObjectURL(blob);
    const row = document.createElement("div");
    row.className = "gifv-frame";
    const thumb = document.createElement("img");
    thumb.className = "gifv-thumb";
    thumb.src = url;
    thumb.alt = name;
    const label = document.createElement("span");
    label.className = "gifv-frame-n";
    label.textContent = name;
    const dl = document.createElement("a");
    dl.className = "gifv-dl";
    dl.href = url;
    dl.download = name;
    dl.textContent = "⬇ Download";
    const open = document.createElement("button");
    open.className = "gifv-open";
    open.textContent = "↗ Open";
    open.disabled = typeof openBlob !== "function";
    open.addEventListener("click", () => openBlob(blob, name, { mime: "image/png" }));
    row.append(thumb, label, dl, open);
    objectUrls.push(url);
    return row;
  }
  const objectUrls = [];
  return {
    destroy() {
      destroyed = true;
      clearTimeout(timer);
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
      root.remove();
    }
  };
}
function injectStyle2() {
  if (document.getElementById("gifv-style")) return;
  const s = document.createElement("style");
  s.id = "gifv-style";
  s.textContent = `
    .gifv-root { display:flex; flex-direction:column; gap:.5rem; height:100%; min-height:0; }
    .gifv-stage { flex:1; min-height:0; display:flex; align-items:center; justify-content:center; overflow:auto; background:#0000000d; }
    .gifv-canvas { max-width:100%; max-height:100%; image-rendering:auto; }
    .gifv-bar { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; padding:.25rem .25rem; }
    .gifv-bar button { cursor:pointer; }
    .gifv-bar button:disabled { cursor:default; opacity:.5; }
    .gifv-scrub { flex:1; min-width:120px; }
    .gifv-count { font-variant-numeric:tabular-nums; min-width:3.5em; text-align:center; }
    .gifv-loop { display:inline-flex; align-items:center; gap:.25rem; font-size:.85em; }
    .gifv-frames { display:flex; flex-direction:column; gap:.25rem; max-height:30%; overflow:auto; padding:.25rem; }
    .gifv-frames-h { font-weight:600; font-size:.85em; opacity:.8; }
    .gifv-frame { display:flex; align-items:center; gap:.5rem; }
    .gifv-thumb { width:40px; height:40px; object-fit:contain; background:#0000000d; border:1px solid #8884; }
    .gifv-frame-n { flex:1; font-size:.8em; font-variant-numeric:tabular-nums; }
    .gifv-dl, .gifv-open { font-size:.8em; cursor:pointer; }`;
  document.head.appendChild(s);
}

// ../../docs/types/image/renderer.js
var DOC_TPL = new URL("./doc.html", import.meta.url);
var EDIT_TOOLS_TPL = new URL("./edit-tools.html", import.meta.url);
var EDITABLE_MIME = /* @__PURE__ */ new Set(["image/png", "image/jpeg", "image/webp", "image/avif", "image/bmp", "image/gif"]);
async function render(intake, ctx = {}) {
  if (isSvg(intake)) {
    const DOMPurify = await loadGlobal2(vendor2("dompurify/purify.min.js"), "DOMPurify");
    DOMPurify.removed = [];
    const clean = DOMPurify.sanitize(intake.text || "", { USE_PROFILES: { svg: true, svgFilters: true } });
    return { bodyHtml: '<div class="img-doc">' + clean + "</div>", hadUnsafe: DOMPurify.removed.length > 0 };
  }
  if (mimeFor(intake) === "image/gif") {
    try {
      const decoded = await decodeGifFrames(intake.bytes);
      if (decoded.frames.length > 1) {
        const gifHost = document.createElement("div");
        gifHost.className = "imgv-doc";
        const player = mountGifPlayer({ host: gifHost, bytes: intake.bytes, openBlob: window.__fv?.openBlobFile?.bind(window.__fv) });
        return { parentNode: gifHost, revoke: () => player.destroy() };
      }
    } catch {
    }
  }
  const mime = mimeFor(intake);
  const url = URL.createObjectURL(new Blob([intake.bytes], { type: mime }));
  const canEdit = EDITABLE_MIME.has(mime);
  const host = document.createElement("div");
  host.className = "imgv-doc";
  const [docTpl, editToolsTpl] = await Promise.all([
    loadTemplate(DOC_TPL),
    canEdit ? loadTemplate(EDIT_TOOLS_TPL) : Promise.resolve("")
  ]);
  host.innerHTML = fill(docTpl, { filename: intake.filename, editTools: editToolsTpl });
  const {
    img,
    note,
    zoomLabel,
    asciiBtn,
    asciiOut,
    editInput,
    editSize,
    editColor,
    editApply,
    editReset,
    pencilBtn,
    eraserBtn,
    fillBtn,
    fillTol,
    fillTolV,
    fillMode,
    fillPercep,
    fillFeather,
    fillOpts,
    selectBtn,
    marqueeBtn,
    ellipseBtn,
    lassoBtn,
    deselectBtn,
    selInvertBtn,
    selCutBtn,
    moveBtn,
    drawColorPicker,
    drawSizePicker,
    undoBtn,
    redoBtn,
    exportFmt,
    editFont,
    bgBtn,
    bgTol,
    bgOk,
    bgX,
    cropBtn,
    cropApplyBtn,
    cropCancelBtn,
    resizeBtn,
    resizePanel,
    resizeW,
    resizeH,
    resizeLock,
    resizeApplyBtn,
    resizeCancelBtn,
    expandBtn,
    expandPanel,
    expandPad,
    expandTransparent,
    expandColor,
    expandApplyBtn,
    expandCancelBtn,
    rotLBtn,
    rotRBtn,
    flipHBtn,
    flipVBtn,
    filtersBtn,
    filtersPanel,
    fBrightness,
    fContrast,
    fSaturation,
    fHue,
    fApplyBtn,
    fResetBtn,
    levelsBtn,
    levelsPanel,
    lvBlack,
    lvWhite,
    lvGamma,
    lvApply,
    lvCancel,
    presetGrey,
    presetSepia,
    presetInvert
  } = queryEls(host, canEdit);
  let asciiMode = false;
  let jxlPngBytes = null;
  let drawCtl = null;
  let advController = null, advActive = false;
  const overlayActive = () => !!(advController && !advController.isEmpty());
  let selection = null;
  let pendingGeom = null;
  const hostOnBinaryEdit = ctx.onBinaryEdit;
  let lastRasterEdit = null;
  function emitBinaryEdit() {
    if (!hostOnBinaryEdit) return;
    if (overlayActive()) {
      hostOnBinaryEdit({
        dirty: true,
        mimeType: core.getExportMime(),
        getBytes: async () => {
          const canvas = advController.flattenToCanvas();
          const mt = core.getExportMime();
          const blob = await new Promise((r) => canvas.toBlob(r, mt, mt === "image/jpeg" ? 0.92 : void 0));
          return new Uint8Array(await blob.arrayBuffer());
        }
      });
    } else {
      hostOnBinaryEdit(lastRasterEdit);
    }
  }
  const core = createEditCore({
    img,
    url,
    mime,
    ctx: { ...ctx, onBinaryEdit: (payload) => {
      lastRasterEdit = payload;
      emitBinaryEdit();
    } },
    els: { editReset, exportFmt, undoBtn, redoBtn, dirtyIndicator: host.querySelector(".imgv-dirty-indicator") }
  });
  const els = {
    editInput,
    editSize,
    editColor,
    editFont,
    editApply,
    editReset,
    filtersBtn,
    filtersPanel,
    fBrightness,
    fContrast,
    fSaturation,
    fHue,
    fApplyBtn,
    fResetBtn,
    levelsBtn,
    levelsPanel,
    lvBlack,
    lvWhite,
    lvGamma,
    lvApply,
    lvCancel,
    presetGrey,
    presetSepia,
    presetInvert,
    bgBtn,
    bgTol,
    bgOk,
    bgX,
    exportFmt,
    rotLBtn,
    rotRBtn,
    flipHBtn,
    flipVBtn,
    cropBtn,
    cropApplyBtn,
    cropCancelBtn,
    resizeBtn,
    resizePanel,
    resizeW,
    resizeH,
    resizeLock,
    resizeApplyBtn,
    resizeCancelBtn,
    expandBtn,
    expandPanel,
    expandPad,
    expandTransparent,
    expandColor,
    expandApplyBtn,
    expandCancelBtn
  };
  if (canEdit) mountTabs(host);
  const editTools = [];
  const viewCtl = createView({
    host,
    img,
    zoomLabel,
    syncOverlay: () => drawCtl?.syncOverlay(),
    getOverlayEl: () => drawCtl?.getOverlayEl(),
    getAdv: () => advController,
    isEditModeActive: () => drawCtl?.isDrawMode() || editTools.some((t) => t.isActive && t.isActive()),
    isAscii: () => asciiMode
  });
  const apply = viewCtl.apply;
  const applyPan = viewCtl.applyPan;
  const view = { setNatural: (n) => {
    viewCtl.setNatural(n);
    selection?.clear();
  } };
  img.addEventListener("load", () => {
    if (!pendingGeom) return;
    const A = pendingGeom;
    pendingGeom = null;
    advController?.applyGeometry(A);
  });
  const isJxl = (intake.filename || "").split(".").pop()?.toLowerCase() === "jxl" || mime === "image/jxl";
  img.addEventListener("error", () => {
    if (isJxl) return;
  });
  if (isJxl) {
    img.hidden = true;
    note.hidden = false;
    note.textContent = "Decoding JPEG XL…";
    (async () => {
      try {
        const { decodeJxl } = await import("./jxl-decode.js");
        const id = await decodeJxl(intake.bytes);
        const c = document.createElement("canvas");
        c.width = id.width;
        c.height = id.height;
        c.getContext("2d").putImageData(id, 0, 0);
        const blob = await new Promise((r) => c.toBlob(r, "image/png"));
        jxlPngBytes = new Uint8Array(await blob.arrayBuffer());
        note.hidden = true;
        img.hidden = false;
        img.src = URL.createObjectURL(blob);
        viewCtl.setNatural(c.width);
      } catch (e) {
        note.hidden = false;
        img.hidden = true;
        note.textContent = "JPEG XL could not be decoded here: " + (e.message || e) + ". Download still works.";
      }
    })();
  } else {
    img.src = url;
    apply();
    dimensions(url).then((d) => {
      if (d) viewCtl.setNatural(d.w);
    });
  }
  let asciiStudio = null;
  async function toggleAscii() {
    if (!asciiMode && advActive) leaveAdv();
    asciiMode = !asciiMode;
    asciiBtn.textContent = asciiMode ? "Image" : "ASCII";
    asciiBtn.classList.toggle("active", asciiMode);
    host.querySelector(".imgv-bar").classList.toggle("imgv-ascii-on", asciiMode);
    host.querySelector(".imgv-stage").hidden = asciiMode;
    asciiOut.hidden = !asciiMode;
    if (asciiMode) {
      let curBytes, curMime;
      if (overlayActive()) {
        const mt = core.getExportMime();
        const canvas = advController.flattenToCanvas();
        const blob = await new Promise((r) => canvas.toBlob(r, mt, mt === "image/jpeg" ? 0.92 : void 0));
        curBytes = new Uint8Array(await blob.arrayBuffer());
        curMime = mt;
      } else {
        const eb = core.editedBlob;
        curBytes = eb ? new Uint8Array(await eb.arrayBuffer()) : jxlPngBytes || intake.bytes;
        curMime = eb ? eb.type || mime : jxlPngBytes ? "image/png" : mime;
      }
      try {
        if (!asciiStudio) {
          asciiBtn.disabled = true;
          asciiOut.style.padding = "0";
          const { mountAsciiStudio } = await import("./ascii/studio.js");
          asciiStudio = mountAsciiStudio(asciiOut, {
            bytes: curBytes,
            mime: curMime,
            filename: intake.filename,
            onActivate: () => recordStage3AsciiActivation({ file: intake.filename }),
            onBack: toggleAscii
            // 🖼 Image button in the studio toolbar returns here
          });
          asciiBtn.disabled = false;
        } else {
          asciiStudio.setImage({ bytes: curBytes, mime: curMime });
          recordStage3AsciiActivation({ file: intake.filename });
        }
      } catch (e) {
        asciiOut.textContent = "ASCII studio failed to load: " + (e.message || e);
        asciiBtn.disabled = false;
      }
      import("./ascii-screensaver.js").then(({ installScreensaver }) => {
        if (!host._ss) host._ss = installScreensaver(host, () => asciiMode && !asciiStudio?.isCameraActive?.());
        host._ss.start();
      });
    } else {
      host._ss?.stop();
      asciiStudio?.stopCamera?.();
      advController?.relayout();
    }
  }
  asciiBtn.addEventListener("click", toggleAscii);
  const toolsBtn = canEdit ? host.querySelector(".imgv-tools-btn") : null;
  if (toolsBtn) {
    const bar = host.querySelector(".imgv-bar");
    toolsBtn.hidden = false;
    bar.classList.add("imgv-tools-collapsed");
    toolsBtn.classList.remove("active");
    toolsBtn.addEventListener("click", () => {
      const open = !bar.classList.toggle("imgv-tools-collapsed");
      toolsBtn.classList.toggle("active", open);
      if (open && advActive) leaveAdv();
    });
  }
  const advBtn = canEdit ? host.querySelector(".imgv-adv-btn") : null;
  if (advBtn) {
    advBtn.hidden = false;
    advBtn.addEventListener("click", async () => {
      if (advActive) {
        leaveAdv();
        return;
      }
      host.querySelector(".imgv-bar").classList.add("imgv-tools-collapsed");
      toolsBtn?.classList.remove("active");
      advBtn.disabled = true;
      try {
        if (!advController) {
          advController = await mountAdvEdit({ host, img, pushUndo: core.pushUndo, onDirty: () => {
            host.querySelector(".imgv-dirty-indicator")?.removeAttribute("hidden");
            emitBinaryEdit();
          } });
          core.setOverlayHooks({ snapshot: () => advController.serialize(), restore: (j) => advController.restore(j) });
        }
        advActive = true;
        advController.setInteractive(true);
        if (advController.isEmpty()) advController.rebaseline();
        advBtn.classList.add("active");
        if (advController.objectCount() === 0) advController.addText();
      } catch (e) {
        advBtn.title = "Advanced editing failed: " + (e.message || e);
      }
      advBtn.disabled = false;
    });
  }
  function leaveAdv() {
    advActive = false;
    advController?.setInteractive(false);
    advBtn?.classList.remove("active");
  }
  function onGeometry(affine) {
    if (advController) pendingGeom = affine;
  }
  const textTool = mountTextTool({ host, img, mime, core, els });
  editTools.push(textTool);
  editReset?.addEventListener("click", () => {
    textTool.exitPlaceMode();
    if (advActive) leaveAdv();
    advController?.clear();
    core.reset();
  });
  const geometryTool = mountGeometry({ host, img, url, mime, core, view, els, onGeometry });
  editTools.push(geometryTool);
  selection = mountSelection({
    host,
    img,
    mime,
    els: { selectBtn, marqueeBtn, ellipseBtn, lassoBtn, moveBtn, deselectBtn },
    getFillOpts: () => ({ tol: parseInt(fillTol?.value || "12", 10), mode: fillMode?.value || "seed", perceptual: !!fillPercep?.checked }),
    onActivate: () => drawCtl?.setDrawMode(null),
    // selection is mutually exclusive with pencil/eraser/fill input
    onCommit: async (canvas) => {
      core.pushUndo();
      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      core.commitBlob(blob, { mime: "image/png" });
    }
  });
  editTools.push({ isActive: () => selection.isActive() });
  selInvertBtn?.addEventListener("click", () => selection.invert());
  selCutBtn?.addEventListener("click", async () => {
    const sel = selection.getMask();
    if (!sel) return;
    const c = document.createElement("canvas");
    c.width = sel.w;
    c.height = sel.h;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, sel.w, sel.h);
    const id = g.getImageData(0, 0, sel.w, sel.h);
    for (let p = 0; p < sel.data.length; p++) if (sel.data[p]) id.data[(p << 2) + 3] = 0;
    g.putImageData(id, 0, 0);
    core.pushUndo();
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    core.commitBlob(blob, { mime: "image/png" });
  });
  mountFilters({ img, mime, core, els });
  const compareBtn = canEdit ? host.querySelector(".imgv-compare") : null;
  let compareView = null;
  function exitCompare() {
    if (!compareView) return;
    compareView.destroy();
    compareView = null;
    img.style.display = "";
    const ov = drawCtl?.getOverlayEl();
    if (ov) ov.style.display = "";
    host.querySelector(".imgv-bar").classList.remove("imgv-compare-on");
    compareBtn?.classList.remove("active");
    apply();
  }
  compareBtn?.addEventListener("click", async () => {
    if (compareView) {
      exitCompare();
      return;
    }
    const stage = host.querySelector(".imgv-stage");
    img.style.display = "none";
    const ov = drawCtl?.getOverlayEl();
    if (ov) ov.style.display = "none";
    host.querySelector(".imgv-bar").classList.add("imgv-compare-on");
    compareBtn.classList.add("active");
    const { mountCompare } = await import("./compare-view.js");
    compareView = mountCompare(stage, { originalUrl: url, currentUrl: core.editedUrl || url, onClose: exitCompare });
  });
  drawCtl = createDrawTools({
    host,
    img,
    mime,
    core,
    getSelection: () => selection,
    applyPan,
    els: { pencilBtn, eraserBtn, fillBtn, fillTol, fillTolV, fillMode, fillPercep, fillFeather, fillOpts, drawColorPicker, drawSizePicker, undoBtn, redoBtn }
  });
  const unregisterUndoKeys = canEdit ? registerUndoKeys({ host, isEnabled: () => !asciiMode, doUndo: core.doUndo, doRedo: core.doRedo }) : null;
  const bgTool = mountBg({ img, url, core, els });
  editTools.push(bgTool);
  const bgChecker = canEdit ? host.querySelector(".imgv-bg-checker") : null;
  bgChecker?.addEventListener("change", () => img.classList.toggle("imgv-checker", bgChecker.checked));
  return { parentNode: host, revoke: () => {
    advController?.destroy();
    selection?.teardown();
    unregisterUndoKeys?.();
    viewCtl.teardown();
    compareView?.destroy?.();
    asciiStudio?.destroy?.();
    URL.revokeObjectURL(url);
    core.revoke();
    bgTool.teardown();
    host._ss?.stop();
  } };
}
export {
  render
};
