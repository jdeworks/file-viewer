// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/types/image/renderer.js (+ the edit modules it statically imports) by
// build/image/build.mjs. Rebuild:  node build/image/build.mjs  (run by scripts/check.sh).
// Exports render(). Shared core/* modules + every dynamic import() (jxl-decode, ascii/studio,
// ascii-screensaver, compare-view, gifuct/jxl wasm) + the new-URL HTML templates stay external —
// they are NOT inlined here. index.js's loadRenderer imports THIS file.


// docs/types/image/renderer.js
import { loadGlobal as loadGlobal3, vendor as vendor3 } from "../../core/script-loader.js";
import { loadTemplate, fill } from "../../core/template.js";

// docs/types/image/imglib.js
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

// docs/types/image/renderer.js
import { recordStage3AsciiActivation } from "../../games/metagame/viewer-actions.js";

// docs/types/image/edit-els.js
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
    cloneBtn: qe(".imgv-clone"),
    healBtn: qe(".imgv-heal"),
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
    curvesBtn: qe(".imgv-curves-btn"),
    curvesPanel: qe(".imgv-curves-panel"),
    curveCanvas: qe(".imgv-curve-canvas"),
    curveChannel: qe(".imgv-curve-ch"),
    curveApply: qe(".imgv-curve-apply"),
    curveReset: qe(".imgv-curve-reset"),
    curveCancel: qe(".imgv-curve-cancel"),
    convolveBtn: qe(".imgv-convolve-btn"),
    convolvePanel: qe(".imgv-convolve-panel"),
    convType: qe(".imgv-conv-type"),
    convStrength: qe(".imgv-conv-strength"),
    convApply: qe(".imgv-conv-apply"),
    convCancel: qe(".imgv-conv-cancel"),
    presetGrey: qe(".imgv-preset-grey"),
    presetSepia: qe(".imgv-preset-sepia"),
    presetInvert: qe(".imgv-preset-invert")
  };
}

// docs/types/image/view-controller.js
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
  function fitView() {
    fit = true;
    zoom = 1;
    resetView();
    apply();
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
    fitView,
    zoomAt,
    setNatural,
    teardown() {
      document.removeEventListener("keydown", onZoomKey);
    }
  };
}

// docs/types/image/fill.js
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

// docs/types/image/draw-overlay.js
function createDrawTools(ctx) {
  const { host, img, mime, core, els } = ctx;
  const {
    pencilBtn,
    eraserBtn,
    fillBtn,
    cloneBtn,
    healBtn,
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
  let drawMode = null, isEraserStroke = false, isCloneStroke = false, isHealStroke = false;
  let drawOverlay = null, drawOCtx = null, isPointerDown = false, lastPt = null, brushCursor = null;
  let cloneSource = null, cloneSrcCtx = null, cloneSrcPt = null, cloneOffset = null, cloneMarker = null;
  const cloneMode = () => drawMode === "clone" || drawMode === "heal";
  function syncOverlay() {
    selection()?.syncOverlay();
    if (!drawOverlay) return;
    drawOverlay.style.left = img.offsetLeft + "px";
    drawOverlay.style.top = img.offsetTop + "px";
    drawOverlay.style.width = img.offsetWidth + "px";
    drawOverlay.style.height = img.offsetHeight + "px";
    positionCloneMarker();
  }
  function positionCloneMarker() {
    if (!cloneMarker) return;
    if (!cloneSrcPt || !cloneMode() || !img.naturalWidth) {
      cloneMarker.style.display = "none";
      return;
    }
    const sx = img.offsetWidth / img.naturalWidth, sy = img.offsetHeight / img.naturalHeight;
    cloneMarker.style.left = img.offsetLeft + cloneSrcPt.x * sx + "px";
    cloneMarker.style.top = img.offsetTop + cloneSrcPt.y * sy + "px";
    cloneMarker.style.display = "block";
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
    cloneMarker = document.createElement("div");
    cloneMarker.className = "imgv-clone-src";
    cloneMarker.style.cssText = "position:absolute;width:12px;height:12px;border:1px solid #0ff;box-shadow:0 0 0 1px rgba(0,0,0,.7);border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);z-index:3;display:none;";
    stage.appendChild(cloneMarker);
    img.addEventListener("load", () => {
      if (drawOverlay && !isEraserStroke && !isCloneStroke && !isHealStroke) {
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
    if (!brushCursor || drawMode !== "pencil" && drawMode !== "eraser" && !cloneMode()) {
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
    cloneBtn?.classList.toggle("active", drawMode === "clone");
    healBtn?.classList.toggle("active", drawMode === "heal");
    if (!cloneMode()) {
      cloneSource = null;
      cloneSrcCtx = null;
      cloneSrcPt = null;
      cloneOffset = null;
      positionCloneMarker();
    }
    fillOpts.forEach((el) => {
      el.hidden = !(drawMode === "fill" || selection()?.isActive());
    });
    if (!drawOverlay && drawMode) buildOverlay();
    if (drawOverlay) {
      drawOverlay.style.pointerEvents = drawMode ? "auto" : "none";
      drawOverlay.style.cursor = drawMode === "eraser" ? "cell" : drawMode === "fill" ? "crosshair" : drawMode === "pencil" || cloneMode() ? "none" : "";
    }
    if (drawMode !== "pencil" && drawMode !== "eraser" && !cloneMode()) hideBrushCursor();
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
  function snapshotImg() {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext("2d", { willReadFrequently: true });
    if (mime === "image/jpeg") {
      g.fillStyle = "#fff";
      g.fillRect(0, 0, c.width, c.height);
    }
    g.drawImage(img, 0, 0);
    cloneSrcCtx = g;
    return c;
  }
  function maybeSetCloneSource(e) {
    const pt = ptToCanvas(e);
    if (e.altKey || !cloneSource) {
      cloneSource = snapshotImg();
      cloneSrcPt = pt;
      cloneOffset = null;
      positionCloneMarker();
      return true;
    }
    return false;
  }
  function cloneDab(p, sz) {
    drawOCtx.save();
    drawOCtx.beginPath();
    drawOCtx.arc(p.x, p.y, sz / 2, 0, Math.PI * 2);
    drawOCtx.clip();
    drawOCtx.clearRect(0, 0, drawOverlay.width, drawOverlay.height);
    drawOCtx.drawImage(cloneSource, cloneOffset.x, cloneOffset.y);
    drawOCtx.restore();
  }
  function healDab(p, sz) {
    const r = sz / 2;
    const x0 = Math.max(0, Math.floor(p.x - r)), y0 = Math.max(0, Math.floor(p.y - r));
    const x1 = Math.min(drawOverlay.width, Math.ceil(p.x + r)), y1 = Math.min(drawOverlay.height, Math.ceil(p.y + r));
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0 || !cloneSrcCtx) return;
    if (cloneSource.width < w || cloneSource.height < h) {
      cloneDab(p, sz);
      return;
    }
    const sx = Math.max(0, Math.min(cloneSource.width - w, Math.round(x0 - cloneOffset.x)));
    const sy = Math.max(0, Math.min(cloneSource.height - h, Math.round(y0 - cloneOffset.y)));
    const src = cloneSrcCtx.getImageData(sx, sy, w, h);
    const dst = drawOCtx.getImageData(x0, y0, w, h);
    const s = src.data, d = dst.data;
    let sr = 0, sg = 0, sb = 0, dr = 0, dg = 0, db = 0, n = 0;
    for (let i = 0; i < s.length; i += 4) {
      sr += s[i];
      sg += s[i + 1];
      sb += s[i + 2];
      dr += d[i];
      dg += d[i + 1];
      db += d[i + 2];
      n++;
    }
    const or = (dr - sr) / n, og = (dg - sg) / n, ob = (db - sb) / n;
    for (let i = 0; i < s.length; i += 4) {
      s[i] += or;
      s[i + 1] += og;
      s[i + 2] += ob;
    }
    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    tmp.getContext("2d").putImageData(src, 0, 0);
    drawOCtx.save();
    drawOCtx.beginPath();
    drawOCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
    drawOCtx.clip();
    drawOCtx.drawImage(tmp, x0, y0);
    drawOCtx.restore();
  }
  const dab = (p, sz) => (isHealStroke ? healDab : cloneDab)(p, sz);
  async function onPDown(e) {
    if (!drawMode || !drawOverlay) return;
    e.preventDefault();
    if (drawMode === "fill") {
      await doFill(e);
      return;
    }
    if (cloneMode() && maybeSetCloneSource(e)) return;
    isPointerDown = true;
    isEraserStroke = drawMode === "eraser";
    isCloneStroke = cloneMode();
    isHealStroke = drawMode === "heal";
    core.pushUndo();
    if (isEraserStroke || isCloneStroke) {
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
    if (!isEraserStroke && !isCloneStroke && img.naturalWidth && drawOverlay.width !== img.naturalWidth) {
      drawOverlay.width = img.naturalWidth;
      drawOverlay.height = img.naturalHeight;
    }
    lastPt = ptToCanvas(e);
    const sz = getCanvasBrushSize();
    if (isCloneStroke) {
      if (!cloneOffset) cloneOffset = { x: lastPt.x - cloneSrcPt.x, y: lastPt.y - cloneSrcPt.y };
      dab(lastPt, sz);
      return;
    }
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
    if (isCloneStroke) {
      const dx = pt.x - lastPt.x, dy = pt.y - lastPt.y, dist = Math.hypot(dx, dy), step = Math.max(1, sz / 4);
      for (let d = step; d < dist; d += step) dab({ x: lastPt.x + dx * d / dist, y: lastPt.y + dy * d / dist }, sz);
      dab(pt, sz);
      lastPt = pt;
      return;
    }
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
    if (isEraserStroke || isCloneStroke) {
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
    cloneBtn?.addEventListener("click", () => setDrawMode("clone"));
    healBtn?.addEventListener("click", () => setDrawMode("heal"));
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

// docs/types/image/editor-core.js
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

// docs/types/image/levels.js
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

// docs/types/image/edit-filters.js
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

// docs/types/image/curves.js
function normalizePoints(points) {
  const clamp = (v) => v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
  const pts = (points || []).map((p) => ({ x: clamp(p.x), y: clamp(p.y) })).sort((a, b) => a.x - b.x);
  const out = [];
  for (const p of pts) {
    if (out.length && out[out.length - 1].x === p.x) out[out.length - 1] = p;
    else out.push(p);
  }
  if (!out.length) return [{ x: 0, y: 0 }, { x: 255, y: 255 }];
  if (out[0].x > 0) out.unshift({ x: 0, y: out[0].y });
  if (out[out.length - 1].x < 255) out.push({ x: 255, y: out[out.length - 1].y });
  return out;
}
function buildCurveLUT(points) {
  const pts = normalizePoints(points);
  const n = pts.length;
  const lut = new Uint8ClampedArray(256);
  if (n < 2) {
    for (let i = 0; i < 256; i++) lut[i] = i;
    return lut;
  }
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const dx = [], m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = xs[i + 1] - xs[i];
    m[i] = (ys[i + 1] - ys[i]) / dx[i];
  }
  const t = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      t[i] = tau * a * m[i];
      t[i + 1] = tau * b * m[i];
    }
  }
  let seg = 0;
  for (let x = 0; x < 256; x++) {
    while (seg < n - 2 && x > xs[seg + 1]) seg++;
    const h = dx[seg], s = (x - xs[seg]) / h, s2 = s * s, s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    lut[x] = Math.round(h00 * ys[seg] + h10 * h * t[seg] + h01 * ys[seg + 1] + h11 * h * t[seg + 1]);
  }
  return lut;
}
function buildChannelLUTs(pts) {
  const master = buildCurveLUT(pts.rgb || []);
  const compose = (chPts) => {
    const ch = buildCurveLUT(chPts || []);
    const out = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) out[i] = master[ch[i]];
    return out;
  };
  return { r: compose(pts.r), g: compose(pts.g), b: compose(pts.b) };
}
function applyChannelLUTs(data, luts) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = luts.r[data[i]];
    data[i + 1] = luts.g[data[i + 1]];
    data[i + 2] = luts.b[data[i + 2]];
  }
}

// docs/types/image/edit-curves.js
function mountCurves({ img, mime, core, els }) {
  const { curvesBtn, curvesPanel, curveCanvas, curveChannel, curveApply, curveReset, curveCancel } = els;
  if (!curvesBtn || !curveCanvas) return { teardown() {
  } };
  const g = curveCanvas.getContext("2d");
  const W = curveCanvas.width, H = curveCanvas.height;
  const identity = () => [{ x: 0, y: 0 }, { x: 255, y: 255 }];
  const freshChannels = () => ({ rgb: identity(), r: identity(), g: identity(), b: identity() });
  const CH_COLOR = { rgb: "#6cf", r: "#f66", g: "#6f6", b: "#69f" };
  let channels = freshChannels(), activeCh = "rgb";
  let points = channels[activeCh];
  let src = null, sw = 0, sh = 0, openSrc = null, prevUrl = null, raf = 0, drag = -1;
  const toCanvas = (p) => ({ cx: p.x / 255 * W, cy: (1 - p.y / 255) * H });
  const fromEvent = (e) => {
    const r = curveCanvas.getBoundingClientRect();
    const cx = (e.clientX - r.left) * (W / r.width), cy = (e.clientY - r.top) * (H / r.height);
    return { x: Math.max(0, Math.min(255, cx / W * 255)), y: Math.max(0, Math.min(255, (1 - cy / H) * 255)) };
  };
  function draw() {
    g.clearRect(0, 0, W, H);
    g.fillStyle = "#1c1c1c";
    g.fillRect(0, 0, W, H);
    g.strokeStyle = "#3a3a3a";
    g.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const gx = i / 4 * W, gy = i / 4 * H;
      g.beginPath();
      g.moveTo(gx, 0);
      g.lineTo(gx, H);
      g.moveTo(0, gy);
      g.lineTo(W, gy);
      g.stroke();
    }
    g.strokeStyle = "#555";
    g.beginPath();
    g.moveTo(0, H);
    g.lineTo(W, 0);
    g.stroke();
    const lut = buildCurveLUT(points);
    g.strokeStyle = CH_COLOR[activeCh];
    g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x < 256; x++) {
      const px = x / 255 * W, py = (1 - lut[x] / 255) * H;
      x ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.stroke();
    g.fillStyle = "#fff";
    for (const p of points) {
      const { cx, cy } = toCanvas(p);
      g.beginPath();
      g.arc(cx, cy, 4, 0, 7);
      g.fill();
    }
  }
  function preview() {
    if (raf || !src) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!src) return;
      const out = new ImageData(new Uint8ClampedArray(src.data), sw, sh);
      applyChannelLUTs(out.data, buildChannelLUTs(channels));
      const c = document.createElement("canvas");
      c.width = sw;
      c.height = sh;
      c.getContext("2d").putImageData(out, 0, 0);
      c.toBlob((blob) => {
        if (!blob || !src) return;
        const u = URL.createObjectURL(blob);
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        prevUrl = u;
        img.src = u;
      }, mime === "image/jpeg" ? "image/jpeg" : "image/png");
    });
  }
  function hit(pt) {
    let best = -1, bd = 12 * 12;
    const a = toCanvas(pt);
    points.forEach((p, i) => {
      const b = toCanvas(p);
      const d = (a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  }
  curveCanvas.addEventListener("pointerdown", (e) => {
    if (!src) return;
    const pt = fromEvent(e);
    let i = hit(pt);
    if (i < 0) {
      points.push({ x: Math.round(pt.x), y: Math.round(pt.y) });
      points.sort((a, b) => a.x - b.x);
      i = points.findIndex((p) => p.x === Math.round(pt.x));
    }
    drag = i;
    curveCanvas.setPointerCapture(e.pointerId);
    draw();
    preview();
  });
  curveCanvas.addEventListener("pointermove", (e) => {
    if (drag < 0) return;
    const pt = fromEvent(e), last = points.length - 1, p = points[drag];
    p.y = Math.round(pt.y);
    if (drag === 0) p.x = 0;
    else if (drag === last) p.x = 255;
    else {
      const lo = points[drag - 1].x + 1, hi = points[drag + 1].x - 1;
      p.x = Math.max(lo, Math.min(hi, Math.round(pt.x)));
    }
    draw();
    preview();
  });
  const endDrag = () => {
    drag = -1;
  };
  curveCanvas.addEventListener("pointerup", endDrag);
  curveCanvas.addEventListener("pointercancel", endDrag);
  curveCanvas.addEventListener("dblclick", (e) => {
    const i = hit(fromEvent(e));
    if (i > 0 && i < points.length - 1) {
      points.splice(i, 1);
      draw();
      preview();
    }
  });
  function close(applied) {
    if (curvesPanel) curvesPanel.hidden = true;
    if (prevUrl) {
      URL.revokeObjectURL(prevUrl);
      prevUrl = null;
    }
    if (!applied && openSrc) img.src = openSrc;
    src = null;
    curvesBtn.classList.remove("active");
  }
  curvesBtn.addEventListener("click", async () => {
    if (!curvesPanel) return;
    if (!curvesPanel.hidden) {
      close(false);
      return;
    }
    const base = await core.loadBase();
    sw = base.naturalWidth;
    sh = base.naturalHeight;
    const c = document.createElement("canvas");
    c.width = sw;
    c.height = sh;
    const cx = c.getContext("2d", { willReadFrequently: true });
    if (mime === "image/jpeg") {
      cx.fillStyle = "#fff";
      cx.fillRect(0, 0, sw, sh);
    }
    cx.drawImage(base, 0, 0);
    src = cx.getImageData(0, 0, sw, sh);
    openSrc = img.src;
    channels = freshChannels();
    activeCh = "rgb";
    points = channels.rgb;
    if (curveChannel) curveChannel.value = "rgb";
    curvesPanel.hidden = false;
    curvesBtn.classList.add("active");
    draw();
  });
  curveChannel?.addEventListener("change", () => {
    activeCh = curveChannel.value in channels ? curveChannel.value : "rgb";
    points = channels[activeCh];
    draw();
  });
  curveReset?.addEventListener("click", () => {
    channels[activeCh] = identity();
    points = channels[activeCh];
    draw();
    preview();
  });
  curveCancel?.addEventListener("click", () => close(false));
  curveApply?.addEventListener("click", async () => {
    if (!src) return;
    const out = new ImageData(new Uint8ClampedArray(src.data), sw, sh);
    applyChannelLUTs(out.data, buildChannelLUTs(channels));
    const c = document.createElement("canvas");
    c.width = sw;
    c.height = sh;
    c.getContext("2d").putImageData(out, 0, 0);
    core.pushUndo();
    await core.commitCanvas(c);
    close(true);
  });
  return { teardown() {
    if (prevUrl) URL.revokeObjectURL(prevUrl);
  } };
}

// docs/types/image/convolve.js
var GAUSS = [1, 2, 1, 2, 4, 2, 1, 2, 1].map((v) => v / 16);
var IDENT = [0, 0, 0, 0, 1, 0, 0, 0, 0];
function buildKernel(type, strength) {
  const s = Math.max(0, Math.min(1, +strength || 0));
  const out = new Array(9);
  if (type === "sharpen") {
    for (let i = 0; i < 9; i++) out[i] = IDENT[i] + s * (IDENT[i] - GAUSS[i]);
  } else {
    for (let i = 0; i < 9; i++) out[i] = IDENT[i] * (1 - s) + GAUSS[i] * s;
  }
  return out;
}
function applyConvolution(data, w, h, kernel) {
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const di = (y * w + x) * 4;
      let r = 0, g = 0, b = 0, ki = 0;
      for (let ky = -1; ky <= 1; ky++) {
        const yy = y + ky < 0 ? 0 : y + ky >= h ? h - 1 : y + ky;
        for (let kx = -1; kx <= 1; kx++) {
          const xx = x + kx < 0 ? 0 : x + kx >= w ? w - 1 : x + kx;
          const si = (yy * w + xx) * 4;
          const wt = kernel[ki++];
          r += data[si] * wt;
          g += data[si + 1] * wt;
          b += data[si + 2] * wt;
        }
      }
      out[di] = r;
      out[di + 1] = g;
      out[di + 2] = b;
      out[di + 3] = data[di + 3];
    }
  }
  return out;
}

// docs/types/image/edit-convolve.js
function mountConvolve({ img, mime, core, els }) {
  const { convolveBtn, convolvePanel, convType, convStrength, convApply, convCancel } = els;
  if (!convolveBtn || !convolvePanel) return { teardown() {
  } };
  let src = null, sw = 0, sh = 0, openSrc = null, prevUrl = null, raf = 0;
  function processed() {
    const kernel = buildKernel(convType?.value || "blur", (+convStrength.value || 0) / 100);
    const out = new ImageData(applyConvolution(src.data, sw, sh, kernel), sw, sh);
    const c = document.createElement("canvas");
    c.width = sw;
    c.height = sh;
    c.getContext("2d").putImageData(out, 0, 0);
    return c;
  }
  function preview() {
    if (raf || !src) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!src) return;
      processed().toBlob((blob) => {
        if (!blob || !src) return;
        const u = URL.createObjectURL(blob);
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        prevUrl = u;
        img.src = u;
      }, mime === "image/jpeg" ? "image/jpeg" : "image/png");
    });
  }
  function close(applied) {
    convolvePanel.hidden = true;
    if (prevUrl) {
      URL.revokeObjectURL(prevUrl);
      prevUrl = null;
    }
    if (!applied && openSrc) img.src = openSrc;
    src = null;
    convolveBtn.classList.remove("active");
  }
  convolveBtn.addEventListener("click", async () => {
    if (!convolvePanel.hidden) {
      close(false);
      return;
    }
    const base = await core.loadBase();
    sw = base.naturalWidth;
    sh = base.naturalHeight;
    const c = document.createElement("canvas");
    c.width = sw;
    c.height = sh;
    const cx = c.getContext("2d", { willReadFrequently: true });
    if (mime === "image/jpeg") {
      cx.fillStyle = "#fff";
      cx.fillRect(0, 0, sw, sh);
    }
    cx.drawImage(base, 0, 0);
    src = cx.getImageData(0, 0, sw, sh);
    openSrc = img.src;
    if (convType) convType.value = "blur";
    if (convStrength) convStrength.value = "50";
    convolvePanel.hidden = false;
    convolveBtn.classList.add("active");
  });
  convType?.addEventListener("change", preview);
  convStrength?.addEventListener("input", preview);
  convCancel?.addEventListener("click", () => close(false));
  convApply?.addEventListener("click", async () => {
    if (!src) return;
    const c = processed();
    core.pushUndo();
    await core.commitCanvas(c);
    close(true);
  });
  return { teardown() {
    if (prevUrl) URL.revokeObjectURL(prevUrl);
  } };
}

// docs/types/image/edit-text.js
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

// docs/types/image/geometry-affine.js
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

// docs/types/image/edit-geometry.js
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

// docs/types/image/edit-bg.js
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

// docs/types/image/edit-undo-key.js
var active = null;
var installed = false;
function isTextEntry(t) {
  if (!t) return false;
  if (t.isContentEditable || t.tagName === "TEXTAREA") return true;
  if (t.tagName === "INPUT") return /^(|text|search|url|email|tel|password)$/i.test(t.type || "");
  return false;
}
var ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
function onKey(e) {
  if (!active || !active.host.isConnected) return;
  if (active.isEnabled && !active.isEnabled()) return;
  if (isTextEntry(e.target)) return;
  const arrow = ARROWS[e.key];
  if (arrow && active.onArrow && active.onArrow(arrow[0], arrow[1], e.shiftKey)) {
    e.preventDefault();
    return;
  }
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  if (k === "c" && active.onCopy) {
    if (active.onCopy()) e.preventDefault();
    return;
  }
  if (k === "v" && active.onPaste) {
    active.onPaste();
    e.preventDefault();
    return;
  }
  if (k !== "z" && k !== "y") return;
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

// docs/types/image/edit-tabs.js
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
/* Mode buttons stay together as one compact row; the edit toolbar drops to its
   own full-width row below so its changing length never nudges view controls. */
.imgv-mode-col{display:inline-flex;flex-direction:row;flex-wrap:nowrap;gap:4px;align-self:center;}
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

// docs/types/image/help-tab.js
import { loadGlobal, vendor } from "../../core/script-loader.js";
var GUIDE_URL = new URL("./editor-guide.md", import.meta.url);
var cssInjected = false;
function injectStyle2() {
  if (cssInjected) return;
  cssInjected = true;
  const s = document.createElement("style");
  s.id = "imgv-help-css";
  s.textContent = `
    .imgv-help{flex-basis:100%;max-height:min(60vh,560px);overflow:auto;padding:4px 14px 12px;
      line-height:1.55;font-size:13px;color:var(--fg);}
    .imgv-help h1{font-size:1.5em;margin:.2em 0 .4em;}
    .imgv-help h2{font-size:1.2em;margin:1.1em 0 .4em;border-bottom:1px solid var(--border);padding-bottom:3px;}
    .imgv-help h3{font-size:1.02em;margin:.9em 0 .3em;}
    .imgv-help p,.imgv-help ul,.imgv-help ol{margin:.4em 0;}
    .imgv-help ul,.imgv-help ol{padding-left:1.4em;}
    .imgv-help li{margin:.15em 0;}
    .imgv-help code{font-family:monospace;background:var(--bg-2,#0001);padding:.05em .35em;border-radius:4px;font-size:.92em;}
    .imgv-help blockquote{margin:.5em 0;padding:.2em .9em;border-left:3px solid var(--accent);opacity:.85;}
    .imgv-help a{color:var(--accent);}
    .imgv-help .imgv-help-status{opacity:.7;}`;
  document.head.appendChild(s);
}
function mountHelpTab(host) {
  const panel = host.querySelector('.imgv-tabpanel[data-tab="help"]');
  const tab = host.querySelector('.imgv-tab[data-tab="help"]');
  if (!panel || !tab) return;
  injectStyle2();
  const box = document.createElement("div");
  box.className = "imgv-help";
  box.innerHTML = '<p class="imgv-help-status">Loading guide…</p>';
  panel.appendChild(box);
  let started = false;
  async function renderOnce() {
    if (started) return;
    started = true;
    try {
      const [res, markdownit, DOMPurify] = await Promise.all([
        fetch(GUIDE_URL),
        loadGlobal(vendor("markdown-it/markdown-it.min.js"), "markdownit"),
        loadGlobal(vendor("dompurify/purify.min.js"), "DOMPurify")
      ]);
      const src = await res.text();
      const md = markdownit({ html: false, linkify: true, typographer: true });
      box.innerHTML = DOMPurify.sanitize(md.render(src));
    } catch (e) {
      started = false;
      box.innerHTML = `<p class="imgv-help-status">Could not load the guide: ${e && e.message || e}</p>`;
    }
  }
  tab.addEventListener("click", renderOnce);
  if (tab.classList.contains("active")) renderOnce();
}

// docs/types/image/pixel-clipboard.js
var clip = null;
function setClip(canvas) {
  clip = canvas;
}
function getClip() {
  return clip;
}
async function copyToSystem(canvas) {
  try {
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    if (blob && navigator.clipboard?.write && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    }
  } catch {
  }
}
async function readFromSystem() {
  try {
    if (!navigator.clipboard?.read) return null;
    for (const item of await navigator.clipboard.read()) {
      const type = item.types.find((t) => t.startsWith("image/"));
      if (type) return await blobToCanvas(await item.getType(type));
    }
  } catch {
  }
  return null;
}
async function blobToCanvas(blob) {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  c.getContext("2d").drawImage(bmp, 0, 0);
  return c;
}

// docs/types/image/ocr-ui.js
var OCR = "../../core/ocr/index.js";
var consented = false;
function ocrConsent(host, approxMB) {
  if (consented) return Promise.resolve(true);
  injectOcrStyle();
  return new Promise((resolve) => {
    const back = document.createElement("div");
    back.className = "imgv-ocr-backdrop";
    back.innerHTML = `
      <div class="imgv-ocr-dialog" role="dialog" aria-modal="true">
        <div class="imgv-ocr-h"><span style="font-size:20px">&#9888;</span> Extract text (OCR)</div>
        <p class="imgv-ocr-p">Text recognition runs fully offline in your browser, but the first
        run downloads the OCR engine (~${approxMB} MB: the recognizer + English language data).
        It is cached afterwards. Continue?</p>
        <div class="imgv-ocr-btns">
          <button class="imgv-ocr-go">Download &amp; run OCR</button>
          <button class="imgv-ocr-cancel">Cancel</button>
        </div>
      </div>`;
    (host.ownerDocument?.body || document.body).appendChild(back);
    const done = (ok) => {
      back.remove();
      if (ok) consented = true;
      resolve(ok);
    };
    back.querySelector(".imgv-ocr-go").addEventListener("click", () => done(true));
    back.querySelector(".imgv-ocr-cancel").addEventListener("click", () => done(false));
    back.addEventListener("click", (e) => {
      if (e.target === back) done(false);
    });
  });
}
function makePanel(host, title) {
  injectOcrStyle();
  host.querySelector(".imgv-ocr-panel")?.remove();
  const panel = document.createElement("div");
  panel.className = "imgv-ocr-panel";
  panel.innerHTML = `
    <div class="imgv-ocr-bar">
      <strong class="imgv-ocr-title">${title}</strong>
      <span class="imgv-ocr-status" aria-live="polite"></span>
      <button class="imgv-ocr-x" title="Close">✕</button>
    </div>
    <div class="imgv-ocr-controls"></div>
    <div class="imgv-ocr-body"></div>`;
  host.appendChild(panel);
  panel.querySelector(".imgv-ocr-x").addEventListener("click", () => panel.remove());
  return {
    panel,
    status: panel.querySelector(".imgv-ocr-status"),
    controls: panel.querySelector(".imgv-ocr-controls"),
    body: panel.querySelector(".imgv-ocr-body")
  };
}
async function openImageOcrPanel({ host, getCanvas }) {
  if (!await ocrConsent(host, 11)) return;
  const { status, controls, body } = makePanel(host, "Extract text (OCR)");
  controls.innerHTML = `
    <label class="imgv-ocr-chk"><input type="checkbox" class="imgv-ocr-digits"> Digits only</label>`;
  const digits = controls.querySelector(".imgv-ocr-digits");
  async function run() {
    status.textContent = "Recognizing…";
    body.innerHTML = "";
    digits.disabled = true;
    let result;
    try {
      const { recognize } = await import(OCR);
      result = await recognize(getCanvas(), { digits: digits.checked });
    } catch (e) {
      status.textContent = "OCR failed";
      body.innerHTML = `<div class="imgv-ocr-err">${e && e.message || e}</div>`;
      digits.disabled = false;
      return;
    }
    const text = result.text || "";
    status.textContent = text ? `${Math.round(result.confidence || 0)}% confidence` : "No text found";
    body.innerHTML = `
      <textarea class="imgv-ocr-out" readonly placeholder="(no text recognized)"></textarea>
      <div class="imgv-ocr-acts">
        <button class="imgv-ocr-copy">Copy</button>
        <button class="imgv-ocr-dl">Download .txt</button>
      </div>`;
    body.querySelector(".imgv-ocr-out").value = text;
    body.querySelector(".imgv-ocr-copy").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(text);
        status.textContent = "Copied";
      } catch {
      }
    });
    body.querySelector(".imgv-ocr-dl").addEventListener("click", async () => {
      const { download } = await import(OCR);
      download("extracted-text.txt", text, "text/plain");
    });
    digits.disabled = false;
  }
  digits.addEventListener("change", run);
  run();
}
async function openGifOcrPanel({ host, getFrames }) {
  const frames = getFrames();
  if (!frames || !frames.length) return;
  if (!await ocrConsent(host, 11)) return;
  const { status, controls, body } = makePanel(host, "GIF transcript (OCR)");
  const sources = [];
  let t = 0;
  for (const f of frames) {
    sources.push({ time: t, source: f.canvas });
    t += Math.max(0, f.delayMs || 0) / 1e3;
  }
  status.textContent = "Recognizing…";
  let cues;
  try {
    const { ocrFrames } = await import(OCR);
    cues = await ocrFrames(sources, { onProgress: ({ index, total }) => {
      status.textContent = `Recognizing… frame ${index + 1}/${total}`;
    } });
  } catch (e) {
    status.textContent = "OCR failed";
    body.innerHTML = `<div class="imgv-ocr-err">${e && e.message || e}</div>`;
    return;
  }
  const { FORMATS, toText, download } = await import(OCR);
  status.textContent = cues.length ? `${cues.length} cue${cues.length === 1 ? "" : "s"}` : "No text found";
  const opts = Object.entries(FORMATS).map(([k, f]) => `<option value="${k}">${f.label}</option>`).join("");
  controls.innerHTML = `
    <label class="imgv-ocr-chk">Format <select class="imgv-ocr-fmt">${opts}</select></label>
    <button class="imgv-ocr-dl">Download</button>`;
  body.innerHTML = `<textarea class="imgv-ocr-out" readonly placeholder="(no text recognized)"></textarea>`;
  const out = body.querySelector(".imgv-ocr-out");
  out.value = toText(cues);
  controls.querySelector(".imgv-ocr-dl").addEventListener("click", () => {
    const fmt = FORMATS[controls.querySelector(".imgv-ocr-fmt").value];
    download("gif-transcript." + fmt.ext, fmt.fn(cues), fmt.mime);
  });
}
function injectOcrStyle() {
  if (document.getElementById("imgv-ocr-style")) return;
  const s = document.createElement("style");
  s.id = "imgv-ocr-style";
  s.textContent = `
    .imgv-ocr-backdrop { position:fixed; inset:0; z-index:50; display:flex; align-items:center; justify-content:center; background:#0008; }
    .imgv-ocr-dialog { max-width:460px; margin:16px; padding:20px; border-radius:8px; background:var(--bg-2,#252525); color:var(--fg,#ddd); border:1px solid var(--border,#444); font-family:var(--font-ui,sans-serif); }
    .imgv-ocr-h { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:600; margin-bottom:10px; }
    .imgv-ocr-p { margin:0 0 16px; font-size:13px; line-height:1.6; opacity:.85; }
    .imgv-ocr-btns { display:flex; gap:10px; flex-wrap:wrap; }
    .imgv-ocr-go { padding:8px 16px; border:none; border-radius:5px; cursor:pointer; background:var(--accent,#4a8fff); color:#fff; font-size:13px; }
    .imgv-ocr-cancel { padding:8px 16px; border-radius:5px; cursor:pointer; background:transparent; border:1px solid var(--border,#444); color:var(--fg,#ccc); font-size:13px; }
    .imgv-ocr-panel { position:absolute; top:8px; right:8px; z-index:12; width:min(320px,calc(100% - 16px)); display:flex; flex-direction:column; gap:6px; padding:8px; border-radius:8px; background:var(--bg-2,#252525); color:var(--fg,#ddd); border:1px solid var(--border,#444); box-shadow:0 4px 16px #0006; font-family:var(--font-ui,sans-serif); font-size:12px; }
    .imgv-ocr-bar { display:flex; align-items:center; gap:8px; }
    .imgv-ocr-title { flex:0 0 auto; }
    .imgv-ocr-status { flex:1; opacity:.75; font-variant-numeric:tabular-nums; }
    .imgv-ocr-x { border:none; background:transparent; color:inherit; cursor:pointer; font-size:13px; }
    .imgv-ocr-controls { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .imgv-ocr-chk { display:inline-flex; align-items:center; gap:4px; }
    .imgv-ocr-out { width:100%; min-height:96px; box-sizing:border-box; resize:vertical; font-family:monospace; font-size:12px; }
    .imgv-ocr-acts { display:flex; gap:8px; margin-top:6px; }
    .imgv-ocr-panel button { cursor:pointer; }
    .imgv-ocr-err { color:#f88; }`;
  document.head.appendChild(s);
}

// docs/types/image/edit-select-masks.js
function rectMask(a, b, w, h) {
  const x0 = Math.max(0, Math.min(w, Math.min(a.x, b.x))), x1 = Math.max(0, Math.min(w, Math.max(a.x, b.x)));
  const y0 = Math.max(0, Math.min(h, Math.min(a.y, b.y))), y1 = Math.max(0, Math.min(h, Math.max(a.y, b.y)));
  if (x1 - x0 < 2 || y1 - y0 < 2) return null;
  const m = new Uint8Array(w * h);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * w + x] = 1;
  return { m, w, h };
}
function maskFromPath(draw, w, h) {
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
function ellipseMask(a, b, w, h) {
  const rx = Math.abs(b.x - a.x) / 2, ry = Math.abs(b.y - a.y) / 2;
  if (rx < 1 || ry < 1) return null;
  return maskFromPath((g) => g.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, rx, ry, 0, 0, Math.PI * 2), w, h);
}
function lassoMask(pts, w, h) {
  if (!pts || pts.length < 3) return null;
  return maskFromPath((g) => {
    pts.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y));
    g.closePath();
  }, w, h);
}
function translateMask(src, w, h, dx, dy) {
  const out = new Uint8Array(w * h);
  if (!dx && !dy) {
    out.set(src);
    return out;
  }
  for (let p = 0; p < src.length; p++) {
    if (!src[p]) continue;
    const x = p % w + dx, y = (p / w | 0) + dy;
    if (x >= 0 && x < w && y >= 0 && y < h) out[y * w + x] = 1;
  }
  return out;
}

// docs/types/image/edit-select.js
function mountSelection({ host, img, mime, els, getFillOpts, onActivate, onCommit }) {
  const { selectBtn, marqueeBtn, ellipseBtn, lassoBtn, moveBtn, deselectBtn } = els;
  if (!selectBtn) return { isActive: () => false, hasSelection: () => false, getMask: () => null, copySelection: () => null, clipFillInPlace() {
  }, async clipCanvas() {
  }, invert() {
  }, nudge() {
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
  let moving = false, moveStart = null, moveBaseDx = 0, moveBaseDy = 0;
  let floating = false, holedCanvas = null, pieceCanvas = null, baseMask = null, floatDx = 0, floatDy = 0;
  let selCanvas = null, selCtx = null, selBuf = null, edgeIdx = null;
  let antsRAF = 0, antsPhase = 0, antsLast = 0;
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
      dragFloat(ptToCanvas(e));
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
      moving = false;
      return;
    }
    if (!dragging) return;
    dragging = false;
    const pt = ptToCanvas(e);
    const w = img.naturalWidth || 1, h = img.naturalHeight || 1;
    if (mode === "marquee") setMask(rectMask(dragStart, pt, w, h));
    else if (mode === "ellipse") setMask(ellipseMask(dragStart, pt, w, h));
    else if (mode === "lasso") {
      const pts = lassoPts;
      lassoPts = null;
      setMask(lassoMask(pts, w, h));
    }
  }
  function liftFloat() {
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
    baseMask = mask.slice();
    floating = true;
    floatDx = 0;
    floatDy = 0;
  }
  function startMove(e) {
    if (!mask) return;
    e.preventDefault();
    if (!floating) liftFloat();
    moving = true;
    moveStart = ptToCanvas(e);
    moveBaseDx = floatDx;
    moveBaseDy = floatDy;
    try {
      ov.setPointerCapture(e.pointerId);
    } catch {
    }
    buildSelBuf();
    paintAnts();
  }
  function dragFloat(pt) {
    setFloatOffset(moveBaseDx + (pt.x - moveStart.x), moveBaseDy + (pt.y - moveStart.y));
  }
  function setFloatOffset(dx, dy) {
    floatDx = dx;
    floatDy = dy;
    mask = translateMask(baseMask, mw, mh, floatDx, floatDy);
    buildSelBuf();
    paintAnts();
  }
  function stampFloat() {
    if (!floating) return;
    const out = document.createElement("canvas");
    out.width = mw;
    out.height = mh;
    const og = out.getContext("2d");
    og.drawImage(holedCanvas, 0, 0);
    og.drawImage(pieceCanvas, floatDx, floatDy);
    floating = false;
    holedCanvas = pieceCanvas = null;
    baseMask = null;
    floatDx = floatDy = 0;
    compose();
    onCommit?.(out);
  }
  function nudge(dx, dy, outlineOnly) {
    if (!mask) return;
    if (outlineOnly) {
      if (floating) stampFloat();
      baseMask = baseMask || mask;
      mask = translateMask(mask, mw, mh, dx, dy);
      buildSelBuf();
      paintAnts();
      return;
    }
    if (!floating) liftFloat();
    setFloatOffset(floatDx + dx, floatDy + dy);
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
    if (floating) stampFloat();
    mask = res.m;
    mw = res.w;
    mh = res.h;
    render2();
    if (deselectBtn) deselectBtn.hidden = false;
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
    if (floating) stampFloat();
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
    selCanvas = document.createElement("canvas");
    selCanvas.width = mw;
    selCanvas.height = mh;
    selCtx = selCanvas.getContext("2d");
    selBuf = selCtx.createImageData(mw, mh);
    buildSelBuf();
    paintAnts();
    startAnts();
  }
  function buildSelBuf() {
    if (!selBuf) return;
    const d = selBuf.data;
    d.fill(0);
    const edges = [];
    for (let p = 0; p < mw * mh; p++) {
      if (!mask[p]) continue;
      const x = p % mw, y = p / mw | 0;
      const edge = x === 0 || y === 0 || x === mw - 1 || y === mh - 1 || !mask[p - 1] || !mask[p + 1] || !mask[p - mw] || !mask[p + mw];
      if (edge) {
        edges.push(p);
        continue;
      }
      const i = p << 2;
      d[i] = 0;
      d[i + 1] = 132;
      d[i + 2] = 255;
      d[i + 3] = 48;
    }
    edgeIdx = Int32Array.from(edges);
  }
  function paintAnts() {
    if (!selBuf || !edgeIdx || !selCtx) return;
    const d = selBuf.data, ph = antsPhase | 0;
    for (let k = 0; k < edgeIdx.length; k++) {
      const p = edgeIdx[k];
      const v = (p % mw + (p / mw | 0) + ph & 7) < 4 ? 0 : 255;
      const i = p << 2;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 255;
    }
    selCtx.putImageData(selBuf, 0, 0);
    compose();
  }
  function compose() {
    if (!octx) return;
    octx.clearRect(0, 0, ov.width, ov.height);
    if (floating && holedCanvas) {
      octx.drawImage(holedCanvas, 0, 0);
      octx.drawImage(pieceCanvas, floatDx, floatDy);
    }
    if (selCanvas) octx.drawImage(selCanvas, 0, 0);
  }
  function startAnts() {
    stopAnts();
    const step = (t) => {
      if (!mask) {
        antsRAF = 0;
        return;
      }
      if (!dragging && !moving && t - antsLast > 80) {
        antsPhase = antsPhase + 1 & 7;
        antsLast = t;
        paintAnts();
      }
      antsRAF = requestAnimationFrame(step);
    };
    antsRAF = requestAnimationFrame(step);
  }
  function stopAnts() {
    if (antsRAF) cancelAnimationFrame(antsRAF);
    antsRAF = 0;
  }
  function setMode(m) {
    if (floating && m !== "move") stampFloat();
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
    stopAnts();
    mask = null;
    mw = mh = 0;
    selBuf = null;
    edgeIdx = null;
    selCanvas = null;
    selCtx = null;
    floating = false;
    holedCanvas = pieceCanvas = null;
    baseMask = null;
    floatDx = floatDy = 0;
    if (octx) octx.clearRect(0, 0, ov.width, ov.height);
    if (deselectBtn) deselectBtn.hidden = true;
  }
  function deselect() {
    if (floating) stampFloat();
    clear();
  }
  function copySelection() {
    if (!mask) return null;
    let x0 = mw, y0 = mh, x1 = -1, y1 = -1;
    for (let p = 0; p < mask.length; p++) {
      if (!mask[p]) continue;
      const x = p % mw, y = p / mw | 0;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    if (x1 < x0) return null;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const sc = document.createElement("canvas");
    sc.width = mw;
    sc.height = mh;
    const sg = sc.getContext("2d", { willReadFrequently: true });
    if (floating && holedCanvas) {
      sg.drawImage(holedCanvas, 0, 0);
      sg.drawImage(pieceCanvas, floatDx, floatDy);
    } else sg.drawImage(img, 0, 0, mw, mh);
    const sid = sg.getImageData(0, 0, mw, mh).data;
    const out = document.createElement("canvas");
    out.width = bw;
    out.height = bh;
    const og = out.getContext("2d");
    const oid = og.createImageData(bw, bh);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const sp = (y + y0) * mw + (x + x0);
      if (!mask[sp]) continue;
      const si = sp << 2, oi = y * bw + x << 2;
      oid.data[oi] = sid[si];
      oid.data[oi + 1] = sid[si + 1];
      oid.data[oi + 2] = sid[si + 2];
      oid.data[oi + 3] = sid[si + 3];
    }
    og.putImageData(oid, 0, 0);
    return out;
  }
  function invert() {
    if (!mask) return;
    if (floating) stampFloat();
    for (let p = 0; p < mask.length; p++) mask[p] = mask[p] ? 0 : 1;
    baseMask = null;
    buildSelBuf();
    paintAnts();
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
  deselectBtn?.addEventListener("click", deselect);
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
    nudge,
    copySelection,
    clear,
    syncOverlay,
    teardown() {
      stopAnts();
      ov?.remove();
      ov = null;
      octx = null;
      mask = null;
      selBuf = null;
      edgeIdx = null;
      selCanvas = null;
      selCtx = null;
      holedCanvas = pieceCanvas = baseMask = null;
    }
  };
}

// docs/types/image/adv-edit.js
import { loadGlobal as loadGlobal2, vendor as vendor2 } from "../../core/script-loader.js";

// docs/types/image/adv-edit-actions.js
function isTypingTarget(target) {
  if (!target) return false;
  if (target.isContentEditable || target.tagName === "TEXTAREA") return true;
  if (target.tagName !== "INPUT") return false;
  return /^(text|search|url|email|tel|password)$/i.test(target.type || "text");
}
function rgbToHex(c) {
  if (typeof c !== "string") return "#000000";
  if (c[0] === "#") return c.length === 7 ? c : c;
  const m = c.match(/\d+/g);
  if (!m) return "#000000";
  return "#" + m.slice(0, 3).map((n) => (+n).toString(16).padStart(2, "0")).join("");
}
function normalizeTransform(node) {
  const cls = node?.getClassName?.();
  if (!node || cls === "Label" || cls === "Group") return;
  const sx = node.scaleX?.() || 1, sy = node.scaleY?.() || 1;
  if (Math.abs(sx - 1) < 1e-4 && Math.abs(sy - 1) < 1e-4) return;
  if (typeof node.width === "function" && typeof node.height === "function" && !["Line", "Arrow"].includes(cls)) {
    node.width(Math.max(1, node.width() * sx));
    node.height(Math.max(1, node.height() * sy));
  } else if (cls === "Circle") {
    node.radius(Math.max(1, node.radius() * Math.max(Math.abs(sx), Math.abs(sy))));
  } else if (cls === "Ellipse") {
    node.radiusX(Math.max(1, node.radiusX() * sx));
    node.radiusY(Math.max(1, node.radiusY() * sy));
  } else if (cls === "Ring" || cls === "Arc") {
    const k = Math.max(Math.abs(sx), Math.abs(sy));
    node.innerRadius(Math.max(1, node.innerRadius() * k));
    node.outerRadius(Math.max(1, node.outerRadius() * k));
  } else if (cls === "Wedge") {
    node.radius(Math.max(1, node.radius() * Math.max(Math.abs(sx), Math.abs(sy))));
  } else if (cls === "RegularPolygon") {
    node.radius(Math.max(1, node.radius() * Math.max(Math.abs(sx), Math.abs(sy))));
  } else if (cls === "Star") {
    const k = Math.max(Math.abs(sx), Math.abs(sy));
    node.innerRadius(Math.max(1, node.innerRadius() * k));
    node.outerRadius(Math.max(1, node.outerRadius() * k));
  }
  node.scaleX(1);
  node.scaleY(1);
}
function cloneNode(node, stageW, stageH) {
  const clone = node.clone();
  clone.x(Math.min(stageW - 20, clone.x() + 18));
  clone.y(Math.min(stageH - 20, clone.y() + 18));
  clone.visible(true);
  return clone;
}
function nodeName(node, isLabel, textNodeOf) {
  if (isLabel(node)) {
    const t = textNodeOf(node)?.text?.();
    if (t && t.trim()) return t.trim().slice(0, 18);
  }
  if (node?.getClassName?.() === "Group") return `Group (${node.getChildren?.().length || 0})`;
  return { Rect: "Rectangle", Circle: "Circle", Ellipse: "Ellipse", Ring: "Ring", Wedge: "Wedge", Arc: "Arc", Line: "Line", Arrow: "Arrow", RegularPolygon: "Polygon", Star: "Star", Label: "Text", Image: "Image" }[node?.getClassName?.()] || "Layer";
}
function readSize(node) {
  const cls = node?.getClassName?.();
  if (cls === "Circle") return { w: Math.round(node.radius() * 2), h: Math.round(node.radius() * 2) };
  if (cls === "Ellipse") return { w: Math.round(node.radiusX() * 2), h: Math.round(node.radiusY() * 2) };
  if (cls === "Ring" || cls === "Arc") return { w: Math.round(node.outerRadius() * 2), h: Math.round(node.outerRadius() * 2) };
  if (cls === "Wedge") return { w: Math.round(node.radius() * 2), h: Math.round(node.radius() * 2) };
  if (cls === "RegularPolygon") return { w: Math.round(node.radius() * 2), h: Math.round(node.radius() * 2) };
  if (cls === "Star") return { w: Math.round(node.outerRadius() * 2), h: Math.round(node.outerRadius() * 2) };
  if (cls === "Group") {
    const r = node.getClientRect({ skipShadow: true });
    return { w: Math.round(r.width), h: Math.round(r.height) };
  }
  try {
    if (typeof node?.width === "function" && typeof node?.height === "function") return { w: Math.round(node.width()), h: Math.round(node.height()) };
  } catch {
  }
  try {
    const r = node?.getClientRect?.({ skipShadow: true });
    if (r) return { w: Math.round(r.width), h: Math.round(r.height) };
  } catch {
  }
  return { w: 0, h: 0 };
}
function writeSize(node, w, h) {
  const cls = node?.getClassName?.();
  if (cls === "Circle") {
    node.radius(Math.max(1, Math.max(w, h) / 2));
    return;
  }
  if (cls === "Ellipse") {
    node.radiusX(Math.max(1, w / 2));
    node.radiusY(Math.max(1, h / 2));
    return;
  }
  if (cls === "Ring" || cls === "Arc") {
    node.outerRadius(Math.max(1, Math.max(w, h) / 2));
    return;
  }
  if (cls === "Wedge") {
    node.radius(Math.max(1, Math.max(w, h) / 2));
    return;
  }
  if (cls === "RegularPolygon") {
    node.radius(Math.max(1, Math.max(w, h) / 2));
    return;
  }
  if (cls === "Star") {
    node.outerRadius(Math.max(1, Math.max(w, h) / 2));
    return;
  }
  if (typeof node?.width === "function" && typeof node?.height === "function" && !["Line", "Arrow"].includes(cls)) {
    node.width(Math.max(1, w));
    node.height(Math.max(1, h));
  }
}
function installAdvKeys({ ownerDocument, keyTarget, isActive, getSelection, deleteSelection, duplicateSelection, nudgeSelection, clearSelection }) {
  const onKey2 = (e) => {
    if (!isActive() || isTypingTarget(e.target)) return;
    const selected = getSelection();
    if (!selected.length) return;
    if (e.__fvAdvHandled) return;
    const handled = () => {
      e.__fvAdvHandled = true;
      e.preventDefault();
    };
    const isDelete = e.key === "Delete" || e.key === "Backspace" || e.code === "Delete" || e.code === "Backspace" || e.keyCode === 46 || e.keyCode === 8;
    if (e.type === "keyup" && !isDelete) return;
    if (isDelete) {
      handled();
      deleteSelection();
      return;
    }
    if (e.key === "Escape") {
      handled();
      clearSelection();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
      handled();
      duplicateSelection();
      return;
    }
    const delta = e.shiftKey ? 10 : 1;
    const map = { ArrowLeft: [-delta, 0], ArrowRight: [delta, 0], ArrowUp: [0, -delta], ArrowDown: [0, delta] };
    const move = map[e.key];
    if (move) {
      handled();
      nudgeSelection(move[0], move[1]);
    }
  };
  ownerDocument.addEventListener("keydown", onKey2);
  ownerDocument.addEventListener("keyup", onKey2);
  ownerDocument.defaultView?.addEventListener("keydown", onKey2);
  ownerDocument.defaultView?.addEventListener("keyup", onKey2);
  keyTarget?.addEventListener("keydown", onKey2);
  keyTarget?.addEventListener("keyup", onKey2);
  return () => {
    ownerDocument.removeEventListener("keydown", onKey2);
    ownerDocument.removeEventListener("keyup", onKey2);
    ownerDocument.defaultView?.removeEventListener("keydown", onKey2);
    ownerDocument.defaultView?.removeEventListener("keyup", onKey2);
    keyTarget?.removeEventListener("keydown", onKey2);
    keyTarget?.removeEventListener("keyup", onKey2);
  };
}

// docs/types/image/adv-edit-controls.js
function installObjectActions(ctx) {
  const { getSelected, select, snap, tr, layer, Konva, cloneNode: cloneNode2, placeObject, wireObject, isGroup, stageW, stageH, refreshLayers, syncToolbar, markDirty } = ctx;
  function deleteSelection() {
    const sel = getSelected();
    if (!sel.length) return;
    snap();
    tr.nodes([]);
    sel.slice().forEach((n) => n.destroy());
    select(null);
    markDirty();
  }
  function duplicateSelection() {
    const sel = getSelected();
    if (!sel.length) return;
    snap();
    const clones = sel.map((n) => cloneNode2(n, stageW(), stageH()));
    clones.forEach((n) => placeObject(n));
    select(clones);
  }
  function nudgeSelection(dx, dy) {
    const sel = getSelected();
    if (!sel.length) return;
    snap();
    sel.forEach((n) => n.move({ x: dx, y: dy }));
    layer.draw();
    refreshLayers();
    markDirty();
  }
  function groupSelection() {
    const sel = getSelected();
    if (sel.length < 2) return;
    snap();
    const group = new Konva.Group({ draggable: true });
    wireObject(group);
    layer.add(group);
    sel.slice().forEach((n) => {
      const pos = n.getAbsolutePosition();
      n.name("group-child");
      n.moveTo(group);
      n.absolutePosition(pos);
    });
    select(group);
    refreshLayers();
    syncToolbar();
    markDirty();
  }
  function ungroupSelection() {
    const groups = getSelected().filter(isGroup);
    if (!groups.length) return;
    snap();
    const kids = [];
    groups.forEach((group) => {
      group.getChildren().slice().forEach((child) => {
        const pos = child.getAbsolutePosition();
        child.off("click tap dblclick dbltap dragstart transformstart dragmove transformend dragend");
        wireObject(child);
        child.moveTo(layer);
        child.absolutePosition(pos);
        kids.push(child);
      });
      group.destroy();
    });
    layer.add(tr);
    select(kids);
    refreshLayers();
    markDirty();
  }
  return { deleteSelection, duplicateSelection, nudgeSelection, groupSelection, ungroupSelection };
}
function installShapeControls(ctx) {
  const {
    $,
    tb,
    addText,
    addShape,
    deleteSelection,
    groupSelection,
    ungroupSelection,
    pointEdit,
    precision,
    getSelected,
    primary,
    isLabel,
    textNodeOf,
    layer,
    markDirty,
    snap,
    tr,
    refreshLayers,
    syncToolbar
  } = ctx;
  const sel = () => getSelected();
  $(".imgv-adv-add").addEventListener("click", addText);
  $(".imgv-adv-rect").addEventListener("click", () => addShape("rect"));
  $(".imgv-adv-ellipse").addEventListener("click", () => addShape("ellipse"));
  $(".imgv-adv-line").addEventListener("click", () => addShape("line"));
  $(".imgv-adv-arrow").addEventListener("click", () => addShape("arrow"));
  $(".imgv-adv-poly").addEventListener("click", () => addShape("poly"));
  $(".imgv-adv-star").addEventListener("click", () => addShape("star"));
  $(".imgv-adv-more").addEventListener("click", () => {
    const next = ["circle", "ring", "wedge", "arc"][$(".imgv-adv-more").dataset.next || 0];
    $(".imgv-adv-more").dataset.next = String((Number($(".imgv-adv-more").dataset.next || 0) + 1) % 4);
    addShape(next);
  });
  $(".imgv-adv-del").addEventListener("click", deleteSelection);
  $(".imgv-adv-fill").addEventListener("input", () => {
    sel().forEach((n) => (isLabel(n) ? textNodeOf(n) : n).fill($(".imgv-adv-fill").value));
    layer.draw();
    markDirty();
  });
  $(".imgv-adv-stroke").addEventListener("input", () => {
    sel().filter((n) => !isLabel(n)).forEach((n) => n.stroke($(".imgv-adv-stroke").value));
    layer.draw();
    markDirty();
  });
  $(".imgv-adv-strokew").addEventListener("input", () => {
    sel().filter((n) => !isLabel(n)).forEach((n) => n.strokeWidth(parseInt($(".imgv-adv-strokew").value, 10) || 0));
    layer.draw();
    markDirty();
  });
  $(".imgv-adv-dash").addEventListener("change", () => {
    sel().filter((n) => !isLabel(n)).forEach((n) => n.dash?.($(".imgv-adv-dash").value ? $(".imgv-adv-dash").value.split(",").map(Number) : []));
    layer.draw();
    markDirty();
  });
  $(".imgv-adv-cap").addEventListener("change", () => {
    sel().forEach((n) => n.lineCap?.($(".imgv-adv-cap").value));
    layer.draw();
    markDirty();
  });
  $(".imgv-adv-join").addEventListener("change", () => {
    sel().forEach((n) => n.lineJoin?.($(".imgv-adv-join").value));
    layer.draw();
    markDirty();
  });
  $(".imgv-adv-opacity").addEventListener("input", () => {
    sel().forEach((n) => n.opacity((parseInt($(".imgv-adv-opacity").value, 10) || 0) / 100));
    layer.draw();
    markDirty();
  });
  $(".imgv-adv-x").addEventListener("change", () => {
    const n = primary();
    if (n) {
      n.x(parseFloat($(".imgv-adv-x").value) || 0);
      layer.draw();
      refreshLayers();
      markDirty();
    }
  });
  $(".imgv-adv-y").addEventListener("change", () => {
    const n = primary();
    if (n) {
      n.y(parseFloat($(".imgv-adv-y").value) || 0);
      layer.draw();
      refreshLayers();
      markDirty();
    }
  });
  $(".imgv-adv-rot").addEventListener("change", () => {
    sel().forEach((n) => n.rotation(parseFloat($(".imgv-adv-rot").value) || 0));
    layer.draw();
    markDirty();
  });
  function applySizeInputs() {
    const w = parseFloat($(".imgv-adv-w").value) || 1, h = parseFloat($(".imgv-adv-h").value) || 1;
    sel().forEach((n) => writeSize(n, w, h));
    layer.draw();
    markDirty();
    syncToolbar();
  }
  $(".imgv-adv-w").addEventListener("change", applySizeInputs);
  $(".imgv-adv-h").addEventListener("change", applySizeInputs);
  $(".imgv-adv-corner").addEventListener("input", () => {
    sel().filter((n) => n.getClassName?.() === "Rect").forEach((n) => n.cornerRadius(parseInt($(".imgv-adv-corner").value, 10) || 0));
    layer.draw();
    markDirty();
  });
  $(".imgv-adv-sides").addEventListener("change", () => {
    sel().filter((n) => n.getClassName?.() === "RegularPolygon").forEach((n) => n.sides(Math.max(3, parseInt($(".imgv-adv-sides").value, 10) || 5)));
    layer.draw();
    refreshLayers();
    markDirty();
  });
  $(".imgv-adv-points").addEventListener("change", () => {
    sel().filter((n) => n.getClassName?.() === "Star").forEach((n) => n.numPoints(Math.max(3, parseInt($(".imgv-adv-points").value, 10) || 5)));
    layer.draw();
    markDirty();
  });
  $(".imgv-adv-inner").addEventListener("change", () => {
    sel().filter((n) => ["Star", "Ring", "Arc"].includes(n.getClassName?.())).forEach((n) => n.innerRadius(Math.max(1, parseInt($(".imgv-adv-inner").value, 10) || 1)));
    layer.draw();
    markDirty();
  });
  $(".imgv-adv-radius").addEventListener("change", () => {
    sel().forEach((n) => {
      const v = Math.max(1, parseInt($(".imgv-adv-radius").value, 10) || 1);
      if (["Circle", "Wedge", "RegularPolygon"].includes(n.getClassName?.())) n.radius(v);
    });
    layer.draw();
    markDirty();
  });
  $(".imgv-adv-angle").addEventListener("change", () => {
    sel().forEach((n) => {
      if (["Ring", "Wedge", "Arc"].includes(n.getClassName?.())) n.angle(Math.max(1, Math.min(360, parseInt($(".imgv-adv-angle").value, 10) || 1)));
    });
    layer.draw();
    markDirty();
  });
  $(".imgv-adv-head").addEventListener("change", () => {
    sel().filter((n) => n.getClassName?.() === "Arrow").forEach((n) => {
      const v = Math.max(1, parseInt($(".imgv-adv-head").value, 10) || 1);
      n.pointerLength(v);
      n.pointerWidth(v);
    });
    layer.draw();
    markDirty();
  });
  $(".imgv-adv-headstart").addEventListener("change", () => {
    sel().filter((n) => n.getClassName?.() === "Arrow").forEach((n) => n.pointerAtBeginning($(".imgv-adv-headstart").checked));
    layer.draw();
    markDirty();
  });
  $(".imgv-adv-tension").addEventListener("change", () => {
    sel().forEach((n) => n.tension?.(Math.max(0, Math.min(1, parseFloat($(".imgv-adv-tension").value) || 0))));
    layer.draw();
    markDirty();
  });
  $(".imgv-adv-closed").addEventListener("change", () => {
    sel().filter((n) => n.getClassName?.() === "Line").forEach((n) => n.closed($(".imgv-adv-closed").checked));
    layer.draw();
    markDirty();
  });
  $(".imgv-adv-shadow").addEventListener("input", () => {
    sel().filter((n) => !isLabel(n)).forEach((n) => {
      n.shadowBlur(parseInt($(".imgv-adv-shadow").value, 10) || 0);
      n.shadowOpacity(n.shadowBlur() ? 0.45 : 0);
      n.shadowOffset({ x: 2, y: 2 });
    });
    layer.draw();
    markDirty();
  });
  $(".imgv-adv-shadowc").addEventListener("input", () => {
    sel().filter((n) => !isLabel(n)).forEach((n) => n.shadowColor($(".imgv-adv-shadowc").value));
    layer.draw();
    markDirty();
  });
  $(".imgv-adv-ratio").addEventListener("change", () => tr.keepRatio($(".imgv-adv-ratio").checked));
  $(".imgv-adv-center").addEventListener("change", () => tr.centeredScaling($(".imgv-adv-center").checked));
  $(".imgv-adv-flip").addEventListener("change", () => tr.flipEnabled($(".imgv-adv-flip").checked));
  $(".imgv-adv-blend").addEventListener("change", () => {
    if (sel().length) {
      snap();
      sel().forEach((n) => n.globalCompositeOperation($(".imgv-adv-blend").value));
      layer.draw();
      markDirty();
    }
  });
  $(".imgv-adv-front").addEventListener("click", () => {
    if (!sel().length) return;
    snap();
    sel().forEach((n) => n.moveToTop());
    tr.moveToTop();
    layer.draw();
    refreshLayers();
    markDirty();
  });
  $(".imgv-adv-back").addEventListener("click", () => {
    if (!sel().length) return;
    snap();
    sel().forEach((n) => n.moveToBottom());
    tr.moveToTop();
    layer.draw();
    refreshLayers();
    markDirty();
  });
  tb.querySelectorAll(".imgv-adv-align").forEach((b) => b.addEventListener("click", () => precision.align(b.dataset.align)));
  tb.querySelectorAll(".imgv-adv-dist").forEach((b) => b.addEventListener("click", () => precision.distribute(b.dataset.axis)));
  tb.addEventListener("click", (e) => {
    if (e.target.closest(".imgv-adv-group")) groupSelection();
    if (e.target.closest(".imgv-adv-ungroup")) ungroupSelection();
    if (e.target.closest(".imgv-adv-pointedit")) pointEdit.setEnabled(!pointEdit.isEnabled());
  });
  $(".imgv-adv-grid").addEventListener("change", () => precision.setGrid($(".imgv-adv-grid").checked));
}

// docs/types/image/adv-edit-layers.js
function mountAdvLayersPanel({ stageHost, layer, tr, getObjects, getSelected, select, snap, markDirty, cloneNode: cloneNode2, placeObject, labelName, stageW, stageH }) {
  const panel = document.createElement("div");
  panel.className = "imgv-adv-layers";
  panel.hidden = true;
  panel.style.cssText = "position:absolute;top:8px;right:8px;z-index:7;width:210px;max-height:60%;overflow:auto;background:var(--bg-2,#222);color:var(--fg,#eee);border:1px solid var(--border,#444);border-radius:6px;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.3);";
  stageHost.appendChild(panel);
  const locked = (n) => !!n.getAttr("locked");
  const setLocked = (n, on) => {
    n.setAttr("locked", on);
    n.draggable(!on);
    n.listening(!on);
  };
  const displayName = (n) => n.getAttr("layerName") || labelName(n);
  const icon = (n) => ({ Label: "T", Rect: "R", Circle: "C", Ellipse: "E", Ring: "O", Wedge: "W", Arc: "A", Line: "/", Arrow: ">", RegularPolygon: "P", Star: "*", Group: "G" })[n.getClassName?.()] || "?";
  function refresh() {
    const selected = getSelected();
    const labels = getObjects().slice().reverse();
    panel.innerHTML = `<div style="padding:5px 8px;font-weight:600;border-bottom:1px solid var(--border,#444)">Layers (${labels.length})${selected.length ? ` · ${selected.length} selected` : ""}</div>`;
    labels.forEach((label) => panel.appendChild(rowFor(label, selected)));
  }
  function rowFor(label, selected) {
    const row = document.createElement("div");
    row.dataset.selected = selected.includes(label) ? "1" : "0";
    row.style.cssText = `display:flex;align-items:center;gap:4px;padding:3px 6px;cursor:pointer;${selected.includes(label) ? "background:var(--accent,#2563eb);color:#fff;" : ""}${locked(label) ? "opacity:.7;" : ""}`;
    const eye = mkMini(label.visible() ? "V" : "-", "Show / hide", (e) => {
      e.stopPropagation();
      snap();
      label.visible(!label.visible());
      if (!label.visible() && selected.includes(label)) select(null);
      layer.draw();
      refresh();
      markDirty();
    });
    const lock = mkMini(locked(label) ? "L" : "U", locked(label) ? "Unlock" : "Lock", (e) => {
      e.stopPropagation();
      snap();
      setLocked(label, !locked(label));
      if (locked(label)) tr.nodes(tr.nodes().filter((n) => n !== label));
      layer.draw();
      refresh();
      markDirty();
    });
    const type = document.createElement("span");
    type.textContent = icon(label);
    type.title = label.getClassName?.() || "Layer";
    type.style.cssText = "width:12px;text-align:center;font-weight:700;opacity:.85";
    const name = document.createElement("span");
    name.textContent = displayName(label);
    name.title = "Double-click to rename";
    name.style.cssText = "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
    name.addEventListener("dblclick", (e) => renameLayer(e, label, name));
    const dup = mkMini("+", "Duplicate", (e) => {
      e.stopPropagation();
      snap();
      const c = cloneNode2(label, stageW(), stageH());
      placeObject(c);
      refresh();
    });
    const up = mkMini("↑", "Bring forward", (e) => {
      e.stopPropagation();
      snap();
      label.moveUp();
      tr.moveToTop();
      layer.draw();
      refresh();
      markDirty();
    });
    const dn = mkMini("↓", "Send backward", (e) => {
      e.stopPropagation();
      snap();
      label.moveDown();
      tr.moveToTop();
      layer.draw();
      refresh();
      markDirty();
    });
    const del = mkMini("x", "Delete", (e) => {
      e.stopPropagation();
      snap();
      if (selected.includes(label)) select(null);
      label.destroy();
      layer.draw();
      refresh();
      markDirty();
    });
    row.append(eye, lock, type, name, dup, up, dn, del);
    row.addEventListener("click", (e) => {
      select(label, { toggle: e.shiftKey || e.ctrlKey || e.metaKey });
    });
    return row;
  }
  function renameLayer(e, label, name) {
    e.stopPropagation();
    const input = document.createElement("input");
    input.value = label.getAttr("layerName") || labelName(label);
    input.style.cssText = "flex:1;min-width:60px;font:inherit;";
    name.replaceWith(input);
    input.focus();
    input.select();
    const done = (commit) => {
      if (!input.isConnected) return;
      if (commit) {
        snap();
        label.setAttr("layerName", input.value.trim() || null);
        markDirty();
      }
      refresh();
    };
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") done(false);
      if (ev.key === "Enter") done(true);
    });
    input.addEventListener("blur", () => done(true));
  }
  function mkMini(txt, title, fn) {
    const b = document.createElement("button");
    b.textContent = txt;
    b.title = title;
    b.style.cssText = "background:none;border:none;color:inherit;cursor:pointer;font-size:11px;padding:0 1px";
    b.addEventListener("click", fn);
    return b;
  }
  return { panel, refresh, destroy: () => panel.remove() };
}

// docs/types/image/adv-edit-precision.js
function mountAdvPrecision({ Konva, stage, tr, getObjects, getSelected, snap, markDirty, refreshLayers, stageW, stageH }) {
  const layer = new Konva.Layer({ listening: false });
  layer.name("precision");
  stage.add(layer);
  let gridOn = false;
  const gridSize = 25, threshold = 5;
  function drawGrid() {
    layer.find(".grid").forEach((n) => n.destroy());
    if (!gridOn) {
      layer.batchDraw();
      return;
    }
    for (let x = gridSize; x < stageW(); x += gridSize) layer.add(line([x, 0, x, stageH()], "grid", "rgba(120,120,120,.22)", [2, 5]));
    for (let y = gridSize; y < stageH(); y += gridSize) layer.add(line([0, y, stageW(), y], "grid", "rgba(120,120,120,.22)", [2, 5]));
    layer.batchDraw();
  }
  function snapDrag(node) {
    clearGuides();
    if (!node) return;
    if (gridOn) {
      node.x(Math.round(node.x() / gridSize) * gridSize);
      node.y(Math.round(node.y() / gridSize) * gridSize);
    }
    const guides = snapToGuides(node);
    guides.forEach((g) => layer.add(line(g.points, "guide", "#4c9aff", [4, 3])));
    layer.batchDraw();
  }
  function snapToGuides(node) {
    const box = node.getClientRect({ skipShadow: true });
    const stopsX = [0, stageW() / 2, stageW()];
    const stopsY = [0, stageH() / 2, stageH()];
    getObjects().forEach((other) => {
      if (other === node || !other.visible()) return;
      const r = other.getClientRect({ skipShadow: true });
      stopsX.push(r.x, r.x + r.width / 2, r.x + r.width);
      stopsY.push(r.y, r.y + r.height / 2, r.y + r.height);
    });
    const edgesX = [{ p: box.x, off: box.x - node.x() }, { p: box.x + box.width / 2, off: box.x + box.width / 2 - node.x() }, { p: box.x + box.width, off: box.x + box.width - node.x() }];
    const edgesY = [{ p: box.y, off: box.y - node.y() }, { p: box.y + box.height / 2, off: box.y + box.height / 2 - node.y() }, { p: box.y + box.height, off: box.y + box.height - node.y() }];
    const bestX = closest(stopsX, edgesX), bestY = closest(stopsY, edgesY);
    const guides = [];
    if (bestX) {
      node.x(bestX.value);
      guides.push({ points: [bestX.stop, 0, bestX.stop, stageH()] });
    }
    if (bestY) {
      node.y(bestY.value);
      guides.push({ points: [0, bestY.stop, stageW(), bestY.stop] });
    }
    return guides;
  }
  function closest(stops, edges) {
    let best = null;
    for (const stop of stops) for (const edge of edges) {
      const diff = Math.abs(stop - edge.p);
      if (diff <= threshold && (!best || diff < best.diff)) best = { diff, stop, value: stop - edge.off };
    }
    return best;
  }
  function activeNodes() {
    const live = new Set(getObjects());
    const transformed = (tr?.nodes?.() || []).filter((n) => live.has(n));
    const source = transformed.length ? transformed : getSelected() || [];
    return [...new Set(source)].filter((n) => live.has(n) && n.visible() && !n.getAttr?.("locked"));
  }
  function align(kind) {
    const nodes = activeNodes();
    if (nodes.length < 2) return;
    const boxes = nodes.map((n) => ({ n, r: n.getClientRect({ skipShadow: true }) }));
    const minX = Math.min(...boxes.map((b) => b.r.x)), maxX = Math.max(...boxes.map((b) => b.r.x + b.r.width));
    const minY = Math.min(...boxes.map((b) => b.r.y)), maxY = Math.max(...boxes.map((b) => b.r.y + b.r.height));
    snap();
    tr?.nodes?.([]);
    boxes.forEach(({ n, r }) => {
      if (kind === "left") n.x(n.x() + minX - r.x);
      if (kind === "hcenter") n.x(n.x() + (minX + maxX) / 2 - (r.x + r.width / 2));
      if (kind === "right") n.x(n.x() + maxX - (r.x + r.width));
      if (kind === "top") n.y(n.y() + minY - r.y);
      if (kind === "vcenter") n.y(n.y() + (minY + maxY) / 2 - (r.y + r.height / 2));
      if (kind === "bottom") n.y(n.y() + maxY - (r.y + r.height));
    });
    tr?.nodes?.(nodes);
    tr?.forceUpdate?.();
    stage.batchDraw();
    refreshLayers();
    markDirty();
  }
  function distribute(axis) {
    const nodes = activeNodes();
    if (nodes.length < 3) return;
    const key = axis === "x" ? "x" : "y", size = axis === "x" ? "width" : "height";
    const boxes = nodes.map((n) => {
      const r = n.getClientRect({ skipShadow: true });
      return { n, r, center: r[key] + r[size] / 2 };
    }).sort((a, b) => a.center - b.center);
    const first = boxes[0].center;
    const last = boxes.at(-1).center;
    const step = (last - first) / (boxes.length - 1);
    snap();
    tr?.nodes?.([]);
    boxes.forEach(({ n, r }, i) => {
      const target = first + step * i;
      const delta = target - (r[key] + r[size] / 2);
      if (axis === "x") n.x(n.x() + delta);
      else n.y(n.y() + delta);
    });
    tr?.nodes?.(nodes);
    tr?.forceUpdate?.();
    stage.batchDraw();
    refreshLayers();
    markDirty();
  }
  function line(points, name, stroke, dash) {
    return new Konva.Line({ points, name, stroke, strokeWidth: 1, dash, listening: false });
  }
  function clearGuides() {
    layer.find(".guide").forEach((n) => n.destroy());
    layer.batchDraw();
  }
  return {
    layer,
    setGrid(on) {
      gridOn = !!on;
      drawGrid();
    },
    relayout: drawGrid,
    snapDrag,
    clearGuides,
    align,
    distribute,
    destroy: () => layer.destroy()
  };
}

// docs/types/image/adv-edit-points.js
function mountAdvPointEditor({ Konva, stage, tr, getSelected, markDirty, refreshLayers }) {
  const layer = new Konva.Layer({ listening: true });
  layer.name("point-edit");
  stage.add(layer);
  let enabled = false;
  const target = () => enabled ? getSelected().find((n) => ["Line", "Arrow"].includes(n.getClassName?.())) : null;
  const localPoint = (node, pos) => node.getAbsoluteTransform().copy().invert().point(pos);
  const worldPoint = (node, x, y) => node.getAbsoluteTransform().point({ x, y });
  function setEnabled(on) {
    enabled = !!on;
    if (enabled) tr?.nodes?.([]);
    refresh();
  }
  function refresh() {
    layer.destroyChildren();
    const node = target();
    if (!node || !node.visible()) {
      layer.batchDraw();
      return;
    }
    const pts = node.points().slice();
    for (let i = 0; i < pts.length; i += 2) layer.add(handle(node, i, false));
    for (let i = 0; i < pts.length - 2; i += 2) layer.add(handle(node, i, true));
    layer.batchDraw();
  }
  function handle(node, idx, mid) {
    const pts = node.points();
    const p = mid ? { x: (pts[idx] + pts[idx + 2]) / 2, y: (pts[idx + 1] + pts[idx + 3]) / 2 } : { x: pts[idx], y: pts[idx + 1] };
    const w = worldPoint(node, p.x, p.y);
    const h = new Konva.Circle({
      x: w.x,
      y: w.y,
      radius: mid ? 5 : 6,
      fill: mid ? "#ffffff" : "#4c9aff",
      stroke: "#0b3d91",
      strokeWidth: 1,
      draggable: true,
      name: mid ? "point-mid" : "point-handle"
    });
    let pointIndex = idx, inserted = false;
    h.on("dragstart", (e) => {
      e.cancelBubble = true;
      if (!mid || inserted) return;
      const now = node.points().slice();
      const lp = localPoint(node, h.position());
      now.splice(idx + 2, 0, lp.x, lp.y);
      node.points(now);
      pointIndex = idx + 2;
      inserted = true;
      h.name("point-handle");
      h.fill("#4c9aff");
      layer.find(".point-mid").forEach((n) => n.destroy());
    });
    h.on("dragmove", (e) => {
      e.cancelBubble = true;
      const now = node.points().slice();
      const lp = localPoint(node, h.position());
      now[pointIndex] = lp.x;
      now[pointIndex + 1] = lp.y;
      node.points(now);
      tr?.forceUpdate?.();
      stage.batchDraw();
    });
    h.on("dragend", (e) => {
      e.cancelBubble = true;
      refresh();
      refreshLayers();
      markDirty();
    });
    return h;
  }
  return {
    layer,
    isEnabled: () => enabled,
    setEnabled,
    refresh,
    destroy: () => layer.destroy()
  };
}

// docs/types/image/adv-edit-text.js
function syncTextControls($, label, { multi = false, textNodeOf, tagNodeOf, rgbToHex: rgbToHex2 }) {
  const t = textNodeOf(label), tag = tagNodeOf(label);
  const style = t.fontStyle?.() || "";
  const deco = t.textDecoration?.() || "";
  $(".imgv-adv-text").value = multi ? "Multiple text selected" : t.text();
  $(".imgv-adv-size").value = Math.round(t.fontSize());
  $(".imgv-adv-font").value = t.fontFamily();
  $(".imgv-adv-fill").value = rgbToHex2(t.fill());
  $(".imgv-adv-bg").value = rgbToHex2(tag.fill());
  $(".imgv-adv-bgop").value = Math.round((tag.opacity() ?? 1) * 100);
  $(".imgv-adv-bold").checked = /\bbold\b/.test(style);
  $(".imgv-adv-italic").checked = /\bitalic\b/.test(style);
  $(".imgv-adv-underline").checked = /\bunderline\b/.test(deco);
  $(".imgv-adv-strike").checked = /\bline-through\b/.test(deco);
  $(".imgv-adv-talign").value = t.align?.() || "left";
  $(".imgv-adv-valign").value = t.verticalAlign?.() || "top";
  $(".imgv-adv-lineh").value = t.lineHeight?.() || 1;
  $(".imgv-adv-wrap").value = t.wrap?.() || "word";
  $(".imgv-adv-tw").value = Math.round(t.width?.() || 0);
  $(".imgv-adv-th").value = Math.round(t.height?.() || 0);
  $(".imgv-adv-pad").value = Math.round(t.padding?.() || 0);
  $(".imgv-adv-tstroke").value = rgbToHex2(t.stroke?.() || "#000000");
  $(".imgv-adv-tstrokew").value = Math.round(t.strokeWidth?.() || 0);
  $(".imgv-adv-tshadow").value = Math.round(t.shadowBlur?.() || 0);
  $(".imgv-adv-tshadowc").value = rgbToHex2(t.shadowColor?.() || "#000000");
}
function installTextControls({ $, selectedLabels, textNodeOf, tagNodeOf, layer, markDirty, refreshLayers }) {
  const labels = () => selectedLabels().filter(Boolean);
  const texts = () => labels().map(textNodeOf).filter(Boolean);
  const draw = (refresh = false) => {
    layer.draw();
    if (refresh) refreshLayers();
    markDirty();
  };
  $(".imgv-adv-text").addEventListener("input", () => {
    const l = labels();
    if (l.length === 1) {
      textNodeOf(l[0]).text($(".imgv-adv-text").value);
      draw(true);
    }
  });
  $(".imgv-adv-size").addEventListener("input", () => {
    texts().forEach((t) => t.fontSize(parseInt($(".imgv-adv-size").value, 10) || 48));
    draw();
  });
  $(".imgv-adv-font").addEventListener("change", () => {
    texts().forEach((t) => t.fontFamily($(".imgv-adv-font").value));
    draw();
  });
  $(".imgv-adv-bg").addEventListener("input", () => {
    labels().forEach((l) => tagNodeOf(l).fill($(".imgv-adv-bg").value));
    draw();
  });
  $(".imgv-adv-bgop").addEventListener("input", () => {
    labels().forEach((l) => tagNodeOf(l).opacity((parseInt($(".imgv-adv-bgop").value, 10) || 0) / 100));
    draw();
  });
  ["bold", "italic"].forEach((k) => $(".imgv-adv-" + k).addEventListener("change", () => {
    const style = [$(".imgv-adv-bold").checked ? "bold" : "", $(".imgv-adv-italic").checked ? "italic" : ""].filter(Boolean).join(" ") || "normal";
    texts().forEach((t) => t.fontStyle(style));
    draw();
  }));
  ["underline", "strike"].forEach((k) => $(".imgv-adv-" + k).addEventListener("change", () => {
    const deco = [$(".imgv-adv-underline").checked ? "underline" : "", $(".imgv-adv-strike").checked ? "line-through" : ""].filter(Boolean).join(" ");
    texts().forEach((t) => t.textDecoration(deco));
    draw();
  }));
  $(".imgv-adv-talign").addEventListener("change", () => {
    texts().forEach((t) => t.align($(".imgv-adv-talign").value));
    draw();
  });
  $(".imgv-adv-valign").addEventListener("change", () => {
    texts().forEach((t) => t.verticalAlign($(".imgv-adv-valign").value));
    draw();
  });
  $(".imgv-adv-lineh").addEventListener("change", () => {
    texts().forEach((t) => t.lineHeight(Math.max(0.5, parseFloat($(".imgv-adv-lineh").value) || 1)));
    draw();
  });
  $(".imgv-adv-wrap").addEventListener("change", () => {
    texts().forEach((t) => t.wrap($(".imgv-adv-wrap").value));
    draw();
  });
  $(".imgv-adv-tw").addEventListener("change", () => {
    texts().forEach((t) => t.width(Math.max(1, parseFloat($(".imgv-adv-tw").value) || 1)));
    draw();
  });
  $(".imgv-adv-th").addEventListener("change", () => {
    texts().forEach((t) => t.height(Math.max(1, parseFloat($(".imgv-adv-th").value) || 1)));
    draw();
  });
  $(".imgv-adv-pad").addEventListener("change", () => {
    texts().forEach((t) => t.padding(Math.max(0, parseFloat($(".imgv-adv-pad").value) || 0)));
    draw();
  });
  $(".imgv-adv-tstroke").addEventListener("input", () => {
    texts().forEach((t) => t.stroke($(".imgv-adv-tstroke").value));
    draw();
  });
  $(".imgv-adv-tstrokew").addEventListener("change", () => {
    texts().forEach((t) => t.strokeWidth(Math.max(0, parseFloat($(".imgv-adv-tstrokew").value) || 0)));
    draw();
  });
  $(".imgv-adv-tshadow").addEventListener("input", () => {
    texts().forEach((t) => {
      t.shadowBlur(parseInt($(".imgv-adv-tshadow").value, 10) || 0);
      t.shadowOpacity(t.shadowBlur() ? 0.45 : 0);
      t.shadowOffset({ x: 2, y: 2 });
    });
    draw();
  });
  $(".imgv-adv-tshadowc").addEventListener("input", () => {
    texts().forEach((t) => t.shadowColor($(".imgv-adv-tshadowc").value));
    draw();
  });
}

// docs/types/image/adv-edit-toolbar.js
var DEFAULTS = {
  text: "Text",
  fontFamily: "system-ui, sans-serif",
  fontSize: 48,
  fill: "#ffffff",
  bg: "#000000",
  bgOpacity: 0.5
};
function advToolbarHtml() {
  return `
    <button class="imgv-adv-add">+ Text</button>
    <button class="imgv-adv-rect" title="Add rectangle">▭</button>
    <button class="imgv-adv-ellipse" title="Add ellipse">◯</button>
    <button class="imgv-adv-line" title="Add line">╱</button>
    <button class="imgv-adv-arrow" title="Add arrow">➤</button>
    <button class="imgv-adv-poly" title="Add polygon">⬠</button>
    <button class="imgv-adv-star" title="Add star">★</button>
    <button class="imgv-adv-more" title="Add circle, ring, wedge, or arc">More</button>
    <span class="imgv-sep"></span>
    <input class="imgv-adv-text imgv-adv-txtctl" type="text" placeholder="Selected text" style="min-width:120px">
    <label class="imgv-adv-txtctl" style="font-size:.8em">Size <input class="imgv-adv-size" type="number" min="6" max="400" value="${DEFAULTS.fontSize}" style="width:56px"></label>
    <select class="imgv-adv-font imgv-adv-txtctl" title="Font"><option value="system-ui, sans-serif">Sans</option><option value="Georgia, serif">Serif</option><option value="monospace">Mono</option><option value="Impact, sans-serif">Impact</option><option value="cursive">Cursive</option></select>
    <label class="imgv-adv-txtctl" style="font-size:.8em"><input class="imgv-adv-bold" type="checkbox"> B</label>
    <label class="imgv-adv-txtctl" style="font-size:.8em"><input class="imgv-adv-italic" type="checkbox"> I</label>
    <label class="imgv-adv-txtctl" style="font-size:.8em"><input class="imgv-adv-underline" type="checkbox"> U</label>
    <label class="imgv-adv-txtctl" style="font-size:.8em"><input class="imgv-adv-strike" type="checkbox"> S</label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">Align <select class="imgv-adv-talign"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">V <select class="imgv-adv-valign"><option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option></select></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">Line <input class="imgv-adv-lineh" type="number" min=".5" max="4" step=".1" value="1" style="width:48px"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">Wrap <select class="imgv-adv-wrap"><option value="word">Word</option><option value="char">Char</option><option value="none">None</option></select></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">TW <input class="imgv-adv-tw" type="number" min="1" style="width:54px"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">TH <input class="imgv-adv-th" type="number" min="1" style="width:54px"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">Pad <input class="imgv-adv-pad" type="number" min="0" max="200" value="6" style="width:48px"></label>
    <label style="font-size:.8em">Fill <input class="imgv-adv-fill" type="color" value="${DEFAULTS.fill}"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">BG <input class="imgv-adv-bg" type="color" value="${DEFAULTS.bg}"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">BG opacity <input class="imgv-adv-bgop" type="range" min="0" max="100" value="${DEFAULTS.bgOpacity * 100}" style="width:70px"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">Text stroke <input class="imgv-adv-tstroke" type="color" value="#000000"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">TS width <input class="imgv-adv-tstrokew" type="number" min="0" max="40" value="0" style="width:48px"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">Text shadow <input class="imgv-adv-tshadow" type="range" min="0" max="40" value="0" style="width:70px"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">TS color <input class="imgv-adv-tshadowc" type="color" value="#000000"></label>
    <label class="imgv-adv-shpctl" style="font-size:.8em">Stroke <input class="imgv-adv-stroke" type="color" value="#1144aa"></label>
    <label class="imgv-adv-shpctl" style="font-size:.8em">Width <input class="imgv-adv-strokew" type="number" min="0" max="80" value="2" style="width:48px"></label>
    <label class="imgv-adv-shpctl" style="font-size:.8em">Dash <select class="imgv-adv-dash"><option value="">Solid</option><option value="8,5">Dash</option><option value="2,5">Dot</option><option value="12,5,2,5">Dash-dot</option></select></label>
    <label class="imgv-adv-linectl" style="font-size:.8em">Cap <select class="imgv-adv-cap"><option>butt</option><option>round</option><option>square</option></select></label>
    <label class="imgv-adv-linectl" style="font-size:.8em">Join <select class="imgv-adv-join"><option>miter</option><option>round</option><option>bevel</option></select></label>
    <button class="imgv-adv-pointedit imgv-adv-linectl" title="Edit line/arrow points">Points</button>
    <label class="imgv-adv-anyctl" style="font-size:.8em">Opacity <input class="imgv-adv-opacity" type="range" min="0" max="100" value="100" style="width:70px"></label>
    <label class="imgv-adv-anyctl" style="font-size:.8em">X <input class="imgv-adv-x" type="number" style="width:54px"></label>
    <label class="imgv-adv-anyctl" style="font-size:.8em">Y <input class="imgv-adv-y" type="number" style="width:54px"></label>
    <label class="imgv-adv-sizectl" style="font-size:.8em">W <input class="imgv-adv-w" type="number" min="1" style="width:54px"></label>
    <label class="imgv-adv-sizectl" style="font-size:.8em">H <input class="imgv-adv-h" type="number" min="1" style="width:54px"></label>
    <label class="imgv-adv-anyctl" style="font-size:.8em">Rot <input class="imgv-adv-rot" type="number" step="1" style="width:54px"></label>
    <label class="imgv-adv-rectctl" style="font-size:.8em">Corner <input class="imgv-adv-corner" type="number" min="0" max="200" value="4" style="width:50px"></label>
    <label class="imgv-adv-polyctl" style="font-size:.8em">Sides <input class="imgv-adv-sides" type="number" min="3" max="24" value="5" style="width:48px"></label>
    <label class="imgv-adv-starctl" style="font-size:.8em">Points <input class="imgv-adv-points" type="number" min="3" max="24" value="5" style="width:48px"></label>
    <label class="imgv-adv-innerctl" style="font-size:.8em">Inner <input class="imgv-adv-inner" type="number" min="1" value="26" style="width:50px"></label>
    <label class="imgv-adv-radctl" style="font-size:.8em">Radius <input class="imgv-adv-radius" type="number" min="1" value="56" style="width:50px"></label>
    <label class="imgv-adv-arcctl" style="font-size:.8em">Angle <input class="imgv-adv-angle" type="number" min="1" max="360" value="120" style="width:50px"></label>
    <label class="imgv-adv-arrowctl" style="font-size:.8em">Head <input class="imgv-adv-head" type="number" min="1" max="120" value="12" style="width:48px"></label>
    <label class="imgv-adv-arrowctl" style="font-size:.8em"><input class="imgv-adv-headstart" type="checkbox"> Start</label>
    <label class="imgv-adv-linectl" style="font-size:.8em">Tension <input class="imgv-adv-tension" type="number" min="0" max="1" step=".1" value="0" style="width:48px"></label>
    <label class="imgv-adv-lineonlyctl" style="font-size:.8em"><input class="imgv-adv-closed" type="checkbox"> Closed</label>
    <label class="imgv-adv-shpctl" style="font-size:.8em">Shadow <input class="imgv-adv-shadow" type="range" min="0" max="40" value="0" style="width:70px"></label>
    <label class="imgv-adv-shpctl" style="font-size:.8em">Shadow color <input class="imgv-adv-shadowc" type="color" value="#000000"></label>
    <label class="imgv-adv-xformctl" style="font-size:.8em"><input class="imgv-adv-ratio" type="checkbox"> Ratio</label>
    <label class="imgv-adv-xformctl" style="font-size:.8em"><input class="imgv-adv-center" type="checkbox"> Center</label>
    <label class="imgv-adv-xformctl" style="font-size:.8em"><input class="imgv-adv-flip" type="checkbox" checked> Flip</label>
    <label class="imgv-adv-anyctl" style="font-size:.8em" title="How this object blends with the objects BEHIND it in the overlay (not the base image)">Blend <select class="imgv-adv-blend"><option value="source-over">Normal</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="overlay">Overlay</option><option value="darken">Darken</option><option value="lighten">Lighten</option><option value="color-dodge">Dodge</option><option value="color-burn">Burn</option><option value="hard-light">Hard light</option><option value="soft-light">Soft light</option><option value="difference">Difference</option><option value="exclusion">Exclusion</option></select></label>
    <button class="imgv-adv-group" title="Group selected objects">Group</button>
    <button class="imgv-adv-ungroup" title="Ungroup selected groups">Ungroup</button>
    <button class="imgv-adv-front" title="Bring selected to front">Front</button>
    <button class="imgv-adv-back" title="Send selected to back">Back</button>
    <label style="font-size:.8em"><input class="imgv-adv-grid" type="checkbox"> Grid</label>
    <button class="imgv-adv-align" data-align="left" title="Align left">L</button>
    <button class="imgv-adv-align" data-align="hcenter" title="Align horizontal center">HC</button>
    <button class="imgv-adv-align" data-align="right" title="Align right">R</button>
    <button class="imgv-adv-align" data-align="top" title="Align top">T</button>
    <button class="imgv-adv-align" data-align="vcenter" title="Align vertical center">VC</button>
    <button class="imgv-adv-align" data-align="bottom" title="Align bottom">B</button>
    <button class="imgv-adv-dist" data-axis="x" title="Distribute horizontally">DH</button>
    <button class="imgv-adv-dist" data-axis="y" title="Distribute vertically">DV</button>
    <button class="imgv-adv-del" title="Delete selected">🗑 Delete</button>`;
}

// docs/types/image/adv-edit.js
var konvaPromise = null;
function loadKonva() {
  if (!konvaPromise) konvaPromise = loadGlobal2(vendor2("konva/konva.min.js"), "Konva");
  return konvaPromise;
}
async function mountAdvEdit({ host, img, onDirty, pushUndo }) {
  const Konva = await loadKonva();
  const stageHost = host.querySelector(".imgv-stage");
  let naturalW = img.naturalWidth || 1, naturalH = img.naturalHeight || 1;
  const rect = img.getBoundingClientRect();
  let stageW = Math.max(1, Math.round(rect.width)), stageH = Math.max(1, Math.round(rect.height));
  const container = document.createElement("div");
  container.className = "imgv-adv-stage";
  container.tabIndex = 0;
  container.style.cssText = `position:absolute;left:0;top:0;width:${stageW}px;height:${stageH}px;z-index:6;`;
  const hostRect = stageHost.getBoundingClientRect();
  container.style.left = Math.round(rect.left - hostRect.left) + "px";
  container.style.top = Math.round(rect.top - hostRect.top) + "px";
  stageHost.style.position = "relative";
  stageHost.appendChild(container);
  const stage = new Konva.Stage({ container, width: stageW, height: stageH });
  const layer = new Konva.Layer();
  stage.add(layer);
  const tr = new Konva.Transformer({
    rotateEnabled: true,
    keepRatio: false,
    centeredScaling: false,
    flipEnabled: true,
    rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
    rotationSnapTolerance: 5,
    enabledAnchors: ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"],
    boundBoxFunc: (oldBox, newBox) => newBox.width < 8 || newBox.height < 8 ? oldBox : newBox
  });
  if (typeof tr._batchChangeChild === "function") {
    tr._batchChangeChild = (selector, attrs) => {
      const child = tr.findOne(selector);
      if (child) child.setAttrs(attrs);
    };
  }
  layer.add(tr);
  let interactive = true;
  let selected = [];
  const markDirty = () => onDirty?.();
  const snap = () => pushUndo?.();
  const objects = () => layer.getChildren().filter((n) => n.hasName?.("obj"));
  const precision = mountAdvPrecision({ Konva, stage, tr, getObjects: objects, getSelected: () => selected, snap, markDirty, refreshLayers: () => refreshLayers(), stageW: () => stageW, stageH: () => stageH });
  const pointEdit = mountAdvPointEditor({ Konva, stage, tr, getSelected: () => selected, markDirty, refreshLayers: () => refreshLayers() });
  const bar = host.querySelector(".imgv-bar");
  const tb = document.createElement("span");
  tb.className = "imgv-adv-bar";
  tb.hidden = true;
  tb.style.cssText = "display:none;flex-basis:100%;flex-wrap:wrap;gap:6px;align-items:center;";
  tb.innerHTML = advToolbarHtml();
  bar.appendChild(tb);
  const $ = (s) => tb.querySelector(s);
  function textNodeOf(label) {
    return label.findOne("Text");
  }
  function tagNodeOf(label) {
    return label.findOne("Tag");
  }
  const isGroup = (n) => n instanceof Konva.Group || n?.getClassName?.() === "Group";
  const isLocked = (n) => !!n?.getAttr?.("locked");
  const primary = () => selected[selected.length - 1] || null;
  function syncToolbar() {
    const node = primary();
    const has = !!node, label = isLabel(node), multi = selected.length > 1;
    const cls = node?.getClassName?.();
    const shape = has && !label && !isGroup(node);
    tb.querySelectorAll(".imgv-adv-txtctl").forEach((el) => {
      el.style.display = label ? "" : "none";
    });
    tb.querySelectorAll(".imgv-adv-shpctl").forEach((el) => {
      el.style.display = shape ? "" : "none";
    });
    const line = ["Line", "Arrow"].includes(cls);
    const arc = ["Ring", "Wedge", "Arc"].includes(cls);
    tb.querySelectorAll(".imgv-adv-anyctl").forEach((el) => {
      el.style.display = has ? "" : "none";
    });
    tb.querySelectorAll(".imgv-adv-sizectl").forEach((el) => {
      el.style.display = has && !label && !["Line", "Arrow"].includes(cls) ? "" : "none";
    });
    tb.querySelectorAll(".imgv-adv-linectl").forEach((el) => {
      el.style.display = line ? "" : "none";
    });
    $(".imgv-adv-pointedit").classList.toggle("active", pointEdit.isEnabled());
    tb.querySelectorAll(".imgv-adv-lineonlyctl").forEach((el) => {
      el.style.display = cls === "Line" ? "" : "none";
    });
    tb.querySelectorAll(".imgv-adv-arrowctl").forEach((el) => {
      el.style.display = cls === "Arrow" ? "" : "none";
    });
    tb.querySelectorAll(".imgv-adv-radctl").forEach((el) => {
      el.style.display = ["Circle", "Wedge", "RegularPolygon"].includes(cls) ? "" : "none";
    });
    tb.querySelectorAll(".imgv-adv-arcctl").forEach((el) => {
      el.style.display = arc ? "" : "none";
    });
    tb.querySelectorAll(".imgv-adv-xformctl").forEach((el) => {
      el.style.display = has ? "" : "none";
    });
    tb.querySelectorAll(".imgv-adv-rectctl").forEach((el) => {
      el.style.display = cls === "Rect" ? "" : "none";
    });
    tb.querySelectorAll(".imgv-adv-polyctl").forEach((el) => {
      el.style.display = cls === "RegularPolygon" ? "" : "none";
    });
    tb.querySelectorAll(".imgv-adv-starctl").forEach((el) => {
      el.style.display = cls === "Star" ? "" : "none";
    });
    tb.querySelectorAll(".imgv-adv-innerctl").forEach((el) => {
      el.style.display = ["Star", "Ring", "Arc"].includes(cls) ? "" : "none";
    });
    $(".imgv-adv-del").disabled = !has;
    $(".imgv-adv-fill").disabled = !has || isGroup(node);
    $(".imgv-adv-group").disabled = selected.length < 2;
    $(".imgv-adv-ungroup").disabled = !selected.some(isGroup);
    if (!has) return;
    $(".imgv-adv-blend").value = node.globalCompositeOperation() || "source-over";
    $(".imgv-adv-opacity").value = Math.round((node.opacity() ?? 1) * 100);
    $(".imgv-adv-x").value = Math.round(node.x());
    $(".imgv-adv-y").value = Math.round(node.y());
    $(".imgv-adv-rot").value = Math.round(node.rotation() || 0);
    const sz = readSize(node);
    $(".imgv-adv-w").value = sz.w;
    $(".imgv-adv-h").value = sz.h;
    if (cls === "Rect") $(".imgv-adv-corner").value = Math.round(node.cornerRadius() || 0);
    if (["Circle", "Wedge"].includes(cls)) $(".imgv-adv-radius").value = Math.round(node.radius());
    if (arc) $(".imgv-adv-angle").value = Math.round(node.angle());
    if (cls === "RegularPolygon") {
      $(".imgv-adv-sides").value = node.sides();
      $(".imgv-adv-radius").value = Math.round(node.radius());
    }
    if (cls === "Star") {
      $(".imgv-adv-points").value = node.numPoints();
      $(".imgv-adv-inner").value = Math.round(node.innerRadius());
    }
    if (["Ring", "Arc"].includes(cls)) $(".imgv-adv-inner").value = Math.round(node.innerRadius());
    if (label) {
      syncTextControls($, node, { multi, textNodeOf, tagNodeOf, rgbToHex });
    } else if (shape) {
      $(".imgv-adv-fill").value = rgbToHex(node.fill() || "#3388ff");
      $(".imgv-adv-stroke").value = rgbToHex(node.stroke() || "#1144aa");
      $(".imgv-adv-strokew").value = Math.round(node.strokeWidth() || 0);
      $(".imgv-adv-dash").value = (node.dash?.() || []).join(",");
      $(".imgv-adv-shadow").value = Math.round(node.shadowBlur?.() || 0);
      $(".imgv-adv-shadowc").value = rgbToHex(node.shadowColor?.() || "#000000");
      if (line) {
        $(".imgv-adv-cap").value = node.lineCap() || "butt";
        $(".imgv-adv-join").value = node.lineJoin() || "miter";
        $(".imgv-adv-tension").value = node.tension?.() || 0;
      }
      if (cls === "Line") $(".imgv-adv-closed").checked = !!node.closed();
      if (cls === "Arrow") {
        $(".imgv-adv-head").value = Math.round(node.pointerLength());
        $(".imgv-adv-headstart").checked = !!node.pointerAtBeginning();
      }
    }
  }
  function select(nodes, opts = {}) {
    const incoming = Array.isArray(nodes) ? nodes.filter(Boolean) : nodes ? [nodes] : [];
    if (opts.toggle && incoming.length === 1) {
      selected = selected.includes(incoming[0]) ? selected.filter((n) => n !== incoming[0]) : [...selected, incoming[0]];
    } else if (opts.add) {
      selected = [.../* @__PURE__ */ new Set([...selected, ...incoming])];
    } else {
      selected = incoming;
    }
    container.dataset.selectedCount = String(selected.length);
    tr.nodes(selected.filter((n) => !isLocked(n)));
    if (interactive && selected.length) container.focus({ preventScroll: true });
    layer.draw();
    syncToolbar();
    refreshLayers();
    pointEdit.refresh();
  }
  function wireObject(node) {
    node.name("obj");
    node.on("click tap", (e) => {
      e.cancelBubble = true;
      if (interactive) select(node, { toggle: e.evt?.shiftKey || e.evt?.ctrlKey || e.evt?.metaKey });
    });
    node.on("dblclick dbltap", (e) => {
      e.cancelBubble = true;
      if (interactive && isLabel(node)) editLabelText(node);
    });
    node.on("dragstart transformstart", () => snap());
    node.on("dragmove", () => precision.snapDrag(node));
    node.on("transformend", () => {
      selected.forEach(normalizeTransform);
      layer.draw();
      markDirty();
      syncToolbar();
    });
    node.on("dragend", () => {
      precision.clearGuides();
      markDirty();
    });
  }
  function placeObject(node) {
    wireObject(node);
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
    else if (type === "circle") node = new Konva.Circle({ x: cx, y: cy, radius: 56, draggable: true, fill: "#3388ff", stroke: "#1144aa", strokeWidth: 2 });
    else if (type === "ellipse") node = new Konva.Ellipse({ x: cx, y: cy, radiusX: 60, radiusY: 40, draggable: true, fill: "#3388ff", stroke: "#1144aa", strokeWidth: 2 });
    else if (type === "ring") node = new Konva.Ring({ x: cx, y: cy, innerRadius: 28, outerRadius: 56, draggable: true, fill: "#3388ff", stroke: "#1144aa", strokeWidth: 2 });
    else if (type === "wedge") node = new Konva.Wedge({ x: cx, y: cy, radius: 64, angle: 120, draggable: true, fill: "#3388ff", stroke: "#1144aa", strokeWidth: 2 });
    else if (type === "arc") node = new Konva.Arc({ x: cx, y: cy, innerRadius: 36, outerRadius: 62, angle: 180, draggable: true, fill: "#3388ff", stroke: "#1144aa", strokeWidth: 2 });
    else if (type === "line") node = new Konva.Line({ points: [cx - 60, cy, cx + 60, cy], stroke: "#1144aa", strokeWidth: 4, hitStrokeWidth: 14, draggable: true });
    else if (type === "arrow") node = new Konva.Arrow({ points: [cx - 60, cy, cx + 60, cy], stroke: "#1144aa", strokeWidth: 4, fill: "#1144aa", pointerLength: 12, pointerWidth: 12, hitStrokeWidth: 14, draggable: true });
    else if (type === "poly") node = new Konva.RegularPolygon({ x: cx, y: cy, sides: 5, radius: 56, draggable: true, fill: "#3388ff", stroke: "#1144aa", strokeWidth: 2 });
    else node = new Konva.Star({ x: cx, y: cy, numPoints: 5, innerRadius: 26, outerRadius: 56, draggable: true, fill: "#3388ff", stroke: "#1144aa", strokeWidth: 2 });
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
  function addImage(source) {
    if (!source || !source.width) return null;
    snap();
    const k = naturalW ? stageW / naturalW : 1;
    let w = source.width * k, h = source.height * k;
    const fit = Math.min(1, stageW * 0.9 / w, stageH * 0.9 / h);
    w = Math.max(1, w * fit);
    h = Math.max(1, h * fit);
    const node = new Konva.Image({ image: source, x: stageW / 2 - w / 2, y: stageH / 2 - h / 2, width: w, height: h, draggable: true });
    placeObject(node);
    return node;
  }
  function editLabelText(label) {
    const text = textNodeOf(label);
    if (!text) return;
    select(label);
    const box = text.getClientRect({ relativeTo: stage });
    const ta = document.createElement("textarea");
    ta.className = "imgv-adv-textarea";
    ta.value = text.text();
    ta.style.cssText = `position:absolute;z-index:9;left:${container.offsetLeft + box.x}px;top:${container.offsetTop + box.y}px;width:${Math.max(80, box.width)}px;height:${Math.max(32, box.height)}px;font:${text.fontSize()}px ${text.fontFamily()};line-height:1.15;color:${text.fill()};background:var(--bg,#fff);border:1px solid var(--accent,#2563eb);padding:4px;resize:both;`;
    stageHost.appendChild(ta);
    tr.nodes([]);
    text.hide();
    layer.draw();
    const done = (commit) => {
      if (!ta.isConnected) return;
      if (commit) {
        snap();
        text.text(ta.value);
        markDirty();
      }
      ta.remove();
      text.show();
      select(label);
      layer.draw();
      refreshLayers();
    };
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        done(false);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        done(true);
      }
    });
    ta.addEventListener("blur", () => done(true));
    ta.focus();
    ta.select();
  }
  let marquee = null, marqueeStart = null, suppressClick = false;
  stage.on("mousedown touchstart", (e) => {
    if (!interactive || e.target !== stage) return;
    marqueeStart = stage.getPointerPosition();
    marquee = new Konva.Rect({ x: marqueeStart.x, y: marqueeStart.y, width: 0, height: 0, fill: "rgba(76,154,255,.16)", stroke: "#4c9aff", dash: [4, 3], listening: false });
    layer.add(marquee);
    marquee.moveToTop();
    tr.moveToTop();
  });
  stage.on("mousemove touchmove", () => {
    if (!marquee || !marqueeStart) return;
    const p = stage.getPointerPosition();
    if (!p) return;
    const x = Math.min(p.x, marqueeStart.x), y = Math.min(p.y, marqueeStart.y);
    marquee.setAttrs({ x, y, width: Math.abs(p.x - marqueeStart.x), height: Math.abs(p.y - marqueeStart.y) });
    layer.batchDraw();
  });
  stage.on("mouseup touchend", () => {
    if (!marquee || !marqueeStart) return;
    const box = marquee.getClientRect();
    const moved = box.width > 4 || box.height > 4;
    const hits = moved ? objects().filter((n) => Konva.Util.haveIntersection(box, n.getClientRect())) : [];
    marquee.destroy();
    marquee = null;
    marqueeStart = null;
    if (moved) {
      suppressClick = true;
      select(hits);
    }
  });
  stage.on("click tap", (e) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    if (e.target === stage && interactive) select(null);
  });
  const { deleteSelection, duplicateSelection, nudgeSelection, groupSelection, ungroupSelection } = installObjectActions({
    getSelected: () => selected,
    select,
    snap,
    tr,
    layer,
    Konva,
    cloneNode,
    placeObject,
    wireObject,
    isGroup,
    stageW: () => stageW,
    stageH: () => stageH,
    refreshLayers: () => refreshLayers(),
    syncToolbar,
    markDirty
  });
  installShapeControls({
    $,
    tb,
    addText,
    addShape,
    deleteSelection,
    groupSelection,
    ungroupSelection,
    pointEdit,
    precision,
    getSelected: () => selected,
    primary,
    isLabel,
    textNodeOf,
    layer,
    markDirty,
    snap,
    tr,
    refreshLayers: () => refreshLayers(),
    syncToolbar
  });
  syncToolbar();
  const uninstallKeys = installAdvKeys({
    ownerDocument: host.ownerDocument,
    keyTarget: container,
    isActive: () => interactive && host.isConnected,
    getSelection: () => selected.slice(),
    deleteSelection,
    duplicateSelection,
    nudgeSelection,
    clearSelection: () => select(null)
  });
  const onContainerDelete = (e) => {
    if ((e.key === "Delete" || e.key === "Backspace" || e.code === "Delete" || e.code === "Backspace" || e.keyCode === 46 || e.keyCode === 8) && selected.length) {
      e.preventDefault();
      e.stopPropagation();
      deleteSelection();
    }
  };
  container.addEventListener("keydown", onContainerDelete, true);
  container.addEventListener("keyup", onContainerDelete, true);
  container.onkeydown = onContainerDelete;
  container.onkeyup = onContainerDelete;
  function labelName(node) {
    return nodeName(node, isLabel, textNodeOf);
  }
  const layersPanel = mountAdvLayersPanel({ stageHost, layer, tr, getObjects: objects, getSelected: () => selected, select, snap, markDirty, cloneNode, placeObject, labelName, stageW: () => stageW, stageH: () => stageH });
  const panel = layersPanel.panel;
  const refreshLayers = layersPanel.refresh;
  installTextControls({ $, selectedLabels: () => selected.filter(isLabel), textNodeOf, tagNodeOf, layer, markDirty, refreshLayers });
  function flattenToCanvas() {
    const wasSel = selected.slice();
    select(null);
    const nW = img.naturalWidth || naturalW, nH = img.naturalHeight || naturalH;
    const canvas = document.createElement("canvas");
    canvas.width = nW;
    canvas.height = nH;
    const g = canvas.getContext("2d");
    g.drawImage(img, 0, 0, nW, nH);
    const precisionWasVisible = precision.layer.visible();
    const pointsWasVisible = pointEdit.layer.visible();
    precision.layer.visible(false);
    pointEdit.layer.visible(false);
    const overlay = stage.toCanvas({ pixelRatio: nW / stageW });
    precision.layer.visible(precisionWasVisible);
    pointEdit.layer.visible(pointsWasVisible);
    g.drawImage(overlay, 0, 0, nW, nH);
    if (wasSel.length) select(wasSel);
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
    precision.relayout();
    relayout();
  }
  function applyGeometry(affine) {
    const oldK = naturalW / stageW;
    const objs = objects();
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
    precision.relayout();
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
    objects().forEach((n) => n.destroy());
    select(null);
    layer.draw();
    refreshLayers();
    markDirty();
  }
  return {
    addText,
    addImage,
    isEmpty: () => objects().length === 0,
    objectCount: () => objects().length,
    setInteractive(on) {
      interactive = on;
      if (!on) pointEdit.setEnabled(false);
      tb.hidden = !on;
      tb.style.display = on ? "flex" : "none";
      panel.hidden = !on;
      panel.style.display = on ? "block" : "none";
      container.style.pointerEvents = on ? "auto" : "none";
      if (on) refreshLayers();
      else select(null);
    },
    // Overlay history bridge for editor-core's unified undo.
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
      uninstallKeys();
      container.removeEventListener("keydown", onContainerDelete, true);
      container.removeEventListener("keyup", onContainerDelete, true);
      container.onkeydown = null;
      container.onkeyup = null;
      pointEdit.destroy();
      precision.destroy();
      tr.destroy();
      stage.destroy();
      container.remove();
      tb.remove();
      layersPanel.destroy();
    }
  };
  function rebuild(json) {
    layer.destroyChildren();
    const tmp = Konva.Node.create(json);
    tmp.find(".obj").forEach((src) => {
      const node = src.clone();
      node.draggable(true);
      wireObject(node);
      layer.add(node);
    });
    layer.add(tr);
    select(null);
    markDirty();
  }
}

// docs/types/image/gif-decode.js
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

// docs/types/image/gif-anim.js
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
      <button class="gifv-ocr" title="Extract text from every frame into a timestamped transcript" disabled>Extract text (OCR)</button>
    </div>
    <div class="gifv-frames" hidden></div>`;
  host.appendChild(root);
  injectStyle3();
  const canvas = root.querySelector(".gifv-canvas");
  const cx = canvas.getContext("2d");
  const playBtn = root.querySelector(".gifv-play");
  const scrub = root.querySelector(".gifv-scrub");
  const count = root.querySelector(".gifv-count");
  const loopChk = root.querySelector(".gifv-loop-chk");
  const splitBtn = root.querySelector(".gifv-split");
  const ocrBtn = root.querySelector(".gifv-ocr");
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
  ocrBtn.addEventListener("click", () => openGifOcrPanel({ host: root, getFrames: () => frames }));
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
    ocrBtn.disabled = frames.length < 1;
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
function injectStyle3() {
  if (document.getElementById("gifv-style")) return;
  const s = document.createElement("style");
  s.id = "gifv-style";
  s.textContent = `
    .gifv-root { position:relative; display:flex; flex-direction:column; gap:.5rem; height:100%; min-height:0; }
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

// docs/types/image/renderer.js
var DOC_TPL = new URL("./doc.html", import.meta.url);
var EDIT_TOOLS_TPL = new URL("./edit-tools.html", import.meta.url);
var EDITABLE_MIME = /* @__PURE__ */ new Set(["image/png", "image/jpeg", "image/webp", "image/avif", "image/bmp", "image/gif"]);
async function render(intake, ctx = {}) {
  if (isSvg(intake)) {
    const DOMPurify = await loadGlobal3(vendor3("dompurify/purify.min.js"), "DOMPurify");
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
    cloneBtn,
    healBtn,
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
    curvesBtn,
    curvesPanel,
    curveCanvas,
    curveChannel,
    curveApply,
    curveReset,
    curveCancel,
    convolveBtn,
    convolvePanel,
    convType,
    convStrength,
    convApply,
    convCancel,
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
    curvesBtn,
    curvesPanel,
    curveCanvas,
    curveChannel,
    curveApply,
    curveReset,
    curveCancel,
    convolveBtn,
    convolvePanel,
    convType,
    convStrength,
    convApply,
    convCancel,
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
  if (canEdit) {
    mountTabs(host);
    mountHelpTab(host);
  }
  const ocrCanvas = () => {
    if (overlayActive()) return advController.flattenToCanvas();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth || 1;
    c.height = img.naturalHeight || 1;
    c.getContext("2d").drawImage(img, 0, 0);
    return c;
  };
  const ocrBtn = host.querySelector(".imgv-ocr-btn");
  if (ocrBtn) {
    ocrBtn.hidden = false;
    ocrBtn.addEventListener("click", () => openImageOcrPanel({ host: host.querySelector(".imgv-stage"), getCanvas: ocrCanvas }));
  }
  const downloadBtn = canEdit ? host.querySelector(".imgv-download") : null;
  downloadBtn?.addEventListener("click", async () => {
    const mt = exportFmt?.value || "" || core.getExportMime() || mime;
    let canvas;
    if (overlayActive()) {
      canvas = advController.flattenToCanvas();
    } else {
      const base = await core.loadBase();
      canvas = document.createElement("canvas");
      canvas.width = base.naturalWidth || img.naturalWidth;
      canvas.height = base.naturalHeight || img.naturalHeight;
      const g = canvas.getContext("2d");
      if (mt === "image/jpeg") {
        g.fillStyle = "#fff";
        g.fillRect(0, 0, canvas.width, canvas.height);
      }
      g.drawImage(base, 0, 0);
    }
    const blob = await new Promise((r) => canvas.toBlob(r, mt, mt === "image/jpeg" ? 0.92 : void 0));
    if (!blob) return;
    const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/avif": "avif" }[mt] || ((intake.filename || "").split(".").pop() || "png");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (intake.filename || "image").replace(/\.[^.]+$/, "") + "." + ext;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1e3);
  });
  const editTools = [];
  const viewCtl = createView({
    host,
    img,
    zoomLabel,
    syncOverlay: () => drawCtl?.syncOverlay(),
    getOverlayEl: () => drawCtl?.getOverlayEl(),
    getAdv: () => advController,
    isEditModeActive: () => advActive || drawCtl?.isDrawMode() || editTools.some((t) => t.isActive && t.isActive()),
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
  async function enterAdv({ seedText = true } = {}) {
    if (!advBtn || advActive) return;
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
      if (seedText && advController.objectCount() === 0) advController.addText();
    } catch (e) {
      advBtn.title = "Advanced editing failed: " + (e.message || e);
    }
    advBtn.disabled = false;
  }
  if (advBtn) {
    advBtn.hidden = false;
    advBtn.addEventListener("click", () => {
      if (advActive) leaveAdv();
      else enterAdv();
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
    selection?.clear();
    viewCtl.fitView();
  });
  let barRO = null;
  const barEl = host.querySelector(".imgv-bar");
  if (barEl && typeof ResizeObserver === "function") {
    barRO = new ResizeObserver(() => apply());
    barRO.observe(barEl);
  }
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
  mountCurves({ img, mime, core, els });
  mountConvolve({ img, mime, core, els });
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
    els: { pencilBtn, eraserBtn, fillBtn, cloneBtn, healBtn, fillTol, fillTolV, fillMode, fillPercep, fillFeather, fillOpts, drawColorPicker, drawSizePicker, undoBtn, redoBtn }
  });
  const unregisterUndoKeys = canEdit ? registerUndoKeys({
    host,
    isEnabled: () => !asciiMode,
    doUndo: core.doUndo,
    doRedo: core.doRedo,
    // Arrow keys nudge a live pixel selection (Shift = move just the outline); the
    // adv (vector) editor has its own arrow handling, so defer while it's active.
    onArrow: (dx, dy, shift) => {
      if (advActive || !selection?.hasSelection()) return false;
      selection.nudge(dx, dy, shift);
      return true;
    },
    // Ctrl+C copies the selected pixels (internal + best-effort OS clipboard); Ctrl+V
    // drops them into Adv Edit as a free move/rotate/resize pane (also accepts an
    // external image from the OS clipboard when nothing was copied internally).
    onCopy: () => {
      const cv = selection?.copySelection?.();
      if (!cv) return false;
      setClip(cv);
      copyToSystem(cv);
      return true;
    },
    onPaste: async () => {
      const cv = getClip() || await readFromSystem();
      if (!cv) return;
      await enterAdv({ seedText: false });
      advController?.addImage(cv);
    }
  }) : null;
  const bgTool = mountBg({ img, url, core, els });
  editTools.push(bgTool);
  const bgChecker = canEdit ? host.querySelector(".imgv-bg-checker") : null;
  bgChecker?.addEventListener("change", () => img.classList.toggle("imgv-checker", bgChecker.checked));
  return { parentNode: host, revoke: () => {
    barRO?.disconnect();
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
