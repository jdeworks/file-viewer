// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/core/app.js by build/app/build.mjs.
// Static startup modules are inlined to reduce browser request count. Every dynamic import()
// stays external/lazy, including detectors, type renderers, examples, games, known files, Monaco,
// side-by-side compare, and optional tools.

var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../docs/core/intake.js
var TEXT_SNIFF_BYTES = 4096;
var FILE_LOAD_FEEDBACK_BYTES = 500 * 1024;
var LARGE_FILE_BYTES = 8 * 1024 * 1024;
var MEDIA_STREAM_BYTES = 8 * 1024 * 1024;
var MEDIA_HEAD_BYTES = 64 * 1024;
var MAX_FULL_READ = 64 * 1024 * 1024;
var MEDIA_EXT = /\.(mp3|wav|m4a|m4b|aac|oga|ogg|opus|flac|weba|mp4|m4v|webm|ogv|mov|mkv)$/i;
function looksLikeMedia(file) {
  return MEDIA_EXT.test(file.name || "") || /^(audio|video)\//.test(file.type || "");
}
function decodeText(bytes) {
  let start = 0;
  if (bytes.length >= 3 && bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191) start = 3;
  const window2 = bytes.subarray(start, start + TEXT_SNIFF_BYTES);
  for (let i = 0; i < window2.length; i++) {
    if (window2[i] === 0) return null;
  }
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(start));
  } catch {
    return null;
  }
}
function buildIntake({ filename, mimeType, bytes, isPaste, lastModified, file = null, size, streamed = false, truncated = false }) {
  const text = streamed ? null : decodeText(bytes);
  return {
    filename: filename || (isPaste ? "pasted" : "untitled"),
    mimeType: mimeType || "",
    bytes,
    // for streamed media this is only a header slice
    text,
    // null => binary
    textSample: text ? text.slice(0, TEXT_SNIFF_BYTES) : "",
    isBinary: text === null,
    isPaste: !!isPaste,
    size: size == null ? bytes.length : size,
    lastModified: lastModified || null,
    file,
    // original File handle (when from disk) — streamable
    streamed,
    // true => bytes is a header only; use `file` for content
    truncated,
    // true => bytes/text are only the first MAX_FULL_READ; size is the full size
    loadedBytes: bytes.length
    // how many bytes are actually in `bytes` (≤ size when truncated)
  };
}
async function intakeFromFile(file) {
  if (looksLikeMedia(file) && file.size > MEDIA_STREAM_BYTES) {
    const head = new Uint8Array(await file.slice(0, MEDIA_HEAD_BYTES).arrayBuffer());
    return buildIntake({
      filename: file.name,
      mimeType: file.type,
      bytes: head,
      size: file.size,
      file,
      streamed: true,
      lastModified: file.lastModified || null
    });
  }
  if (file.size > MAX_FULL_READ) {
    const head = new Uint8Array(await file.slice(0, MAX_FULL_READ).arrayBuffer());
    return buildIntake({
      filename: file.name,
      mimeType: file.type,
      bytes: head,
      size: file.size,
      file,
      truncated: true,
      lastModified: file.lastModified || null
    });
  }
  const buf = new Uint8Array(await file.arrayBuffer());
  return buildIntake({
    filename: file.name,
    mimeType: file.type,
    bytes: buf,
    size: file.size,
    file,
    lastModified: file.lastModified || null
  });
}
var nextPaint = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(bytes >= 10 * 1048576 ? 0 : 1) + " MB";
  if (bytes >= 1024) return Math.round(bytes / 1024) + " KB";
  return bytes + " B";
}
async function showFileReadStatus(file, onFileStatus) {
  if (!onFileStatus || !file || file.size < FILE_LOAD_FEEDBACK_BYTES) return;
  onFileStatus("Reading " + (file.name || "file") + "…", { detail: formatBytes(file.size) });
  await nextPaint();
}
function intakeFromText(text, filename) {
  const bytes = new TextEncoder().encode(text);
  return buildIntake({ filename, mimeType: "text/plain", bytes, isPaste: true });
}
function pasteTargetIsEditable(e) {
  const path = (typeof e.composedPath === "function" ? e.composedPath() : null) || [];
  const nodes = path.length ? path : [e.target, document.activeElement];
  return nodes.some((n) => n && n.nodeType === 1 && (n.tagName === "INPUT" || n.tagName === "TEXTAREA" || n.tagName === "SELECT" || n.isContentEditable === true));
}
function readEntries(reader) {
  return new Promise((resolve, reject) => {
    const all = [];
    const next = () => reader.readEntries((batch) => {
      if (!batch.length) return resolve(all);
      all.push(...batch);
      next();
    }, reject);
    next();
  });
}
async function walkEntry(entry, prefix, out, onProgress) {
  const path = prefix ? prefix + "/" + entry.name : entry.name;
  if (entry.isFile) {
    await new Promise((res) => entry.file((f) => {
      out.push({ file: f, path });
      onProgress?.(out.length);
      res();
    }, () => res()));
  } else if (entry.isDirectory) {
    for (const child of await readEntries(entry.createReader())) await walkEntry(child, path, out, onProgress);
  }
}
function entriesFromFileList(fileList) {
  return [...fileList].map((file) => ({ file, path: file.webkitRelativePath || file.name }));
}
async function walkEntries(roots2, onProgress) {
  const out = [];
  for (const r of roots2) await walkEntry(r, "", out, onProgress);
  return out;
}
function wireIntake({ dropZone, fileInput, folderInput, onIntake, onFolder, onError, onFolderStatus, onFileStatus }) {
  const handleFile = async (file) => {
    try {
      if (!file) return;
      await showFileReadStatus(file, onFileStatus);
      await onIntake(await intakeFromFile(file));
    } catch (err) {
      onError?.(err);
    } finally {
      onFileStatus?.(null);
    }
  };
  fileInput?.addEventListener("change", (e) => handleFile(e.target.files?.[0]));
  folderInput?.addEventListener("change", (e) => {
    onFolderStatus?.("Preparing selected folder…");
    const entries = entriesFromFileList(e.target.files || []);
    if (entries.length) onFolder?.(entries);
    else onFolderStatus?.(null);
  });
  const handleDrop = async (e) => {
    const items = [...e.dataTransfer?.items || []];
    const roots2 = items.map((i) => i.webkitGetAsEntry?.()).filter(Boolean);
    if (roots2.some((r) => r.isDirectory) && onFolder) {
      const out = [];
      let lastUpdate = 0;
      onFolderStatus?.("Scanning dropped folder…", { detail: "0 files" });
      const onProgress = (count) => {
        if (count - lastUpdate < 200) return;
        lastUpdate = count;
        onFolderStatus?.("Scanning dropped folder…", { detail: count.toLocaleString() + " files" });
      };
      const walked = await walkEntries(roots2, onProgress);
      out.push(...walked);
      if (out.length) return onFolder(out);
      onFolderStatus?.(null);
    }
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };
  if (dropZone) {
    ["dragenter", "dragover"].forEach((ev) => dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    }));
    ["dragleave", "drop"].forEach((ev) => dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      if (ev === "dragleave" && e.target !== dropZone) return;
      dropZone.classList.remove("drag-over");
    }));
  }
  const intakeScreen = document.getElementById("intake");
  const isFileDrag = (e) => {
    const types = e.dataTransfer?.types;
    if (!types) return false;
    if (types.includes("text/x-fv-tree-path")) return false;
    return types.includes("Files");
  };
  const onEmptyScreen = () => intakeScreen && !intakeScreen.hidden;
  const setDragging = (on) => document.body.classList.toggle("fv-dragging", on);
  window.addEventListener("dragenter", (e) => {
    if (onEmptyScreen() && isFileDrag(e)) setDragging(true);
  });
  window.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (onEmptyScreen() && isFileDrag(e)) setDragging(true);
  });
  window.addEventListener("dragleave", (e) => {
    if (!e.relatedTarget) setDragging(false);
  });
  window.addEventListener("drop", (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer?.types?.includes("text/x-fv-tree-path")) return;
    handleDrop(e);
  });
  window.addEventListener("paste", (e) => {
    if (pasteTargetIsEditable(e)) return;
    const item = [...e.clipboardData?.items || []].find((i) => i.kind === "file");
    if (item) {
      handleFile(item.getAsFile());
      return;
    }
    const text = e.clipboardData?.getData("text");
    if (text && text.trim()) onIntake(intakeFromText(text, "pasted"));
  });
}

// ../../docs/types/text/code/langmap.js
var LANGS = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  c: "cpp",
  h: "cpp",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  hh: "cpp",
  cs: "csharp",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  kts: "kotlin",
  scala: "scala",
  m: "objective-c",
  fs: "fsharp",
  fsx: "fsharp",
  vb: "vb",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  ps1: "powershell",
  bat: "bat",
  cmd: "bat",
  html: "html",
  htm: "html",
  xml: "xml",
  svg: "xml",
  vue: "html",
  css: "css",
  scss: "scss",
  less: "less",
  yaml: "yaml",
  yml: "yaml",
  toml: "ini",
  ini: "ini",
  cfg: "ini",
  conf: "ini",
  tf: "hcl",
  hcl: "hcl",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  proto: "protobuf",
  wgsl: "wgsl",
  sol: "solidity",
  lua: "lua",
  r: "r",
  pl: "perl",
  dart: "dart",
  ex: "elixir",
  exs: "elixir",
  clj: "clojure",
  dockerfile: "dockerfile",
  makefile: "makefile",
  // Build-system source files (no dedicated Monaco grammar → closest fit / plaintext).
  cmake: "plaintext",
  bazel: "python",
  bzl: "python",
  ninja: "plaintext"
};
var FILENAMES = {
  dockerfile: "dockerfile",
  makefile: "makefile",
  "cmakelists.txt": "plaintext",
  cmakelists: "plaintext",
  "build.bazel": "python",
  build: "python",
  "workspace.bazel": "python",
  workspace: "python",
  "build.ninja": "plaintext",
  ".bazelrc": "ini",
  bazelrc: "ini"
};

// ../../docs/core/filetree.js
import { state } from "./state.js";
var TYPE_DOT = {
  markdown: "#519aff",
  pdf: "#e5534b",
  csv: "#3fb950",
  xlsx: "#3fb950",
  docx: "#4c9aff",
  pptx: "#e3a008",
  json: "#e3b341",
  image: "#a371f7",
  code: "#56b6c2",
  text: "#8b949e"
};
var TYPE_ICON = {
  js: "{ }",
  ts: "{ }",
  code: "{ }",
  json: "{ }",
  yaml: "{ }",
  toml: "{ }",
  image: "🖼",
  pdf: "📋",
  video: "🎬",
  audio: "🎬",
  media: "🎬",
  markdown: "¶"
};
var EXT_TYPE = {
  md: "markdown",
  markdown: "markdown",
  mdown: "markdown",
  mkd: "markdown",
  pdf: "pdf",
  csv: "csv",
  tsv: "csv",
  xlsx: "xlsx",
  xls: "xlsx",
  xlsm: "xlsx",
  xlsb: "xlsx",
  ods: "xlsx",
  docx: "docx",
  dotx: "docx",
  pptx: "pptx",
  ppsx: "pptx",
  pptm: "pptx",
  json: "json",
  jsonc: "json",
  geojson: "json",
  json5: "json",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  bmp: "image",
  avif: "image",
  ico: "image",
  svg: "image"
};
function quickType(filename) {
  const base = (filename || "").toLowerCase().split("/").pop();
  if (FILENAMES[base]) return "code";
  const ext = base.includes(".") ? base.split(".").pop() : "";
  if (EXT_TYPE[ext]) return EXT_TYPE[ext];
  if (LANGS[ext]) return "code";
  return "text";
}
var dotColor = (id) => TYPE_DOT[id] || TYPE_DOT.text;
function fmtSize(n) {
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(0) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}
var _dragNode = null;
function getDraggedTreeNode() {
  return _dragNode;
}
var TREE_DRAG_TYPE = "text/x-fv-tree-path";
function buildTree(entries) {
  const root = { name: "", dir: true, children: /* @__PURE__ */ new Map() };
  for (const e of entries) {
    const parts = e.path.split("/").filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const last = i === parts.length - 1;
      const name = parts[i];
      if (last) {
        const ex = node.children.get(name);
        node.children.set(name, { ...e, name, dir: false, file: e.file, path: e.path, originalPath: e.originalPath || e.path, children: ex && ex.children ? ex.children : void 0 });
      } else {
        let child = node.children.get(name);
        if (!child) {
          child = { name, dir: true, children: /* @__PURE__ */ new Map() };
          node.children.set(name, child);
        } else if (!child.children) child.children = /* @__PURE__ */ new Map();
        node = child;
      }
    }
  }
  return root;
}
function sortedChildren(node) {
  return [...node.children.values()].sort((a, b) => a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1);
}
var ROW_H = 28;
var OVERSCAN = 8;
function collectFolderPaths(node, prefix, out, depth = 0, maxDepth = Infinity) {
  for (const c of sortedChildren(node)) {
    if (c.children && c.children.size) {
      const fp = prefix ? prefix + "/" + c.name : c.name;
      if (depth <= maxDepth) out.add(fp);
      collectFolderPaths(c, fp, out, depth + 1, maxDepth);
    }
  }
}
function renderTree(host, root, {
  onOpen,
  onMove,
  onDelete,
  onReveal,
  canDiskAction = () => true,
  initialOpenDepth = Infinity
}) {
  host.innerHTML = "";
  const inner = document.createElement("div");
  inner.className = "ft-virtual-inner";
  inner.style.position = "relative";
  inner.style.height = "0px";
  host.appendChild(inner);
  const openFolders = /* @__PURE__ */ new Set();
  collectFolderPaths(root, "", openFolders, 0, initialOpenDepth);
  let items = [];
  let activeNode = null;
  let filterFn = null;
  const editedPaths = /* @__PURE__ */ new Set();
  const movedPaths = /* @__PURE__ */ new Map();
  function buildFlat() {
    items = [];
    function walk(node, depth, parentPath) {
      for (const c of sortedChildren(node)) {
        const fp = parentPath ? parentPath + "/" + c.name : c.name;
        if (c.dir) {
          if (!filterFn) {
            items.push({ node: c, depth, isFolder: true, folderPath: fp });
            if (openFolders.has(fp)) walk(c, depth + 1, fp);
          } else {
            walk(c, depth + 1, fp);
          }
        } else {
          const kids = c.children && c.children.size;
          if (!filterFn || filterFn(c.path)) {
            items.push({ node: c, depth: filterFn ? 0 : depth, isFolder: false, folderPath: kids ? fp : "", expandable: !!kids });
          }
          if (kids && !filterFn && openFolders.has(fp)) walk(c, depth + 1, fp);
        }
      }
    }
    walk(root, 0, "");
    inner.style.height = items.length * ROW_H + "px";
    inner.innerHTML = "";
    paint();
  }
  let mq = null;
  function stopMarquee() {
    if (!mq) return;
    clearInterval(mq.timer);
    mq.el.textContent = mq.name;
    mq.el.classList.remove("ft-ticker");
    mq = null;
  }
  function startMarquee(row) {
    stopMarquee();
    const el = row && row.querySelector(".ft-name");
    if (!el || el.scrollWidth <= el.clientWidth + 1) return;
    const name = el.textContent;
    el.classList.add("ft-ticker");
    let s = name + "   ";
    mq = { el, name, timer: setInterval(() => {
      s = s.slice(1) + s[0];
      el.textContent = s;
    }, 100) };
  }
  function appendRowActions(row, target) {
    if (!canDiskAction(target)) return;
    if (onReveal) {
      const rev = document.createElement("button");
      rev.className = "ft-reveal";
      rev.textContent = "📂";
      rev.title = "Reveal in file manager";
      rev.tabIndex = -1;
      rev.addEventListener("click", (e) => {
        e.stopPropagation();
        onReveal(target);
      });
      row.appendChild(rev);
    }
    if (onDelete) {
      const del = document.createElement("button");
      del.className = "ft-del";
      del.textContent = "🗑";
      del.title = target.isFolder ? "Delete this folder from disk" : "Delete this file from disk";
      del.tabIndex = -1;
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        onDelete(target);
      });
      row.appendChild(del);
    }
  }
  function makeRow(item, idx) {
    const row = document.createElement("div");
    row.className = "ft-row " + (item.isFolder ? "ft-folder" : "ft-file");
    row.dataset.idx = idx;
    row.style.position = "absolute";
    row.style.top = idx * ROW_H + "px";
    row.style.height = ROW_H + "px";
    row.style.width = "100%";
    const pad = 8 + item.depth * 14;
    row.style.paddingLeft = pad + "px";
    if (item.isFolder) {
      const isOpen = openFolders.has(item.folderPath);
      row.innerHTML = '<span class="ft-arrow">' + (isOpen ? "▾" : "▸") + '</span><span class="ft-icon">' + (isOpen ? "📂" : "📁") + '</span><span class="ft-name">' + escapeHtml(item.node.name) + "</span>";
      row.tabIndex = -1;
      row.addEventListener("click", () => {
        if (openFolders.has(item.folderPath)) openFolders.delete(item.folderPath);
        else openFolders.add(item.folderPath);
        buildFlat();
      });
      appendRowActions(row, { path: item.folderPath, isFolder: true, name: item.node.name, root: item.depth === 0 });
      if (onMove) {
        row.addEventListener("dragover", (e) => {
          if (![...e.dataTransfer.types].includes(TREE_DRAG_TYPE)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          inner.querySelectorAll(".ft-drop-target").forEach((r) => r.classList.remove("ft-drop-target"));
          row.classList.add("ft-drop-target");
        });
        row.addEventListener("dragleave", (e) => {
          if (row.contains(e.relatedTarget)) return;
          row.classList.remove("ft-drop-target");
        });
        row.addEventListener("drop", (e) => {
          e.preventDefault();
          row.classList.remove("ft-drop-target");
          const srcPath = e.dataTransfer.getData(TREE_DRAG_TYPE);
          if (srcPath && srcPath !== item.folderPath) onMove(srcPath, item.folderPath);
        });
      }
    } else {
      const visiblePath = item.node.sidebarInnerPath || item.node.path;
      row.dataset.path = visiblePath;
      row.dataset.fullPath = item.node.path;
      row.tabIndex = 0;
      row.draggable = true;
      const id = quickType(item.node.name);
      const typeIcon = TYPE_ICON[id] || "▫";
      const isOpen = item.expandable && openFolders.has(item.folderPath);
      row.innerHTML = (item.expandable ? '<span class="ft-arrow">' + (isOpen ? "▾" : "▸") + "</span>" : "") + '<span class="ft-dot" style="background:' + dotColor(id) + '"></span><span class="ft-icon ft-icon-type" title="' + id + '">' + typeIcon + '</span><span class="ft-name">' + escapeHtml(item.node.name) + "</span>" + (movedPaths.has(item.node.path) ? '<span class="ft-move-dest">→ ' + escapeHtml(movedPaths.get(item.node.path)) + "</span>" : "") + '<span class="ft-size">' + fmtSize(item.node.file.size) + "</span>";
      if (item.node === activeNode) row.classList.add("active");
      if (editedPaths.has(item.node.path)) row.classList.add("ft-edited");
      if (movedPaths.has(item.node.path)) row.classList.add("ft-moved");
      if (state.sessionTree) row.classList.add("ft-session");
      if (item.expandable) {
        row.querySelector(".ft-arrow").addEventListener("click", (e) => {
          e.stopPropagation();
          if (openFolders.has(item.folderPath)) openFolders.delete(item.folderPath);
          else openFolders.add(item.folderPath);
          buildFlat();
        });
      }
      row.addEventListener("click", () => {
        setActive(item.node.path);
        onOpen(item.node);
      });
      appendRowActions(row, { path: item.node.path, isFolder: false, name: item.node.name, root: item.node.sidebarRoot || item.depth === 0 });
      row.addEventListener("dragstart", (e) => {
        _dragNode = item.node.sidebarInnerPath ? { ...item.node, path: item.node.sidebarInnerPath } : item.node;
        e.dataTransfer.setData(TREE_DRAG_TYPE, item.node.path);
        e.dataTransfer.effectAllowed = "move";
      });
      row.addEventListener("dragend", () => {
        _dragNode = null;
      });
    }
    return row;
  }
  function paint() {
    const scrollTop = host.scrollTop;
    const viewRows = Math.ceil(host.clientHeight / ROW_H) + 1;
    const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
    const end = Math.min(items.length, start + viewRows + OVERSCAN * 2);
    const existing = inner.querySelectorAll("[data-idx]");
    for (const el of existing) {
      const i = Number(el.dataset.idx);
      if (i < start || i >= end) el.remove();
    }
    const rendered = /* @__PURE__ */ new Set();
    for (const el of inner.querySelectorAll("[data-idx]")) rendered.add(Number(el.dataset.idx));
    for (let i = start; i < end; i++) {
      if (!rendered.has(i)) inner.appendChild(makeRow(items[i], i));
    }
  }
  function setActive(path) {
    const oldRow = inner.querySelector(".ft-row.active");
    if (oldRow) oldRow.classList.remove("active");
    stopMarquee();
    activeNode = items.find((it) => !it.isFolder && it.node.path === path)?.node || null;
    if (!activeNode && !filterFn) {
      openAncestors(path);
      buildFlat();
      activeNode = items.find((it) => !it.isFolder && it.node.path === path)?.node || null;
    }
    const newRow = inner.querySelector('[data-full-path="' + cssEscape(path) + '"], [data-path="' + cssEscape(path) + '"]');
    if (newRow) {
      newRow.classList.add("active");
      startMarquee(newRow);
    }
    const itemIdx = items.findIndex((it) => !it.isFolder && it.node.path === path);
    if (itemIdx >= 0) {
      const top = itemIdx * ROW_H;
      if (top < host.scrollTop) host.scrollTop = top;
      else if (top + ROW_H > host.scrollTop + host.clientHeight) host.scrollTop = top + ROW_H - host.clientHeight;
    }
  }
  function setEdited(path, on = true) {
    if (on) editedPaths.add(path);
    else editedPaths.delete(path);
    const row = inner.querySelector('[data-full-path="' + cssEscape(path) + '"], [data-path="' + cssEscape(path) + '"]');
    if (row) row.classList.toggle("ft-edited", on !== false);
  }
  function setMoved(path, on = true) {
    if (on) movedPaths.set(path, typeof on === "string" ? on : path);
    else movedPaths.delete(path);
    const row = inner.querySelector('[data-full-path="' + cssEscape(path) + '"], [data-path="' + cssEscape(path) + '"]');
    if (row) {
      row.classList.toggle("ft-moved", on !== false);
      const size = row.querySelector(".ft-size");
      row.querySelector(".ft-move-dest")?.remove();
      if (on !== false && size) {
        const badge = document.createElement("span");
        badge.className = "ft-move-dest";
        badge.textContent = "→ " + movedPaths.get(path);
        row.insertBefore(badge, size);
      }
    }
  }
  function filter(matchFn) {
    filterFn = matchFn;
    buildFlat();
    return items.length;
  }
  function clearFilter() {
    filterFn = null;
    buildFlat();
  }
  function expandAll() {
    collectFolderPaths(root, "", openFolders);
    buildFlat();
  }
  function collapseAll() {
    openFolders.clear();
    buildFlat();
  }
  function getOpenFolders() {
    return [...openFolders];
  }
  function openPaths(paths) {
    for (const p of paths || []) openFolders.add(p);
    buildFlat();
  }
  function openAncestors(path) {
    const parts = path.split("/").filter(Boolean);
    let cur = "";
    for (let i = 0; i < parts.length - 1; i++) {
      cur = cur ? cur + "/" + parts[i] : parts[i];
      openFolders.add(cur);
    }
  }
  function navigate(dir) {
    const fileItems = items.filter((it) => !it.isFolder);
    if (!fileItems.length) return;
    const curIdx = activeNode ? fileItems.findIndex((it) => it.node === activeNode) : -1;
    const nextIdx = Math.max(0, Math.min(fileItems.length - 1, curIdx + dir));
    const next = fileItems[nextIdx];
    if (!next) return;
    setActive(next.node.path);
    onOpen(next.node);
  }
  function refresh() {
    startMarquee(inner.querySelector(".ft-row.active"));
  }
  function rerender() {
    buildFlat();
  }
  function stop() {
    stopMarquee();
    host.removeEventListener("scroll", onScroll);
  }
  function onScroll() {
    paint();
  }
  host.addEventListener("scroll", onScroll, { passive: true });
  new ResizeObserver(paint).observe(host);
  buildFlat();
  return { setActive, setEdited, setMoved, filter, clearFilter, navigate, refresh, rerender, expandAll, collapseAll, getOpenFolders, openPaths, stop };
}
function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
function cssEscape(s) {
  return s.replace(/["\\]/g, "\\$&");
}

// ../../docs/core/offline.js
var VKEY = "fv:offline:savedVersion";
function initOffline(statusEl) {
  if (!("serviceWorker" in navigator) || !statusEl) return;
  let currentVersion = null;
  let statusKnown = false;
  let fullAvailable = false;
  let cachedAssets = 0;
  let totalAssets = 0;
  let pendingMessage = null;
  let activePrecacheRequest = null;
  let requestSequence = 0;
  const nextRequestId = () => {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    return `offline-${Date.now().toString(36)}-${(++requestSequence).toString(36)}-${random[0].toString(36)}`;
  };
  const send = (msg) => {
    const controller = navigator.serviceWorker.controller;
    if (!controller) return false;
    controller.postMessage(msg);
    return true;
  };
  const setState = (cls, html, title) => {
    statusEl.hidden = false;
    statusEl.className = "offline-status " + cls;
    statusEl.innerHTML = html;
    if (title) statusEl.title = title;
  };
  function rest() {
    const saved = localStorage.getItem(VKEY);
    if (!statusKnown) {
      if (saved) setState("checking", '<span class="off-spin"></span> Checking offline save…', "Verifying the saved offline files");
      else setState("idle", '<span class="off-ring"></span> Save offline', "Choose files and viewers to make available without a connection");
    } else if (fullAvailable && currentVersion) {
      localStorage.setItem(VKEY, currentVersion);
      setState("ready", '<span class="off-check">✓</span> Available offline', "The complete current viewer is saved for offline use");
    } else if (cachedAssets > 0) {
      localStorage.removeItem(VKEY);
      const count = totalAssets ? cachedAssets + " / " + totalAssets + " assets saved" : "Selected bundles are saved";
      setState("partial", '<span class="off-check">✓</span> Selected bundles saved', count + ". Choose more bundles at any time.");
    } else {
      localStorage.removeItem(VKEY);
      setState("idle", '<span class="off-ring"></span> Save offline', "Choose bundles to make available without a connection");
    }
  }
  navigator.serviceWorker.addEventListener("message", (e) => {
    const d = e.data || {};
    const isPrecacheMessage = d.type === "precache-progress" || d.type === "precache-done" || d.type === "precache-error";
    if (isPrecacheMessage && (!activePrecacheRequest || d.requestId !== activePrecacheRequest)) return;
    if (d.type === "cache-status") {
      currentVersion = d.version || currentVersion;
      statusKnown = true;
      fullAvailable = !!d.full;
      cachedAssets = Number(d.cached) || 0;
      totalAssets = Number(d.total) || 0;
      rest();
    } else if (d.type === "precache-progress") {
      setState("caching", '<span class="off-spin"></span> Saving for offline… ' + d.done + " / " + d.total);
    } else if (d.type === "precache-done") {
      currentVersion = d.version || currentVersion;
      statusKnown = true;
      fullAvailable = !!d.full;
      cachedAssets = Number(d.cached) || 0;
      totalAssets = Number(d.total) || 0;
      activePrecacheRequest = null;
      rest();
    } else if (d.type === "precache-error") {
      activePrecacheRequest = null;
      fullAvailable = false;
      localStorage.removeItem(VKEY);
      setState("error", '<span aria-hidden="true">!</span> Offline save incomplete — retry', d.error || "Some files could not be saved. Retry while online.");
    }
  });
  statusEl.style.cursor = "pointer";
  statusEl.setAttribute("role", "button");
  statusEl.tabIndex = 0;
  const onActivate = () => {
    if (statusEl.classList.contains("caching") || statusEl.classList.contains("preparing")) return;
    openCacheModal((files) => {
      activePrecacheRequest = nextRequestId();
      const message = { type: "precache", files, requestId: activePrecacheRequest };
      if (send(message)) setState("caching", '<span class="off-spin"></span> Saving for offline…');
      else {
        pendingMessage = message;
        setState("preparing", '<span class="off-spin"></span> Preparing offline save…', "Waiting for offline support to become ready");
      }
    }, (error) => {
      setState("error", '<span aria-hidden="true">!</span> Offline options unavailable — retry', error?.message || String(error));
    });
  };
  statusEl.addEventListener("click", onActivate);
  statusEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate();
    }
  });
  rest();
  navigator.serviceWorker.register("sw.js").then(async (reg) => {
    await navigator.serviceWorker.ready;
    const onController = () => {
      if (pendingMessage && send(pendingMessage)) {
        pendingMessage = null;
        setState("caching", '<span class="off-spin"></span> Saving for offline…');
      } else {
        send({ type: "status" });
      }
    };
    onController();
    navigator.serviceWorker.addEventListener("controllerchange", onController);
    const promptIfWaiting = (worker) => {
      if (worker && navigator.serviceWorker.controller) showUpdateBanner(worker);
    };
    promptIfWaiting(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const sw = reg.installing;
      sw?.addEventListener("statechange", () => {
        if (sw.state === "installed") promptIfWaiting(sw);
      });
    });
    let checking = false;
    const checkForUpdate = () => {
      if (checking || document.hidden) return;
      checking = true;
      reg.update().catch(() => {
      }).finally(() => {
        checking = false;
      });
    };
    document.addEventListener("visibilitychange", checkForUpdate);
    window.addEventListener("focus", checkForUpdate);
  }).catch((error) => {
    pendingMessage = null;
    activePrecacheRequest = null;
    setState("error", '<span aria-hidden="true">!</span> Offline support unavailable', error?.message || "Service worker registration failed.");
  });
}
var updateBannerShown = false;
function showUpdateBanner(worker) {
  if (updateBannerShown || document.getElementById("updateBanner")) return;
  updateBannerShown = true;
  const bar = document.createElement("div");
  bar.id = "updateBanner";
  bar.className = "update-banner";
  bar.setAttribute("role", "status");
  bar.setAttribute("aria-live", "polite");
  bar.innerHTML = '<span class="ub-msg">A new version of the viewer is available.</span><button class="ub-reload" type="button">Reload</button><button class="ub-dismiss" type="button" aria-label="Dismiss">✕</button>';
  document.body.appendChild(bar);
  let reloading = false;
  const reload = () => {
    if (!reloading) {
      reloading = true;
      location.reload();
    }
  };
  bar.querySelector(".ub-reload").addEventListener("click", () => {
    bar.querySelector(".ub-reload").textContent = "Reloading…";
    navigator.serviceWorker.addEventListener("controllerchange", reload, { once: true });
    worker.postMessage({ type: "skip-waiting" });
    setTimeout(reload, 2500);
  });
  bar.querySelector(".ub-dismiss").addEventListener("click", () => {
    bar.remove();
  });
}
function fmtSize2(n) {
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(0) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}
function emulatorsEnabled() {
  try {
    const saved = JSON.parse(localStorage.getItem("fv:settings:global") || "null");
    return saved?.values?.enableEmulators === true || saved?.enableEmulators === true;
  } catch {
    return false;
  }
}
var GROUP_ORDER = ["App shell", "File viewers", "Editor", "Data & charts", "Documents", "Archives", "Media", "Games", "Easter eggs", "Content", "Emulators"];
var CACHE_PRESETS = [
  {
    id: "common-v",
    label: "Common V",
    title: "Common viewing: app shell, file viewers, common document/data/media libraries, and common sample files.",
    bundles: [
      "core",
      "known",
      "types",
      "vendor:dompurify",
      "vendor:markdown-it",
      "vendor:js-yaml",
      "vendor:papaparse",
      "vendor:jszip",
      "vendor:pdfjs",
      "vendor:xlsx",
      "vendor:mammoth",
      "vendor:pptxviewjs",
      "vendor:cfb",
      "vendor:html2canvas",
      "vendor:gifuct",
      "vendor:utif",
      "vendor:libheif",
      "vendor:fonts",
      "vendor:monaco",
      "examples:catalog",
      "examples:text-config",
      "examples:data",
      "examples:office"
    ]
  },
  {
    id: "common-e",
    label: "Common E",
    title: "Common editing: Common V plus Monaco, TipTap, and common export/editing helpers.",
    bundles: [
      "core",
      "known",
      "types",
      "vendor:dompurify",
      "vendor:markdown-it",
      "vendor:js-yaml",
      "vendor:papaparse",
      "vendor:jszip",
      "vendor:pdfjs",
      "vendor:xlsx",
      "vendor:mammoth",
      "vendor:pptxviewjs",
      "vendor:cfb",
      "vendor:html2canvas",
      "vendor:gifuct",
      "vendor:gifenc",
      "vendor:utif",
      "vendor:libheif",
      "vendor:fonts",
      "vendor:monaco",
      "vendor:tiptap",
      "vendor:pdf-lib",
      "vendor:konva",
      "examples:catalog",
      "examples:text-config",
      "examples:data",
      "examples:office"
    ]
  },
  {
    id: "office-v",
    label: "Office V",
    title: "Office viewing: Markdown, PDF, spreadsheets, slides, Word/OpenDocument, archives used by Office formats, and office examples.",
    bundles: [
      "core",
      "known",
      "types",
      "vendor:dompurify",
      "vendor:markdown-it",
      "vendor:js-yaml",
      "vendor:jszip",
      "vendor:pdfjs",
      "vendor:xlsx",
      "vendor:mammoth",
      "vendor:pptxviewjs",
      "vendor:cfb",
      "vendor:html2canvas",
      "vendor:monaco",
      "examples:catalog",
      "examples:office",
      "examples:text-config",
      "examples:data"
    ]
  },
  {
    id: "office-e",
    label: "Office E",
    title: "Office editing: Office V plus source editor, Markdown WYSIWYG, and document export/editing helpers.",
    bundles: [
      "core",
      "known",
      "types",
      "vendor:dompurify",
      "vendor:markdown-it",
      "vendor:js-yaml",
      "vendor:jszip",
      "vendor:pdfjs",
      "vendor:xlsx",
      "vendor:mammoth",
      "vendor:pptxviewjs",
      "vendor:cfb",
      "vendor:html2canvas",
      "vendor:monaco",
      "vendor:tiptap",
      "vendor:pdf-lib",
      "examples:catalog",
      "examples:office",
      "examples:text-config",
      "examples:data"
    ]
  }
];
var DEFAULT_CACHE_BUNDLES = new Set(CACHE_PRESETS[0].bundles);
var cacheModalOpening = false;
async function openCacheModal(onConfirm, onError = () => {
}) {
  const existing = document.querySelector(".cache-modal");
  if (existing) {
    existing.querySelector(".cm-close")?.focus();
    return;
  }
  if (cacheModalOpening) return;
  cacheModalOpening = true;
  let bundles;
  try {
    const response = await fetch("asset-manifest.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load offline options (" + response.status + ").");
    bundles = (await response.json()).bundles || [];
    if (!bundles.length) throw new Error("No offline bundles are available.");
  } catch (error) {
    cacheModalOpening = false;
    onError(error);
    return;
  }
  cacheModalOpening = false;
  if (!emulatorsEnabled()) bundles = bundles.filter((b) => b.group !== "Emulators");
  const grouped = /* @__PURE__ */ new Map();
  for (const b of bundles) {
    const g = b.group || "Other";
    if (!grouped.has(g)) grouped.set(g, []);
    grouped.get(g).push(b);
  }
  const cats = [...grouped.keys()].sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a), ib = GROUP_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
  const root = document.createElement("div");
  root.className = "cache-modal-backdrop";
  root.innerHTML = '<div class="cache-modal" role="dialog" aria-modal="true" aria-labelledby="cacheModalTitle"><header class="cm-head"><h2 id="cacheModalTitle">Save for offline</h2><button type="button" class="cm-close" aria-label="Close">✕</button></header><p class="cm-intro">Choose what to cache so it works without a connection. Sizes are downloads.</p><div class="cm-toolbar"><button type="button" class="cm-all">Select all</button><button type="button" class="cm-none">Deselect all</button>' + CACHE_PRESETS.map((p) => '<button type="button" class="cm-preset" data-preset="' + p.id + '" title="' + p.title + '" aria-pressed="' + (p.id === "common-v") + '">' + p.label + "</button>").join("") + '<span class="cm-grand-total"></span></div><div class="cm-groups"></div><footer class="cm-foot"><span class="cm-total"></span><button type="button" class="cm-save">Save selected</button></footer></div>';
  const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.body.appendChild(root);
  document.body.classList.add("cache-modal-open");
  const groupsEl = root.querySelector(".cm-groups");
  const totalEl = root.querySelector(".cm-total");
  const grandEl = root.querySelector(".cm-grand-total");
  function rowHtml(b) {
    const isCore = b.id === "core" || b.id === "known";
    const checked = isCore || DEFAULT_CACHE_BUNDLES.has(b.id);
    return '<label class="cm-row' + (b.heavy ? " cm-row-heavy" : "") + '"><input type="checkbox" class="cm-chk" data-id="' + b.id + '" data-size="' + b.size + '"' + (checked ? " checked" : "") + (isCore ? " disabled" : "") + '><span class="cm-label">' + (b.label || b.id) + (isCore ? ' <span class="cm-req">(required)</span>' : "") + "</span>" + (b.heavy ? '<span class="cm-heavy">large</span>' : "") + '<span class="cm-size">' + fmtSize2(b.size) + "</span></label>";
  }
  cats.forEach((cat, groupIndex) => {
    const bs = grouped.get(cat);
    const isAppShell = cat === "App shell";
    const sec = document.createElement("div");
    sec.className = "cm-group";
    const head = document.createElement("button");
    head.type = "button";
    head.className = "cm-group-head";
    head.setAttribute("aria-expanded", String(!isAppShell));
    const bodyId = "cacheModalGroup" + groupIndex;
    head.setAttribute("aria-controls", bodyId);
    head.innerHTML = '<span class="cm-toggle" aria-hidden="true">' + (isAppShell ? "▸" : "▾") + '</span><span class="cm-group-label">' + cat + '</span><span class="cm-group-meta"></span>';
    const body = document.createElement("div");
    body.id = bodyId;
    body.className = "cm-group-body" + (isAppShell ? " cm-collapsed" : "");
    body.hidden = isAppShell;
    body.innerHTML = bs.map(rowHtml).join("");
    sec.appendChild(head);
    sec.appendChild(body);
    groupsEl.appendChild(sec);
    head.addEventListener("click", () => {
      const collapsed = body.classList.toggle("cm-collapsed");
      body.hidden = collapsed;
      head.setAttribute("aria-expanded", String(!collapsed));
      head.querySelector(".cm-toggle").textContent = collapsed ? "▸" : "▾";
    });
  });
  function updateTotals() {
    let grand = 0;
    for (const sec of groupsEl.querySelectorAll(".cm-group")) {
      let sel = 0, tot = 0, selSize = 0;
      for (const c of sec.querySelectorAll(".cm-chk")) {
        tot++;
        const sz = Number(c.dataset.size) || 0;
        if (c.checked) {
          sel++;
          selSize += sz;
          grand += sz;
        }
      }
      const meta = sec.querySelector(".cm-group-meta");
      if (meta) meta.textContent = sel + " / " + tot + " selected · " + fmtSize2(selSize);
    }
    totalEl.textContent = "Selected: " + fmtSize2(grand);
    grandEl.textContent = "Total: " + fmtSize2(grand);
  }
  updateTotals();
  const setActivePreset = (id = null) => {
    root.querySelectorAll(".cm-preset").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.preset === id)));
  };
  groupsEl.addEventListener("change", () => {
    setActivePreset();
    updateTotals();
  });
  root.querySelector(".cm-all").addEventListener("click", () => {
    for (const c of root.querySelectorAll(".cm-chk:not(:disabled)")) c.checked = true;
    setActivePreset();
    updateTotals();
  });
  root.querySelector(".cm-none").addEventListener("click", () => {
    for (const c of root.querySelectorAll(".cm-chk:not(:disabled)")) c.checked = false;
    setActivePreset();
    updateTotals();
  });
  root.querySelectorAll(".cm-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = CACHE_PRESETS.find((p) => p.id === btn.dataset.preset);
      if (!preset) return;
      const ids = new Set(preset.bundles);
      for (const c of root.querySelectorAll(".cm-chk:not(:disabled)")) c.checked = ids.has(c.dataset.id);
      setActivePreset(preset.id);
      updateTotals();
    });
  });
  const focusable = () => [...root.querySelectorAll("button:not(:disabled), input:not(:disabled)")].filter((element) => !element.hidden && element.getClientRects().length > 0);
  const onKeydown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusable();
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKeydown);
    root.remove();
    document.body.classList.remove("cache-modal-open");
    if (previousActive?.isConnected) previousActive.focus();
  };
  root.querySelector(".cm-close").addEventListener("click", close);
  root.addEventListener("click", (e) => {
    if (e.target === root) close();
  });
  document.addEventListener("keydown", onKeydown);
  root.querySelector(".cm-save").addEventListener("click", () => {
    const chosen = /* @__PURE__ */ new Set();
    for (const c of root.querySelectorAll(".cm-chk")) if (c.checked || c.disabled) chosen.add(c.dataset.id);
    const files = [...new Set(bundles.filter((b) => chosen.has(b.id)).flatMap((b) => b.files))];
    close();
    onConfirm(files);
  });
  root.querySelector(".cm-close").focus();
}
function initOfflineBadge() {
  const badge = document.getElementById("offlineBadge");
  if (!badge) return;
  badge.textContent = "Offline";
  if (!navigator.onLine) badge.hidden = false;
  window.addEventListener("online", () => {
    badge.hidden = true;
  });
  window.addEventListener("offline", () => {
    badge.hidden = false;
  });
}
function offlineMissHtml() {
  return '<div class="offline-miss"><div class="om-icon">📡</div><p><strong>Not available offline yet.</strong></p><p>This viewer wasn’t loaded while you were online, so it isn’t in the cache. Anything you’ve already opened still works offline.</p><p>Reconnect once to use it — or, next time you have a connection, tap <strong>“Save offline”</strong> in the top bar (under More controls on a phone) and include the bundle this viewer needs.</p></div>';
}

// ../../docs/core/persistence.js
var persistence_exports = {};
__export(persistence_exports, {
  clearState: () => clearState,
  fingerprint: () => fingerprint,
  loadState: () => loadState,
  saveState: () => saveState,
  updateState: () => updateState
});
var PREFIX = "fv:state:";
var INDEX = "fv:state:index";
var MAX_ENTRIES = 120;
function fingerprint(intake) {
  if (!intake) return "";
  const name = intake.filename || "untitled";
  return `${name}:${intake.size || 0}`;
}
var keyFor = (fp) => PREFIX + fp;
function readIndex() {
  try {
    return JSON.parse(localStorage.getItem(INDEX) || "[]");
  } catch {
    return [];
  }
}
function writeIndex(list) {
  try {
    localStorage.setItem(INDEX, JSON.stringify(list));
  } catch {
  }
}
function touch(fp) {
  const list = readIndex().filter((x) => x !== fp);
  list.push(fp);
  writeIndex(list);
}
function evictOldest() {
  const list = readIndex();
  const victim = list.shift();
  if (victim != null) {
    try {
      localStorage.removeItem(keyFor(victim));
    } catch {
    }
  }
  writeIndex(list);
  return victim != null;
}
function loadState(intake) {
  const fp = fingerprint(intake);
  if (!fp) return null;
  try {
    const raw = localStorage.getItem(keyFor(fp));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveState(intake, state20) {
  const fp = fingerprint(intake);
  if (!fp) return false;
  const payload = JSON.stringify(state20);
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      localStorage.setItem(keyFor(fp), payload);
      touch(fp);
      let list = readIndex();
      while (list.length > MAX_ENTRIES && list[0] !== fp) {
        evictOldest();
        list = readIndex();
      }
      return true;
    } catch (e) {
      if (!evictOldest()) return false;
    }
  }
  return false;
}
function updateState(intake, patch) {
  const next = Object.assign({}, loadState(intake) || {}, patch);
  saveState(intake, next);
  return next;
}
function clearState(intake) {
  const fp = fingerprint(intake);
  if (!fp) return;
  try {
    localStorage.removeItem(keyFor(fp));
  } catch {
  }
  writeIndex(readIndex().filter((x) => x !== fp));
}

// ../../docs/core/settings-schema.js
var CATEGORY_ORDER = ["viewer-common", "viewer-extended", "monaco-common", "monaco-extended", "always", "advanced"];
var CATEGORY_LABEL = {
  always: "General",
  "monaco-common": "Editor",
  "monaco-extended": "Editor — advanced",
  "viewer-common": "Preview",
  "viewer-extended": "Preview — advanced",
  advanced: "Advanced"
};
var CATEGORY_OPEN = { always: true, "monaco-common": true, "monaco-extended": false, "viewer-common": true, "viewer-extended": false, advanced: false };
var DEFAULT_PREVIEW_MAX_WIDTH = 820;
var PHONE_PREVIEW_WIDTH = 390;
var PREVIEW_WIDTH_MODES = ["available", "unrestricted", "page", "phone", "custom"];
var GENERAL_DESCRIPTORS = [
  {
    key: "showAllTypes",
    label: "Show all file types in selector",
    category: "always",
    type: "bool",
    default: false,
    hint: "The type dropdown normally lists only formats that matched this file (≥1%). Turn on to always list every supported type so you can force any viewer."
  },
  {
    key: "treeArrowKeys",
    label: "Arrow-key file navigation",
    category: "always",
    type: "bool",
    default: true,
    hint: "When the folder sidebar has focus, ↑/↓ move between files and open them. Click a file first to focus the tree."
  },
  {
    key: "reduceMotion",
    label: "Reduce motion",
    category: "advanced",
    type: "bool",
    default: false,
    hint: "Disable UI and game animations (transitions, pulses, arcade effects). Helps on low-power devices or if motion is distracting."
  },
  {
    key: "enableFfmpeg",
    label: "Media transcoding (ffmpeg.wasm — ~23 MB download on first use)",
    category: "advanced",
    type: "bool",
    default: false,
    hint: "Convert audio/video formats your browser cannot play natively (AVI, WMV, FLV, TS, ...) using ffmpeg.wasm. Downloads ~23 MB the first time; cached for subsequent uses. Transcoding runs entirely in-browser — no upload, no server."
  },
  {
    key: "enableArchiveWasm",
    label: "Archive support (libarchive.wasm — ~1 MB download on first use)",
    category: "advanced",
    type: "bool",
    default: false,
    hint: "List and extract 7z, RAR, tar, tar.gz archives using libarchive.wasm. Downloads ~1 MB the first time; cached for subsequent uses. Runs entirely in-browser."
  },
  {
    key: "enableEmulators",
    label: "Prefer emulators for supported game files",
    category: "advanced",
    type: "bool",
    default: false,
    hint: "Apply immediately. Uses same-origin emulator engines that are cached on first use; the complete optional EmulatorJS bundle is about 14 MB. Only open files from sources you trust — emulated software runs with reduced but non-zero access."
  }
];
var MONACO_DESCRIPTORS = [
  {
    key: "wordWrap",
    label: "Word wrap",
    category: "monaco-common",
    type: "select",
    options: ["on", "off", "bounded"],
    default: "on",
    hint: "Wrap long lines in the editor instead of scrolling sideways."
  },
  {
    key: "fontSize",
    label: "Font size",
    category: "monaco-common",
    type: "number",
    min: 8,
    max: 40,
    default: 14,
    hint: "Editor text size, in pixels."
  },
  {
    key: "lineNumbers",
    label: "Line numbers",
    category: "monaco-common",
    type: "select",
    options: ["on", "off", "relative"],
    default: "on",
    hint: 'Gutter line numbers. "relative" counts from the cursor (handy for Vim-style motions).'
  },
  {
    key: "tabSize",
    label: "Tab size",
    category: "monaco-common",
    type: "number",
    min: 1,
    max: 8,
    default: 2,
    hint: "How many spaces one indentation level is shown as."
  },
  {
    key: "fontFamily",
    label: "Font family",
    category: "monaco-common",
    type: "select",
    options: ["monospace", "Menlo", "Consolas", "Courier New", "Fira Code"],
    default: "monospace",
    hint: "Editor typeface. Falls back to the system monospace font if the chosen one is unavailable."
  },
  {
    key: "minimap",
    label: "Minimap",
    category: "monaco-extended",
    type: "bool",
    default: false,
    hint: "The zoomed-out code overview on the right edge of the editor."
  },
  {
    key: "renderWhitespace",
    label: "Show whitespace",
    category: "monaco-extended",
    type: "select",
    options: ["none", "boundary", "trailing", "all"],
    default: "none",
    hint: "Render dots/arrows for spaces and tabs."
  },
  {
    key: "indentGuides",
    label: "Indent guides",
    category: "monaco-extended",
    type: "bool",
    default: true,
    hint: "Vertical lines marking each indentation level."
  },
  {
    key: "insertSpaces",
    label: "Insert spaces (vs tabs)",
    category: "monaco-extended",
    type: "bool",
    default: true,
    hint: "Pressing Tab inserts spaces instead of a tab character."
  },
  {
    key: "lineHeight",
    label: "Line height (0 = auto)",
    category: "monaco-extended",
    type: "number",
    min: 0,
    max: 48,
    default: 0,
    hint: "Pixel height of each editor line. 0 derives it from the font size."
  },
  {
    key: "cursorStyle",
    label: "Cursor style",
    category: "monaco-extended",
    type: "select",
    options: ["line", "block", "underline", "line-thin"],
    default: "line",
    hint: "Shape of the text caret."
  },
  {
    key: "cursorBlinking",
    label: "Cursor blinking",
    category: "monaco-extended",
    type: "select",
    options: ["blink", "smooth", "phase", "expand", "solid"],
    default: "blink",
    hint: "Caret blink animation."
  },
  {
    key: "smoothScrolling",
    label: "Smooth scrolling",
    category: "monaco-extended",
    type: "bool",
    default: false,
    hint: "Animate editor scrolling instead of jumping."
  },
  {
    key: "mouseWheelZoom",
    label: "Ctrl+wheel zoom",
    category: "monaco-extended",
    type: "bool",
    default: false,
    hint: "Hold Ctrl and scroll to change the editor font size."
  },
  {
    key: "renderControlCharacters",
    label: "Show control chars",
    category: "monaco-extended",
    type: "bool",
    default: false,
    hint: "Render invisible control characters (e.g. ␀) instead of hiding them."
  },
  {
    key: "fontLigatures",
    label: "Font ligatures",
    category: "monaco-extended",
    type: "bool",
    default: false,
    hint: "Combine character pairs like => into a single glyph (needs a ligature font such as Fira Code)."
  },
  {
    key: "bracketPairColorization",
    label: "Bracket pair colors",
    category: "monaco-extended",
    type: "bool",
    default: true,
    hint: "Tint matching brackets in the same color to make nesting readable."
  },
  {
    key: "stickyScroll",
    label: "Sticky scroll",
    category: "monaco-extended",
    type: "bool",
    default: false,
    hint: "Pin the enclosing scope (function/class headers) to the top while scrolling."
  },
  {
    key: "folding",
    label: "Code folding",
    category: "monaco-extended",
    type: "bool",
    default: true,
    hint: "Show gutter controls to collapse/expand code regions."
  }
];
var VIEWER_DESCRIPTORS = [
  {
    key: "previewWidthMode",
    label: "Preview sizing",
    category: "viewer-common",
    type: "select",
    options: [
      { value: "page", label: "A4 / page width" },
      { value: "available", label: "Available width" },
      { value: "unrestricted", label: "Unrestricted" },
      { value: "phone", label: "Phone width" },
      { value: "custom", label: "Custom width" }
    ],
    default: "page",
    hint: "Quick sizing modes for rendered previews. Page and phone use fixed reading widths; available fills the pane; unrestricted removes the preview width cap."
  },
  {
    key: "previewMaxWidth",
    label: "Custom preview width (px)",
    category: "viewer-common",
    type: "number",
    min: 320,
    max: 1600,
    default: DEFAULT_PREVIEW_MAX_WIDTH,
    hint: "Numeric preview width used by Custom width mode. Dragging the split divider switches to Custom width and updates this value."
  },
  {
    key: "previewFontSize",
    label: "Preview font size (px)",
    category: "viewer-common",
    type: "number",
    min: 10,
    max: 28,
    default: 16,
    hint: "Base text size of the rendered content (markdown, HTML, notebooks, …)."
  },
  {
    key: "syncScroll",
    label: "Sync scroll",
    category: "viewer-common",
    type: "bool",
    default: true,
    hint: "Scroll the editor and preview together when both are visible."
  },
  {
    key: "previewLineHeight",
    label: "Preview line height",
    category: "viewer-extended",
    type: "select",
    options: ["1.3", "1.5", "1.6", "1.8", "2.0"],
    default: "1.6",
    hint: "Spacing between lines of rendered text."
  },
  {
    key: "previewPadding",
    label: "Preview padding (px)",
    category: "viewer-extended",
    type: "number",
    min: 0,
    max: 80,
    default: 20,
    hint: "Inner margin around the rendered content."
  },
  {
    key: "readerFontFamily",
    label: "Reader font",
    category: "viewer-extended",
    type: "select",
    options: ["serif", "sans", "mono"],
    default: "serif",
    hint: "Typeface for long-form e-book and document reading views."
  },
  {
    key: "readerTheme",
    label: "Reader theme",
    category: "viewer-extended",
    type: "select",
    options: ["default", "sepia", "dark"],
    default: "default",
    hint: "Reading color theme for iframe-based e-book previews."
  }
];
function applyMonacoOptions(v) {
  return {
    wordWrap: v.wordWrap ?? "on",
    fontSize: v.fontSize ?? 14,
    fontFamily: v.fontFamily && v.fontFamily !== "monospace" ? v.fontFamily + ", monospace" : "monospace",
    lineHeight: v.lineHeight || 0,
    // 0 = auto
    lineNumbers: v.lineNumbers ?? "on",
    tabSize: v.tabSize ?? 2,
    minimap: { enabled: !!v.minimap },
    renderWhitespace: v.renderWhitespace ?? "none",
    guides: { indentation: v.indentGuides !== false },
    insertSpaces: v.insertSpaces ?? true,
    cursorStyle: v.cursorStyle ?? "line",
    cursorBlinking: v.cursorBlinking ?? "blink",
    smoothScrolling: !!v.smoothScrolling,
    mouseWheelZoom: !!v.mouseWheelZoom,
    renderControlCharacters: !!v.renderControlCharacters,
    fontLigatures: !!v.fontLigatures,
    bracketPairColorization: { enabled: v.bracketPairColorization !== false },
    stickyScroll: { enabled: !!v.stickyScroll },
    folding: v.folding !== false
  };
}
function clampPreviewWidth(n) {
  if (!Number.isFinite(n)) return DEFAULT_PREVIEW_MAX_WIDTH;
  return Math.max(320, Math.min(1600, n));
}
function previewSizing(v = {}) {
  const mode = PREVIEW_WIDTH_MODES.includes(v.previewWidthMode) ? v.previewWidthMode : "page";
  const customWidth = clampPreviewWidth(Number(v.previewMaxWidth));
  if (mode === "available") return { mode, maxWidth: null, paneWidth: null, overflowX: "hidden" };
  if (mode === "unrestricted") return { mode, maxWidth: null, paneWidth: null, overflowX: "auto" };
  if (mode === "phone") return { mode, maxWidth: PHONE_PREVIEW_WIDTH, paneWidth: PHONE_PREVIEW_WIDTH, overflowX: "hidden" };
  if (mode === "custom") return { mode, maxWidth: customWidth, paneWidth: customWidth, overflowX: "hidden" };
  return { mode: "page", maxWidth: DEFAULT_PREVIEW_MAX_WIDTH, paneWidth: DEFAULT_PREVIEW_MAX_WIDTH, overflowX: "hidden" };
}
function previewStyle(v) {
  const sizing = previewSizing(v);
  return {
    sizingMode: sizing.mode,
    maxWidth: sizing.maxWidth,
    overflowX: sizing.overflowX,
    fontSize: Number(v.previewFontSize) || 16,
    lineHeight: Number(v.previewLineHeight) || 1.6,
    padding: v.previewPadding != null ? Number(v.previewPadding) : 20,
    readerFontFamily: ["serif", "sans", "mono"].includes(v.readerFontFamily) ? v.readerFontFamily : "serif",
    readerTheme: ["default", "sepia", "dark"].includes(v.readerTheme) ? v.readerTheme : "default"
  };
}
function descriptorsFor(type) {
  const out = [...GENERAL_DESCRIPTORS];
  if (type.capabilities.rawView) out.push(...MONACO_DESCRIPTORS);
  if (type.capabilities.preview) {
    out.push(...VIEWER_DESCRIPTORS);
    out.push(...type.settings?.schema || []);
  }
  const hidden = new Set(type.settings?.hidden || []);
  return out.filter((d) => !hidden.has(d.key));
}
var MONACO_KEYS = new Set(MONACO_DESCRIPTORS.map((d) => d.key));
var GLOBAL_KEYS = /* @__PURE__ */ new Set([...MONACO_KEYS, ...GENERAL_DESCRIPTORS.map((d) => d.key)]);

// ../../docs/core/iframe.js
import { loadGlobal, vendor } from "./script-loader.js";
var BRIDGE = `
(function(){
  function send(m){ parent.postMessage(Object.assign({__fv:1}, m), '*'); }
  // Magic selector: hover/click a [data-fv-src] element -> tell parent its source range.
  function srcEl(t){ while(t && t!==document.body){ if(t.dataset && t.dataset.fvSrc) return t; t=t.parentElement; } return null; }
  function openEl(t){ while(t && t!==document.body){ if(t.dataset && t.dataset.fvOpen!=null) return t; t=t.parentElement; } return null; }
  document.addEventListener('mousemove', function(e){
    var el = srcEl(e.target); if(!el) return;
    send({type:'hover', src: el.dataset.fvSrc});
  });
  document.addEventListener('click', function(e){
    // Open-an-entry click (e.g. a file inside a zip) takes precedence over source-mapping.
    var o = openEl(e.target); if(o){ send({type:'open', name: o.dataset.fvOpen}); return; }
    var el = srcEl(e.target); if(!el) return;
    send({type:'select', src: el.dataset.fvSrc});
  });
  // Scroll sync (preview -> parent), ratio based.
  var ticking=false;
  window.addEventListener('scroll', function(){
    if(ticking) return; ticking=true;
    requestAnimationFrame(function(){
      var h=document.documentElement.scrollHeight-window.innerHeight;
      send({type:'scroll', ratio: h>0 ? window.scrollY/h : 0});
      ticking=false;
    });
  }, {passive:true});
  // Parent -> preview: highlight a source range, or scroll to ratio.
  window.addEventListener('message', function(e){
    var d=e.data; if(!d||!d.__fv) return;
    if(d.type==='highlight'){
      document.querySelectorAll('.fv-hl').forEach(function(n){n.classList.remove('fv-hl');});
      if(d.src){ var n=document.querySelector('[data-fv-src="'+CSS.escape(d.src)+'"]'); if(n){ n.classList.add('fv-hl'); n.scrollIntoView({block:'center',behavior:'smooth'}); } }
    } else if(d.type==='scrollTo'){
      var h=document.documentElement.scrollHeight-window.innerHeight; window.scrollTo(0, (d.ratio||0)*h);
    }
  });
  send({type:'ready'});
})();`;
var BASE_CSS = "";
try {
  BASE_CSS = await (await fetch(new URL("../assets/preview.css", import.meta.url))).text();
} catch {
}
function previewColors(theme) {
  if (theme === "dark") return { bg: "#1e1e1e", fg: "#e6e6e6", scheme: "dark" };
  return { bg: "#fff", fg: "#1a1a1a", scheme: "light" };
}
function earlyThemeStyle(theme) {
  const c = previewColors(theme);
  return `<style>html{background:${c.bg};color-scheme:${c.scheme};}body{background:${c.bg};color:${c.fg};}</style>
`;
}
function buildSrcdoc({ bodyHtml, theme, extraHead = "", style = {} }) {
  const bodyClasses = [];
  if (theme === "dark") bodyClasses.push("fv-dark");
  if (["available", "unrestricted", "page", "phone", "custom"].includes(style.sizingMode)) bodyClasses.push("fv-width-" + style.sizingMode);
  const vars = [];
  if (Number.isFinite(style.maxWidth)) vars.push(`--fv-maxw:${style.maxWidth}px;`);
  else vars.push("--fv-maxw:none;");
  if (style.overflowX === "auto") vars.push("--fv-overflow-x:auto;");
  if (Number.isFinite(style.fontSize)) vars.push(`--fv-fontsize:${style.fontSize}px;`);
  if (Number.isFinite(style.lineHeight)) vars.push(`--fv-lh:${style.lineHeight};`);
  if (Number.isFinite(style.padding)) vars.push(`--fv-pad:${style.padding}px;`);
  if (style.readerFontFamily === "sans") vars.push("--fv-reader-font:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;");
  else if (style.readerFontFamily === "mono") vars.push("--fv-reader-font:ui-monospace,SFMono-Regular,Menlo,monospace;");
  else vars.push('--fv-reader-font:Georgia,"Times New Roman",serif;');
  if (style.readerTheme === "sepia") bodyClasses.push("fv-reader-sepia");
  else if (style.readerTheme === "dark") bodyClasses.push("fv-reader-dark");
  const rootStyle = vars.length ? `<style>:root{${vars.join("")}}</style>` : "";
  const bodyClass = bodyClasses.length ? ' class="' + bodyClasses.join(" ") + '"' : "";
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' + earlyThemeStyle(theme) + "<style>" + BASE_CSS + "</style>\n" + rootStyle + extraHead + "\n</head>\n<body" + bodyClass + ">\n" + bodyHtml + "\n<script>" + BRIDGE + "<\/script>\n</body>\n</html>";
}
function injectBridge(doc) {
  const tag = "<script>" + BRIDGE + "<\/script>";
  return doc.includes("</body>") ? doc.replace("</body>", tag + "</body>") : doc + tag;
}
function mountPreview(container, { bodyHtml, fullDoc, theme, allowScripts = false, extraHead = "", style = {}, onSelect, onHover, onScroll, onOpen }) {
  container.innerHTML = "";
  const iframe = document.createElement("iframe");
  iframe.className = "fv-preview-frame";
  iframe.title = "Rendered preview";
  const colors = previewColors(theme);
  iframe.style.backgroundColor = colors.bg;
  iframe.style.colorScheme = colors.scheme;
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.srcdoc = fullDoc != null ? injectBridge(fullDoc) : buildSrcdoc({ bodyHtml, theme, extraHead, style });
  container.appendChild(iframe);
  function onMsg(e) {
    if (e.source !== iframe.contentWindow) return;
    const d = e.data;
    if (!d || !d.__fv) return;
    if (d.type === "select") onSelect?.(d.src);
    else if (d.type === "hover") onHover?.(d.src);
    else if (d.type === "scroll") onScroll?.(d.ratio);
    else if (d.type === "open") onOpen?.(d.name);
  }
  window.addEventListener("message", onMsg);
  const post = (msg) => iframe.contentWindow?.postMessage({ __fv: 1, ...msg }, "*");
  return {
    iframe,
    highlight: (src) => post({ type: "highlight", src }),
    scrollTo: (ratio) => post({ type: "scrollTo", ratio }),
    destroy: () => {
      window.removeEventListener("message", onMsg);
      container.innerHTML = "";
    }
  };
}
function printBodyHtml(bodyHtml, { style = {} } = {}) {
  const printCss = "<style>@media print{html,body{background:#fff!important;color:#000!important;}}@page{margin:16mm;}body{max-width:none;}</style>";
  const tmp = document.createElement("iframe");
  tmp.setAttribute("aria-hidden", "true");
  tmp.style.cssText = "position:fixed;left:-99999px;top:0;border:0;width:" + (Number(style.maxWidth) || DEFAULT_PREVIEW_MAX_WIDTH) + "px;height:1px;";
  tmp.srcdoc = buildSrcdoc({ bodyHtml, theme: "light", style, extraHead: printCss });
  document.body.appendChild(tmp);
  tmp.onload = () => {
    const win = tmp.contentWindow;
    const done = () => {
      if (tmp.parentNode) tmp.remove();
    };
    try {
      win.addEventListener("afterprint", () => setTimeout(done, 300), { once: true });
      win.focus();
      win.print();
    } catch {
      done();
    }
    setTimeout(done, 12e4);
  };
}
async function captureBodyHtml(bodyHtml, { theme, style = {} }) {
  const html2canvas = await loadGlobal(vendor("html2canvas/html2canvas.min.js"), "html2canvas");
  const tmp = document.createElement("iframe");
  tmp.style.cssText = "position:fixed;left:-99999px;top:0;border:0;width:" + (Number(style.maxWidth) || DEFAULT_PREVIEW_MAX_WIDTH) + "px;height:10px;";
  tmp.srcdoc = buildSrcdoc({ bodyHtml, theme, style });
  document.body.appendChild(tmp);
  try {
    await new Promise((r) => {
      tmp.onload = r;
    });
    const doc = tmp.contentDocument;
    tmp.style.height = Math.max(10, doc.body.scrollHeight) + "px";
    await new Promise((r) => requestAnimationFrame(r));
    const canvas = await html2canvas(doc.body, { scale: 2, backgroundColor: null, useCORS: true });
    return canvas.toDataURL("image/png");
  } finally {
    tmp.remove();
  }
}

// ../../docs/core/heavy-packages.js
var HEAVY_PACKAGES = {
  enableFfmpeg: {
    label: "ffmpeg.wasm",
    load: async (onProgress) => {
      const { loadFfmpeg } = await import("../types/media/transcoder.js");
      await loadFfmpeg((p) => {
        if (p && typeof p.ratio === "number") onProgress(p.ratio);
      });
    }
  },
  enableArchiveWasm: {
    label: "libarchive.wasm",
    load: async () => {
      const { preloadArchiveLib } = await import("./archivelib.js");
      await preloadArchiveLib();
    }
  }
};
var MOUNTED = /* @__PURE__ */ new WeakMap();
function unmountHeavyReload(row) {
  const el = MOUNTED.get(row);
  if (el) {
    el.remove();
    MOUNTED.delete(row);
  }
}
function mountHeavyReload(row, key2) {
  unmountHeavyReload(row);
  const pkg = HEAVY_PACKAGES[key2];
  if (!pkg) return;
  const box = document.createElement("div");
  box.className = "heavy-dl";
  const status = document.createElement("span");
  status.className = "heavy-dl-status";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn small heavy-dl-reload";
  btn.textContent = "Reload to apply";
  box.append(status, btn);
  row.appendChild(box);
  MOUNTED.set(row, box);
  let reloading = false;
  btn.addEventListener("click", () => {
    if (btn.disabled || reloading) return;
    reloading = true;
    btn.textContent = "Reloading…";
    location.reload();
  });
  if (!pkg.load) {
    status.textContent = "Enabled.";
    btn.disabled = false;
    return;
  }
  btn.disabled = true;
  status.className = "heavy-dl-status";
  status.textContent = "Downloading " + pkg.label + "…";
  let pct = -1;
  pkg.load((ratio) => {
    if (typeof ratio === "number" && ratio >= 0 && ratio <= 1) {
      const p = Math.round(ratio * 100);
      if (p !== pct) {
        pct = p;
        status.textContent = "Downloading " + pkg.label + "… " + p + "%";
      }
    }
  }).then(() => {
    status.className = "heavy-dl-status done";
    status.textContent = "Downloaded ✓";
    btn.disabled = false;
  }).catch(() => {
    status.className = "heavy-dl-status error";
    status.textContent = "Download failed — reload to retry";
    btn.disabled = false;
  });
}

// ../../docs/core/settings.js
var SETTINGS_VERSION = 1;
var typeKey = (id) => "fv:settings:type:" + id;
var GLOBAL_KEY = "fv:settings:global";
function readSaved(key2) {
  try {
    const o = JSON.parse(localStorage.getItem(key2) || "null");
    if (!o || typeof o.values !== "object") return null;
    return o.values;
  } catch {
    return null;
  }
}
function knownOnly(values, descriptors) {
  const keys = new Set(descriptors.map((d) => d.key));
  const out = {};
  for (const k of Object.keys(values || {})) if (keys.has(k)) out[k] = values[k];
  return out;
}
async function fetchPresets(type, descriptors) {
  const generated = await fetchPresetsFromGenerated(type, descriptors);
  if (generated) return generated;
  return fetchPresetsFromUrls(type, descriptors);
}
var generatedDefaultsPromise = null;
async function loadGeneratedDefaults() {
  if (!generatedDefaultsPromise) {
    generatedDefaultsPromise = fetch(new URL("./settings-defaults.generated.json", import.meta.url)).then((r) => r.ok ? r.json() : null).catch(() => null);
  }
  return generatedDefaultsPromise;
}
async function fetchPresetsFromGenerated(type, descriptors) {
  const generated = await loadGeneratedDefaults();
  const entry = generated?.types?.[type.id];
  if (!entry) return null;
  const descriptorDefaults = {};
  for (const d of descriptors) descriptorDefaults[d.key] = d.default;
  const defaults = { ...descriptorDefaults, ...knownOnly(entry.defaults, descriptors) };
  const presets = (entry.presets || []).map((p) => ({
    id: p.id,
    label: p.label || p.id,
    values: { ...defaults, ...knownOnly(p.values, descriptors) }
  }));
  return presets.length ? { defaults, presets } : null;
}
async function fetchPresetsFromUrls(type, descriptors) {
  const defaults = {};
  for (const d of descriptors) defaults[d.key] = d.default;
  const declared = type.settings?.presets || [{ id: "default", label: "Default", url: type.settingsUrl }];
  const presets = [];
  for (const p of declared) {
    try {
      const json = await (await fetch(p.url)).json();
      presets.push({ id: p.id, label: p.label || json.label || p.id, values: { ...defaults, ...knownOnly(json.values, descriptors) } });
    } catch {
      presets.push({ id: p.id, label: p.label || p.id, values: { ...defaults } });
    }
  }
  return { defaults, presets };
}
function matchPreset(values, presets, descriptors) {
  const keys = descriptors.map((d) => d.key);
  for (const p of presets) if (keys.every((k) => values[k] === p.values[k])) return p.id;
  return "custom";
}
async function buildModel(type) {
  const descriptors = descriptorsFor(type);
  const { defaults, presets } = await fetchPresets(type, descriptors);
  const base = presets.find((p) => p.id === "default") || presets[0];
  const globalSaved = knownOnly(readSaved(GLOBAL_KEY), descriptors);
  const typeSaved = knownOnly(readSaved(typeKey(type.id)), descriptors);
  const values = { ...defaults, ...base?.values || {}, ...globalSaved, ...typeSaved };
  const model = { type, descriptors, defaults, presets, values, selectedPresetId: "custom" };
  model.selectedPresetId = matchPreset(values, presets, descriptors);
  return model;
}
var modelCache = /* @__PURE__ */ new Map();
async function getModel(type) {
  let m = modelCache.get(type.id);
  if (!m) {
    m = await buildModel(type);
    modelCache.set(type.id, m);
  }
  return m;
}
function monacoOptions(model) {
  return applyMonacoOptions(model.values);
}
function persist(model, scope) {
  const visible = model.descriptors.map((d) => d.key);
  if (scope === "type") {
    const values = {};
    for (const k of visible) values[k] = model.values[k];
    localStorage.setItem(typeKey(model.type.id), JSON.stringify({ version: SETTINGS_VERSION, values }));
  } else if (scope === "global") {
    const values = {};
    for (const k of visible) if (GLOBAL_KEYS.has(k)) values[k] = model.values[k];
    localStorage.setItem(GLOBAL_KEY, JSON.stringify({ version: SETTINGS_VERSION, values }));
  }
}
function persistGlobalKey(key2, value) {
  if (!GLOBAL_KEYS.has(key2)) return;
  const cur = readSaved(GLOBAL_KEY) || {};
  cur[key2] = value;
  localStorage.setItem(GLOBAL_KEY, JSON.stringify({ version: SETTINGS_VERSION, values: cur }));
  for (const model of modelCache.values()) {
    if (model.descriptors.some((descriptor) => descriptor.key === key2)) {
      model.values[key2] = value;
      model.selectedPresetId = matchPreset(model.values, model.presets, model.descriptors);
    }
  }
}
function persistTypeKey(typeId, key2, value) {
  const k = typeKey(typeId);
  const cur = readSaved(k) || {};
  cur[key2] = value;
  localStorage.setItem(k, JSON.stringify({ version: SETTINGS_VERSION, values: cur }));
}
function readGlobalKey(key2, fallback) {
  const cur = readSaved(GLOBAL_KEY);
  return cur && key2 in cur ? cur[key2] : fallback;
}
function syncModelPreset(model) {
  model.selectedPresetId = matchPreset(model.values, model.presets, model.descriptors);
}
var groupOpenState = /* @__PURE__ */ new Map();
function renderSettings(container, model, { onChange, toast: toast15 }) {
  container.innerHTML = "";
  const presetRow = document.createElement("div");
  presetRow.className = "set-row";
  const presetLabel = document.createElement("label");
  presetLabel.textContent = "Preset";
  const presetSel = document.createElement("select");
  presetSel.className = "set-preset";
  for (const p of model.presets) presetSel.add(new Option(p.label, p.id));
  presetSel.add(new Option("Custom", "custom"));
  presetSel.value = model.selectedPresetId;
  presetSel.onchange = () => {
    const p = model.presets.find((x) => x.id === presetSel.value);
    if (p) {
      model.values = { ...p.values };
      model.selectedPresetId = p.id;
      rebuild();
      onChange(model);
    }
  };
  presetRow.append(presetLabel, presetSel);
  container.appendChild(presetRow);
  const groupsHost = document.createElement("div");
  container.appendChild(groupsHost);
  function syncPreset() {
    model.selectedPresetId = matchPreset(model.values, model.presets, model.descriptors);
    presetSel.value = model.selectedPresetId;
  }
  function control(d, id) {
    const v = model.values[d.key];
    let el;
    if (d.type === "bool") {
      el = document.createElement("input");
      el.type = "checkbox";
      el.checked = !!v;
      el.onchange = () => set(d.key, el.checked);
    } else if (d.type === "number") {
      el = document.createElement("input");
      el.type = "number";
      el.value = v;
      if (d.min != null) el.min = d.min;
      if (d.max != null) el.max = d.max;
      el.onchange = () => set(d.key, clampNum(Number(el.value), d));
    } else if (d.type === "textarea") {
      el = document.createElement("textarea");
      el.rows = 4;
      el.spellcheck = false;
      el.style.fontFamily = "monospace";
      el.style.resize = "vertical";
      el.style.width = "100%";
      el.value = String(v ?? "");
      el.onchange = () => set(d.key, el.value);
    } else {
      el = document.createElement("select");
      for (const o of d.options) {
        const value = typeof o === "object" ? o.value : o;
        const label = typeof o === "object" ? o.label : o;
        el.add(new Option(String(label), String(value)));
      }
      el.value = String(v);
      el.onchange = () => set(d.key, coerce(el.value, v));
    }
    if (id) el.id = id;
    return el;
  }
  function set(key2, val) {
    model.values[key2] = val;
    syncPreset();
    onChange(model, key2);
  }
  function rebuild() {
    groupsHost.innerHTML = "";
    for (const cat of CATEGORY_ORDER) {
      const items = model.descriptors.filter((d) => d.category === cat);
      if (!items.length) continue;
      const det = document.createElement("details");
      det.className = "set-group";
      det.open = groupOpenState.has(cat) ? groupOpenState.get(cat) : CATEGORY_OPEN[cat] !== false;
      const sum = document.createElement("summary");
      sum.textContent = CATEGORY_LABEL[cat] || cat;
      det.addEventListener("toggle", () => groupOpenState.set(cat, det.open));
      det.appendChild(sum);
      for (const d of items) {
        const row = document.createElement("div");
        row.className = d.type === "textarea" ? "set-row set-row--block" : "set-row";
        const id = "set-" + d.key;
        const info = document.createElement("div");
        info.className = "set-info";
        const l = document.createElement("label");
        l.textContent = d.label;
        l.htmlFor = id;
        info.appendChild(l);
        if (d.hint) {
          const h = document.createElement("div");
          h.className = "set-hint";
          h.textContent = d.hint;
          info.appendChild(h);
        }
        row.append(info, control(d, id));
        det.appendChild(row);
        if (d.type === "bool" && HEAVY_PACKAGES[d.key]) {
          const chk = row.querySelector('input[type="checkbox"]');
          chk.addEventListener("change", () => {
            if (chk.checked) mountHeavyReload(row, d.key);
            else unmountHeavyReload(row);
          });
        }
      }
      groupsHost.appendChild(det);
    }
    presetSel.value = model.selectedPresetId;
  }
  const footer = document.createElement("div");
  footer.className = "set-footer";
  const saveType = mkBtn("Save for this type", () => {
    persist(model, "type");
    toast15?.("Saved for " + model.type.label);
  });
  const saveAll = mkBtn("Save as global default", () => {
    persist(model, "global");
    toast15?.("Saved as global default");
  });
  const revert = mkBtn("Revert to preset", () => {
    const p = model.presets.find((x) => x.id === model.selectedPresetId) || model.presets[0];
    if (p) {
      model.values = { ...p.values };
      rebuild();
      syncPreset();
      onChange(model);
    }
  });
  footer.append(saveType, saveAll, revert);
  rebuild();
  container.appendChild(footer);
}
function mkBtn(text, fn) {
  const b = document.createElement("button");
  b.className = "btn small";
  b.textContent = text;
  b.onclick = fn;
  return b;
}
function clampNum(n, d) {
  if (Number.isNaN(n)) return d.default;
  if (d.min != null) n = Math.max(d.min, n);
  if (d.max != null) n = Math.min(d.max, n);
  return n;
}
function coerce(str, prev) {
  return typeof prev === "number" ? Number(str) : str;
}

// ../../docs/core/layout.js
import { state as state2, $, isMobile, toast } from "./state.js";

// ../../docs/core/exports.js
function downloadBlob(data, filename, mime) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime || "application/octet-stream" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1e3);
}
function downloadStandaloneHtml(state20, ctx) {
  const maxw = ctx && ctx.previewStyle ? ctx.previewStyle.maxWidth : 820;
  const maxWidthCss = Number.isFinite(maxw) ? Number(maxw) + "px" : "none";
  const title = (state20.intake && state20.intake.filename || "document").replace(/\.[^.]+$/, "");
  const esc3 = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  const css = "body{font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:" + maxWidthCss + ";margin:0 auto;padding:24px;color:#1a1a1a;background:#fff;}img{max-width:100%;height:auto;}pre{overflow:auto;}table{border-collapse:collapse;}th,td{border:1px solid #ddd;padding:4px 8px;}";
  const doc = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + esc3(title) + "</title>\n<style>" + css + "</style>\n</head>\n<body>\n" + state20.lastBodyHtml + "\n</body>\n</html>\n";
  downloadBlob(doc, title + ".html", "text/html");
}
async function getExports(state20, ctx) {
  const out = [];
  if (state20.lastBodyHtml) {
    out.push({ label: "Print / Save as PDF", run: () => printBodyHtml(state20.lastBodyHtml, { style: ctx.previewStyle }) });
    out.push({ label: "Download as HTML", run: () => downloadStandaloneHtml(state20, ctx) });
    out.push({ label: "Download as Word (.docx)", run: async () => {
      const { buildDocx } = await import("./docx-export.js");
      const base = (state20.intake && state20.intake.filename || "document").replace(/\.[^.]+$/, "");
      downloadBlob(await buildDocx(state20.lastBodyHtml), base + ".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    } });
  }
  if (state20.type && state20.type.loadExports) {
    try {
      const mod = await state20.type.loadExports();
      const items = await (mod.getExports || mod.default)(state20.intake, state20);
      if (Array.isArray(items)) out.push(...items.filter((i) => i && i.label && i.run));
    } catch {
    }
  }
  return out;
}
function hasExports(state20) {
  return !!(state20.lastBodyHtml || state20.type && state20.type.loadExports);
}

// ../../docs/core/layout.js
var renderPreview = () => {
};
var openSettings = () => {
};
function initLayout(deps) {
  renderPreview = deps.renderPreview;
  openSettings = deps.openSettings;
}
var OVERFLOW_IDS = ["typeSelect", "rawMode", "compareBtn", "tableModeBtn", "formatBtn", "saveBtn", "downloadBtn", "screenshotBtn", "exportBtn", "metaBtn", "settingsBtn", "offlineStatus"];
var overflowAnchors = null;
function layoutTopbar() {
  if (!overflowAnchors) {
    overflowAnchors = OVERFLOW_IDS.map((id) => {
      const el = $(id);
      return { el, parent: el.parentNode, next: el.nextSibling };
    });
  }
  const menu = $("moreMenu");
  if (isMobile()) {
    const landing = !$("intake").hidden;
    for (const { el, parent, next } of overflowAnchors) {
      if (el.id === "offlineStatus" && landing) parent.insertBefore(el, next);
      else menu.appendChild(el);
    }
    const anyVisible = overflowAnchors.some(({ el }) => el.parentNode === menu && !el.hidden);
    $("moreBtn").hidden = !anyVisible;
  } else {
    for (const { el, parent, next } of overflowAnchors) parent.insertBefore(el, next);
    $("moreBtn").hidden = true;
    closeMoreMenu();
  }
}
function toggleMoreMenu() {
  const menu = $("moreMenu");
  const open = menu.hidden;
  menu.hidden = !open;
  $("moreBtn").setAttribute("aria-expanded", String(open));
}
function closeMoreMenu() {
  $("moreMenu").hidden = true;
  $("moreBtn").setAttribute("aria-expanded", "false");
}
function updateExportButton() {
  $("exportBtn").hidden = !hasExports(state2);
}
function closeExportMenu() {
  $("exportMenu").hidden = true;
  $("exportBtn").setAttribute("aria-expanded", "false");
}
async function toggleExportMenu() {
  const menu = $("exportMenu");
  if (!menu.hidden) {
    closeExportMenu();
    return;
  }
  menu.innerHTML = '<div class="export-loading">…</div>';
  menu.hidden = false;
  $("exportBtn").setAttribute("aria-expanded", "true");
  const items = await getExports(state2, { previewStyle: previewStyle(state2.settingsModel.values) });
  if ($("exportMenu").hidden) return;
  menu.innerHTML = "";
  if (!items.length) {
    menu.innerHTML = '<div class="export-loading">No exports available</div>';
    return;
  }
  for (const it of items) {
    const b = document.createElement("button");
    b.className = "export-item";
    b.textContent = it.label;
    b.addEventListener("click", async () => {
      closeExportMenu();
      try {
        await it.run();
      } catch (e) {
        toast("Export failed: " + e.message);
      }
    });
    menu.appendChild(b);
  }
}
function applyLayout() {
  const caps = state2.type.capabilities;
  const hasPreview = caps.preview || !!state2.known && !state2.forceBase;
  const both = caps.rawView && hasPreview;
  const forced = hasPreview && !caps.rawView ? "preview" : "raw";
  const wysiwyg = !!state2.wysiwygActive;
  const panes = $("panes");
  if (isMobile()) {
    panes.removeAttribute("data-mode");
    panes.setAttribute("data-tab", wysiwyg ? "raw" : both ? state2.tab : forced);
  } else {
    panes.removeAttribute("data-tab");
    panes.setAttribute("data-mode", wysiwyg ? "raw" : both ? state2.mode : forced);
  }
  const vm = $("viewMode");
  if (vm) vm.hidden = wysiwyg || !both || isMobile();
  const tabbar = $("tabbar");
  if (tabbar) tabbar.style.display = !wysiwyg && both && isMobile() ? "flex" : "none";
  document.querySelectorAll("#viewMode button").forEach((b) => b.classList.toggle("active", b.dataset.mode === state2.mode));
  document.querySelectorAll("#tabbar button").forEach((b) => b.classList.toggle("active", b.dataset.mode === state2.tab));
  applyPreviewPaneWidth();
  state2.rawview?.layout();
}
var MIN_EDITOR_PX = 380;
var DIVIDER_PX = 6;
function applyPreviewPaneWidth() {
  const caps = state2.type?.capabilities;
  const hasPreview = caps && (caps.preview || !!state2.known && !state2.forceBase);
  const both = caps && caps.rawView && hasPreview;
  const splitActive = both && !isMobile() && state2.mode === "split" && !state2.wysiwygActive;
  $("splitDivider").hidden = !splitActive;
  const previewPane = $("previewPane"), rawPane = $("rawPane");
  if (!splitActive) {
    previewPane.style.flex = "";
    rawPane.style.flex = "";
    return;
  }
  const total = $("panes").clientWidth || 0;
  const sizing = previewSizing(state2.settingsModel?.values);
  const want = sizing.paneWidth || Math.round(total / 2);
  const maxPreview = Math.max(320, total - MIN_EDITOR_PX - DIVIDER_PX);
  const w = Math.max(320, Math.min(want, maxPreview));
  previewPane.style.flex = "0 0 " + Math.round(w) + "px";
  rawPane.style.flex = "1 1 auto";
}
function initSplitDivider() {
  const divider = $("splitDivider"), panes = $("panes");
  const previewPane = $("previewPane"), rawPane = $("rawPane");
  let dragging = false;
  let activePointerId = null;
  let shieldedNodes = [];
  const shieldInteractiveSurfaces = () => {
    shieldedNodes = [...previewPane.querySelectorAll("iframe"), $("editor")].filter(Boolean).map((node) => ({
      node,
      pointerEvents: node.style.pointerEvents
    }));
    for (const { node } of shieldedNodes) node.style.pointerEvents = "none";
  };
  const restoreInteractiveSurfaces = () => {
    for (const { node, pointerEvents } of shieldedNodes) node.style.pointerEvents = pointerEvents;
    shieldedNodes = [];
  };
  const onMove = (e) => {
    if (!dragging) return;
    const rect = panes.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    let w = rect.right - x;
    w = Math.max(320, Math.min(w, rect.width - MIN_EDITOR_PX - DIVIDER_PX));
    previewPane.style.flex = "0 0 " + Math.round(w) + "px";
    rawPane.style.flex = "1 1 auto";
    if (state2.settingsModel) {
      state2.settingsModel.values.previewWidthMode = "custom";
      state2.settingsModel.values.previewMaxWidth = Math.round(w);
    }
    state2.rawview?.layout();
    e.preventDefault();
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = "";
    restoreInteractiveSurfaces();
    window.removeEventListener("pointermove", onMove, true);
    window.removeEventListener("pointerup", onUp, true);
    window.removeEventListener("pointercancel", onUp, true);
    if (activePointerId != null) {
      try {
        divider.releasePointerCapture(activePointerId);
      } catch {
      }
      activePointerId = null;
    }
    const m = state2.settingsModel;
    if (m) {
      m.values.previewMaxWidth = Math.round(previewPane.getBoundingClientRect().width);
      m.values.previewWidthMode = "custom";
      syncModelPreset(m);
      renderPreview();
      if (!$("settingsDrawer").hidden) openSettings();
    }
  };
  divider.addEventListener("pointerdown", (e) => {
    if (divider.hidden) return;
    dragging = true;
    activePointerId = e.pointerId;
    try {
      divider.setPointerCapture(e.pointerId);
    } catch {
    }
    shieldInteractiveSurfaces();
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onUp, true);
    e.preventDefault();
  });
}

// ../../docs/core/sync.js
import { state as state3 } from "./state.js";
function mapPreviewToRaw(src, moveCursor = true) {
  if (!src || !state3.rawview) return;
  const [a, b] = src.split(":").map(Number);
  const startLine = a + 1, endLine = Math.max(startLine, b);
  state3.rawview.decorate(startLine, endLine);
  if (moveCursor) state3.rawview.reveal(startLine);
}
function mapRawToPreview(line) {
  if (!state3.preview) return;
  state3.preview.highlight(line - 1 + ":" + line);
}
function syncScrollFromRaw() {
  if (state3.syncing || !state3.preview || !state3.settingsModel.values.syncScroll) return;
  if (!state3.rawview?.canSync()) return;
  const { top, max } = state3.rawview.scrollInfo();
  state3.syncing = true;
  state3.preview.scrollTo(max > 0 ? top / max : 0);
  requestAnimationFrame(() => state3.syncing = false);
}
function syncScrollFromPreview(ratio) {
  if (state3.syncing || !state3.rawview || !state3.settingsModel.values.syncScroll) return;
  if (!state3.rawview.canSync()) return;
  const { max } = state3.rawview.scrollInfo();
  state3.syncing = true;
  state3.rawview.setScrollTop(ratio * Math.max(0, max));
  requestAnimationFrame(() => state3.syncing = false);
}

// ../../docs/core/compare.js
import { state as state4, $ as $2, toast as toast2 } from "./state.js";
var syncRawModeButtons = () => {
};
function initCompare(deps) {
  syncRawModeButtons = deps.syncRawModeButtons;
}
function startCompare() {
  if (!state4.rawview) return;
  showCompareTarget();
}
function openComparePicker() {
  $2("compareInput").value = "";
  $2("compareInput").click();
}
async function onComparePicked(e) {
  const file = e.target.files && e.target.files[0];
  if (!file || !state4.rawview) return;
  try {
    await handPicked(await intakeFromFile(file));
  } catch (err) {
    toast2("Could not read file: " + err.message);
  }
}
function initCompareDropTarget() {
  const bar = $2("compareBar");
  bar.querySelector(".compare-pick").addEventListener("click", openComparePicker);
  bar.addEventListener("dragover", (e) => {
    if (![...e.dataTransfer.types].includes(TREE_DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    bar.classList.add("drag-over");
  });
  bar.addEventListener("dragleave", (e) => {
    if (!bar.contains(e.relatedTarget)) bar.classList.remove("drag-over");
  });
  bar.addEventListener("drop", async (e) => {
    if (![...e.dataTransfer.types].includes(TREE_DRAG_TYPE)) return;
    e.preventDefault();
    bar.classList.remove("drag-over");
    const path = e.dataTransfer.getData(TREE_DRAG_TYPE);
    const node = getDraggedTreeNode();
    const entry = state4.treeEntries?.find((item) => item.path === path);
    const file = node?.path === path ? node.file : entry?.file || fileFromSidebarRootPath(path);
    if (!file) {
      toast2("Could not find that sidebar file.");
      return;
    }
    try {
      await handPicked(await intakeFromFile(file));
    } catch (err) {
      toast2("Could not read file: " + err.message);
    }
  });
}
function stopCompare() {
  resetCompare();
}
function resetCompare() {
  $2("rawPane")?.classList.remove("comparing");
  const bar = $2("compareBar");
  if (bar) {
    bar.hidden = true;
    bar.classList.remove("drag-over", "flash");
    bar.querySelector(".compare-label").textContent = "";
  }
}
function showCompareTarget() {
  $2("rawPane").classList.add("comparing");
  const bar = $2("compareBar");
  bar.querySelector(".compare-label").textContent = "Drop a sidebar file to open side by side, or choose a file.";
  bar.hidden = false;
  bar.classList.remove("flash");
  void bar.offsetWidth;
  bar.classList.add("flash");
  state4.mode = "raw";
  syncRawModeButtons();
  applyLayout();
  state4.rawview.layout();
}
async function handPicked(intake) {
  resetCompare();
  const { openSideBySideWithIntake } = await import("./sidebyside.js");
  await openSideBySideWithIntake(intake);
}
function fileFromSidebarRootPath(path) {
  for (const root of state4.sidebarRoots || []) {
    for (const entry of root.treeEntries || []) {
      const visiblePath = root.kind === "file" ? root.label : root.label + "/" + entry.path;
      if (path === visiblePath || path === entry.path) return entry.file;
    }
  }
  return null;
}

// ../../docs/core/rawpane.js
import { state as state11, $ as $6, toast as toast6, themeIsDark, debounce } from "./state.js";
import { loadGlobal as loadGlobal4, vendor as vendor5 } from "./script-loader.js";

// ../../docs/core/autosave.js
import { state as state5, toast as toast3 } from "./state.js";
var PREFIX2 = "fv:autosave:";
var INTERVAL_MS = 5 * 60 * 1e3;
var MAX_BYTES = 2 * 1024 * 1024;
var TTL_MS = 7 * 24 * 60 * 60 * 1e3;
var _timer = null;
var _warned = false;
function pruneOld() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(PREFIX2)) continue;
      const entry = tryParse(localStorage.getItem(k));
      if (entry && Date.now() - (entry.ts || 0) > TTL_MS) {
        localStorage.removeItem(k);
        i--;
      }
    }
  } catch {
  }
}
function tryParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
function key(filename) {
  return PREFIX2 + (filename || "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}
function saveNow() {
  if (!state5.rawview || state5.intake?.isBinary) return;
  const text = state5.rawview.getValue?.();
  if (!text) return;
  const filename = state5.intake?.filename || state5.intake?.name;
  if (!filename) return;
  if (text.length > MAX_BYTES) {
    if (!_warned) {
      _warned = true;
      toast3("File too large for autosave (>2MB)");
    }
    return;
  }
  try {
    localStorage.setItem(key(filename), JSON.stringify({ text, ts: Date.now(), filename }));
  } catch {
  }
}
function clearAutosave(filename) {
  if (!filename) return;
  try {
    localStorage.removeItem(key(filename));
  } catch {
  }
}
function getAutosave(filename) {
  if (!filename) return null;
  const entry = tryParse(localStorage.getItem(key(filename)));
  if (!entry) return null;
  if (Date.now() - (entry.ts || 0) > TTL_MS) {
    clearAutosave(filename);
    return null;
  }
  return entry;
}
function startAutosave() {
  stopAutosave();
  _warned = false;
  pruneOld();
  _timer = setInterval(saveNow, INTERVAL_MS);
}
function stopAutosave() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

// ../../docs/core/rawview.js
import { loadMonaco } from "./monaco-loader.js";
function fill(el) {
  el.style.position = "absolute";
  el.style.inset = "0";
  return el;
}
async function createRawView(host, {
  originalText,
  currentText,
  language,
  theme,
  options = {},
  onChange,
  onCursor,
  onScroll,
  onContextMenu,
  onPaste,
  onMoveDiff,
  onCustomDiff,
  signal,
  isCurrent
}) {
  const monaco = await loadMonaco();
  if (signal?.aborted || isCurrent && !isCurrent()) return null;
  import("../types/text/code/codelens.js").then((m) => m.registerCodeMetrics?.(monaco)).catch(() => {
  });
  host.innerHTML = "";
  const stdHost = fill(document.createElement("div"));
  const diffHost = fill(document.createElement("div"));
  const moveHost = fill(document.createElement("div"));
  const customHost = fill(document.createElement("div"));
  moveHost.className = "movediff-host";
  customHost.className = "movediff-host";
  diffHost.style.display = "none";
  moveHost.style.display = "none";
  customHost.style.display = "none";
  host.append(stdHost, diffHost, moveHost, customHost);
  const originalModel = monaco.editor.createModel(originalText, language);
  const modifiedModel = monaco.editor.createModel(currentText, language);
  let compareModel = null;
  const diffOriginal = () => compareModel || originalModel;
  const std = monaco.editor.create(stdHost, {
    model: modifiedModel,
    automaticLayout: true,
    theme: theme === "dark" ? "vs-dark" : "vs",
    ...options
  });
  let diff = null;
  let mode = "current";
  let decorations = [];
  modifiedModel.onDidChangeContent(() => onChange?.(modifiedModel.getValue()));
  std.onDidChangeCursorPosition((e) => {
    if (mode !== "diff" && mode !== "movediff") onCursor?.(e.position.lineNumber);
  });
  std.onDidScrollChange(() => {
    if (mode !== "diff" && mode !== "movediff") onScroll?.();
  });
  std.onContextMenu((e) => {
    if (mode === "current") onContextMenu?.(e);
  });
  const onDomPaste = (event) => {
    if (mode !== "current" || !onPaste) return;
    const text = event.clipboardData?.getData("text/plain") || event.clipboardData?.getData("text") || "";
    if (!text) return;
    const range = std.getSelection();
    const selected = modifiedModel.getValueInRange(range);
    const replacement = onPaste({ text, selected });
    if (replacement == null) return;
    event.preventDefault();
    event.stopPropagation();
    replaceRange(range, replacement, { source: "raw-paste" });
  };
  host.addEventListener("paste", onDomPaste, true);
  const isNarrow = () => window.matchMedia("(max-width: 760px)").matches;
  function ensureDiff() {
    if (diff) return diff;
    diff = monaco.editor.createDiffEditor(diffHost, {
      automaticLayout: true,
      theme: theme === "dark" ? "vs-dark" : "vs",
      readOnly: false,
      originalEditable: false,
      renderSideBySide: !isNarrow(),
      // inline on mobile, side-by-side on desktop
      ignoreTrimWhitespace: false,
      ...options
    });
    diff.setModel({ original: diffOriginal(), modified: modifiedModel });
    return diff;
  }
  function setMode(next) {
    mode = next;
    stdHost.style.display = "none";
    diffHost.style.display = "none";
    moveHost.style.display = "none";
    customHost.style.display = "none";
    if (next === "diff" && onCustomDiff) {
      customHost.style.display = "";
      onCustomDiff(customHost, diffOriginal().getValue(), modifiedModel.getValue());
    } else if (next === "diff") {
      ensureDiff().setModel({ original: diffOriginal(), modified: modifiedModel });
      diff.updateOptions({ renderSideBySide: !isNarrow() });
      diffHost.style.display = "";
      diff.layout();
    } else if (next === "movediff") {
      moveHost.style.display = "";
      onMoveDiff?.(moveHost, diffOriginal().getValue(), modifiedModel.getValue());
    } else {
      std.setModel(next === "original" ? originalModel : modifiedModel);
      std.updateOptions({ readOnly: next === "original" });
      stdHost.style.display = "";
      std.layout();
    }
  }
  return {
    monaco,
    mode: () => mode,
    setMode,
    getValue: () => modifiedModel.getValue(),
    originalValue: () => originalModel.getValue(),
    setValue: (text) => modifiedModel.setValue(text),
    selectionText() {
      return modifiedModel.getValueInRange(std.getSelection());
    },
    replaceSelection(text, opts = {}) {
      const selection = std.getSelection();
      replaceRange(selection, text, opts);
    },
    selectionRange() {
      return std.getSelection();
    },
    replaceRange(range, text, opts = {}) {
      replaceRange(range, text, opts);
    },
    transformSelection(transform, opts = {}) {
      const selection = opts.expandToLines ? expandSelectionToLines(std.getSelection()) : std.getSelection();
      const selected = modifiedModel.getValueInRange(selection);
      const result = transform(selected);
      const next = typeof result === "string" ? { text: result } : result || { text: selected };
      replaceRange(selection, next.text, { ...opts, ...next });
    },
    // Replace the WHOLE document via an undoable edit (so Ctrl+Z reverts it). Unlike
    // setValue(), this goes through executeEdits and stays on Monaco's undo stack.
    transformAll(transform, opts = {}) {
      const result = transform(modifiedModel.getValue());
      const text = typeof result === "string" ? result : result?.text ?? modifiedModel.getValue();
      replaceRange(modifiedModel.getFullModelRange(), text, { source: "raw-textutil", ...opts });
    },
    setSelection(startLine, startColumn, endLine, endColumn) {
      std.setSelection(new monaco.Range(startLine, startColumn, endLine, endColumn));
      std.focus();
    },
    isDirty: () => originalModel.getValue() !== modifiedModel.getValue(),
    // Adopt the current working copy as the new baseline (so isDirty() → false). Used after a
    // successful save-back to disk: the on-disk content now IS the original, nothing is unsaved.
    markClean: () => {
      if (originalModel.getValue() !== modifiedModel.getValue()) originalModel.setValue(modifiedModel.getValue());
    },
    setLanguage(lang) {
      monaco.editor.setModelLanguage(originalModel, lang);
      monaco.editor.setModelLanguage(modifiedModel, lang);
      if (compareModel) monaco.editor.setModelLanguage(compareModel, lang);
    },
    // Compare the current file against another file's text (current ↔ other). Switches to diff.
    setCompare(text, lang) {
      if (!compareModel) compareModel = monaco.editor.createModel(text, lang || language);
      else compareModel.setValue(text);
      if (lang) monaco.editor.setModelLanguage(compareModel, lang);
      setMode("diff");
    },
    clearCompare() {
      if (!compareModel) return;
      const m = compareModel;
      compareModel = null;
      if (mode === "diff") setMode("diff");
      m.dispose();
    },
    hasCompare: () => !!compareModel,
    setTheme(t) {
      monaco.editor.setTheme(t === "dark" ? "vs-dark" : "vs");
    },
    updateOptions(opts) {
      std.updateOptions(opts);
      diff?.updateOptions(opts);
    },
    layout() {
      std.layout();
      diff?.layout();
      if (mode === "diff" || mode === "movediff") diff?.updateOptions({ renderSideBySide: !isNarrow() });
    },
    focus() {
      std.focus();
    },
    // Magic selector: highlight + reveal a 1-based inclusive line range on the std editor.
    decorate(startLine, endLine) {
      decorations = std.deltaDecorations(decorations, [{
        range: new monaco.Range(startLine, 1, endLine, 1),
        options: { isWholeLine: true, className: "fv-line-hl" }
      }]);
    },
    reveal(line) {
      std.revealLineInCenter(line);
    },
    format() {
      return std.getAction?.("editor.action.formatDocument")?.run();
    },
    // Register a keybinding (e.g. 'ctrl+b') → handler. Uses Monaco's KeyMod/KeyCode API.
    addCommand(keybinding, handler) {
      const parts = String(keybinding || "").toLowerCase().split("+");
      let chord = 0;
      for (const part of parts) {
        if (part === "ctrl") chord |= monaco.KeyMod.CtrlCmd;
        else if (part === "shift") chord |= monaco.KeyMod.Shift;
        else if (part === "alt") chord |= monaco.KeyMod.Alt;
        else {
          const key2 = monaco.KeyCode["Key" + part.toUpperCase()] ?? monaco.KeyCode[part.toUpperCase()] ?? 0;
          chord |= key2;
        }
      }
      if (chord) std.addCommand(chord, handler);
    },
    // Scroll sync uses the std editor (active in current/original modes).
    scrollInfo() {
      return { top: std.getScrollTop(), max: std.getScrollHeight() - std.getLayoutInfo().height };
    },
    setScrollTop(t) {
      std.setScrollTop(t);
    },
    canSync: () => mode === "current" || mode === "original",
    dispose() {
      host.removeEventListener("paste", onDomPaste, true);
      std.dispose();
      diff?.dispose();
      originalModel.dispose();
      modifiedModel.dispose();
      compareModel?.dispose();
      host.innerHTML = "";
    }
  };
  function expandSelectionToLines(selection) {
    const start = selection.startLineNumber;
    const end = selection.isEmpty() ? start : selection.endLineNumber;
    return new monaco.Range(start, 1, end, modifiedModel.getLineMaxColumn(end));
  }
  function replaceRange(range, text, opts = {}) {
    const insert = String(text || "");
    const startOffset = modifiedModel.getOffsetAt(range.getStartPosition());
    std.executeEdits(opts.source || "raw-editor", [{ range, text: insert, forceMoveMarkers: true }]);
    const insertedStart = modifiedModel.getPositionAt(startOffset);
    const insertedEnd = modifiedModel.getPositionAt(startOffset + insert.length);
    if (Number.isFinite(opts.selectStart) && Number.isFinite(opts.selectEnd)) {
      std.setSelection(new monaco.Range(
        modifiedModel.getPositionAt(startOffset + opts.selectStart).lineNumber,
        modifiedModel.getPositionAt(startOffset + opts.selectStart).column,
        modifiedModel.getPositionAt(startOffset + opts.selectEnd).lineNumber,
        modifiedModel.getPositionAt(startOffset + opts.selectEnd).column
      ));
    } else if (opts.selectInserted) {
      std.setSelection(new monaco.Range(insertedStart.lineNumber, insertedStart.column, insertedEnd.lineNumber, insertedEnd.column));
    } else {
      std.setPosition(insertedEnd);
    }
    std.focus();
  }
}

// ../../docs/core/hexdump.js
function hexDump(bytes, limit = 4096) {
  if (!bytes || !bytes.length) return "(empty file — 0 bytes)";
  const n = Math.min(bytes.length, limit);
  const lines = [];
  for (let off = 0; off < n; off += 16) {
    const end = Math.min(off + 16, n);
    let hex2 = "";
    let ascii = "";
    for (let i = 0; i < 16; i++) {
      if (i === 8) hex2 += " ";
      const idx = off + i;
      if (idx < end) {
        const b = bytes[idx];
        hex2 += b.toString(16).padStart(2, "0") + " ";
        ascii += b >= 32 && b < 127 ? String.fromCharCode(b) : ".";
      } else {
        hex2 += "   ";
      }
    }
    lines.push(off.toString(16).padStart(8, "0") + "  " + hex2 + " |" + ascii + "|");
  }
  let out = lines.join("\n");
  if (bytes.length > limit) {
    out += "\n\n… " + (bytes.length - limit).toLocaleString() + " more bytes not shown (hex view limited to the first " + limit.toLocaleString() + " of " + bytes.length.toLocaleString() + " bytes).";
  }
  return out;
}

// ../../docs/types/markdown/edit-actions.js
function markdownHeading(text, level = 1) {
  const depth = Math.max(1, Math.min(6, Number(level) || 1));
  const prefix = "#".repeat(depth) + " ";
  return String(text || "").split("\n").map((line) => {
    if (!line.trim()) return line;
    return line.replace(/^(\s*)#{1,6}\s*/, "$1").replace(/^(\s*)/, "$1" + prefix);
  }).join("\n");
}
function markdownWrap(text, marker, placeholder) {
  const value = String(text || "");
  if (value.length >= marker.length * 2 && value.startsWith(marker) && value.endsWith(marker)) {
    const inner2 = value.slice(marker.length, value.length - marker.length);
    return { text: inner2, selectStart: 0, selectEnd: inner2.length };
  }
  const inner = value || placeholder;
  return {
    text: marker + inner + marker,
    selectStart: marker.length,
    selectEnd: marker.length + inner.length
  };
}
function markdownCodeBlock(text) {
  const value = String(text || "");
  if (!value.includes("\n") && value.length > 0) {
    return markdownInlineCode(value);
  }
  const inner = value || "code";
  return {
    text: "```\n" + inner + "\n```",
    selectStart: 4,
    selectEnd: 4 + inner.length
  };
}
function markdownInlineCode(text) {
  const value = String(text || "");
  const inner = value || "code";
  return { text: "`" + inner + "`", selectStart: 1, selectEnd: 1 + inner.length };
}
function markdownBlockquote(text) {
  const value = String(text || "");
  const lines = value.split("\n");
  return lines.map((line) => "> " + line).join("\n");
}
function markdownBulletList(text) {
  const value = String(text || "");
  const lines = value.split("\n");
  return lines.map((line) => line.trim() ? "- " + line : line).join("\n");
}
function markdownOrderedList(text) {
  const value = String(text || "");
  const lines = value.split("\n");
  let counter = 1;
  return lines.map((line) => {
    if (!line.trim()) return line;
    return counter++ + ". " + line;
  }).join("\n");
}
function markdownStrikethrough(text) {
  return markdownWrap(text, "~~", "strikethrough");
}
function markdownLinkForPastedUrl(selection, pastedText) {
  const label = String(selection || "").trim();
  const url = String(pastedText || "").trim();
  if (!label || !isLikelyUrl(url)) return null;
  return `[${label}](${url})`;
}
function markdownTable(rows = 3, cols = 3) {
  const rowCount = Math.max(1, Math.min(20, Number(rows) || 3));
  const colCount = Math.max(1, Math.min(10, Number(cols) || 3));
  const headers = Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`);
  const separator = Array.from({ length: colCount }, () => "---");
  const body = Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => ""));
  return [headers, separator, ...body].map(formatRow).join("\n");
}
function tableSortOptions(text) {
  const parsed = parseMarkdownTable(text);
  if (!parsed) return [];
  return parsed.header.map((label, index) => ({ index, label: label || `Column ${index + 1}` }));
}
function sortMarkdownTable(text, columnIndex, direction = "asc") {
  const parsed = parseMarkdownTable(text);
  const col = Number(columnIndex);
  if (!parsed || col < 0 || col >= parsed.header.length) return null;
  const sign = direction === "desc" ? -1 : 1;
  const sorted = [...parsed.body].sort((a, b) => compareCells(a[col] || "", b[col] || "") * sign);
  const lines = [parsed.header, parsed.separator, ...sorted].map(formatRow);
  return lines.join("\n");
}
function parseMarkdownTable(text) {
  const rawLines = String(text || "").split(/\r?\n/);
  const lines = rawLines.filter((line) => line.trim());
  if (lines.length < 2) return null;
  const header = splitRow(lines[0]);
  const separator = splitRow(lines[1]);
  if (!header || !separator || header.length < 1 || separator.length !== header.length) return null;
  if (!separator.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))) return null;
  const body = lines.slice(2).map(splitRow);
  if (body.some((row) => !row || row.length !== header.length)) return null;
  return { header, separator, body };
}
function splitRow(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed.includes("|")) return null;
  const body = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  return body.split("|").map((cell) => cell.trim());
}
function formatRow(cells) {
  return "| " + cells.map((cell) => String(cell || "").trim()).join(" | ") + " |";
}
function compareCells(a, b) {
  const av = String(a || "").trim();
  const bv = String(b || "").trim();
  const an = Number(av.replace(/,/g, ""));
  const bn = Number(bv.replace(/,/g, ""));
  if (av && bv && Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  return av.localeCompare(bv, void 0, { numeric: true, sensitivity: "base" });
}
function isLikelyUrl(value) {
  if (!/^(https?:\/\/|mailto:|ftp:\/\/)/i.test(value)) return false;
  try {
    const url = new URL(value);
    return !!url.protocol && (url.protocol !== "mailto:" || !!url.pathname);
  } catch {
    return false;
  }
}

// ../../docs/types/markdown/wysiwyg.js
import { vendor as vendor2 } from "./script-loader.js";
var editor = null;
var _tiptap = null;
async function loadTiptap() {
  if (!_tiptap) _tiptap = await import(vendor2("tiptap/tiptap.esm.js"));
  return _tiptap;
}
function injectCssOnce() {
  if (document.getElementById("tiptap-css")) return;
  const link = document.createElement("link");
  link.id = "tiptap-css";
  link.rel = "stylesheet";
  link.href = vendor2("tiptap/tiptap.css");
  document.head.appendChild(link);
}
async function mountWysiwyg(container, text, onChange) {
  unmountWysiwyg();
  injectCssOnce();
  const { Editor, StarterKit, TableKit, TaskList, TaskItem, Markdown } = await loadTiptap();
  container.innerHTML = "";
  const host = document.createElement("div");
  host.className = "tiptap-host";
  container.appendChild(host);
  editor = new Editor({
    element: host,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      TableKit.configure({ table: { resizable: true } }),
      // GFM task lists: TaskList container + checkable TaskItem (nested allowed).
      // The Markdown extension recognizes the taskList/taskItem nodes and
      // round-trips them as `- [ ]` / `- [x]`.
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown
    ],
    autofocus: true,
    onUpdate: () => onChange?.(getWysiwygValue())
  });
  editor.commands.setContent(text ?? "", { contentType: "markdown" });
  return editor;
}
function unmountWysiwyg() {
  if (editor) {
    try {
      editor.destroy();
    } catch {
    }
    editor = null;
  }
}
function getWysiwygValue() {
  if (!editor) return "";
  try {
    return editor.getMarkdown();
  } catch {
    return "";
  }
}
function isWysiwygActive() {
  return editor !== null;
}
function runWysiwygCommand(action, opts = {}) {
  if (!editor) return false;
  const c = editor.chain().focus();
  switch (action) {
    case "bold":
      c.toggleBold().run();
      return true;
    case "italic":
      c.toggleItalic().run();
      return true;
    case "strikethrough":
      c.toggleStrike().run();
      return true;
    case "inline-code":
      c.toggleCode().run();
      return true;
    case "code-block":
      c.toggleCodeBlock().run();
      return true;
    case "blockquote":
      c.toggleBlockquote().run();
      return true;
    case "bullet-list":
      c.toggleBulletList().run();
      return true;
    case "ordered-list":
      c.toggleOrderedList().run();
      return true;
    case "task-list":
      c.toggleTaskList().run();
      return true;
    case "heading":
      c.toggleHeading({ level: Math.min(6, Math.max(1, opts.level || 1)) }).run();
      return true;
    case "paragraph":
      c.setParagraph().run();
      return true;
    default:
      return false;
  }
}
function insertWysiwygMarkdown(md) {
  if (!editor) return;
  editor.chain().focus().insertContent(md, { contentType: "markdown" }).run();
}

// ../../docs/core/rawpane-editors.js
import { state as state6 } from "./state.js";

// ../../docs/types/html/wysiwyg-html.js
var HtmlWysiwygEditor = class {
  constructor(container, text, onChange) {
    this._container = container;
    this._onChange = onChange;
    this._text = text;
    this._editHost = null;
    this._debounceTimer = null;
  }
  mount() {
    const body = this._extractBody(this._text);
    this._editHost = document.createElement("div");
    this._editHost.id = "htmlWysiwygHost";
    this._editHost.className = "html-wysiwyg-host editor-host";
    this._editHost.contentEditable = "true";
    this._editHost.innerHTML = body;
    this._container.append(this._editHost);
    this._editHost.addEventListener("input", () => this._onEdit());
    this._editHost.addEventListener("keydown", (e) => this._onKeyDown(e));
  }
  _extractBody(html) {
    const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return m ? m[1] : html;
  }
  _onEdit() {
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this._onChange?.(this.getValue());
    }, 300);
  }
  _onKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      if (e.key === "b") {
        e.preventDefault();
        this.exec("bold");
      } else if (e.key === "i") {
        e.preventDefault();
        this.exec("italic");
      } else if (e.key === "u") {
        e.preventDefault();
        this.exec("underline");
      } else if (e.key === "z") {
        e.preventDefault();
        this.exec("undo");
      }
    } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") {
      e.preventDefault();
      this.exec("redo");
    }
  }
  exec(cmd, value) {
    try {
      document.execCommand(cmd, false, value ?? null);
    } catch {
    }
    this._editHost?.focus();
    this._onEdit();
  }
  execLink() {
    const url = window.prompt("Enter URL:");
    if (url) this.exec("createLink", url);
  }
  getValue() {
    if (!this._editHost) return this._text;
    const bodyContent = this._editHost.innerHTML;
    const replaced = this._text.replace(
      /(<body[^>]*>)([\s\S]*?)(<\/body>)/i,
      (_, open, _old, close) => `${open}${bodyContent}${close}`
    );
    if (replaced !== this._text) return replaced;
    return `<!DOCTYPE html><html><body>${bodyContent}</body></html>`;
  }
  unmount() {
    clearTimeout(this._debounceTimer);
    if (this._editHost) {
      this._editHost.remove();
      this._editHost = null;
    }
  }
};

// ../../docs/types/text/csv/shape.js
function maxCsvColumns(rows) {
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0);
}
function csvColumnLabels(rows, hasHeader = true) {
  const width = maxCsvColumns(rows);
  const header = hasHeader && Array.isArray(rows?.[0]) ? rows[0] : [];
  const used = /* @__PURE__ */ new Set();
  const nextSuffix = /* @__PURE__ */ new Map();
  return Array.from({ length: width }, (_, columnIndex) => {
    const raw = header[columnIndex];
    const base = hasHeader && raw != null && String(raw) !== "" ? String(raw) : `column_${columnIndex + 1}`;
    let label = base;
    let suffix = nextSuffix.get(base) || 2;
    while (used.has(label)) label = `${base}_${suffix++}`;
    nextSuffix.set(base, suffix);
    used.add(label);
    return label;
  });
}

// ../../docs/types/text/csv/table-editor.js
function parseCsvText(text, sep) {
  const rows = [];
  let row = [];
  let i = 0;
  const n = text.length;
  while (i <= n) {
    if (i === n) {
      rows.push(row);
      break;
    }
    const ch = text[i];
    if (ch === '"') {
      let val = "";
      i++;
      while (i < n) {
        if (text[i] === '"') {
          if (text[i + 1] === '"') {
            val += '"';
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          val += text[i++];
        }
      }
      row.push(val);
      if (i < n && text[i] === sep) i++;
      else if (i < n && text[i] === "\r") {
        i++;
        if (text[i] === "\n") i++;
        rows.push(row);
        row = [];
      } else if (i < n && text[i] === "\n") {
        i++;
        rows.push(row);
        row = [];
      }
    } else if (ch === sep) {
      row.push("");
      i++;
    } else if (ch === "\r" || ch === "\n") {
      row.push("");
      if (ch === "\r" && text[i + 1] === "\n") i++;
      i++;
      rows.push(row);
      row = [];
    } else {
      let val = "";
      while (i < n && text[i] !== sep && text[i] !== "\r" && text[i] !== "\n") {
        val += text[i++];
      }
      row.push(val);
      if (i < n && text[i] === sep) i++;
      else if (i < n && text[i] === "\r") {
        i++;
        if (text[i] === "\n") i++;
        rows.push(row);
        row = [];
      } else if (i < n && text[i] === "\n") {
        i++;
        rows.push(row);
        row = [];
      }
    }
  }
  if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") {
    rows.pop();
  }
  return rows.length ? rows : [[""]];
}
function toCsvText(rows, sep) {
  return rows.map(
    (row) => row.map((cell) => {
      const s = String(cell ?? "");
      return s.includes(sep) || s.includes('"') || s.includes("\n") || s.includes("\r") ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(sep)
  ).join("\n");
}
var TableEditor = class {
  constructor(container, text, sep, onChange, hasHeader = true) {
    this._sep = sep || ",";
    this._onChange = onChange;
    this._rows = parseCsvText(text, this._sep);
    this._container = container;
    this._hasHeader = hasHeader !== false;
    this._render();
  }
  _maxCols() {
    return Math.max(...this._rows.map((r) => r.length), 1);
  }
  _render() {
    this._container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "te-wrapper";
    const toolbar = document.createElement("div");
    toolbar.className = "te-toolbar";
    const addRowBtn = document.createElement("button");
    addRowBtn.className = "te-btn";
    addRowBtn.textContent = "+ Row";
    addRowBtn.type = "button";
    addRowBtn.title = "Append a new empty row";
    addRowBtn.addEventListener("click", () => {
      this._rows.push(Array(this._maxCols()).fill(""));
      this._notifyAndRender();
    });
    const addColBtn = document.createElement("button");
    addColBtn.className = "te-btn";
    addColBtn.textContent = "+ Col";
    addColBtn.type = "button";
    addColBtn.title = "Append a new empty column";
    addColBtn.addEventListener("click", () => {
      this._rows.forEach((r) => r.push(""));
      this._notifyAndRender();
    });
    toolbar.append(addRowBtn, addColBtn);
    const scroll = document.createElement("div");
    scroll.className = "te-scroll";
    const tbl = document.createElement("table");
    tbl.className = "te-table";
    const tbody = document.createElement("tbody");
    const maxCols = this._maxCols();
    const columnLabels = csvColumnLabels(this._rows, this._hasHeader);
    this._rows.forEach((row, ri) => {
      const tr = document.createElement("tr");
      const isHeaderRow = this._hasHeader && ri === 0;
      const idx = document.createElement("td");
      idx.className = "te-idx";
      idx.textContent = isHeaderRow ? "#" : String(this._hasHeader ? ri : ri + 1);
      idx.title = "Right-click to delete this row";
      idx.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (this._rows.length <= 1) return;
        this._rows.splice(ri, 1);
        this._notifyAndRender();
      });
      tr.append(idx);
      for (let ci = 0; ci < maxCols; ci++) {
        const td = document.createElement("td");
        td.className = isHeaderRow ? "te-cell te-header" : "te-cell";
        td.contentEditable = "true";
        td.textContent = row[ci] ?? "";
        td.dataset.ri = ri;
        td.dataset.ci = ci;
        if (isHeaderRow) {
          td.dataset.columnLabel = columnLabels[ci];
          td.setAttribute("aria-label", columnLabels[ci]);
          if (td.textContent === "") {
            td.classList.add("te-header-fallback");
            td.dataset.fallbackLabel = columnLabels[ci];
          }
        }
        td.addEventListener("blur", () => {
          if (!this._rows[ri]) return;
          while (this._rows[ri].length <= ci) this._rows[ri].push("");
          this._rows[ri][ci] = td.textContent;
          this._onChange?.(toCsvText(this._rows, this._sep));
        });
        td.addEventListener("keydown", (e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            if (ci < maxCols - 1) {
              tr.cells[ci + 2]?.focus();
            } else if (ri < this._rows.length - 1) {
              tbody.rows[ri + 1]?.cells[1]?.focus();
            }
          } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            tbody.rows[ri + 1]?.cells[ci + 1]?.focus();
          }
        });
        tr.append(td);
      }
      if (ri === 0) {
        for (let ci = 0; ci < maxCols; ci++) {
          const headerCell = tr.cells[ci + 1];
          headerCell.title = "Right-click to delete this column";
          headerCell.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            if (maxCols <= 1) return;
            this._rows.forEach((r) => r.splice(ci, 1));
            this._notifyAndRender();
          });
        }
      }
      tbody.append(tr);
    });
    tbl.append(tbody);
    scroll.append(tbl);
    wrapper.append(toolbar, scroll);
    this._container.append(wrapper);
  }
  _notifyAndRender() {
    this._onChange?.(toCsvText(this._rows, this._sep));
    this._render();
  }
  getValue() {
    return toCsvText(this._rows, this._sep);
  }
  destroy() {
    this._container.innerHTML = "";
  }
};

// ../../docs/core/rawpane-editors.js
var htmlWysiwyg = null;
function setHtmlToolbarVisible(visible) {
  const el = document.getElementById("htmlToolbar");
  if (!el) return;
  el.hidden = !visible;
  syncHasToolsClass();
}
function wireHtmlToolbar() {
  const el = document.getElementById("htmlToolbar");
  if (!el || el.dataset.wired) return;
  el.dataset.wired = "1";
  el.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cmd]");
    if (!btn || !htmlWysiwyg) return;
    const cmd = btn.dataset.cmd;
    const val = btn.dataset.val || void 0;
    if (cmd === "createLink") {
      htmlWysiwyg.execLink();
    } else {
      htmlWysiwyg.exec(cmd, val);
    }
  });
  document.getElementById("htmlLinkBtn")?.addEventListener("click", () => htmlWysiwyg?.execLink());
}
async function toggleHtmlWysiwyg() {
  if (state6.type?.id !== "html") return;
  if (!htmlWysiwyg) {
    const text = state6.rawview?.getValue?.() ?? (state6.intake?.text || "");
    state6.rawview?.dispose?.();
    state6.rawview = null;
    const editorEl = document.getElementById("editor");
    if (editorEl) editorEl.style.display = "none";
    const editorParent = editorEl?.parentElement || document.getElementById("rawPane");
    htmlWysiwyg = new HtmlWysiwygEditor(editorParent, text, async (newHtml) => {
      state6.intake = { ...state6.intake, text: newHtml };
      state6.downloadedSinceEdit = false;
      if (state6.currentFolderPath) {
        state6.folderEdits.set(state6.currentFolderPath, newHtml);
        state6.folderExported = false;
        state6.treeApi?.setEdited?.(state6.currentFolderPath, true);
      } else if (state6.sessionIntakes.has(state6.intake?.filename)) {
        state6.sessionEdits.set(state6.intake.filename, newHtml);
        state6.treeApi?.setEdited?.(state6.intake.filename, true);
      }
    });
    htmlWysiwyg.mount();
    wireHtmlToolbar();
    setHtmlToolbarVisible(true);
    const btn = document.getElementById("htmlVisualBtn");
    if (btn) {
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
    }
  } else {
    const html = htmlWysiwyg.getValue();
    htmlWysiwyg.unmount();
    htmlWysiwyg = null;
    setHtmlToolbarVisible(false);
    const btn = document.getElementById("htmlVisualBtn");
    if (btn) {
      btn.classList.remove("active");
      btn.setAttribute("aria-pressed", "false");
    }
    const editorEl = document.getElementById("editor");
    if (editorEl) editorEl.style.display = "";
    state6.intake = { ...state6.intake, text: html };
    await buildRawView();
  }
}
function teardownHtmlWysiwyg() {
  if (!htmlWysiwyg) return;
  htmlWysiwyg.unmount();
  htmlWysiwyg = null;
  setHtmlToolbarVisible(false);
  const btn = document.getElementById("htmlVisualBtn");
  if (btn) {
    btn.classList.remove("active");
    btn.setAttribute("aria-pressed", "false");
  }
  const editorEl = document.getElementById("editor");
  if (editorEl) editorEl.style.display = "";
}
function getHtmlWysiwygValue() {
  return htmlWysiwyg ? htmlWysiwyg.getValue() : null;
}
var tableEditor = null;
function setTableMode(on) {
  const editorEl = document.getElementById("editor");
  const btn = document.getElementById("tableModeBtn");
  if (on) {
    const settings = state6.settingsModel?.values || {};
    const delimSetting = settings.delimiter;
    const DELIMS = { comma: ",", semicolon: ";", tab: "	", pipe: "|" };
    let sep;
    if (delimSetting && delimSetting !== "auto") {
      sep = DELIMS[delimSetting] || ",";
    } else {
      sep = (state6.intake?.filename || "").toLowerCase().endsWith(".tsv") ? "	" : ",";
    }
    const text = state6.rawview ? state6.rawview.getValue() : state6.intake?.text || "";
    state6.rawview?.updateOptions?.({ readOnly: true });
    let host = document.getElementById("tableEditorHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "tableEditorHost";
      host.className = "editor-host";
      editorEl?.parentNode?.insertBefore(host, editorEl);
    }
    host.hidden = false;
    if (editorEl) editorEl.style.display = "none";
    tableEditor = new TableEditor(host, text, sep, (newCsv) => {
      state6.intake = { ...state6.intake, text: newCsv };
      state6.downloadedSinceEdit = false;
    });
  } else {
    if (tableEditor) {
      const csv = tableEditor.getValue();
      tableEditor.destroy();
      tableEditor = null;
      if (state6.rawview) {
        state6.rawview.setValue(csv);
        state6.rawview.updateOptions?.({ readOnly: false });
      }
      state6.intake = { ...state6.intake, text: csv };
    }
    const host = document.getElementById("tableEditorHost");
    if (host) host.hidden = true;
    if (editorEl) editorEl.style.display = "";
  }
  if (btn) {
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", String(on));
  }
}
function wireTableModeBtn() {
  const btn = document.getElementById("tableModeBtn");
  if (!btn || btn.dataset.wired) return;
  btn.dataset.wired = "1";
  btn.addEventListener("click", () => {
    const isOn = btn.classList.contains("active");
    setTableMode(!isOn);
  });
}
function teardownTableEditor() {
  if (!tableEditor) return;
  tableEditor.destroy();
  tableEditor = null;
  const host = document.getElementById("tableEditorHost");
  if (host) host.hidden = true;
  const editorEl = document.getElementById("editor");
  if (editorEl) editorEl.style.display = "";
}
function getTableEditorValue() {
  return tableEditor ? tableEditor.getValue() : null;
}

// ../../docs/core/rawpane-forms.js
import { state as state7 } from "./state.js";

// ../../docs/types/text/env/form-editor.js
var SENSITIVE_RE = /SECRET|PASSWORD|PASSWD|PWD|TOKEN|KEY|API|PRIVATE|AUTH|CREDENTIAL|SALT|SIGNING|MASTER|WEBHOOK/i;
var URL_CREDS = /:\/\/[^\s/:@]+:[^\s/@]+@/;
function hasUrlCreds(v) {
  return URL_CREDS.test(v || "");
}
var COMMENTED_VAR = /^([A-Za-z_][\w.]*)\s*=(.*)$/;
function parseEnv(text) {
  const entries = [];
  for (const line of (text || "").split(/\r?\n/)) {
    const t = line.trim();
    if (!t) {
      entries.push({ type: "blank" });
    } else if (t.startsWith("#")) {
      entries.push({ type: "comment", text: t.slice(1).trim() });
    } else {
      const eq = t.indexOf("=");
      if (eq === -1) {
        entries.push({ type: "comment", text: t });
      } else {
        let key2 = t.slice(0, eq).trim();
        let val = t.slice(eq + 1).trim();
        if (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'")) {
          val = val.slice(1, -1);
        }
        entries.push({ type: "var", key: key2, value: val });
      }
    }
  }
  return entries;
}
function serializeEnv(entries) {
  return entries.map((e) => {
    if (e.type === "blank") return "";
    if (e.type === "comment") return "# " + (e.text || "");
    const val = (e.value || "").includes(" ") || (e.value || "").includes("#") ? `"${e.value.replace(/"/g, '\\"')}"` : e.value || "";
    return `${e.key || "KEY"}=${val}`;
  }).join("\n");
}
var EnvFormEditor = class {
  constructor(container, text, onChange) {
    this._entries = parseEnv(text);
    this._onChange = onChange;
    this._container = container;
    this._revealed = /* @__PURE__ */ new Set();
    this._undo = [];
    this._redo = [];
    this._beforeEdit = null;
    this._onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        this._undoOp();
      } else if (k === "y" || k === "z" && e.shiftKey) {
        e.preventDefault();
        this._redoOp();
      }
    };
    container.addEventListener("keydown", this._onKey);
    this._render();
  }
  _notify() {
    this._onChange?.(serializeEnv(this._entries));
  }
  // ── Selection / scope ──
  // Indices to operate on: the selected (entry._sel) entries if any are selected, else all entries.
  _scopeIndices() {
    const sel = [];
    this._entries.forEach((e, i) => {
      if (e._sel) sel.push(i);
    });
    if (sel.length) return sel;
    return this._entries.map((_, i) => i);
  }
  // Sort the scoped entries in place: gather them, sort by key (vars) / text (comments) / '' (blanks),
  // then write them back into the same slots they occupied. Non-scoped rows stay put.
  _sortScope() {
    const idx = this._scopeIndices();
    const sortKey = (e) => e.type === "var" ? e.key || "" : e.type === "comment" ? e.text || "" : "";
    const sorted = idx.map((i) => this._entries[i]).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    this._pushHistory();
    idx.forEach((slot, n) => {
      this._entries[slot] = sorted[n];
    });
    this._render();
    this._notify();
  }
  // Trim leading/trailing whitespace from scoped var keys+values and comment text.
  _trimScope() {
    this._pushHistory();
    for (const i of this._scopeIndices()) {
      const e = this._entries[i];
      if (e.type === "var") {
        e.key = (e.key || "").trim();
        e.value = (e.value || "").trim();
      } else if (e.type === "comment") {
        e.text = (e.text || "").trim();
      }
    }
    this._render();
    this._notify();
  }
  // Remove later var entries whose key already appeared (keep first). Uses full order to decide
  // "already appeared", but only removes entries that are in scope.
  _dedupScope() {
    const scope = new Set(this._scopeIndices());
    const seen = /* @__PURE__ */ new Set();
    const keep = [];
    this._entries.forEach((e, i) => {
      if (e.type === "var") {
        const k = e.key || "";
        if (seen.has(k)) {
          if (scope.has(i)) return;
        } else seen.add(k);
      }
      keep.push(e);
    });
    if (keep.length === this._entries.length) return;
    this._pushHistory();
    this._entries = keep;
    this._render();
    this._notify();
  }
  // Move the entry at `from` to land at index `to` (drop target's slot).
  _moveEntry(from, to) {
    if (from === to || from < 0 || to < 0) return;
    this._pushHistory();
    const [moved] = this._entries.splice(from, 1);
    if (from < to) to -= 1;
    this._entries.splice(to, 0, moved);
    this._render();
    this._notify();
  }
  // ── Undo / redo ──
  _snapshot() {
    return JSON.stringify(this._entries);
  }
  _pushHistory() {
    this._undo.push(this._snapshot());
    if (this._undo.length > 100) this._undo.shift();
    this._redo = [];
  }
  _undoOp() {
    if (!this._undo.length) return;
    this._redo.push(this._snapshot());
    this._entries = JSON.parse(this._undo.pop());
    this._render();
    this._notify();
  }
  _redoOp() {
    if (!this._redo.length) return;
    this._undo.push(this._snapshot());
    this._entries = JSON.parse(this._redo.pop());
    this._render();
    this._notify();
  }
  // Wire an editable input so a committed edit (focus → change) is a single undo step.
  _wireEdit(input) {
    input.addEventListener("focus", () => {
      this._beforeEdit = this._snapshot();
    });
    input.addEventListener("change", () => {
      if (this._beforeEdit && this._beforeEdit !== this._snapshot()) {
        this._undo.push(this._beforeEdit);
        if (this._undo.length > 100) this._undo.shift();
        this._redo = [];
      }
      this._beforeEdit = null;
    });
  }
  _render() {
    this._container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "env-form";
    const toolbar = document.createElement("div");
    toolbar.className = "env-toolbar";
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "env-btn";
    addBtn.textContent = "+ Add variable";
    addBtn.addEventListener("click", () => {
      this._pushHistory();
      this._entries.push({ type: "var", key: "", value: "" });
      this._render();
      this._notify();
      const inputs = this._container.querySelectorAll(".env-key");
      inputs[inputs.length - 1]?.focus();
    });
    const undoBtn = document.createElement("button");
    undoBtn.type = "button";
    undoBtn.className = "env-btn";
    undoBtn.textContent = "↶ Undo";
    undoBtn.title = "Undo (Ctrl+Z)";
    undoBtn.disabled = !this._undo.length;
    undoBtn.addEventListener("click", () => this._undoOp());
    const redoBtn = document.createElement("button");
    redoBtn.type = "button";
    redoBtn.className = "env-btn";
    redoBtn.textContent = "↷ Redo";
    redoBtn.title = "Redo (Ctrl+Y)";
    redoBtn.disabled = !this._redo.length;
    redoBtn.addEventListener("click", () => this._redoOp());
    const anySel = this._entries.some((e) => e._sel);
    const scopeNote = anySel ? " selected rows" : " all rows";
    const sortBtn = document.createElement("button");
    sortBtn.type = "button";
    sortBtn.className = "env-btn";
    sortBtn.textContent = "Sort";
    sortBtn.title = "Sort" + scopeNote + " by key (in place)";
    sortBtn.addEventListener("click", () => this._sortScope());
    const trimBtn = document.createElement("button");
    trimBtn.type = "button";
    trimBtn.className = "env-btn";
    trimBtn.textContent = "Trim";
    trimBtn.title = "Trim whitespace from" + scopeNote;
    trimBtn.addEventListener("click", () => this._trimScope());
    const dedupBtn = document.createElement("button");
    dedupBtn.type = "button";
    dedupBtn.className = "env-btn";
    dedupBtn.textContent = "Dedup";
    dedupBtn.title = "Remove duplicate keys from" + scopeNote + " (keep first)";
    dedupBtn.addEventListener("click", () => this._dedupScope());
    toolbar.append(addBtn, undoBtn, redoBtn, sortBtn, trimBtn, dedupBtn);
    wrapper.append(toolbar);
    const list = document.createElement("div");
    list.className = "env-list";
    const decorate = (row, entry, i) => {
      row.draggable = true;
      if (entry._sel) row.classList.add("env-selected");
      const handle = document.createElement("span");
      handle.className = "env-drag";
      handle.textContent = "⠿";
      handle.title = "Drag to reorder";
      const check = document.createElement("input");
      check.type = "checkbox";
      check.className = "env-check";
      check.checked = !!entry._sel;
      check.title = "Select row";
      check.addEventListener("change", () => {
        this._entries[i]._sel = check.checked;
        row.classList.toggle("env-selected", check.checked);
        this._render();
      });
      row.addEventListener("dragstart", (e) => {
        if (e.target instanceof HTMLInputElement) {
          e.preventDefault();
          return;
        }
        this._dragFrom = i;
        row.classList.add("env-dragging");
        e.dataTransfer.effectAllowed = "move";
        try {
          e.dataTransfer.setData("text/plain", String(i));
        } catch {
        }
      });
      row.addEventListener("dragend", () => {
        row.classList.remove("env-dragging");
        this._dragFrom = null;
      });
      row.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        row.classList.add("env-dragover");
      });
      row.addEventListener("dragleave", () => row.classList.remove("env-dragover"));
      row.addEventListener("drop", (e) => {
        e.preventDefault();
        row.classList.remove("env-dragover");
        const from = this._dragFrom ?? Number(e.dataTransfer.getData("text/plain"));
        if (Number.isFinite(from)) {
          this._moveEntry(from, from < i ? i + 1 : i);
        }
      });
      row.prepend(handle, check);
    };
    this._entries.forEach((entry, i) => {
      const row = document.createElement("div");
      if (entry.type === "blank") {
        row.className = "env-row env-blank";
      } else if (entry.type === "comment") {
        row.className = "env-row env-comment-row";
        const text = document.createElement("input");
        text.type = "text";
        text.className = "env-comment-text";
        text.value = entry.text || "";
        text.placeholder = "Comment…";
        text.addEventListener("input", () => {
          this._entries[i].text = text.value;
          this._notify();
        });
        this._wireEdit(text);
        const m = COMMENTED_VAR.exec((entry.text || "").trim());
        if (m) {
          const uncomment = document.createElement("button");
          uncomment.type = "button";
          uncomment.className = "env-toggle env-uncomment";
          uncomment.title = "Un-comment — make this an active variable";
          uncomment.textContent = "↩";
          uncomment.addEventListener("click", () => {
            this._pushHistory();
            let val = m[2].trim();
            if (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
            this._entries[i] = { type: "var", key: m[1], value: val };
            this._render();
            this._notify();
          });
          row.append(uncomment);
        } else {
          row.append(document.createTextNode("# "));
        }
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "env-del";
        delBtn.title = "Delete line";
        delBtn.textContent = "×";
        delBtn.addEventListener("click", () => {
          this._pushHistory();
          this._entries.splice(i, 1);
          this._render();
          this._notify();
        });
        row.append(text, delBtn);
        decorate(row, entry, i);
      } else {
        row.className = "env-row env-var-row";
        const isSensitive = SENSITIVE_RE.test(entry.key || "") || hasUrlCreds(entry.value || "");
        const isRevealed = this._revealed.has(i);
        const commentToggle = document.createElement("button");
        commentToggle.type = "button";
        commentToggle.className = "env-toggle";
        commentToggle.title = "Comment out this variable";
        commentToggle.textContent = "#";
        commentToggle.addEventListener("click", () => {
          this._pushHistory();
          this._entries[i] = { type: "comment", text: `${entry.key}=${entry.value}` };
          this._render();
          this._notify();
        });
        const keyInput = document.createElement("input");
        keyInput.type = "text";
        keyInput.className = "env-key";
        keyInput.value = entry.key || "";
        keyInput.placeholder = "KEY";
        keyInput.spellcheck = false;
        keyInput.addEventListener("input", () => {
          this._entries[i].key = keyInput.value;
          this._notify();
        });
        this._wireEdit(keyInput);
        const eq = document.createElement("span");
        eq.className = "env-eq";
        eq.textContent = "=";
        const valInput = document.createElement("input");
        valInput.type = isSensitive && !isRevealed ? "password" : "text";
        valInput.className = "env-val";
        valInput.value = entry.value || "";
        valInput.placeholder = "value";
        valInput.spellcheck = false;
        valInput.addEventListener("input", () => {
          this._entries[i].value = valInput.value;
          this._notify();
        });
        this._wireEdit(valInput);
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "env-del";
        delBtn.title = "Delete variable";
        delBtn.textContent = "×";
        delBtn.addEventListener("click", () => {
          this._pushHistory();
          this._entries.splice(i, 1);
          this._revealed.delete(i);
          this._render();
          this._notify();
        });
        row.append(commentToggle, keyInput, eq, valInput);
        if (isSensitive) {
          const eyeBtn = document.createElement("button");
          eyeBtn.type = "button";
          eyeBtn.className = "env-eye";
          eyeBtn.title = isRevealed ? "Hide value" : "Reveal value";
          eyeBtn.textContent = isRevealed ? "🙈" : "👁";
          eyeBtn.addEventListener("click", () => {
            if (isRevealed) this._revealed.delete(i);
            else this._revealed.add(i);
            this._render();
          });
          row.append(eyeBtn);
        }
        row.append(delBtn);
        decorate(row, entry, i);
      }
      list.append(row);
    });
    wrapper.append(list);
    this._container.append(wrapper);
  }
  getValue() {
    return serializeEnv(this._entries);
  }
  destroy() {
    this._container.removeEventListener("keydown", this._onKey);
    this._container.innerHTML = "";
  }
};

// ../../docs/types/text/ini/renderer.js
function parseIni(text) {
  const sections = [{ name: null, pairs: [], line: 1 }];
  let cur = sections[0];
  for (const [idx, raw] of (text || "").split(/\r?\n/).entries()) {
    const lineNo = idx + 1;
    const line = raw.trim();
    if (!line || line[0] === "#" || line[0] === ";") continue;
    const sec = line.match(/^\[(.+?)\]$/);
    if (sec) {
      cur = { name: sec[1].trim(), pairs: [], line: lineNo };
      sections.push(cur);
      continue;
    }
    const m = line.match(/^([^=:]+?)\s*[=:]\s*(.*)$/);
    if (m) {
      let val = m[2].trim();
      if (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      cur.pairs.push({ key: m[1].trim(), value: val, line: lineNo, section: cur.name });
    }
  }
  return sections.filter((s) => s.pairs.length || s.name);
}

// ../../docs/types/text/ini/form-editor.js
function serializeIni(sections) {
  const parts = [];
  for (const sec of sections) {
    if (sec.name === null) {
      for (const p of sec.pairs) {
        parts.push(`${p.key || "key"} = ${p.value || ""}`);
      }
    } else {
      if (parts.length) parts.push("");
      parts.push(`[${sec.name}]`);
      for (const p of sec.pairs) {
        parts.push(`${p.key || "key"} = ${p.value || ""}`);
      }
    }
  }
  return parts.join("\n");
}
var IniFormEditor = class {
  constructor(container, text, onChange) {
    this._sections = parseIni(text).map((s) => ({
      name: s.name,
      pairs: s.pairs.map((p) => ({ key: p.key, value: p.value })),
      collapsed: false
    }));
    if (!this._sections.length) {
      this._sections = [{ name: null, pairs: [], collapsed: false }];
    }
    this._onChange = onChange;
    this._container = container;
    this._render();
  }
  _notify() {
    this._onChange?.(serializeIni(this._sections));
  }
  _renderAndNotify() {
    this._render();
    this._notify();
  }
  _render() {
    this._container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "ini-form";
    const body = document.createElement("div");
    body.className = "ini-body";
    this._sections.forEach((sec, si) => {
      const group = document.createElement("div");
      group.className = "ini-section" + (sec.collapsed ? " ini-collapsed" : "");
      const header = document.createElement("div");
      header.className = "ini-section-header";
      header.title = "Click to collapse/expand";
      const arrow = document.createElement("span");
      arrow.className = "ini-arrow";
      arrow.textContent = sec.collapsed ? "▶" : "▼";
      const titleEl = document.createElement("span");
      titleEl.className = "ini-section-title";
      titleEl.textContent = sec.name === null ? "(global)" : `[${sec.name}]`;
      const headerActions = document.createElement("span");
      headerActions.className = "ini-header-actions";
      if (sec.name !== null) {
        const renameInput = document.createElement("input");
        renameInput.type = "text";
        renameInput.className = "ini-section-name";
        renameInput.value = sec.name;
        renameInput.placeholder = "Section name";
        renameInput.spellcheck = false;
        renameInput.addEventListener("click", (e) => e.stopPropagation());
        renameInput.addEventListener("input", () => {
          this._sections[si].name = renameInput.value;
          titleEl.textContent = `[${renameInput.value}]`;
          this._notify();
        });
        headerActions.append(renameInput);
      }
      const delSecBtn = document.createElement("button");
      delSecBtn.type = "button";
      delSecBtn.className = "ini-del-section";
      delSecBtn.title = "Delete section";
      delSecBtn.textContent = "×";
      delSecBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._sections.splice(si, 1);
        if (!this._sections.length) {
          this._sections = [{ name: null, pairs: [], collapsed: false }];
        }
        this._renderAndNotify();
      });
      headerActions.append(delSecBtn);
      header.append(arrow, titleEl, headerActions);
      header.addEventListener("click", () => {
        this._sections[si].collapsed = !this._sections[si].collapsed;
        this._render();
      });
      group.append(header);
      const pairList = document.createElement("div");
      pairList.className = "ini-pairs";
      if (!sec.collapsed) {
        sec.pairs.forEach((pair, pi) => {
          const row = document.createElement("div");
          row.className = "ini-row";
          const keyInput = document.createElement("input");
          keyInput.type = "text";
          keyInput.className = "ini-key";
          keyInput.value = pair.key;
          keyInput.placeholder = "key";
          keyInput.spellcheck = false;
          keyInput.addEventListener("input", () => {
            this._sections[si].pairs[pi].key = keyInput.value;
            this._notify();
          });
          const eq = document.createElement("span");
          eq.className = "ini-eq";
          eq.textContent = "=";
          const valInput = document.createElement("input");
          valInput.type = "text";
          valInput.className = "ini-val";
          valInput.value = pair.value;
          valInput.placeholder = "value";
          valInput.spellcheck = false;
          valInput.addEventListener("input", () => {
            this._sections[si].pairs[pi].value = valInput.value;
            this._notify();
          });
          const delBtn = document.createElement("button");
          delBtn.type = "button";
          delBtn.className = "ini-del";
          delBtn.title = "Delete row";
          delBtn.textContent = "×";
          delBtn.addEventListener("click", () => {
            this._sections[si].pairs.splice(pi, 1);
            this._renderAndNotify();
          });
          row.append(keyInput, eq, valInput, delBtn);
          pairList.append(row);
        });
        const addRowBtn = document.createElement("button");
        addRowBtn.type = "button";
        addRowBtn.className = "ini-add-row";
        addRowBtn.textContent = "+ Add key";
        addRowBtn.addEventListener("click", () => {
          this._sections[si].pairs.push({ key: "", value: "" });
          this._renderAndNotify();
          const inputs = pairList.querySelectorAll(".ini-key");
          inputs[inputs.length - 1]?.focus();
        });
        pairList.append(addRowBtn);
      }
      group.append(pairList);
      body.append(group);
    });
    wrapper.append(body);
    const footer = document.createElement("div");
    footer.className = "ini-footer";
    const addSecBtn = document.createElement("button");
    addSecBtn.type = "button";
    addSecBtn.className = "ini-add-section";
    addSecBtn.textContent = "+ Add section";
    addSecBtn.addEventListener("click", () => {
      this._sections.push({ name: "NewSection", pairs: [], collapsed: false });
      this._renderAndNotify();
    });
    footer.append(addSecBtn);
    wrapper.append(footer);
    this._container.append(wrapper);
  }
  getValue() {
    return serializeIni(this._sections);
  }
  destroy() {
    this._container.innerHTML = "";
  }
};

// ../../docs/types/text/toml/toml.js
var NeedMore = class extends Error {
};
var isWs = (c) => c === " " || c === "	";
function skipWs(s, i) {
  while (isWs(s[i])) i++;
  return i;
}
function skipWsNL(s, i) {
  for (; ; ) {
    while (isWs(s[i]) || s[i] === "\n" || s[i] === "\r") i++;
    if (s[i] === "#") {
      while (i < s.length && s[i] !== "\n") i++;
      continue;
    }
    return i;
  }
}
var ESCAPES = { n: "\n", t: "	", r: "\r", '"': '"', "\\": "\\", b: "\b", f: "\f" };
function unescape2(s, i, end, out) {
  const c = s[i + 1];
  if (c === "u" || c === "U") {
    const len = c === "u" ? 4 : 8;
    const hex2 = s.slice(i + 2, i + 2 + len);
    out.push(String.fromCodePoint(parseInt(hex2, 16)));
    return i + 2 + len;
  }
  if (c in ESCAPES) {
    out.push(ESCAPES[c]);
    return i + 2;
  }
  if (c === "\n" || c === "\r" && s[i + 2] === "\n") {
    let j = i + 1;
    while (isWs(s[j]) || s[j] === "\n" || s[j] === "\r") j++;
    return j;
  }
  out.push(c);
  return i + 2;
}
function parseBasic(s, i) {
  const out = [];
  i++;
  while (i < s.length) {
    const c = s[i];
    if (c === '"') return { val: out.join(""), i: i + 1 };
    if (c === "\n") throw new NeedMore();
    if (c === "\\") {
      i = unescape2(s, i, s.length, out);
      continue;
    }
    out.push(c);
    i++;
  }
  throw new NeedMore();
}
function parseLiteral(s, i) {
  i++;
  const start = i;
  while (i < s.length) {
    if (s[i] === "'") return { val: s.slice(start, i), i: i + 1 };
    if (s[i] === "\n") throw new NeedMore();
    i++;
  }
  throw new NeedMore();
}
function parseMLBasic(s, i) {
  i += 3;
  if (s[i] === "\n") i++;
  else if (s[i] === "\r" && s[i + 1] === "\n") i += 2;
  const out = [];
  while (i < s.length) {
    if (s.startsWith('"""', i)) return { val: out.join(""), i: i + 3 };
    if (s[i] === "\\") {
      i = unescape2(s, i, s.length, out);
      continue;
    }
    out.push(s[i]);
    i++;
  }
  throw new NeedMore();
}
function parseMLLiteral(s, i) {
  i += 3;
  if (s[i] === "\n") i++;
  else if (s[i] === "\r" && s[i + 1] === "\n") i += 2;
  const start = i;
  while (i < s.length) {
    if (s.startsWith("'''", i)) return { val: s.slice(start, i), i: i + 3 };
    i++;
  }
  throw new NeedMore();
}
var DT_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;
var TIME_RE = /^\d{2}:\d{2}:\d{2}(\.\d+)?$/;
function parseScalarToken(tok) {
  if (tok === "true") return true;
  if (tok === "false") return false;
  if (tok === "inf" || tok === "+inf") return Infinity;
  if (tok === "-inf") return -Infinity;
  if (tok === "nan" || tok === "+nan" || tok === "-nan") return NaN;
  if (DT_RE.test(tok)) {
    const d = new Date(tok.replace(" ", "T"));
    return isNaN(+d) ? tok : d;
  }
  if (TIME_RE.test(tok)) return tok;
  const u = tok.replace(/_/g, "");
  if (/^[+-]?0x[0-9a-fA-F]+$/.test(u)) return parseInt(u, 16);
  if (/^[+-]?0o[0-7]+$/.test(u)) return parseInt(u.replace("0o", ""), 8);
  if (/^[+-]?0b[01]+$/.test(u)) return parseInt(u.replace("0b", ""), 2);
  if (/^[+-]?\d+$/.test(u)) return parseInt(u, 10);
  if (/^[+-]?(\d+(\.\d+)?([eE][+-]?\d+)?|\.\d+)$/.test(u)) return parseFloat(u);
  return tok;
}
function parseScalar(s, i) {
  const start = i;
  while (i < s.length && !",]}#\n\r".includes(s[i])) i++;
  const raw = s.slice(start, i).trim();
  if (raw === "") throw new NeedMore();
  return { val: parseScalarToken(raw), i };
}
function parseArray(s, i) {
  i++;
  const arr = [];
  for (; ; ) {
    i = skipWsNL(s, i);
    if (s[i] === void 0) throw new NeedMore();
    if (s[i] === "]") return { val: arr, i: i + 1 };
    const r = parseValue(s, i);
    arr.push(r.val);
    i = skipWsNL(s, r.i);
    if (s[i] === ",") i++;
    else if (s[i] === "]") return { val: arr, i: i + 1 };
    else if (s[i] === void 0) throw new NeedMore();
  }
}
function parseInlineTable(s, i) {
  i++;
  const obj = {};
  i = skipWs(s, i);
  if (s[i] === "}") return { val: obj, i: i + 1 };
  for (; ; ) {
    i = skipWs(s, i);
    const k = parseKey(s, i);
    i = k.i;
    i = skipWs(s, i);
    if (s[i] !== "=") throw new Error("expected = in inline table");
    const r = parseValue(s, i + 1);
    assignPath(obj, k.path, r.val);
    i = skipWs(s, r.i);
    if (s[i] === ",") {
      i++;
      continue;
    }
    if (s[i] === "}") return { val: obj, i: i + 1 };
    if (s[i] === void 0) throw new NeedMore();
    throw new Error("unexpected char in inline table: " + s[i]);
  }
}
function parseValue(s, i) {
  i = skipWs(s, i);
  const c = s[i];
  if (c === void 0 || c === "\n" || c === "\r" || c === "#") throw new NeedMore();
  if (c === '"') return s.startsWith('"""', i) ? parseMLBasic(s, i) : parseBasic(s, i);
  if (c === "'") return s.startsWith("'''", i) ? parseMLLiteral(s, i) : parseLiteral(s, i);
  if (c === "[") return parseArray(s, i);
  if (c === "{") return parseInlineTable(s, i);
  return parseScalar(s, i);
}
function parseKey(s, i) {
  const path = [];
  for (; ; ) {
    i = skipWs(s, i);
    if (s[i] === '"') {
      const r = parseBasic(s, i);
      path.push(r.val);
      i = r.i;
    } else if (s[i] === "'") {
      const r = parseLiteral(s, i);
      path.push(r.val);
      i = r.i;
    } else {
      const start = i;
      while (i < s.length && /[A-Za-z0-9_-]/.test(s[i])) i++;
      path.push(s.slice(start, i));
    }
    i = skipWs(s, i);
    if (s[i] === ".") {
      i++;
      continue;
    }
    return { path, i };
  }
}
function parseKeyPath(str) {
  return parseKey(str, 0).path;
}
function assignPath(obj, path, val) {
  let o = obj;
  for (let k = 0; k < path.length - 1; k++) {
    if (typeof o[path[k]] !== "object" || o[path[k]] === null) o[path[k]] = {};
    o = o[path[k]];
  }
  o[path[path.length - 1]] = val;
}
function enterTable(root, path, isArray) {
  let o = root;
  for (let k = 0; k < path.length - 1; k++) {
    if (o[path[k]] === void 0) o[path[k]] = {};
    o = Array.isArray(o[path[k]]) ? o[path[k]][o[path[k]].length - 1] : o[path[k]];
  }
  const last = path[path.length - 1];
  if (isArray) {
    if (!Array.isArray(o[last])) o[last] = [];
    const t = {};
    o[last].push(t);
    return t;
  }
  if (o[last] === void 0) o[last] = {};
  return o[last];
}
function parseTOML(src) {
  const root = {};
  let ctx = root;
  const lines = (src || "").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed[0] === "#") continue;
    if (trimmed[0] === "[") {
      const isArray = trimmed.startsWith("[[");
      const close = trimmed.lastIndexOf(isArray ? "]]" : "]");
      ctx = enterTable(root, parseKeyPath(trimmed.slice(isArray ? 2 : 1, close)), isArray);
      continue;
    }
    let buf = lines[i];
    const eq = buf.indexOf("=");
    if (eq < 0) throw new Error("invalid line " + (i + 1) + ": " + trimmed);
    const key2 = parseKeyPath(buf.slice(0, eq));
    let valueStr = buf.slice(eq + 1);
    for (; ; ) {
      try {
        const r = parseValue(valueStr, 0);
        assignPath(ctx, key2, r.val);
        break;
      } catch (e) {
        if (e instanceof NeedMore && i + 1 < lines.length) {
          i++;
          valueStr += "\n" + lines[i];
          continue;
        }
        throw new Error("parse error near line " + (i + 1) + ": " + (e.message || e));
      }
    }
  }
  return root;
}

// ../../docs/core/form-fields.js
function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);
}
function isArrayOfObjects(v) {
  return Array.isArray(v) && v.length > 0 && v.some((item) => isPlainObject(item));
}
function isScalarArray(v) {
  return Array.isArray(v) && v.every((item) => !isPlainObject(item) && !Array.isArray(item));
}
var ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
function looksLikeIsoDatetime(s) {
  return typeof s === "string" && ISO_DATE_RE.test(s);
}
function coerceScalarList(raw) {
  return raw.split(",").map((s) => s.trim()).filter((s) => s !== "").map((s) => {
    if (s === "true") return true;
    if (s === "false") return false;
    const n = Number(s);
    return s !== "" && !isNaN(n) ? n : s;
  });
}
function renderField(container, key2, value, onChange, opts = {}) {
  const sep = opts.sep || "=";
  const row = document.createElement("div");
  row.className = "ini-row toml-row";
  const keyEl = document.createElement("span");
  keyEl.className = "ini-key toml-key";
  keyEl.textContent = key2;
  const eq = document.createElement("span");
  eq.className = "ini-eq";
  eq.textContent = sep;
  if (typeof value === "boolean") {
    const label = document.createElement("label");
    label.className = "toml-bool-label";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = value;
    input.className = "toml-bool";
    input.addEventListener("change", () => onChange(key2, input.checked));
    label.append(input);
    row.append(keyEl, eq, label);
  } else if (typeof value === "number") {
    const input = document.createElement("input");
    input.type = "number";
    input.step = Number.isInteger(value) ? "1" : "any";
    input.value = String(value);
    input.className = "ini-val toml-num";
    input.spellcheck = false;
    input.addEventListener("input", () => {
      const n = input.step === "1" ? parseInt(input.value, 10) : parseFloat(input.value);
      if (!isNaN(n)) onChange(key2, n);
    });
    row.append(keyEl, eq, input);
  } else if ((value === null || value === void 0) && opts.allowSetNull) {
    const badge = document.createElement("span");
    badge.className = "toml-readonly-badge";
    badge.textContent = "null";
    const setBtn = document.createElement("button");
    setBtn.type = "button";
    setBtn.className = "ini-add-row";
    setBtn.style.marginLeft = "8px";
    setBtn.textContent = "set value";
    setBtn.addEventListener("click", () => onChange(key2, ""));
    row.append(keyEl, eq, badge, setBtn);
  } else if (value instanceof Date && opts.dateObjects) {
    const code = document.createElement("code");
    code.className = "toml-readonly";
    code.textContent = value.toISOString();
    const badge = document.createElement("span");
    badge.className = "toml-readonly-badge";
    badge.textContent = "read-only (datetime)";
    row.append(keyEl, eq, code, badge);
  } else if (opts.isoDates && looksLikeIsoDatetime(value)) {
    const input = document.createElement("input");
    input.type = "datetime-local";
    input.className = "ini-val toml-str";
    input.value = value.slice(0, 16);
    input.spellcheck = false;
    input.addEventListener("input", () => {
      const v = input.value;
      onChange(key2, v ? v + ":00Z" : value);
    });
    row.append(keyEl, eq, input);
  } else if (typeof value === "string") {
    if (value.includes("\n")) {
      const input = document.createElement("textarea");
      input.className = "ini-val toml-textarea";
      input.value = value;
      input.rows = Math.min(6, value.split("\n").length + 1);
      input.spellcheck = false;
      input.addEventListener("input", () => onChange(key2, input.value));
      row.classList.add("toml-row-multiline");
      row.append(keyEl, eq, input);
    } else {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "ini-val toml-str";
      input.value = value;
      input.spellcheck = false;
      input.addEventListener("input", () => onChange(key2, input.value));
      row.append(keyEl, eq, input);
    }
  } else if (isScalarArray(value)) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "ini-val toml-arr";
    input.value = value.map((v) => typeof v === "string" ? v : String(v)).join(", ");
    input.spellcheck = false;
    const note = document.createElement("span");
    note.className = "toml-arr-note";
    note.textContent = "(comma-separated)";
    input.addEventListener("input", () => onChange(key2, coerceScalarList(input.value)));
    row.append(keyEl, eq, input, note);
  } else if (isArrayOfObjects(value) || isPlainObject(value)) {
    const code = document.createElement("code");
    code.className = "toml-readonly";
    try {
      const preview = JSON.stringify(value);
      code.textContent = preview.length > 80 ? preview.slice(0, 77) + "..." : preview;
    } catch {
      code.textContent = String(value);
    }
    const badge = document.createElement("span");
    badge.className = "toml-readonly-badge";
    badge.textContent = "complex value — edit in source";
    row.append(keyEl, eq, code, badge);
  } else {
    const code = document.createElement("code");
    code.className = "toml-readonly";
    try {
      code.textContent = value === null || value === void 0 ? "null" : JSON.stringify(value);
    } catch {
      code.textContent = String(value);
    }
    const badge = document.createElement("span");
    badge.className = "toml-readonly-badge";
    badge.textContent = "read-only";
    row.append(keyEl, eq, code, badge);
  }
  container.append(row);
  return row;
}
function renderSection(body, title, pairs, collapsed, onToggle, onFieldChange, opts = {}) {
  const group = document.createElement("div");
  group.className = "ini-section toml-section" + (collapsed ? " ini-collapsed" : "");
  const header = document.createElement("div");
  header.className = "ini-section-header";
  header.title = "Click to collapse/expand";
  const arrow = document.createElement("span");
  arrow.className = "ini-arrow";
  arrow.textContent = collapsed ? "▶" : "▼";
  const titleEl = document.createElement("span");
  titleEl.className = "ini-section-title";
  titleEl.textContent = title;
  header.append(arrow, titleEl);
  header.addEventListener("click", () => onToggle());
  group.append(header);
  const pairList = document.createElement("div");
  pairList.className = "ini-pairs";
  if (!collapsed) {
    for (const [k, v] of Object.entries(pairs)) renderField(pairList, k, v, onFieldChange, opts);
  }
  group.append(pairList);
  body.append(group);
  return group;
}

// ../../docs/types/text/toml/form-editor.js
var FIELD_OPTS = { sep: "=", dateObjects: true };
function tomlValueString(val) {
  if (val === null || val === void 0) return "null";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number") {
    if (!isFinite(val)) return val > 0 ? "inf" : "-inf";
    if (isNaN(val)) return "nan";
    return String(val);
  }
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") {
    if (val.includes("\n")) return '"""\n' + val + '\n"""';
    return '"' + val.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
  }
  if (Array.isArray(val)) {
    if (val.every((v) => typeof v !== "object" || v instanceof Date)) {
      return "[" + val.map(tomlValueString).join(", ") + "]";
    }
    return null;
  }
  return null;
}
function serializeToml(data, leadingComment) {
  const parts = [];
  if (leadingComment) parts.push(leadingComment);
  const globals = data.__globals__ || {};
  for (const [k, v] of Object.entries(globals)) {
    const s = tomlValueString(v);
    if (s !== null) parts.push(k + " = " + s);
  }
  const sections = data.__sections__ || {};
  for (const [name, pairs] of Object.entries(sections)) {
    if (parts.length) parts.push("");
    parts.push("[" + name + "]");
    for (const [k, v] of Object.entries(pairs)) {
      const s = tomlValueString(v);
      if (s !== null) parts.push(k + " = " + s);
    }
  }
  const aot = data.__aot__ || {};
  for (const [name, items] of Object.entries(aot)) {
    for (const item of items) {
      parts.push("");
      parts.push("[[" + name + "]]");
      for (const [k, v] of Object.entries(item)) {
        const s = tomlValueString(v);
        if (s !== null) parts.push(k + " = " + s);
      }
    }
  }
  return parts.join("\n");
}
function classify(parsed) {
  const globals = {};
  const sections = {};
  const aot = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (isPlainObject(v)) {
      sections[k] = v;
    } else if (isArrayOfObjects(v)) {
      aot[k] = v;
    } else {
      globals[k] = v;
    }
  }
  return { globals, sections, aot };
}
var TomlFormEditor = class {
  constructor(container) {
    this._container = container;
    this._data = { __globals__: {}, __sections__: {}, __aot__: {} };
    this._collapsed = {};
    this._leadingComment = "";
    this._render();
  }
  setValue(text) {
    const lines = (text || "").split("\n");
    const commentLines = [];
    for (const line of lines) {
      const t = line.trim();
      if (t === "" || t.startsWith("#")) {
        commentLines.push(line);
      } else break;
    }
    this._leadingComment = commentLines.some((l) => l.trim().startsWith("#")) ? commentLines.join("\n").trimEnd() : "";
    let parsed;
    try {
      parsed = parseTOML(text || "");
    } catch (e) {
      parsed = {};
    }
    const { globals, sections, aot } = classify(parsed);
    this._data = { __globals__: globals, __sections__: sections, __aot__: aot };
    this._render();
  }
  getValue() {
    return serializeToml(this._data, this._leadingComment);
  }
  destroy() {
    this._container.innerHTML = "";
  }
  _render() {
    this._container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "ini-form toml-form";
    const body = document.createElement("div");
    body.className = "ini-body";
    const globals = this._data.__globals__;
    if (Object.keys(globals).length > 0) {
      const colKey = "__globals__";
      const collapsed = !!this._collapsed[colKey];
      renderSection(
        body,
        "(global)",
        globals,
        collapsed,
        () => {
          this._collapsed[colKey] = !collapsed;
          this._render();
        },
        (k, v) => {
          this._data.__globals__[k] = v;
        },
        FIELD_OPTS
      );
    }
    const sections = this._data.__sections__;
    for (const [name, pairs] of Object.entries(sections)) {
      const colKey = "section:" + name;
      const collapsed = !!this._collapsed[colKey];
      renderSection(
        body,
        "[" + name + "]",
        pairs,
        collapsed,
        () => {
          this._collapsed[colKey] = !collapsed;
          this._render();
        },
        (k, v) => {
          this._data.__sections__[name][k] = v;
        },
        FIELD_OPTS
      );
    }
    const aot = this._data.__aot__;
    for (const [name, items] of Object.entries(aot)) {
      items.forEach((item, idx) => {
        const colKey = "aot:" + name + ":" + idx;
        const collapsed = !!this._collapsed[colKey];
        renderSection(
          body,
          "[[" + name + "]] #" + (idx + 1),
          item,
          collapsed,
          () => {
            this._collapsed[colKey] = !collapsed;
            this._render();
          },
          (k, v) => {
            this._data.__aot__[name][idx][k] = v;
          },
          FIELD_OPTS
        );
      });
    }
    wrapper.append(body);
    this._container.append(wrapper);
  }
};

// ../../docs/types/text/yaml/form-editor.js
import { loadGlobal as loadGlobal2, vendor as vendor3 } from "./script-loader.js";
var FIELD_OPTS2 = { sep: ":", isoDates: true, allowSetNull: true };
var _jsyaml = null;
async function getJsYaml() {
  if (_jsyaml) return _jsyaml;
  _jsyaml = await loadGlobal2(vendor3("js-yaml/js-yaml.min.js"), "jsyaml");
  return _jsyaml;
}
function classify2(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { generals: {}, sections: [], keyOrder: [] };
  }
  const generals = {};
  const sections = [];
  const keyOrder = Object.keys(parsed);
  for (const k of keyOrder) {
    const v = parsed[k];
    if (isPlainObject(v)) {
      sections.push({ name: k, data: v });
    } else {
      generals[k] = v;
    }
  }
  return { generals, sections, keyOrder };
}
function serializeYaml(state20, jsyaml) {
  const out = {};
  for (const k of state20.keyOrder) {
    const sec = state20.sections.find((s) => s.name === k);
    if (sec) {
      out[k] = sec.data;
    } else if (Object.prototype.hasOwnProperty.call(state20.generals, k)) {
      out[k] = state20.generals[k];
    }
  }
  for (const k of Object.keys(state20.generals)) {
    if (!Object.prototype.hasOwnProperty.call(out, k)) out[k] = state20.generals[k];
  }
  for (const sec of state20.sections) {
    if (!Object.prototype.hasOwnProperty.call(out, sec.name)) out[sec.name] = sec.data;
  }
  try {
    return jsyaml.dump(out, { indent: 2, lineWidth: -1 });
  } catch {
    return "";
  }
}
var YamlFormEditor = class {
  constructor(container) {
    this._container = container;
    this._state = { generals: {}, sections: [], keyOrder: [] };
    this._collapsed = {};
    this._leadingComment = "";
    this._jsyaml = null;
    this._renderLoading();
  }
  async setValue(text) {
    const lines = (text || "").split("\n");
    const commentLines = [];
    for (const line of lines) {
      const t = line.trim();
      if (t === "" || t.startsWith("#")) {
        commentLines.push(line);
      } else break;
    }
    this._leadingComment = commentLines.some((l) => l.trim().startsWith("#")) ? commentLines.join("\n").trimEnd() : "";
    let jsyaml;
    try {
      jsyaml = await getJsYaml();
    } catch (e) {
      this._renderError("Could not load js-yaml: " + (e.message || e));
      return;
    }
    this._jsyaml = jsyaml;
    let parsed;
    try {
      parsed = jsyaml.load(text || "");
    } catch (e) {
      this._renderError("YAML parse error: " + (e.message || e));
      return;
    }
    this._state = classify2(parsed);
    this._render();
  }
  getValue() {
    if (!this._jsyaml) return "";
    const body = serializeYaml(this._state, this._jsyaml);
    return this._leadingComment ? this._leadingComment + "\n" + body : body;
  }
  destroy() {
    this._container.innerHTML = "";
  }
  _renderLoading() {
    this._container.innerHTML = "";
    const msg = document.createElement("div");
    msg.className = "ini-form toml-form";
    msg.style.padding = "16px";
    msg.textContent = "Loading…";
    this._container.append(msg);
  }
  _renderError(msg) {
    this._container.innerHTML = "";
    const el = document.createElement("div");
    el.className = "ini-form toml-form";
    el.style.cssText = "padding:16px;color:var(--color-danger,#f85149)";
    el.textContent = msg;
    this._container.append(el);
  }
  _render() {
    this._container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "ini-form toml-form";
    const body = document.createElement("div");
    body.className = "ini-body";
    const generals = this._state.generals;
    if (Object.keys(generals).length > 0) {
      const colKey = "__general__";
      const collapsed = !!this._collapsed[colKey];
      renderSection(
        body,
        "General",
        generals,
        collapsed,
        () => {
          this._collapsed[colKey] = !collapsed;
          this._render();
        },
        (k, v) => {
          this._state.generals[k] = v;
        },
        FIELD_OPTS2
      );
    }
    for (const sec of this._state.sections) {
      const colKey = "section:" + sec.name;
      const collapsed = !!this._collapsed[colKey];
      renderSection(
        body,
        sec.name,
        sec.data,
        collapsed,
        () => {
          this._collapsed[colKey] = !collapsed;
          this._render();
        },
        (k, v) => {
          sec.data[k] = v;
        },
        FIELD_OPTS2
      );
    }
    if (Object.keys(generals).length === 0 && this._state.sections.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "padding:16px;opacity:0.6";
      empty.textContent = "Empty or non-mapping YAML document — nothing to edit as a form.";
      body.append(empty);
    }
    wrapper.append(body);
    this._container.append(wrapper);
  }
};

// ../../docs/core/rawpane-forms.js
function editTrack(newText) {
  state7.intake = { ...state7.intake, text: newText };
  state7.downloadedSinceEdit = false;
}
var FORMS = {
  env: { btnId: "envFormBtn", hostId: "envFormHost", create: (host, text) => new EnvFormEditor(host, text, editTrack) },
  ini: { btnId: "iniFormBtn", hostId: "iniFormHost", create: (host, text) => new IniFormEditor(host, text, editTrack) },
  toml: { btnId: "tomlFormBtn", hostId: "tomlFormHost", create: (host, text) => {
    const e = new TomlFormEditor(host);
    e.setValue(text);
    return e;
  } },
  yaml: { btnId: "yamlFormBtn", hostId: "yamlFormHost", create: (host, text) => {
    const e = new YamlFormEditor(host);
    e.setValue(text);
    return e;
  } }
};
var instances = { env: null, ini: null, toml: null, yaml: null };
var priorMode = null;
var priorTab = null;
function setFormMode(kind, on) {
  const cfg = FORMS[kind];
  const editorEl = document.getElementById("editor");
  const btn = document.getElementById(cfg.btnId);
  if (on) {
    if (state7.mode !== "raw" || state7.tab !== "raw") {
      priorMode = state7.mode;
      priorTab = state7.tab;
      state7.mode = "raw";
      state7.tab = "raw";
      applyLayout();
    }
    const text = state7.rawview ? state7.rawview.getValue() : state7.intake?.text || "";
    state7.rawview?.updateOptions?.({ readOnly: true });
    let host = document.getElementById(cfg.hostId);
    if (!host) {
      host = document.createElement("div");
      host.id = cfg.hostId;
      host.className = "editor-host";
      editorEl?.parentNode?.insertBefore(host, editorEl);
    }
    host.hidden = false;
    if (editorEl) editorEl.style.display = "none";
    instances[kind] = cfg.create(host, text);
  } else {
    if (instances[kind]) {
      const text = instances[kind].getValue();
      instances[kind].destroy();
      instances[kind] = null;
      if (state7.rawview) {
        state7.rawview.setValue(text);
        state7.rawview.updateOptions?.({ readOnly: false });
      }
      state7.intake = { ...state7.intake, text };
    }
    const host = document.getElementById(cfg.hostId);
    if (host) host.hidden = true;
    if (editorEl) editorEl.style.display = "";
    if (priorMode != null) {
      state7.mode = priorMode;
      state7.tab = priorTab;
      priorMode = priorTab = null;
      applyLayout();
    }
  }
  if (btn) {
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", String(on));
  }
}
function wireFormBtn(kind) {
  const btn = document.getElementById(FORMS[kind].btnId);
  if (!btn || btn.dataset.wired) return;
  btn.dataset.wired = "1";
  btn.addEventListener("click", () => setFormMode(kind, !btn.classList.contains("active")));
}
function getActiveFormValue() {
  for (const kind of ["env", "ini", "toml", "yaml"]) {
    if (instances[kind]) return instances[kind].getValue();
  }
  return null;
}
var setEnvFormMode = (on) => setFormMode("env", on);
var setIniFormMode = (on) => setFormMode("ini", on);
var setTomlFormMode = (on) => setFormMode("toml", on);
var setYamlFormMode = (on) => setFormMode("yaml", on);
var wireEnvFormBtn = () => wireFormBtn("env");
var wireIniFormBtn = () => wireFormBtn("ini");
var wireTomlFormBtn = () => wireFormBtn("toml");
var wireYamlFormBtn = () => wireFormBtn("yaml");

// ../../docs/core/rawpane-toolbars.js
import { state as state8, $ as $3, toast as toast4 } from "./state.js";
import { loadGlobal as loadGlobal3, vendor as vendor4 } from "./script-loader.js";

// ../../docs/core/text-utils.js
var TRIM_MODE_KEY = "fv:textutil:trimMode";
function getTrimMode() {
  try {
    return localStorage.getItem(TRIM_MODE_KEY) === "ws+lines" ? "ws+lines" : "ws";
  } catch {
    return "ws";
  }
}
function setTrimMode(mode) {
  try {
    localStorage.setItem(TRIM_MODE_KEY, mode);
  } catch {
  }
}
var TRIM_DIR = {
  trim: (s) => s.trim(),
  ltrim: (s) => s.replace(/^\s+/, ""),
  rtrim: (s) => s.replace(/\s+$/, "")
};
var LINE_TRANSFORMS = {
  sortAsc: (lines) => [...lines].sort((a, b) => a.localeCompare(b)),
  sortDesc: (lines) => [...lines].sort((a, b) => b.localeCompare(a)),
  dedup: (lines) => {
    const seen = /* @__PURE__ */ new Set();
    return lines.filter((l) => seen.has(l) ? false : (seen.add(l), true));
  }
};
function lineTransformFor(action, trimMode = getTrimMode()) {
  if (LINE_TRANSFORMS[action]) return LINE_TRANSFORMS[action];
  const dir = TRIM_DIR[action];
  if (!dir) return null;
  const dropBlank = trimMode === "ws+lines";
  return (lines) => {
    const out = lines.map(dir);
    return dropBlank ? out.filter((l) => l.trim() !== "") : out;
  };
}
function b64encode(text) {
  return btoa(unescape(encodeURIComponent(text)));
}
function b64decode(text) {
  return decodeURIComponent(escape(atob(text)));
}

// ../../docs/core/rawpane-toolbars.js
function setJsonToolsVisible(visible) {
  const el = $3("jsonTools");
  if (!el) return;
  el.hidden = !visible;
  syncHasToolsClass();
  if (!visible) {
    const indicator = $3("jsonValidIndicator");
    if (indicator) indicator.hidden = true;
  }
}
function wireJsonTools() {
  const el = $3("jsonTools");
  if (!el || el.dataset.wired) return;
  el.dataset.wired = "1";
  el.addEventListener("click", (e) => {
    const action = e.target.closest("[data-json-action]")?.dataset.jsonAction;
    if (!action) return;
    runJsonAction(action);
  });
}
function updateJsonValidation(valid, errorMsg) {
  const indicator = $3("jsonValidIndicator");
  if (!indicator) return;
  indicator.textContent = valid ? "✓ Valid" : "✗ " + (errorMsg || "Invalid JSON");
  indicator.className = "json-valid-indicator " + (valid ? "json-valid" : "json-invalid");
  indicator.hidden = false;
  clearTimeout(indicator._hideTimer);
  indicator._hideTimer = setTimeout(() => {
    indicator.hidden = true;
  }, 4e3);
}
function runJsonAction(action) {
  if (!state8.rawview) return;
  const text = state8.rawview.getValue();
  if (action === "format") {
    const formatted = state8.rawview.format?.();
    if (formatted && typeof formatted.then === "function") {
      formatted.catch(() => {
        try {
          state8.rawview.setValue(JSON.stringify(JSON.parse(text), null, 2));
        } catch (err) {
          toast4("Cannot format: " + (err.message || "invalid JSON"));
        }
      });
      return;
    }
    try {
      state8.rawview.setValue(JSON.stringify(JSON.parse(text), null, 2));
    } catch (err) {
      toast4("Cannot format: " + (err.message || "invalid JSON"));
    }
  } else if (action === "minify") {
    try {
      state8.rawview.setValue(JSON.stringify(JSON.parse(text)));
    } catch (err) {
      toast4("Cannot minify: " + (err.message || "invalid JSON"));
    }
  } else if (action === "validate") {
    try {
      JSON.parse(text);
      updateJsonValidation(true, null);
    } catch (err) {
      updateJsonValidation(false, err.message);
    }
  }
}
function setYamlToolsVisible(visible) {
  const el = $3("yamlTools");
  if (!el) return;
  el.hidden = !visible;
  syncHasToolsClass();
  if (!visible) {
    const indicator = $3("yamlValidIndicator");
    if (indicator) indicator.hidden = true;
  }
}
function wireYamlTools() {
  const el = $3("yamlTools");
  if (!el || el.dataset.wired) return;
  el.dataset.wired = "1";
  $3("yamlFormatBtn")?.addEventListener("click", () => runYamlAction("format"));
  $3("yamlValidateBtn")?.addEventListener("click", () => runYamlAction("validate"));
}
function updateYamlValidation(valid, message) {
  const indicator = $3("yamlValidIndicator");
  if (!indicator) return;
  indicator.textContent = valid ? "✓ Valid YAML" : "✗ " + (message || "Invalid YAML");
  indicator.className = "json-valid-indicator " + (valid ? "json-valid" : "json-invalid");
  indicator.hidden = false;
  clearTimeout(indicator._hideTimer);
  indicator._hideTimer = setTimeout(() => {
    indicator.hidden = true;
  }, 4e3);
}
async function runYamlAction(action) {
  if (!state8.rawview) return;
  const text = state8.rawview.getValue();
  let jsyaml;
  try {
    jsyaml = await loadGlobal3(vendor4("js-yaml/js-yaml.min.js"), "jsyaml");
  } catch (err) {
    toast4("Could not load js-yaml: " + (err.message || err));
    return;
  }
  if (action === "format") {
    try {
      const parsed = jsyaml.load(text);
      state8.rawview.setValue(jsyaml.dump(parsed, { indent: 2 }));
    } catch (err) {
      toast4("Cannot format: " + (err.message || "invalid YAML"));
    }
  } else if (action === "validate") {
    try {
      jsyaml.load(text);
      updateYamlValidation(true, null);
    } catch (err) {
      updateYamlValidation(false, (err.message || "invalid YAML").slice(0, 80));
    }
  }
}
function setXmlToolsVisible(visible) {
  const el = $3("xmlTools");
  if (!el) return;
  el.hidden = !visible;
  syncHasToolsClass();
  if (!visible) {
    const indicator = $3("xmlValidIndicator");
    if (indicator) indicator.hidden = true;
  }
}
function wireXmlTools() {
  const el = $3("xmlTools");
  if (!el || el.dataset.wired) return;
  el.dataset.wired = "1";
  $3("xmlFormatBtn")?.addEventListener("click", () => runXmlAction("format"));
  $3("xmlValidateBtn")?.addEventListener("click", () => runXmlAction("validate"));
}
function updateXmlValidation(valid, message) {
  const indicator = $3("xmlValidIndicator");
  if (!indicator) return;
  indicator.textContent = valid ? "✓ Valid XML" : "✗ " + (message || "Invalid XML");
  indicator.className = "json-valid-indicator " + (valid ? "json-valid" : "json-invalid");
  indicator.hidden = false;
  clearTimeout(indicator._hideTimer);
  indicator._hideTimer = setTimeout(() => {
    indicator.hidden = true;
  }, 4e3);
}
function formatXml(text) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/xml");
  const err = doc.querySelector("parseerror, parsererror");
  if (err) throw new Error(err.textContent.split("\n")[0].trim());
  const raw = new XMLSerializer().serializeToString(doc);
  let indent = 0;
  return raw.replace(/></g, ">\n<").split("\n").map((line) => {
    if (line.match(/^<\/\w/)) indent--;
    const result = "  ".repeat(Math.max(0, indent)) + line.trim();
    if (line.match(/^<\w[^>]*[^/]>$/) && !line.match(/<.*<.*>/)) indent++;
    return result;
  }).join("\n");
}
function runXmlAction(action) {
  if (!state8.rawview) return;
  const text = state8.rawview.getValue();
  if (action === "format") {
    try {
      state8.rawview.setValue(formatXml(text));
    } catch (err) {
      toast4("Cannot format: " + (err.message || "invalid XML"));
    }
  } else if (action === "validate") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/xml");
      const err = doc.querySelector("parseerror, parsererror");
      if (err) throw new Error(err.textContent.split("\n")[0].trim());
      updateXmlValidation(true, null);
    } catch (err) {
      updateXmlValidation(false, (err.message || "Invalid XML").slice(0, 80));
    }
  }
}
function setTomlToolsVisible(visible) {
  const el = $3("tomlTools");
  if (!el) return;
  el.hidden = !visible;
  syncHasToolsClass();
  if (!visible) {
    const indicator = $3("tomlValidIndicator");
    if (indicator) indicator.hidden = true;
  }
}
function wireTomlTools() {
  const el = $3("tomlTools");
  if (!el || el.dataset.wired) return;
  el.dataset.wired = "1";
  $3("tomlValidateBtn")?.addEventListener("click", async () => {
    if (!state8.rawview) return;
    try {
      const { parseTOML: parseTOML2 } = await import("../types/text/toml/toml.js");
      parseTOML2(state8.rawview.getValue());
      updateTomlValidation(true, "");
    } catch (e) {
      updateTomlValidation(false, (e.message || "Invalid TOML").slice(0, 80));
    }
  });
}
function updateTomlValidation(valid, message) {
  const indicator = $3("tomlValidIndicator");
  if (!indicator) return;
  indicator.textContent = valid ? "✓ Valid TOML" : "✗ " + (message || "Invalid TOML");
  indicator.className = "json-valid-indicator " + (valid ? "json-valid" : "json-invalid");
  indicator.hidden = false;
  clearTimeout(indicator._hideTimer);
  indicator._hideTimer = setTimeout(() => {
    indicator.hidden = true;
  }, 4e3);
}
function setTextUtilsVisible(visible) {
  const el = $3("textUtils");
  if (!el) return;
  el.hidden = !visible;
  $3("rawPane")?.classList.toggle("has-textutils", visible);
}
function wireTextUtils() {
  const el = $3("textUtils");
  if (!el || el.dataset.wired) return;
  el.dataset.wired = "1";
  el.addEventListener("click", (e) => {
    if (e.target.closest("#trimModeBtn")) {
      toggleTrimModeMenu($3("trimModeBtn"));
      return;
    }
    const btn = e.target.closest("[data-textutil]");
    if (!btn) return;
    applyTextUtil(btn.dataset.textutil);
  });
  updateTrimModeLabel();
}
function applyTrimMode(mode) {
  setTrimMode(mode);
  updateTrimModeLabel();
}
function updateTrimModeLabel() {
  const btn = $3("trimModeBtn");
  if (!btn) return;
  const mode = getTrimMode();
  btn.textContent = (mode === "ws+lines" ? "Whitespace + lines" : "Whitespace") + " ▾";
  btn.dataset.mode = mode;
}
var _trimMenu = null;
function closeTrimMenu() {
  if (_trimMenu) {
    _trimMenu.remove();
    _trimMenu = null;
  }
  document.removeEventListener("mousedown", onTrimMenuOutside, true);
}
function onTrimMenuOutside(e) {
  if (_trimMenu && !_trimMenu.contains(e.target) && e.target.id !== "trimModeBtn") closeTrimMenu();
}
function toggleTrimModeMenu(btn) {
  if (!btn) return;
  if (_trimMenu) {
    closeTrimMenu();
    return;
  }
  const menu = document.createElement("div");
  menu.className = "tu-mode-menu";
  for (const [mode, label] of [["ws", "Trim whitespace"], ["ws+lines", "Trim whitespace + blank lines"]]) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "tu-mode-item" + (getTrimMode() === mode ? " active" : "");
    item.textContent = label;
    item.addEventListener("click", () => {
      applyTrimMode(mode);
      closeTrimMenu();
    });
    menu.appendChild(item);
  }
  document.body.appendChild(menu);
  const r = btn.getBoundingClientRect();
  menu.style.left = Math.round(r.left) + "px";
  menu.style.top = Math.round(r.bottom + 2) + "px";
  _trimMenu = menu;
  setTimeout(() => document.addEventListener("mousedown", onTrimMenuOutside, true), 0);
}
function applyTextUtil(action) {
  if (!state8.rawview) return;
  const text = state8.rawview.getValue();
  let result;
  const lineFn = lineTransformFor(action);
  if (lineFn) {
    const fn = (t) => lineFn(t.split("\n")).join("\n");
    const range = state8.rawview.selectionRange?.();
    if (range && !range.isEmpty?.()) {
      state8.rawview.transformSelection(fn, { expandToLines: true, selectInserted: true });
    } else {
      state8.rawview.transformAll(fn);
    }
    return;
  }
  if (action === "b64encode") {
    const sel = state8.rawview.selectionText?.();
    const target = sel && sel.trim() ? sel : text;
    try {
      const encoded = b64encode(target);
      if (sel && sel.trim()) {
        state8.rawview.replaceSelection(encoded);
        return;
      }
      result = encoded;
    } catch (e) {
      toast4("Base64 encode failed: " + e.message);
      return;
    }
  } else if (action === "b64decode") {
    const sel = state8.rawview.selectionText?.();
    const target = (sel && sel.trim() ? sel : text).trim();
    try {
      const decoded = b64decode(target);
      if (sel && sel.trim()) {
        state8.rawview.replaceSelection(decoded);
        return;
      }
      result = decoded;
    } catch (e) {
      toast4("Not valid Base64");
      return;
    }
  }
  if (result !== void 0 && result !== text) {
    state8.rawview.transformAll(() => result);
  }
}

// ../../docs/core/rawpane-markdown.js
import { state as state9, $ as $4, toast as toast5 } from "./state.js";
var tablePicker = null;
var markdownContextMenu = null;
function ensureTaskListButton() {
  const bar = document.getElementById("markdownTools");
  if (!bar || bar.querySelector('[data-md-action="task-list"]')) return;
  const ordered = bar.querySelector('[data-md-action="ordered-list"]');
  if (!ordered) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "md-btn";
  btn.dataset.mdAction = "task-list";
  btn.title = "Task list (checkboxes)";
  btn.textContent = "☑";
  ordered.insertAdjacentElement("afterend", btn);
}
ensureTaskListButton();
if (typeof document !== "undefined" && document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ensureTaskListButton, { once: true });
}
function markdownTaskList(text) {
  return String(text || "").split("\n").map((line) => line.trim() ? "- [ ] " + line : line).join("\n");
}
function closeTablePicker() {
  if (tablePicker) {
    tablePicker.remove();
    tablePicker = null;
  }
}
function showTablePicker(anchorEl) {
  closeTablePicker();
  const picker = document.createElement("div");
  picker.className = "md-table-picker";
  const ROWS = 5, COLS = 5;
  const cells = [];
  const label = document.createElement("div");
  label.className = "md-table-picker-label";
  label.textContent = "1×1";
  picker.append(label);
  const grid = document.createElement("div");
  grid.className = "md-table-picker-grid";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement("div");
      cell.className = "md-table-picker-cell";
      cell.dataset.r = r;
      cell.dataset.c = c;
      grid.append(cell);
      cells.push(cell);
    }
  }
  picker.append(grid);
  document.body.append(picker);
  tablePicker = picker;
  function highlight(rows, cols) {
    label.textContent = `${cols}×${rows}`;
    cells.forEach((cell) => {
      const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
      cell.classList.toggle("active", r < rows && c < cols);
    });
  }
  grid.addEventListener("mousemove", (e) => {
    const cell = e.target.closest(".md-table-picker-cell");
    if (!cell) return;
    highlight(Number(cell.dataset.r) + 1, Number(cell.dataset.c) + 1);
  });
  grid.addEventListener("mouseleave", () => highlight(0, 0));
  grid.addEventListener("click", (e) => {
    const cell = e.target.closest(".md-table-picker-cell");
    if (!cell) return;
    const rows = Number(cell.dataset.r) + 1, cols = Number(cell.dataset.c) + 1;
    closeTablePicker();
    if (isWysiwygActive()) {
      insertWysiwygMarkdown(markdownTable(rows, cols));
    } else {
      state9.rawview.replaceSelection(markdownTable(rows, cols), { source: "markdown-table", selectInserted: true });
    }
  });
  const rect = anchorEl.getBoundingClientRect();
  picker.style.left = Math.min(rect.left, window.innerWidth - 180) + "px";
  picker.style.top = rect.bottom + 4 + "px";
}
var headingMenu = null;
function closeHeadingMenu() {
  headingMenu?.remove();
  headingMenu = null;
  document.removeEventListener("mousedown", onHeadingOutside, true);
}
function onHeadingOutside(e) {
  if (headingMenu && !headingMenu.contains(e.target) && !e.target.closest?.('[data-md-action="heading"]')) closeHeadingMenu();
}
function applyHeadingLevel(level) {
  if (isWysiwygActive()) {
    runWysiwygCommand(level === 0 ? "paragraph" : "heading", { level });
    return;
  }
  if (!state9.rawview || state9.type?.id !== "markdown") return;
  if (level === 0) {
    state9.rawview.transformSelection((text) => text.replace(/^(\s*)#{1,6}\s+/gm, "$1"), { expandToLines: true, source: "markdown-heading" });
  } else {
    state9.rawview.transformSelection((text) => markdownHeading(text, level), { expandToLines: true, source: "markdown-heading" });
  }
}
function showHeadingMenu(anchorEl) {
  closeHeadingMenu();
  const menu = document.createElement("div");
  menu.className = "md-heading-menu";
  menu.setAttribute("role", "menu");
  for (const [label, level] of [["Heading 1", 1], ["Heading 2", 2], ["Heading 3", 3], ["Heading 4", 4], ["Heading 5", 5], ["Heading 6", 6], ["Normal text", 0]]) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "md-heading-item" + (level === 0 ? " md-heading-normal" : " md-heading-" + level);
    b.dataset.level = String(level);
    b.textContent = label;
    b.addEventListener("click", () => {
      applyHeadingLevel(level);
      closeHeadingMenu();
    });
    menu.append(b);
  }
  document.body.append(menu);
  const r = (anchorEl || document.querySelector('[data-md-action="heading"]') || document.body).getBoundingClientRect();
  menu.style.left = Math.min(r.left, window.innerWidth - 180) + "px";
  menu.style.top = r.bottom + 4 + "px";
  headingMenu = menu;
  setTimeout(() => document.addEventListener("mousedown", onHeadingOutside, true), 0);
}
function runMarkdownActionWysiwyg(action, btn) {
  if (action === "table") {
    if (tablePicker) {
      closeTablePicker();
      return;
    }
    showTablePicker(btn || document.getElementById("mdTableBtn"));
    return;
  }
  runWysiwygCommand(action);
}
function runMarkdownAction(action, btn) {
  if (action === "heading") {
    if (headingMenu) {
      closeHeadingMenu();
      return;
    }
    showHeadingMenu(btn);
    return;
  }
  if (isWysiwygActive()) {
    runMarkdownActionWysiwyg(action, btn);
    return;
  }
  if (!state9.rawview || state9.type?.id !== "markdown") return;
  if (action === "bold") {
    state9.rawview.transformSelection((text) => markdownWrap(text, "**", "strong text"), { source: "markdown-bold" });
  } else if (action === "italic") {
    state9.rawview.transformSelection((text) => markdownWrap(text, "*", "emphasis"), { source: "markdown-italic" });
  } else if (action === "strikethrough") {
    state9.rawview.transformSelection((text) => markdownStrikethrough(text), { source: "markdown-strikethrough" });
  } else if (action === "inline-code") {
    state9.rawview.transformSelection((text) => markdownInlineCode(text), { source: "markdown-inline-code" });
  } else if (action === "code-block") {
    state9.rawview.transformSelection((text) => markdownCodeBlock(text), { source: "markdown-code-block" });
  } else if (action === "blockquote") {
    state9.rawview.transformSelection((text) => markdownBlockquote(text), { expandToLines: true, source: "markdown-blockquote" });
  } else if (action === "bullet-list") {
    state9.rawview.transformSelection((text) => markdownBulletList(text), { expandToLines: true, source: "markdown-bullet-list" });
  } else if (action === "ordered-list") {
    state9.rawview.transformSelection((text) => markdownOrderedList(text), { expandToLines: true, source: "markdown-ordered-list" });
  } else if (action === "task-list") {
    state9.rawview.transformSelection((text) => markdownTaskList(text), { expandToLines: true, source: "markdown-task-list" });
  } else if (action === "table") {
    if (tablePicker) {
      closeTablePicker();
      return;
    }
    showTablePicker(btn || $4("mdTableBtn"));
  }
}
function onMarkdownContextMenu(e) {
  const selected = state9.rawview?.selectionText?.() || "";
  const options = tableSortOptions(selected);
  if (!options.length) return;
  const range = state9.rawview.selectionRange?.();
  e.event?.preventDefault?.();
  e.event?.stopPropagation?.();
  showMarkdownTableSortMenu(e.event?.browserEvent || e.event, options, { selected, range });
}
function showMarkdownTableSortMenu(event, options, selection) {
  closeMarkdownContextMenu();
  const menu = document.createElement("div");
  menu.className = "md-context-menu";
  menu.setAttribute("role", "menu");
  const title = document.createElement("div");
  title.className = "md-context-title";
  title.textContent = "Sort table by";
  menu.append(title);
  for (const opt of options) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = opt.label;
    btn.addEventListener("click", () => {
      const sorted = sortMarkdownTable(selection.selected, opt.index);
      if (sorted && selection.range) state9.rawview.replaceRange(selection.range, sorted, { source: "markdown-table-sort", selectInserted: true });
      closeMarkdownContextMenu();
    });
    menu.append(btn);
  }
  document.body.append(menu);
  const x = event?.clientX || 20;
  const y = event?.clientY || 20;
  menu.style.left = Math.min(x, window.innerWidth - 220) + "px";
  menu.style.top = Math.min(y, window.innerHeight - 180) + "px";
  markdownContextMenu = menu;
  setTimeout(() => document.addEventListener("click", closeMarkdownContextMenu, { once: true }), 0);
}
function closeMarkdownContextMenu() {
  markdownContextMenu?.remove();
  markdownContextMenu = null;
}

// ../../docs/core/rawpane-banners.js
import { state as state10, $ as $5 } from "./state.js";
var DISCLAIMER_KEY2 = "fv:edit-disclaimer";
var IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");
var COMMENT_HINT = (IS_MAC ? "⌘ /" : "Ctrl + /") + " to comment";
function setDisclaimerVisible(visible) {
  const el = $5("editDisclaimer");
  if (!el) return;
  el.hidden = !visible;
  $5("rawPane")?.classList.toggle("has-disclaimer", visible);
}
function showEditDisclaimer() {
  if (localStorage.getItem(DISCLAIMER_KEY2) === "never") return;
  const el = $5("editDisclaimer");
  if (!el) return;
  setDisclaimerVisible(true);
  if (el.dataset.wired) return;
  el.dataset.wired = "1";
  el.querySelector(".edit-disclaimer-close").addEventListener("click", () => setDisclaimerVisible(false));
  el.querySelector(".edit-disclaimer-never").addEventListener("click", () => {
    try {
      localStorage.setItem(DISCLAIMER_KEY2, "never");
    } catch {
    }
    setDisclaimerVisible(false);
  });
}
function formatAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 6e4) return "just now";
  if (diff < 36e5) return Math.floor(diff / 6e4) + "m ago";
  if (diff < 864e5) return Math.floor(diff / 36e5) + "h ago";
  return Math.floor(diff / 864e5) + "d ago";
}
var _currentSaved = null;
function showAutosaveBanner(saved) {
  const el = $5("autosaveBanner");
  if (!el) return;
  _currentSaved = saved;
  el.querySelector(".autosave-age").textContent = `Autosave from ${formatAgo(saved.ts)} found.`;
  el.hidden = false;
  $5("rawPane")?.classList.add("has-autosave");
  if (!el.dataset.wired) {
    el.dataset.wired = "1";
    el.querySelector(".autosave-restore").addEventListener("click", () => {
      if (!_currentSaved) return;
      state10.rawview?.setValue?.(_currentSaved.text);
      state10.intake = { ...state10.intake, text: _currentSaved.text };
      el.hidden = true;
      $5("rawPane")?.classList.remove("has-autosave");
    });
    el.querySelector(".autosave-dismiss").addEventListener("click", () => {
      el.hidden = true;
      $5("rawPane")?.classList.remove("has-autosave");
      clearAutosave(state10.intake?.filename || state10.intake?.name);
    });
  }
}
function updateWordCount(text, typeId) {
  const bar = document.getElementById("wordCountBar");
  if (!bar) return;
  if (!text || state10.intake?.isBinary) {
    bar.hidden = true;
    document.getElementById("rawPane")?.classList.remove("has-wordcount");
    return;
  }
  const lines = text.split("\n").length;
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  let label;
  if (typeId === "markdown") {
    const readMins = Math.ceil(words / 200);
    label = `${words.toLocaleString()} words · ${chars.toLocaleString()} chars · ~${readMins} min read`;
  } else if (typeId === "text") {
    label = `${lines.toLocaleString()} lines · ${words.toLocaleString()} words · ${chars.toLocaleString()} chars`;
  } else {
    label = `${lines.toLocaleString()} lines · ${chars.toLocaleString()} chars`;
  }
  const display = (typeId === "markdown" ? "" : COMMENT_HINT + "   ·   ") + label;
  const tuBar = document.getElementById("textUtils");
  const inlineCount = document.getElementById("textUtilsCount");
  if (tuBar && !tuBar.hidden && inlineCount) {
    inlineCount.textContent = display;
    inlineCount.hidden = false;
    bar.hidden = true;
    document.getElementById("rawPane")?.classList.remove("has-wordcount");
    return;
  }
  if (inlineCount) inlineCount.hidden = true;
  bar.textContent = display;
  bar.hidden = false;
  document.getElementById("rawPane")?.classList.add("has-wordcount");
}
function hideWordCount() {
  const bar = document.getElementById("wordCountBar");
  if (bar) bar.hidden = true;
  const inlineCount = document.getElementById("textUtilsCount");
  if (inlineCount) inlineCount.hidden = true;
  document.getElementById("rawPane")?.classList.remove("has-wordcount");
}

// ../../docs/core/editor-mode.js
var EDITOR_MODE_TYPES = /* @__PURE__ */ new Set(["code", "dockerfile", "dxf", "gcode"]);
function isEditorModeType(typeId) {
  return EDITOR_MODE_TYPES.has(typeId);
}
function applyEditorMode(rawview, type, { isBinary, onSave } = {}) {
  if (!rawview || isBinary || !isEditorModeType(type?.id)) return false;
  rawview.updateOptions?.({ readOnly: false });
  if (typeof onSave === "function") rawview.addCommand?.("ctrl+s", onSave);
  return true;
}

// ../../docs/core/rawpane.js
var renderPreview2 = async () => {
};
function initRawPane(deps) {
  renderPreview2 = deps.renderPreview;
}
var wysiwygMode = false;
var viewerActionsPromise = null;
function viewerActions() {
  if (!viewerActionsPromise) viewerActionsPromise = import("../games/metagame/viewer-actions.js");
  return viewerActionsPromise;
}
function syncHasToolsClass() {
  const anyVisible = ["markdownTools", "jsonTools", "yamlTools", "xmlTools", "tomlTools", "htmlToolbar"].some(
    (id) => {
      const el = $6(id) || document.getElementById(id);
      return el && !el.hidden;
    }
  );
  $6("rawPane")?.classList.toggle("has-tools", anyVisible);
}
function setMarkdownToolsVisible(visible) {
  const el = $6("markdownTools");
  if (!el) return;
  el.hidden = !visible;
  syncHasToolsClass();
}
function wireMarkdownTools() {
  const el = $6("markdownTools");
  if (!el || el.dataset.wired) return;
  el.dataset.wired = "1";
  el.addEventListener("mousedown", (e) => {
    const btn = e.target.closest("[data-md-action]");
    if (!btn || btn.dataset.mdAction === "table") return;
    e.preventDefault();
    runMarkdownAction(btn.dataset.mdAction, btn);
  });
  el.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-md-action]");
    if (!btn || btn.dataset.mdAction === "table") return;
    e.preventDefault();
  });
  el.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-md-action="table"]');
    if (!btn) return;
    runMarkdownAction("table", btn);
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".md-table-picker") && !e.target.closest('[data-md-action="table"]')) {
      closeTablePicker();
    }
  });
  document.getElementById("wysiwygBtn")?.addEventListener("click", () => toggleWysiwyg());
}
function updateWysiwygBtn() {
  state11.wysiwygActive = wysiwygMode;
  const btn = document.getElementById("wysiwygBtn");
  if (!btn) return;
  btn.classList.toggle("active", wysiwygMode);
  btn.setAttribute("aria-pressed", String(wysiwygMode));
  btn.title = wysiwygMode ? "Switch to code editor" : "Switch to visual editor (WYSIWYG)";
}
async function toggleWysiwyg({ skipPersist = false } = {}) {
  if (state11.type?.id !== "markdown") return;
  if (!wysiwygMode) {
    if (!state11.rawview) return;
    const text = state11.rawview.getValue();
    state11.rawview.dispose();
    state11.rawview = null;
    wysiwygMode = true;
    updateWysiwygBtn();
    await mountWysiwyg(document.getElementById("editor"), text, async (value) => {
      state11.intake = { ...state11.intake, text: value };
      state11.downloadedSinceEdit = false;
      if (state11.currentFolderPath) {
        state11.folderEdits.set(state11.currentFolderPath, value);
        state11.folderExported = false;
        state11.treeApi?.setEdited?.(state11.currentFolderPath, true);
      } else if (state11.sessionIntakes.has(state11.intake?.filename)) {
        state11.sessionEdits.set(state11.intake.filename, value);
        state11.treeApi?.setEdited?.(state11.intake.filename, true);
      }
      updateWordCount(value, "markdown");
    });
    if (!skipPersist && state11.settingsModel) {
      state11.settingsModel.values.markdownEditor = "wysiwyg";
      persistTypeKey("markdown", "markdownEditor", "wysiwyg");
    }
    applyLayout();
    setTextUtilsVisible(false);
  } else {
    const text = getWysiwygValue();
    unmountWysiwyg();
    wysiwygMode = false;
    state11.intake = { ...state11.intake, text };
    updateWysiwygBtn();
    if (!skipPersist && state11.settingsModel) {
      state11.settingsModel.values.markdownEditor = "monaco";
      persistTypeKey("markdown", "markdownEditor", "monaco");
    }
    await buildRawView();
    await renderPreview2();
    applyLayout();
  }
}
async function exitWysiwygForFeature() {
  if (!wysiwygMode) return false;
  await toggleWysiwyg();
  return true;
}
async function buildRawView({ isCurrent = () => true, signal } = {}) {
  if (!isCurrent() || signal?.aborted) return false;
  stopAutosave();
  hideWordCount();
  teardownHtmlWysiwyg();
  teardownTableEditor();
  setEnvFormMode(false);
  setIniFormMode(false);
  setTomlFormMode(false);
  setYamlFormMode(false);
  if (wysiwygMode) {
    unmountWysiwyg();
    wysiwygMode = false;
    updateWysiwygBtn();
  }
  state11.rawview?.dispose();
  state11.rawview = null;
  const sl = state11.type.syntaxLanguage;
  const lang = state11.intake.isBinary ? "plaintext" : (typeof sl === "function" ? sl(state11.intake) : sl) || "plaintext";
  const text = state11.intake.isBinary ? hexDump(state11.intake.bytes) : state11.intake.text || "";
  const nextRawview = await createRawView($6("editor"), {
    originalText: text,
    currentText: text,
    language: lang,
    theme: themeIsDark() ? "dark" : "light",
    options: { readOnly: state11.intake.isBinary, ...monacoOptions(state11.settingsModel) },
    onChange: debounce((value) => onRawEdited(value), 250),
    onCursor: (line) => mapRawToPreview(line),
    onScroll: () => syncScrollFromRaw(),
    onContextMenu: state11.type?.id === "markdown" ? onMarkdownContextMenu : void 0,
    onPaste: state11.type?.id === "markdown" ? ({ text: text2, selected }) => markdownLinkForPastedUrl(selected, text2) : void 0,
    onMoveDiff: async (moveHost, original, current) => {
      const { renderMoveDiff } = await import("./movediff-view.js");
      renderMoveDiff(moveHost, original, current, { threshold: 0.8 });
    },
    // A type (or a matched known-file) can declare a custom diff via loadDiffRenderer;
    // core dispatches generically (no type-name checks). The loader is resolved at call
    // time so the "show plain view" toggle takes effect without rebuilding the editor.
    onCustomDiff: state11.type.loadDiffRenderer || state11.known && state11.known.loadDiffRenderer ? async (host, original, current) => {
      const loader = state11.known && !state11.forceBase && state11.known.loadDiffRenderer || state11.type.loadDiffRenderer;
      if (!loader) {
        host.textContent = "";
        return;
      }
      const mod = await loader();
      (mod.render || mod.default)(host, original, current);
    } : void 0,
    signal,
    isCurrent
  });
  if (!nextRawview || !isCurrent() || signal?.aborted) {
    nextRawview?.dispose();
    return false;
  }
  state11.rawview = nextRawview;
  if (!state11.intake.isBinary) state11.rawview.addCommand?.("ctrl+s", downloadCurrent);
  applyEditorMode(state11.rawview, state11.type, { isBinary: state11.intake.isBinary, onSave: downloadCurrent });
  wireMarkdownTools();
  setMarkdownToolsVisible(state11.type?.id === "markdown" && !state11.intake.isBinary);
  if (state11.type?.id === "markdown" && !state11.intake.isBinary) {
    state11.rawview.addCommand?.("ctrl+b", () => runMarkdownAction("bold"));
    state11.rawview.addCommand?.("ctrl+i", () => runMarkdownAction("italic"));
  }
  if (state11.type?.id === "markdown" && !state11.intake.isBinary && state11.settingsModel?.values?.markdownEditor === "wysiwyg") {
    if (!isCurrent() || signal?.aborted) return false;
    await toggleWysiwyg({ skipPersist: true });
    if (!isCurrent() || signal?.aborted) return false;
  }
  wireJsonTools();
  setJsonToolsVisible(state11.type?.id === "json" && !state11.intake.isBinary);
  wireYamlTools();
  setYamlToolsVisible(state11.type?.id === "yaml" && !state11.intake.isBinary);
  wireXmlTools();
  setXmlToolsVisible(state11.type?.id === "xml" && !state11.intake.isBinary);
  wireTomlTools();
  setTomlToolsVisible(state11.type?.id === "toml" && !state11.intake.isBinary);
  wireTableModeBtn();
  const isTabular = state11.type?.id === "csv" && !state11.intake.isBinary;
  const tableModeBtn = document.getElementById("tableModeBtn");
  if (tableModeBtn) {
    tableModeBtn.hidden = !isTabular;
    tableModeBtn.classList.remove("active");
    tableModeBtn.setAttribute("aria-pressed", "false");
  }
  wireTextUtils();
  const hasAlwaysOnToolbar = ["json", "yaml", "xml"].includes(state11.type?.id);
  setTextUtilsVisible(!state11.intake?.isBinary && !hasAlwaysOnToolbar);
  wireEnvFormBtn();
  const filename = (state11.intake?.filename || state11.intake?.name || "").split("/").pop().toLowerCase();
  const isEnv = (state11.type?.id === "env" || filename.endsWith(".env")) && !state11.intake.isBinary;
  const envFormBtn = document.getElementById("envFormBtn");
  if (envFormBtn) {
    envFormBtn.hidden = !isEnv;
    envFormBtn.classList.remove("active");
    envFormBtn.setAttribute("aria-pressed", "false");
  }
  wireIniFormBtn();
  const isIni = state11.type?.id === "ini" && !state11.intake.isBinary;
  const iniFormBtn = document.getElementById("iniFormBtn");
  if (iniFormBtn) {
    iniFormBtn.hidden = !isIni;
    iniFormBtn.classList.remove("active");
    iniFormBtn.setAttribute("aria-pressed", "false");
  }
  wireTomlFormBtn();
  const tomlFormBtn = document.getElementById("tomlFormBtn");
  if (tomlFormBtn) {
    tomlFormBtn.classList.remove("active");
    tomlFormBtn.setAttribute("aria-pressed", "false");
  }
  wireYamlFormBtn();
  const yamlFormBtn = document.getElementById("yamlFormBtn");
  if (yamlFormBtn) {
    yamlFormBtn.classList.remove("active");
    yamlFormBtn.setAttribute("aria-pressed", "false");
  }
  const htmlVisualBtn = document.getElementById("htmlVisualBtn");
  if (htmlVisualBtn) {
    const isHtml = state11.type?.id === "html" && !state11.intake.isBinary;
    htmlVisualBtn.hidden = !isHtml;
    htmlVisualBtn.classList.remove("active");
    htmlVisualBtn.setAttribute("aria-pressed", "false");
    if (isHtml && !htmlVisualBtn.dataset.wired) {
      htmlVisualBtn.dataset.wired = "1";
      htmlVisualBtn.addEventListener("click", () => toggleHtmlWysiwyg());
    }
  }
  syncRawModeButtons2();
  showEditDisclaimer();
  const _autosaveBanner = $6("autosaveBanner");
  if (_autosaveBanner) {
    _autosaveBanner.hidden = true;
    $6("rawPane")?.classList.remove("has-autosave");
  }
  if (!state11.intake?.isBinary) {
    const filename2 = state11.intake?.filename || state11.intake?.name;
    const saved = getAutosave(filename2);
    if (saved && saved.text !== (state11.intake?.text || "")) {
      showAutosaveBanner(saved);
    }
    startAutosave();
    updateWordCount(state11.intake?.text || "", state11.type?.id);
  }
  return true;
}
function showCheatToast(msg) {
  if (typeof toast6 === "function") {
    toast6(msg);
    return;
  }
  if (window.__fv && window.__fv.showToast) {
    window.__fv.showToast(msg);
    return;
  }
  const div = document.createElement("div");
  div.textContent = msg;
  div.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e2a1e;color:#3fb950;padding:10px 20px;border-radius:6px;z-index:9999;font-size:14px;box-shadow:0 2px 8px #0008;transition:opacity .4s";
  document.body.appendChild(div);
  setTimeout(() => {
    div.style.opacity = "0";
    setTimeout(() => div.remove(), 400);
  }, 3e3);
}
async function onRawEdited(value) {
  viewerActions().then(({ recordStage1RawEdit }) => {
    if (recordStage1RawEdit({ file: state11.intake?.filename || "", text: value })) {
      showCheatToast("The Defragmenter cheat routine has been disabled.");
    }
  });
  try {
    if (!localStorage.getItem(DISCLAIMER_KEY + ":toast")) {
      localStorage.setItem(DISCLAIMER_KEY + ":toast", "1");
      toast6("ℹ Changes are in-memory — download to save them to your device.");
    }
  } catch {
  }
  state11.intake = { ...state11.intake, text: value };
  state11.downloadedSinceEdit = false;
  if (state11.currentFolderPath) {
    state11.folderEdits.set(state11.currentFolderPath, value);
    state11.folderExported = false;
    state11.treeApi?.setEdited?.(state11.currentFolderPath, true);
  } else if (state11.sessionIntakes.has(state11.intake?.filename)) {
    state11.sessionEdits.set(state11.intake.filename, value);
    state11.treeApi?.setEdited?.(state11.intake.filename, true);
  }
  if (state11.games && !state11.games.isUnlocked() && /(^|\n)\s*import\s+easteregg\b/.test(value)) {
    state11.games.unlock();
    state11.games.open();
    $6("gamesBtn").hidden = false;
    toast6("🎮 import easteregg — arcade unlocked!");
  }
  if (state11.type?.capabilities.preview) await renderPreview2();
  updateWordCount(value, state11.type?.id);
}
function hasUnsavedWork() {
  if (state11.rawview?.isDirty() && !state11.downloadedSinceEdit) return true;
  if (wysiwygMode && isWysiwygActive() && !state11.downloadedSinceEdit && getWysiwygValue() !== (state11.intake?.originalText ?? state11.intake?.text ?? "")) return true;
  const htmlValue = getHtmlWysiwygValue();
  if (htmlValue != null && !state11.downloadedSinceEdit && htmlValue !== (state11.intake?.originalText ?? "")) return true;
  if (state11.binaryEdit?.dirty && !state11.downloadedSinceEdit) return true;
  const tableValue = getTableEditorValue();
  if (tableValue != null && !state11.downloadedSinceEdit && tableValue !== (state11.intake?.originalText ?? "")) return true;
  const formValue = getActiveFormValue();
  if (formValue != null && !state11.downloadedSinceEdit && formValue !== (state11.intake?.originalText ?? "")) return true;
  if (state11.sessionEdits.size > 0) return true;
  return state11.folderEdits.size > 0 && !state11.folderExported;
}
function confirmDiscard() {
  if (!hasUnsavedWork()) return true;
  return confirm("You have unsaved changes that haven’t been downloaded.\n\nDiscard them and continue?");
}
function setRawMode(mode) {
  if (!state11.rawview) return;
  state11.rawMode = mode;
  state11.rawview.setMode(mode);
  viewerActions().then(({ recordStage10EchoRawMode }) => recordStage10EchoRawMode({ file: state11.intake?.filename || "", mode }));
  syncRawModeButtons2();
  applyLayout();
}
function syncRawModeButtons2() {
  document.querySelectorAll("#rawMode button:not(#compareBtn)").forEach((b) => b.classList.toggle("active", b.dataset.raw === state11.rawMode));
  $6("compareBtn")?.classList.toggle("active", !!state11.rawview?.hasCompare?.());
}
async function takeScreenshot() {
  if (state11.lastBodyHtml == null) {
    toast6("Screenshot not available for script-enabled HTML.");
    return;
  }
  toast6("Capturing…", 1500);
  try {
    const url = await captureBodyHtml(state11.lastBodyHtml, {
      theme: themeIsDark() ? "dark" : "light",
      style: previewStyle(state11.settingsModel.values)
    });
    const a = document.createElement("a");
    a.href = url;
    a.download = (state11.intake.filename || "preview").replace(/\.[^.]+$/, "") + ".png";
    a.click();
    toast6("Screenshot saved");
  } catch (err) {
    toast6("Screenshot failed: " + err.message);
  }
}
async function downloadCurrent() {
  viewerActions().then(({ recordStage10EchoDownload }) => recordStage10EchoDownload({ file: state11.intake?.filename || "" }));
  let blob;
  if (state11.binaryEdit?.dirty && typeof state11.binaryEdit.getBytes === "function") {
    const bytes = await state11.binaryEdit.getBytes();
    blob = new Blob([bytes], { type: state11.binaryEdit.mimeType || state11.intake.mimeType || "application/octet-stream" });
    state11.binaryEdit.dirty = false;
  } else {
    const tableValue = getTableEditorValue(), formValue = getActiveFormValue(), htmlValue = getHtmlWysiwygValue();
    const text = tableValue != null ? tableValue : formValue != null ? formValue : htmlValue != null ? htmlValue : wysiwygMode && isWysiwygActive() ? getWysiwygValue() : state11.rawview ? state11.rawview.getValue() : state11.intake.text || "";
    blob = new Blob([text], { type: state11.intake.mimeType || "text/plain" });
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = state11.intake.filename || "download.txt";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1e3);
  if (state11.sessionEdits.has(state11.intake.filename)) {
    const tableValue = getTableEditorValue(), formValue = getActiveFormValue(), htmlValue = getHtmlWysiwygValue();
    const text = tableValue != null ? tableValue : formValue != null ? formValue : htmlValue != null ? htmlValue : wysiwygMode && isWysiwygActive() ? getWysiwygValue() : state11.rawview ? state11.rawview.getValue() : state11.sessionEdits.get(state11.intake.filename);
    state11.sessionIntakes.set(state11.intake.filename, { ...state11.sessionIntakes.get(state11.intake.filename), text });
    state11.sessionEdits.delete(state11.intake.filename);
    state11.treeApi?.setEdited?.(state11.intake.filename, false);
  }
  state11.downloadedSinceEdit = true;
  clearAutosave(state11.intake?.filename || state11.intake?.name);
}

// ../../docs/core/folder.js
import { state as state13, $ as $8, isMobile as isMobile3, toast as toast8, escapeHtml as escapeHtml2 } from "./state.js";

// ../../docs/core/git.js
var dec = new TextDecoder();
var escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
var TEXT_DIFF_LIMIT = 512 * 1024;
function findGitDir(entries) {
  const head = entries.find((e) => e.path === ".git/HEAD" || e.path.endsWith("/.git/HEAD"));
  if (!head) return null;
  const gitPrefix = head.path.slice(0, -"/HEAD".length);
  const repoRoot = gitPrefix.slice(0, -"/.git".length);
  const repoName = repoRoot.split("/").filter(Boolean).pop() || "repository";
  return { gitPrefix, repoName, repoRoot };
}
function isGitInternal(path) {
  return path === ".git" || path.startsWith(".git/") || /\/\.git(\/|$)/.test(path);
}
async function inflate(u8) {
  const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
var OBJ_TYPE = { 1: "commit", 2: "tree", 3: "blob", 4: "tag" };
var hex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
async function inflateAt(packBytes, offset, size) {
  const stream = new Blob([packBytes.subarray(offset)]).stream().pipeThrough(new DecompressionStream("deflate"));
  const reader = stream.getReader();
  const out = new Uint8Array(size);
  let have = 0;
  try {
    while (have < size) {
      const { done, value } = await reader.read();
      if (done) break;
      const take = Math.min(value.length, size - have);
      out.set(value.subarray(0, take), have);
      have += take;
    }
  } finally {
    reader.cancel().catch(() => {
    });
  }
  return out;
}
function readVarint(buf, p) {
  let v = 0, sh = 0, c;
  do {
    c = buf[p++];
    v += (c & 127) * 2 ** sh;
    sh += 7;
  } while (c & 128);
  return [v, p];
}
function applyDelta(base, delta) {
  let p = 0, srcSize, tgtSize;
  [srcSize, p] = readVarint(delta, p);
  [tgtSize, p] = readVarint(delta, p);
  const out = new Uint8Array(tgtSize);
  let o = 0;
  while (p < delta.length) {
    const cmd = delta[p++];
    if (cmd & 128) {
      let off = 0, len = 0;
      if (cmd & 1) off |= delta[p++];
      if (cmd & 2) off |= delta[p++] << 8;
      if (cmd & 4) off |= delta[p++] << 16;
      if (cmd & 8) off |= delta[p++] << 24;
      if (cmd & 16) len |= delta[p++];
      if (cmd & 32) len |= delta[p++] << 8;
      if (cmd & 64) len |= delta[p++] << 16;
      if (len === 0) len = 65536;
      out.set(base.subarray(off >>> 0, (off >>> 0) + len), o);
      o += len;
    } else if (cmd) {
      out.set(delta.subarray(p, p + cmd), o);
      o += cmd;
      p += cmd;
    }
  }
  return out;
}
function parseIdx(buf) {
  if (!(buf[0] === 255 && buf[1] === 116 && buf[2] === 79 && buf[3] === 99)) return null;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const count = view.getUint32(8 + 255 * 4);
  const shaStart = 8 + 256 * 4;
  const offStart = shaStart + count * 24;
  const largeStart = offStart + count * 4;
  const map = /* @__PURE__ */ new Map();
  for (let i = 0; i < count; i++) {
    const sha = hex(buf.subarray(shaStart + i * 20, shaStart + i * 20 + 20));
    let off = view.getUint32(offStart + i * 4);
    if (off & 2147483648) off = Number(view.getBigUint64(largeStart + (off & 2147483647) * 8));
    map.set(sha, off);
  }
  return map;
}
function parseIdent(s) {
  const m = s.match(/^(.*?)\s*<(.*?)>\s*(\d+)\s*([+-]\d{4})?/);
  if (!m) return { name: s.trim(), email: "", date: null, tz: "" };
  return { name: m[1].trim(), email: m[2], date: new Date(Number(m[3]) * 1e3), tz: m[4] || "" };
}
function parseCommit(sha, content) {
  const sep = content.indexOf("\n\n");
  const header = sep >= 0 ? content.slice(0, sep) : content;
  const message = sep >= 0 ? content.slice(sep + 2) : "";
  const parents = [];
  let tree = null, author = null, committer = null;
  for (const line of header.split("\n")) {
    if (line.startsWith("tree ")) tree = line.slice(5).trim();
    else if (line.startsWith("parent ")) parents.push(line.slice(7).trim());
    else if (line.startsWith("author ")) author = parseIdent(line.slice(7));
    else if (line.startsWith("committer ")) committer = parseIdent(line.slice(10));
  }
  return { sha, tree, parents, author, committer, subject: message.split("\n")[0], message };
}
function parseReflog(txt) {
  const out = [];
  for (const line of txt.split("\n")) {
    const m = line.match(/^([0-9a-f]{40}) ([0-9a-f]{40}) (.*?) <(.*?)> (\d+) ([+-]\d{4})\t(.*)$/);
    if (m) out.push({ from: m[1], to: m[2], name: m[3], email: m[4], date: new Date(Number(m[5]) * 1e3), message: m[7] });
  }
  return out.reverse();
}
async function openRepo(entries) {
  const found = findGitDir(entries);
  if (!found) return null;
  const { gitPrefix, repoName, repoRoot } = found;
  const byPath = new Map(entries.map((e) => [e.path, e.file]));
  const rel = (p) => byPath.get(gitPrefix + "/" + p);
  const text = async (p) => {
    const f = rel(p);
    return f ? await f.text() : null;
  };
  const headTxt = (await text("HEAD") || "").trim();
  const head = { detached: false, branch: null, sha: null };
  const hm = headTxt.match(/^ref:\s*(.+)$/);
  if (hm) head.branch = hm[1].replace("refs/heads/", "");
  else if (/^[0-9a-f]{40}$/.test(headTxt)) {
    head.detached = true;
    head.sha = headTxt;
  }
  const branches = /* @__PURE__ */ new Map(), tags = /* @__PURE__ */ new Map();
  for (const line of (await text("packed-refs") || "").split("\n")) {
    const m = line.match(/^([0-9a-f]{40})\s+refs\/(heads|tags)\/(.+)$/);
    if (m) (m[2] === "heads" ? branches : tags).set(m[3], m[1]);
  }
  const refRe = new RegExp("^" + escapeRe(gitPrefix) + "/refs/(heads|tags)/(.+)$");
  for (const e of entries) {
    const m = e.path.match(refRe);
    if (!m) continue;
    const sha = (await e.file.text()).trim();
    if (/^[0-9a-f]{40}$/.test(sha)) (m[1] === "heads" ? branches : tags).set(m[2], sha);
  }
  if (head.branch && branches.has(head.branch)) head.sha = branches.get(head.branch);
  const packs = [];
  const shaToPack = /* @__PURE__ */ new Map();
  const packRe = new RegExp("^" + escapeRe(gitPrefix) + "/objects/pack/(pack-[0-9a-f]+)\\.idx$");
  for (const e of entries) {
    const m = e.path.match(packRe);
    if (!m) continue;
    const packFile = byPath.get(gitPrefix + "/objects/pack/" + m[1] + ".pack");
    if (!packFile) continue;
    packs.push({ idxFile: e.file, offsets: null, file: packFile, bytes: null });
  }
  let packIndexPromise = null;
  async function ensurePackIndexes() {
    if (!packIndexPromise) {
      packIndexPromise = (async () => {
        for (const pack of packs) {
          if (pack.offsets) continue;
          try {
            pack.offsets = parseIdx(new Uint8Array(await pack.idxFile.arrayBuffer()));
            if (!pack.offsets) continue;
            for (const sha of pack.offsets.keys()) shaToPack.set(sha, pack);
          } catch {
            pack.offsets = null;
          }
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      })();
    }
    await packIndexPromise;
  }
  const packBytesOf = async (pack) => pack.bytes ||= new Uint8Array(await pack.file.arrayBuffer());
  async function readPackObjectAt(pack, offset) {
    const buf = await packBytesOf(pack);
    let p = offset, c = buf[p++];
    let type = c >> 4 & 7;
    let size = c & 15, shift = 4;
    while (c & 128) {
      c = buf[p++];
      size += (c & 127) * 2 ** shift;
      shift += 7;
    }
    if (type === 6) {
      let c2 = buf[p++], rel2 = c2 & 127;
      while (c2 & 128) {
        c2 = buf[p++];
        rel2 = rel2 + 1 << 7 | c2 & 127;
      }
      const base = await readPackObjectAt(pack, offset - rel2);
      return { type: base.type, data: applyDelta(base.data, await inflateAt(buf, p, size)) };
    }
    if (type === 7) {
      const baseSha = hex(buf.subarray(p, p + 20));
      p += 20;
      const base = await readObjectBySha(baseSha);
      if (!base) throw new Error("missing delta base " + baseSha);
      return { type: base.type, data: applyDelta(base.data, await inflateAt(buf, p, size)) };
    }
    return { type: OBJ_TYPE[type] || String(type), data: await inflateAt(buf, p, size) };
  }
  const objectCache = /* @__PURE__ */ new Map();
  async function readObjectByShaUncached(sha) {
    const f = rel("objects/" + sha.slice(0, 2) + "/" + sha.slice(2));
    if (f) {
      try {
        const raw = await inflate(new Uint8Array(await f.arrayBuffer()));
        const nul = raw.indexOf(0);
        const type = dec.decode(raw.subarray(0, nul)).split(" ")[0];
        return { type, data: raw.subarray(nul + 1) };
      } catch {
      }
    }
    if (packs.length && !shaToPack.has(sha)) await ensurePackIndexes();
    const pack = shaToPack.get(sha);
    if (pack) {
      try {
        return await readPackObjectAt(pack, pack.offsets.get(sha));
      } catch {
        return null;
      }
    }
    return null;
  }
  async function readObjectBySha(sha) {
    if (!/^[0-9a-f]{40}$/.test(sha || "")) return null;
    if (!objectCache.has(sha)) objectCache.set(sha, readObjectByShaUncached(sha));
    return objectCache.get(sha);
  }
  const commitCache = /* @__PURE__ */ new Map();
  async function readCommit(sha) {
    if (!/^[0-9a-f]{40}$/.test(sha || "")) return null;
    if (commitCache.has(sha)) return commitCache.get(sha);
    const promise = readCommitUncached(sha);
    commitCache.set(sha, promise);
    return promise;
  }
  async function readCommitUncached(sha) {
    const obj = await readObjectBySha(sha);
    if (!obj || obj.type !== "commit") return null;
    return parseCommit(sha, dec.decode(obj.data));
  }
  const treeCache = /* @__PURE__ */ new Map();
  function parseTree(data) {
    const entries2 = [];
    let p = 0;
    while (p < data.length) {
      const sp = data.indexOf(32, p);
      const nul = data.indexOf(0, sp + 1);
      if (sp < 0 || nul < 0 || nul + 21 > data.length) break;
      const mode = dec.decode(data.subarray(p, sp));
      const name = dec.decode(data.subarray(sp + 1, nul));
      const sha = hex(data.subarray(nul + 1, nul + 21));
      entries2.push({ mode, name, sha, tree: mode === "40000" || mode === "040000" });
      p = nul + 21;
    }
    return entries2;
  }
  const flatTreeCache = /* @__PURE__ */ new Map();
  async function flattenTree(treeSha, prefix = "", out = /* @__PURE__ */ new Map(), limit = 5e3) {
    if (!prefix && !out.size) {
      const cacheKey = treeSha + ":" + limit;
      if (flatTreeCache.has(cacheKey)) return flatTreeCache.get(cacheKey);
      const result = await flattenTreeUncached(treeSha, prefix, out, limit);
      flatTreeCache.set(cacheKey, result);
      return result;
    }
    return flattenTreeUncached(treeSha, prefix, out, limit);
  }
  async function flattenTreeUncached(treeSha, prefix = "", out = /* @__PURE__ */ new Map(), limit = 5e3) {
    if (!treeSha || out.size > limit) return out;
    let entries2 = treeCache.get(treeSha);
    if (!entries2) {
      const obj = await readObjectBySha(treeSha);
      if (!obj || obj.type !== "tree") return out;
      entries2 = parseTree(obj.data);
      treeCache.set(treeSha, entries2);
    }
    for (const entry of entries2) {
      const p = prefix ? prefix + "/" + entry.name : entry.name;
      if (entry.tree) await flattenTree(entry.sha, p, out, limit);
      else out.set(p, { sha: entry.sha, mode: entry.mode });
      if (out.size > limit) break;
    }
    return out;
  }
  const changedCache = /* @__PURE__ */ new Map();
  function lineCount(text2) {
    if (!text2) return 0;
    const lines = text2.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    return lines.length && lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
  }
  async function blobText(sha) {
    const obj = await readObjectBySha(sha);
    if (!obj || obj.type !== "blob" || obj.data.length > TEXT_DIFF_LIMIT) return null;
    const text2 = dec.decode(obj.data);
    return text2.includes("\0") ? null : text2;
  }
  function lineDelta(beforeText, afterText) {
    if (beforeText == null && afterText == null) return {};
    if (beforeText == null) return { additions: lineCount(afterText), deletions: 0 };
    if (afterText == null) return { additions: 0, deletions: lineCount(beforeText) };
    const before = beforeText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const after = afterText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    if (before[before.length - 1] === "") before.pop();
    if (after[after.length - 1] === "") after.pop();
    let start = 0;
    while (start < before.length && start < after.length && before[start] === after[start]) start += 1;
    let bEnd = before.length - 1;
    let aEnd = after.length - 1;
    while (bEnd >= start && aEnd >= start && before[bEnd] === after[aEnd]) {
      bEnd -= 1;
      aEnd -= 1;
    }
    return {
      additions: Math.max(0, aEnd - start + 1),
      deletions: Math.max(0, bEnd - start + 1)
    };
  }
  async function withLineDelta(file, beforeEntry, afterEntry) {
    try {
      const beforeText = beforeEntry ? await blobText(beforeEntry.sha) : null;
      const afterText = afterEntry ? await blobText(afterEntry.sha) : null;
      return { ...file, ...lineDelta(beforeText, afterText) };
    } catch {
      return file;
    }
  }
  async function changedFiles(commit, limit = 200) {
    const cacheKey = commit.sha + ":" + limit;
    if (changedCache.has(cacheKey)) return changedCache.get(cacheKey);
    const current = await flattenTree(commit.tree);
    const parent = commit.parents[0] ? await readCommit(commit.parents[0]) : null;
    const before = parent ? await flattenTree(parent.tree) : /* @__PURE__ */ new Map();
    const files = [];
    for (const [path, now] of current) {
      const old = before.get(path);
      if (!old) files.push(await withLineDelta({ status: "A", path }, null, now));
      else if (old.sha !== now.sha || old.mode !== now.mode) files.push(await withLineDelta({ status: "M", path }, old, now));
      if (files.length >= limit) {
        const result2 = { files, truncated: true };
        changedCache.set(cacheKey, result2);
        return result2;
      }
    }
    for (const path of before.keys()) {
      if (!current.has(path)) files.push(await withLineDelta({ status: "D", path }, before.get(path), null));
      if (files.length >= limit) {
        const result2 = { files, truncated: true };
        changedCache.set(cacheKey, result2);
        return result2;
      }
    }
    files.sort((a, b) => a.path.localeCompare(b.path) || a.status.localeCompare(b.status));
    const result = { files, truncated: false };
    changedCache.set(cacheKey, result);
    return result;
  }
  const walkCache = /* @__PURE__ */ new Map();
  const walkKey = (sha, limit) => sha + ":" + limit;
  function peekWalk(sha, limit = 50) {
    return walkCache.get(walkKey(sha, limit)) || null;
  }
  async function walk(sha, limit = 50) {
    const cacheKey = walkKey(sha, limit);
    if (walkCache.has(cacheKey)) return walkCache.get(cacheKey);
    const commits = [];
    let packed = false;
    const seen = /* @__PURE__ */ new Set();
    while (sha && commits.length < limit && !seen.has(sha)) {
      seen.add(sha);
      const c = await readCommit(sha);
      if (!c) {
        packed = true;
        break;
      }
      commits.push(c);
      sha = c.parents[0];
    }
    const result = { commits, packed };
    walkCache.set(cacheKey, result);
    return result;
  }
  return {
    repoName,
    repoRoot,
    head,
    branches: [...branches].map(([name, sha]) => ({ name, sha, current: name === head.branch })).sort((a, b) => b.current - a.current || a.name.localeCompare(b.name)),
    tags: [...tags].map(([name, sha]) => ({ name, sha })),
    reflog: parseReflog(await text("logs/HEAD") || ""),
    readCommit,
    walk,
    peekWalk,
    changedFiles
  };
}

// ../../docs/core/repoview.js
var esc2 = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
var short = (sha) => (sha || "").slice(0, 7);
function relTime(d) {
  if (!d) return "";
  const s = (Date.now() - d.getTime()) / 1e3;
  for (const [n, sec] of [["year", 31536e3], ["month", 2592e3], ["day", 86400], ["hour", 3600], ["minute", 60]]) {
    const v = Math.floor(s / sec);
    if (v >= 1) return v + " " + n + (v > 1 ? "s" : "") + " ago";
  }
  return "just now";
}
async function renderRepoView(host, repo, options = {}) {
  const WALK_LIMIT = options.walkLimit || 50;
  host.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "repo-view";
  const head = document.createElement("div");
  head.className = "repo-head";
  head.innerHTML = '<div class="repo-title"><span class="repo-icon">⎇</span> <span class="repo-name">' + esc2(repo.repoName) + "</span></div>";
  const branchSel = document.createElement("select");
  branchSel.className = "repo-branch";
  for (const b of repo.branches) branchSel.add(new Option((b.current ? "● " : "") + b.name, b.sha));
  if (repo.head.detached) branchSel.add(new Option("(detached) " + short(repo.head.sha), repo.head.sha, true, true));
  head.appendChild(branchSel);
  wrap.appendChild(head);
  const cols = document.createElement("div");
  cols.className = "repo-cols";
  const list = document.createElement("div");
  list.className = "repo-list";
  const detail = document.createElement("div");
  detail.className = "repo-detail";
  detail.innerHTML = '<p class="repo-hint">Select a commit to see its details.</p>';
  cols.append(list, detail);
  wrap.appendChild(cols);
  host.appendChild(wrap);
  let detailToken = 0;
  const repoPath = (path) => repo.repoRoot ? repo.repoRoot + "/" + path : path;
  const canOpenPath = (path) => typeof options.canOpenFile === "function" && options.canOpenFile(repoPath(path));
  const deltaText = (f) => Number.isFinite(f.additions) || Number.isFinite(f.deletions) ? '<span class="rc-delta"><span class="rc-add">+' + esc2(f.additions || 0) + '</span> <span class="rc-del">-' + esc2(f.deletions || 0) + "</span></span>" : "";
  function fileRow(f) {
    const linked = f.status !== "D" && canOpenPath(f.path);
    const path = linked ? '<button type="button" class="rc-path rc-path-link" data-path="' + esc2(repoPath(f.path)) + '">' + esc2(f.path) + "</button>" : '<span class="rc-path">' + esc2(f.path) + "</span>";
    return '<li><span class="rc-status rc-status-' + esc2(f.status.toLowerCase()) + '">' + esc2(f.status) + "</span>" + path + deltaText(f) + "</li>";
  }
  async function showDetail(c) {
    const token = ++detailToken;
    const sameIdent = c.committer && c.author && c.committer.name === c.author.name && c.committer.email === c.author.email && +c.committer.date === +c.author.date;
    detail.innerHTML = '<div class="rc-sha">commit ' + esc2(c.sha) + '</div><dl class="rc-meta"><dt>Author</dt><dd>' + esc2(c.author && c.author.name) + " &lt;" + esc2(c.author && c.author.email) + '&gt;<br><span class="rc-date">' + (c.author && c.author.date ? c.author.date.toLocaleString() : "") + "</span></dd>" + (c.committer && !sameIdent ? "<dt>Committer</dt><dd>" + esc2(c.committer.name) + " &lt;" + esc2(c.committer.email) + '&gt;<br><span class="rc-date">' + (c.committer.date ? c.committer.date.toLocaleString() : "") + "</span></dd>" : "") + "<dt>Parents</dt><dd>" + (c.parents.length ? c.parents.map(short).join(", ") : "(root commit)") + "</dd><dt>Tree</dt><dd>" + esc2(short(c.tree)) + '</dd></dl><pre class="rc-message">' + esc2(c.message.trimEnd()) + '</pre><div class="rc-files"><h3>Changed files</h3><p class="repo-hint">Reading changed files…</p></div>';
    const filesHost = detail.querySelector(".rc-files");
    try {
      const result = await repo.changedFiles(c);
      if (token !== detailToken) return;
      if (!result.files.length) {
        filesHost.innerHTML = '<h3>Changed files</h3><p class="repo-hint">No file changes found.</p>';
        return;
      }
      filesHost.innerHTML = '<h3>Changed files</h3><ul class="rc-file-list">' + result.files.map(fileRow).join("") + "</ul>" + (result.truncated ? '<p class="repo-note">Showing the first ' + result.files.length + " changed files.</p>" : "");
      filesHost.querySelectorAll(".rc-path-link").forEach((button) => {
        button.addEventListener("click", () => options.openFile?.(button.dataset.path));
      });
    } catch {
      if (token === detailToken) filesHost.innerHTML = '<h3>Changed files</h3><p class="repo-hint">Could not read changed files.</p>';
    }
  }
  function commitRow(id, subject, who) {
    const row = document.createElement("div");
    row.className = "repo-commit";
    row.tabIndex = 0;
    row.innerHTML = '<span class="rc-id">' + esc2(id) + '</span><span class="rc-subject">' + esc2(subject) + '</span><span class="rc-who">' + esc2(who) + "</span>";
    return row;
  }
  let loadMoreBtn = null;
  function appendCommits(commits) {
    for (const c of commits) {
      const row = commitRow(short(c.sha), c.subject, (c.author && c.author.name) + " · " + relTime(c.author && c.author.date));
      const select = () => {
        list.querySelectorAll(".repo-commit.active").forEach((n) => n.classList.remove("active"));
        row.classList.add("active");
        showDetail(c);
      };
      row.addEventListener("click", select);
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter") select();
      });
      list.insertBefore(row, loadMoreBtn);
    }
  }
  function setLoadMore(nextSha) {
    if (loadMoreBtn) {
      loadMoreBtn.remove();
      loadMoreBtn = null;
    }
    if (!nextSha) return;
    const btn = document.createElement("button");
    btn.className = "repo-load-more";
    btn.textContent = "Load 50 more commits";
    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = "Loading…";
      const { commits, packed } = await repo.walk(nextSha, WALK_LIMIT);
      appendCommits(commits);
      const next = !packed && commits.length > 0 && commits[commits.length - 1].parents.length > 0 ? commits[commits.length - 1].parents[0] : null;
      setLoadMore(next);
      if (packed) {
        const note = document.createElement("p");
        note.className = "repo-note";
        note.textContent = "Older history is packed and not expanded.";
        list.appendChild(note);
      }
    };
    loadMoreBtn = btn;
    list.appendChild(btn);
  }
  async function load(sha) {
    const cached = repo.peekWalk?.(sha, WALK_LIMIT);
    if (!cached) list.innerHTML = '<p class="repo-hint">Reading commits…</p>';
    const { commits, packed } = cached || await repo.walk(sha, WALK_LIMIT);
    list.innerHTML = "";
    loadMoreBtn = null;
    detail.innerHTML = '<p class="repo-hint">Select a commit to see its details.</p>';
    if (!commits.length) {
      if (repo.reflog.length) {
        const note = document.createElement("p");
        note.className = "repo-note";
        note.textContent = "Commit objects are packed; showing recent activity from the reflog.";
        list.appendChild(note);
        for (const r of repo.reflog.slice(0, 50)) {
          list.appendChild(commitRow(short(r.to), r.message, r.name + " · " + relTime(r.date)));
        }
      } else {
        list.innerHTML = '<p class="repo-hint">No loose commits found (history is fully packed).</p>';
      }
      return;
    }
    appendCommits(commits);
    if (!packed && commits.length > 0 && commits[commits.length - 1].parents.length > 0) {
      setLoadMore(commits[commits.length - 1].parents[0]);
    } else if (packed) {
      const note = document.createElement("p");
      note.className = "repo-note";
      note.textContent = "Older history is packed and not expanded.";
      list.appendChild(note);
    }
    const first = list.querySelector(".repo-commit");
    if (first) first.click();
  }
  branchSel.addEventListener("change", () => load(branchSel.value));
  await load(repo.head.sha || repo.branches[0] && repo.branches[0].sha);
}

// ../../docs/core/folder-export.js
import { loadGlobal as loadGlobal5, vendor as vendor6 } from "./script-loader.js";
async function exportFolderZip(entries, edits, { changedOnly = false, moves = null } = {}) {
  const JSZip = await loadGlobal5(vendor6("jszip/jszip.min.js"), "JSZip");
  const zip = new JSZip();
  let count = 0;
  for (const e of entries) {
    const origin = e.originalPath || e.path;
    const edited = edits.get(e.path);
    const moved = moves && moves.has(origin);
    if (changedOnly && edited == null && !moved) continue;
    const zipPath = moves && moves.get(origin) || e.path;
    zip.file(zipPath, edited != null ? edited : e.file);
    count++;
  }
  if (moves && moves.size > 0) {
    let sh = "#!/bin/bash\n# Folder reorganization - run this to apply moves on disk\n";
    const q = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";
    for (const [src, dest] of moves) sh += `mkdir -p ${q(dest.split("/").slice(0, -1).join("/") || ".")}
mv ${q(src)} ${q(dest)}
`;
    zip.file("_moves.sh", sh);
  }
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return { blob, count };
}

// ../../docs/core/repack.js
import { loadGlobal as loadGlobal6, vendor as vendor7 } from "./script-loader.js";
async function repackZipWithDeletions(intake, opts = {}) {
  const { textEdits = /* @__PURE__ */ new Map(), binaryEdits = /* @__PURE__ */ new Map(), deletions = /* @__PURE__ */ new Set() } = opts;
  const JSZip = await loadGlobal6(vendor7("jszip/jszip.min.js"), "JSZip");
  const zip = await JSZip.loadAsync(intake.bytes);
  for (const name of deletions) {
    if (zip.file(name)) zip.remove(name);
  }
  for (const [name, text] of textEdits) {
    if (!deletions.has(name)) zip.file(name, text);
  }
  for (const [name, edit] of binaryEdits) {
    if (!deletions.has(name)) zip.file(name, await edit.getBytes());
  }
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

// ../../docs/core/sidebar-roots.js
import { $ as $7, isMobile as isMobile2, state as state12, toast as toast7 } from "./state.js";
var loadIntake = null;
var onTreeDelete = null;
var onTreeReveal = null;
var onRootActivate = null;
var nextId = 1;
function setSidebar(open) {
  $7("fileTree").hidden = !open;
  $7("ftResize").hidden = !open || isMobile2();
  if (isMobile2()) $7("scrim").hidden = !open;
}
function initSidebarRoots({
  loadIntake: loader,
  onDelete = null,
  onReveal = null,
  onActivate = null
}) {
  loadIntake = loader;
  onTreeDelete = onDelete;
  onTreeReveal = onReveal;
  onRootActivate = onActivate;
}
function roots() {
  if (!state12.sidebarRoots) state12.sidebarRoots = [];
  return state12.sidebarRoots;
}
function uniqueLabel(label) {
  const base = label || "Files";
  const used = new Set(roots().map((root) => root.label));
  if (!used.has(base)) return base;
  let i = 2;
  while (used.has(base + " " + i)) i++;
  return base + " " + i;
}
function fileFromIntake(intake) {
  return new File([intake.bytes || (intake.text != null ? intake.text : "")], intake.filename || "untitled", {
    type: intake.mimeType || "",
    lastModified: intake.lastModified || Date.now()
  });
}
function captureActiveSidebarRoot() {
  const root = roots().find((item) => item.id === state12.activeSidebarRootId);
  if (!root) return false;
  let capturedDirtyFileRoot = false;
  if (root.kind === "file" && state12.rawview?.isDirty?.()) {
    const entry = (root.treeEntries || [])[0];
    const path = entry?.path || root.label;
    const text = state12.rawview.getValue();
    const intake = intakeFromText(text, path.split("/").pop() || root.label);
    root.treeEntries = [{
      ...entry || {},
      path,
      file: fileFromIntake(intake),
      intake
    }];
    root.folderEdits = /* @__PURE__ */ new Map([[path, text]]);
    root.folderExported = false;
    capturedDirtyFileRoot = true;
  }
  if (root.kind === "folder" && state12.currentFolderPath && state12.rawview?.isDirty?.()) {
    const edits = state12.folderEdits || root.folderEdits || /* @__PURE__ */ new Map();
    edits.set(state12.currentFolderPath, state12.rawview.getValue());
    state12.folderEdits = edits;
    root.folderEdits = edits;
    root.folderExported = false;
  }
  if ((root.kind === "folder" || root.kind === "archive") && state12.currentFolderPath && state12.binaryEdit?.dirty) {
    const edits = state12.binaryEdits || root.binaryEdits || /* @__PURE__ */ new Map();
    edits.set(state12.currentFolderPath, state12.binaryEdit);
    state12.binaryEdits = edits;
    root.binaryEdits = edits;
    root.folderExported = false;
  }
  if (!capturedDirtyFileRoot) {
    root.treeEntries = state12.treeEntries || root.treeEntries || [];
    root.folderEdits = state12.folderEdits || /* @__PURE__ */ new Map();
  }
  root.folderMoves = state12.folderMoves || /* @__PURE__ */ new Map();
  root.binaryEdits = state12.binaryEdits || null;
  root.archiveDeletes = state12.archiveDeletes || null;
  root.currentFolderPath = state12.currentFolderPath || null;
  root.folderExported = capturedDirtyFileRoot ? false : !!state12.folderExported;
  return capturedDirtyFileRoot;
}
function activateSidebarRoot(root, { skipCapture = false } = {}) {
  if (!root) return;
  if (!skipCapture) captureActiveSidebarRoot();
  state12.activeSidebarRootId = root.id;
  state12.treeEntries = root.treeEntries || [];
  state12.folderEdits = root.folderEdits || /* @__PURE__ */ new Map();
  state12.folderMoves = root.folderMoves || /* @__PURE__ */ new Map();
  state12.binaryEdits = root.binaryEdits || null;
  state12.archiveDeletes = root.archiveDeletes || null;
  state12.archiveIntake = root.archiveIntake || null;
  state12.archiveOpenNode = root.archiveOpenNode || null;
  state12.currentFolderPath = root.currentFolderPath || null;
  state12.sessionTree = root.kind === "file";
  state12.archiveTree = root.kind === "archive";
  state12.folderExported = !!root.folderExported;
  $7("ftRoot").textContent = root.label;
  $7("ftRoot").title = root.title || root.label;
  $7("repoBtn").hidden = !root.git;
  $7("ftExportBtn").hidden = root.kind === "file" || !!root.git || !!root.readOnly || root.kind === "archive" && !root.archiveIntake;
  $7("ftExportBtn").title = root.kind === "archive" ? "Download archive with your edits applied" : "Download folder with your edits applied";
  $7("ftSearch").hidden = !!root.git || root.kind === "file";
  $7("ftSearchInput").value = "";
  $7("ftSearchCount").textContent = "";
  onRootActivate?.(root);
}
function displayEntries() {
  const out = [];
  for (const root of roots()) {
    for (const entry of root.treeEntries || []) {
      const path = root.kind === "file" ? root.label : root.label + "/" + entry.path;
      out.push({
        ...entry,
        path,
        sidebarRootId: root.id,
        sidebarInnerPath: entry.path,
        sidebarRoot: root.kind === "file"
      });
    }
    for (const child of root.childEntries || []) {
      out.push({
        name: child.name,
        file: { name: child.name.split("/").pop() || child.name, size: Number(child.size) || 0 },
        path: root.label + "/" + child.name,
        sidebarRootId: root.id,
        sidebarInnerPath: child.name,
        sidebarChild: true
      });
    }
  }
  return out;
}
function rootForPath(path) {
  return roots().find((root) => path === root.label || path.startsWith(root.label + "/"));
}
function removeActiveSidebarRoot() {
  if (state12.sidebarNavigationPending || state12.companionOperationToken) return;
  const root = roots().find((item) => item.id === state12.activeSidebarRootId);
  if (!root) return;
  const next = roots().filter((item) => item.id !== root.id);
  state12.sidebarRoots = next;
  state12.activeSidebarRootId = null;
  document.querySelector(".arc-del-panel")?.remove();
  renderSidebarRoots(next.at(-1) || null);
  toast7("Removed from sidebar. Nothing was deleted from disk.");
}
function renderSidebarRoots(activeRoot = null, activeInnerPath = null, { skipCapture = false, openSidebar = true } = {}) {
  const list = roots();
  if (!list.length) {
    state12.treeApi?.stop?.();
    state12.treeApi = null;
    state12.treeEntries = null;
    $7("ftBody").innerHTML = "";
    state12.activeSidebarRootId = null;
    state12.sidebarNavigationPending = false;
    state12.sidebarNavigationToken = null;
    $7("ftRemoveRootBtn").hidden = true;
    setSidebar(false);
    onRootActivate?.(null);
    return;
  }
  const active = activeRoot || list.find((root) => root.id === state12.activeSidebarRootId) || list[list.length - 1];
  activateSidebarRoot(active, { skipCapture });
  state12.treeApi?.stop?.();
  state12.treeApi = renderTree($7("ftBody"), buildTree(displayEntries()), {
    onOpen: async (node) => {
      const root = roots().find((item) => item.id === node.sidebarRootId);
      if (!root || !loadIntake) return;
      if (state12.sidebarNavigationPending || state12.companionOperationToken) return;
      const previousRoot = roots().find((item) => item.id === state12.activeSidebarRootId) || null;
      const navigationToken = {};
      state12.sidebarNavigationPending = true;
      state12.sidebarNavigationToken = navigationToken;
      activateSidebarRoot(root);
      let loaded = false;
      let activeInnerPath2 = null;
      try {
        if (node.sidebarChild && root.getChildIntake) {
          const intake = await root.getChildIntake(node.sidebarInnerPath);
          if (intake) {
            state12._skipDiscardGuard = true;
            state12._skipSidebarRoot = true;
            loaded = await loadIntake(intake, { sidebarNavigationToken: navigationToken }) !== false;
          }
          activeInnerPath2 = node.sidebarInnerPath;
        } else {
          const innerPath = node.sidebarInnerPath || node.path.slice(root.label.length + 1);
          const entry = (root.treeEntries || []).find((item) => item.path === innerPath);
          if (!entry) return;
          if (root.openNode) {
            loaded = await root.openNode(entry, innerPath, {
              skipFolderFlush: true,
              sidebarNavigationToken: navigationToken
            }) !== false;
          } else {
            const edited = root.folderEdits?.get(innerPath);
            state12._skipDiscardGuard = true;
            state12._skipSidebarRoot = true;
            loaded = await loadIntake(edited != null ? intakeFromText(edited, innerPath.split("/").pop()) : entry.intake, { sidebarNavigationToken: navigationToken }) !== false;
          }
          if (loaded) {
            state12.currentFolderPath = root.kind === "file" ? null : innerPath;
            root.currentFolderPath = state12.currentFolderPath;
            activeInnerPath2 = innerPath;
          }
        }
      } finally {
        const rootStillPresent = roots().includes(root);
        const finalRoot = loaded && rootStillPresent ? root : previousRoot && roots().includes(previousRoot) ? previousRoot : roots().at(-1);
        state12.sidebarNavigationPending = false;
        state12.sidebarNavigationToken = null;
        if (finalRoot) {
          renderSidebarRoots(finalRoot, loaded ? activeInnerPath2 : finalRoot.currentFolderPath, {
            skipCapture: true
          });
        } else {
          renderSidebarRoots();
        }
        if (isMobile2() && loaded) setSidebar(false);
      }
    },
    onMove: (srcPath, destFolderPath) => {
      const root = rootForPath(srcPath);
      if (!root?.onMove) return;
      const src = srcPath.slice(root.label.length + 1);
      const dest = destFolderPath && destFolderPath.startsWith(root.label + "/") ? destFolderPath.slice(root.label.length + 1) : "";
      activateSidebarRoot(root);
      root.onMove(src, dest);
      root.treeEntries = state12.treeEntries || root.treeEntries;
      renderSidebarRoots(root, state12.currentFolderPath);
    },
    onDelete: onTreeDelete ? (target) => onTreeDelete(target) : null,
    onReveal: onTreeReveal ? (target) => onTreeReveal(target) : null,
    canDiskAction: (target) => {
      const root = rootForPath(target.path);
      return root?.id === state12.activeSidebarRootId && root.kind === "folder" && !!root.companionFolderRoot && !state12.sidebarNavigationPending && !state12.companionOperationToken && document.body.classList.contains("companion-folder-active");
    },
    initialOpenDepth: Infinity
  });
  const activePath = activeInnerPath || active.currentFolderPath || (active.treeEntries || [])[0]?.path;
  if (activePath) {
    let full;
    if (active.kind === "file") {
      const isChild = (active.childEntries || []).some((c) => c.name === activePath);
      full = isChild ? active.label + "/" + activePath : active.label;
    } else {
      full = active.label + "/" + activePath;
    }
    state12.treeApi.setActive(full);
  }
  for (const root of list) {
    for (const [path, text] of root.folderEdits || []) {
      if (text == null) continue;
      state12.treeApi.setEdited(root.kind === "file" ? root.label : root.label + "/" + path, true);
    }
  }
  for (const dest of state12.folderMoves?.values?.() || []) {
    state12.treeApi.setMoved(active.label + "/" + dest, dest);
  }
  $7("treeBtn").hidden = false;
  $7("ftRemoveRootBtn").hidden = false;
  $7("ftExpandBtn").hidden = false;
  $7("ftCollapseBtn").hidden = false;
  setSidebar(openSidebar);
}
function addFileRoot(intake) {
  if (!intake || state12._skipSidebarRoot) return;
  const label = uniqueLabel(intake.filename || "File");
  const root = {
    id: "r" + nextId++,
    kind: "file",
    label,
    title: "Opened file: " + label,
    treeEntries: [{
      path: label,
      file: fileFromIntake(intake),
      intake
    }]
  };
  roots().push(root);
  renderSidebarRoots(root, label, { skipCapture: true, openSidebar: !isMobile2() });
}
function expandActiveFileRootToFolder({ entries, getIntake }) {
  const root = roots().find((item) => item.id === state12.activeSidebarRootId);
  if (!root || root.kind !== "file" || !entries?.length || !loadIntake) return false;
  root.childEntries = entries.map((e) => ({ name: e.name, size: Number(e.size) || 0 }));
  root.getChildIntake = (innerPath) => getIntake(innerPath);
  renderSidebarRoots(root, null, { skipCapture: true });
  return true;
}
function addFolderRoot({ label, entries, git = false, openNode = null, alreadyCaptured = false }) {
  if (!alreadyCaptured) captureActiveSidebarRoot();
  const sourceLabel = label || "Folder";
  const rootLabel = uniqueLabel(sourceLabel);
  const prefix = sourceLabel + "/";
  const normalizedEntries = (entries || []).map((entry) => {
    if (!entry.path?.startsWith(prefix)) return entry;
    const originalPath = entry.originalPath || entry.path;
    return {
      ...entry,
      path: entry.path.slice(prefix.length),
      originalPath: originalPath.startsWith(prefix) ? originalPath.slice(prefix.length) : originalPath
    };
  });
  const root = {
    id: "r" + nextId++,
    kind: "folder",
    label: rootLabel,
    title: label || "Folder",
    git,
    treeEntries: normalizedEntries,
    folderEdits: /* @__PURE__ */ new Map(),
    folderMoves: /* @__PURE__ */ new Map(),
    openNode
  };
  roots().push(root);
  renderSidebarRoots(root, null, { skipCapture: alreadyCaptured });
  return root;
}
function addArchiveRoot({ label, entries, openNode, archiveIntake, alreadyCaptured = false }) {
  if (!alreadyCaptured) captureActiveSidebarRoot();
  const root = {
    id: "r" + nextId++,
    kind: "archive",
    label: uniqueLabel(label || "Archive"),
    title: "Archive: " + (label || "Archive"),
    treeEntries: entries || [],
    folderEdits: /* @__PURE__ */ new Map(),
    folderMoves: /* @__PURE__ */ new Map(),
    binaryEdits: /* @__PURE__ */ new Map(),
    archiveDeletes: /* @__PURE__ */ new Set(),
    archiveIntake,
    openNode
  };
  roots().push(root);
  renderSidebarRoots(root, null, { skipCapture: alreadyCaptured });
  return root;
}

// ../../docs/core/folder.js
var loadIntake2 = () => {
};
var confirmDiscard2 = () => true;
var onFolderFileOpened = null;
var onTreeDelete2 = null;
var onTreeReveal2 = null;
var viewerActionsPromise2 = null;
function viewerActions2() {
  if (!viewerActionsPromise2) viewerActionsPromise2 = import("../games/metagame/viewer-actions.js");
  return viewerActionsPromise2;
}
function initFolder(deps) {
  loadIntake2 = deps.loadIntake;
  confirmDiscard2 = deps.confirmDiscard;
  onFolderFileOpened = deps.onFolderFileOpened || null;
  onTreeDelete2 = deps.onTreeDelete || null;
  onTreeReveal2 = deps.onTreeReveal || null;
}
var _moveNoticed = false;
var _repoViewToken = 0;
var nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
function showFolderLoading(message, { progress = null, detail = "" } = {}) {
  const notice = $8("ftNotice");
  const label = document.createElement("div");
  label.className = "ft-loading-label";
  label.textContent = message;
  const bar = document.createElement("div");
  bar.className = "ft-loading-bar" + (Number.isFinite(progress) ? "" : " indeterminate");
  if (Number.isFinite(progress)) bar.style.setProperty("--p", Math.max(0, Math.min(1, progress)));
  notice.className = "ft-notice ft-loading";
  notice.replaceChildren(label, bar);
  if (detail) {
    const extra = document.createElement("div");
    extra.className = "ft-loading-detail";
    extra.textContent = detail;
    notice.appendChild(extra);
  }
  notice.hidden = false;
}
function hideFolderLoading() {
  const notice = $8("ftNotice");
  notice.hidden = true;
  notice.className = "ft-notice";
  notice.textContent = "";
}
function recordMove(src, dest) {
  const entry = state13.treeEntries?.find((e) => e.path === src);
  const origin = entry?.originalPath || src;
  const currentDest = state13.folderMoves.get(origin);
  const editKey = state13.folderEdits.has(src) ? src : currentDest && state13.folderEdits.has(currentDest) ? currentDest : null;
  if (editKey) {
    state13.folderEdits.set(dest, state13.folderEdits.get(editKey));
    state13.folderEdits.delete(editKey);
  }
  if (dest === origin) state13.folderMoves.delete(origin);
  else state13.folderMoves.set(origin, dest);
  if (state13.currentFolderPath === src) state13.currentFolderPath = dest;
}
var _onMove = null;
async function loadFolder(entries, { repoWalkLimit, openPath, openFolders } = {}) {
  if (state13.companionOperationToken || state13.sidebarNavigationPending) return null;
  if (!confirmDiscard2()) return null;
  captureActiveSidebarRoot();
  const git = findGitDir(entries);
  state13.repoEntries = git ? entries : null;
  state13.repoHandle = null;
  let display = git ? entries.filter((e) => !isGitInternal(e.path)) : entries;
  display = display.map((e) => ({ ...e, originalPath: e.originalPath || e.path }));
  state13.treeEntries = display;
  const rootName = git ? git.repoName : display[0]?.path.split("/")[0] || "Folder";
  $8("ftRoot").textContent = rootName;
  $8("ftRoot").title = rootName;
  $8("ftBody").innerHTML = "";
  showFolderLoading("Preparing " + rootName + "…", { progress: 0.1, detail: entries.length.toLocaleString() + " file" + (entries.length === 1 ? "" : "s") });
  state13.folderEdits = /* @__PURE__ */ new Map();
  state13.folderMoves = /* @__PURE__ */ new Map();
  state13.currentFolderPath = null;
  state13.sessionTree = false;
  state13.archiveTree = false;
  state13.archiveOpenNode = null;
  state13.folderExported = false;
  _moveNoticed = false;
  _onMove = (src, destFolder) => {
    const fname = src.split("/").pop();
    const dest = destFolder ? destFolder + "/" + fname : fname;
    if (dest === src) return;
    if (state13.treeEntries.some((e) => e.path === dest && e.path !== src)) {
      toast8("A file already exists at " + dest);
      return;
    }
    recordMove(src, dest);
    const entry = state13.treeEntries.find((e) => e.path === src);
    if (entry) entry.path = dest;
    renderSidebarRoots(state13.sidebarRoots?.find((root) => root.id === state13.activeSidebarRootId), dest);
    for (const movedDest of state13.folderMoves.values()) state13.treeApi.setMoved(movedDest, movedDest);
    state13.treeApi.setActive(dest);
    toast8("Moved to " + dest);
    if (!_moveNoticed) {
      _moveNoticed = true;
      setTimeout(() => toast8("Moves are in-memory only. Download the folder to save changes or run _moves.sh."), 2700);
    }
  };
  $8("treeBtn").hidden = false;
  $8("repoBtn").hidden = !git;
  $8("ftExportBtn").hidden = !!git;
  $8("ftExpandBtn").hidden = false;
  $8("ftCollapseBtn").hidden = false;
  $8("ftSearch").hidden = !!git;
  $8("ftSearchInput").value = "";
  $8("ftSearchCount").textContent = "";
  setTree(true);
  await nextFrame();
  showFolderLoading("Building file tree…", { progress: 0.45, detail: display.length.toLocaleString() + " visible file" + (display.length === 1 ? "" : "s") });
  await nextFrame();
  const tree = buildTree(display);
  state13.treeApi = renderTree($8("ftBody"), tree, { onOpen: (node) => openTreeFile(node), onMove: _onMove, onDelete: (t) => onTreeDelete2?.(t), onReveal: (t) => onTreeReveal2?.(t), initialOpenDepth: 0 });
  const folderRoot = addFolderRoot({
    label: rootName,
    entries: display,
    git: !!git,
    openNode: (entry, path, options) => openTreeFile({ file: entry.file, path }, options),
    alreadyCaptured: true
  });
  folderRoot.onMove = _onMove;
  display = folderRoot.treeEntries;
  state13.treeEntries = display;
  if (openFolders && openFolders.length) state13.treeApi.openPaths(openFolders);
  try {
    showFolderLoading(git ? "Reading git metadata…" : "Opening default file…", { progress: 0.75 });
    await nextFrame();
    if (git) {
      await openRepoView({ auto: true, walkLimit: repoWalkLimit });
    } else {
      const normalizedOpenPath = openPath && openPath.startsWith(rootName + "/") ? openPath.slice(rootName.length + 1) : openPath;
      const pick = normalizedOpenPath && display.find((e) => e.path === normalizedOpenPath) || display.find((e) => /(^|\/)(readme|index)\.\w+$/i.test(e.path)) || display[0];
      if (pick) {
        state13._skipDiscardGuard = true;
        await openTreeFile({ file: pick.file, path: pick.path });
        state13.treeApi.setActive(pick.path);
      }
    }
  } finally {
    hideFolderLoading();
  }
  return folderRoot;
}
async function openRepoView({ auto = false, walkLimit } = {}) {
  if (!state13.repoEntries) return;
  const token = ++_repoViewToken;
  $8("intake").hidden = true;
  $8("workspace").hidden = true;
  const panel = $8("repoPanel");
  panel.hidden = false;
  panel.innerHTML = '<p class="repo-hint">Reading repository…</p>';
  try {
    if (!state13.repoHandle) state13.repoHandle = await openRepo(state13.repoEntries);
    if (token !== _repoViewToken || auto && state13.currentFolderPath) return;
    if (!state13.repoHandle) {
      panel.innerHTML = '<p class="repo-hint">Not a git repository.</p>';
      return;
    }
    const resolveRepoFile = (path) => {
      const entries = state13.treeEntries || [];
      const root = state13.repoHandle?.repoRoot || "";
      const normalized = root && path?.startsWith(root + "/") ? path.slice(root.length + 1) : path;
      return entries.find((entry) => entry.path === path || entry.path === normalized || entry.originalPath === path);
    };
    await renderRepoView(panel, state13.repoHandle, {
      canOpenFile: (path) => !!resolveRepoFile(path),
      openFile: async (path) => {
        const entry = resolveRepoFile(path);
        if (!entry) {
          toast8("File is not available in this folder");
          return;
        }
        state13.treeApi?.setActive?.(entry.path);
        await openTreeFile({ file: entry.file, path: entry.path });
      },
      walkLimit
    });
    if (token !== _repoViewToken || auto && state13.currentFolderPath) panel.hidden = true;
  } catch (e) {
    if (token !== _repoViewToken || auto && state13.currentFolderPath) return;
    panel.innerHTML = '<p class="repo-hint">Could not read repository: ' + escapeHtml2(e.message) + "</p>";
  }
}
async function openTreeFile(node, {
  skipFolderFlush = false,
  sidebarNavigationToken = null
} = {}) {
  const showReadNotice = !state13.folderEdits.has(node.path) && node.file?.size >= FILE_LOAD_FEEDBACK_BYTES;
  try {
    _repoViewToken++;
    if (!skipFolderFlush) flushFolderEdit();
    const stashed = state13.folderEdits.get(node.path);
    if (showReadNotice) {
      showFolderLoading("Reading " + node.path.split("/").pop() + "…", {
        detail: Math.round(node.file.size / 1024).toLocaleString() + " KB"
      });
      await nextFrame();
    }
    const intake = stashed != null ? intakeFromText(stashed, node.path.split("/").pop()) : await intakeFromFile(node.file);
    state13._skipDiscardGuard = true;
    state13._skipSidebarRoot = true;
    const loaded = await loadIntake2(intake, { sidebarNavigationToken });
    if (loaded === false) return false;
    state13.currentFolderPath = node.path;
    onFolderFileOpened?.(node);
    if (isMobile3()) setTree(false);
    return true;
  } catch (err) {
    toast8("Could not open " + node.path);
    return false;
  } finally {
    if (showReadNotice) hideFolderLoading();
  }
}
function flushFolderEdit() {
  if (state13.currentFolderPath && state13.rawview && state13.rawview.isDirty()) {
    state13.folderEdits.set(state13.currentFolderPath, state13.rawview.getValue());
    state13.treeApi?.setEdited?.(state13.currentFolderPath, true);
  }
}
var CONTENT_SEARCH_MAX = 2 * 1024 * 1024;
function onTreeSearchInput() {
  if (!state13.treeApi) return;
  const q = $8("ftSearchInput").value.trim().toLowerCase();
  if (!q) {
    state13.treeApi.clearFilter();
    $8("ftSearchCount").textContent = "";
    return;
  }
  const shown = state13.treeApi.filter((path) => path.toLowerCase().includes(q));
  $8("ftSearchCount").textContent = shown + " match" + (shown === 1 ? "" : "es");
}
async function searchTreeContents() {
  if (!state13.treeApi || !state13.treeEntries) return;
  const q = $8("ftSearchInput").value.trim();
  if (!q) {
    state13.treeApi.clearFilter();
    $8("ftSearchCount").textContent = "";
    return;
  }
  const ql = q.toLowerCase();
  $8("ftSearchCount").textContent = "searching…";
  const matched = /* @__PURE__ */ new Set();
  const activeRoot = state13.sidebarRoots?.find((root) => root.id === state13.activeSidebarRootId);
  const addMatchedPath = (path) => {
    matched.add(path);
    if (activeRoot && activeRoot.kind !== "file") matched.add(activeRoot.label + "/" + path);
  };
  for (const e of state13.treeEntries) {
    if (e.path.toLowerCase().includes(ql)) {
      addMatchedPath(e.path);
      continue;
    }
    if (e.file.size > CONTENT_SEARCH_MAX) continue;
    try {
      const text = await e.file.text();
      if (text.includes("\0")) continue;
      if (text.toLowerCase().includes(ql)) {
        addMatchedPath(e.path);
        const line = text.split(/\r?\n/).find((entry) => entry.includes(q));
        viewerActions2().then(({ recordStage2SearchResult }) => recordStage2SearchResult({ file: e.path, query: q, result: line && line.trim() }));
      }
    } catch {
    }
  }
  const shown = state13.treeApi.filter((path) => matched.has(path));
  $8("ftSearchCount").textContent = shown + " file" + (shown === 1 ? "" : "s") + " (name + contents)";
}
async function exportFolder(changedOnly) {
  if (state13.archiveTree) {
    await repackArchive();
    return;
  }
  flushFolderEdit();
  const entries = state13.treeEntries;
  if (!entries || !entries.length) return;
  if (changedOnly && state13.folderEdits.size === 0 && state13.folderMoves.size === 0) {
    toast8("No edited files or moves to export yet.");
    return;
  }
  try {
    toast8("Building .zip…", 1500);
    const { blob, count } = await exportFolderZip(entries, state13.folderEdits, { changedOnly, moves: state13.folderMoves });
    const base = ($8("ftRoot").textContent || "folder").replace(/[^\w.-]+/g, "_");
    downloadBlob(blob, base + (changedOnly ? "-changed" : "") + ".zip");
    state13.folderExported = true;
    toast8(`Exported ${count} file${count === 1 ? "" : "s"} as .zip.`);
  } catch (e) {
    toast8("Could not export folder: " + e.message);
  }
}
async function repackArchive() {
  flushFolderEdit();
  if (!state13.archiveIntake) {
    toast8("Cannot repack: original archive not available.");
    return;
  }
  const textEdits = state13.folderEdits || /* @__PURE__ */ new Map();
  const binaryEdits = state13.binaryEdits || /* @__PURE__ */ new Map();
  const deletions = state13.archiveDeletes || /* @__PURE__ */ new Set();
  if (textEdits.size === 0 && binaryEdits.size === 0 && deletions.size === 0) {
    toast8("No edits or deletions to export yet.");
    return;
  }
  try {
    toast8("Repacking archive…", 1500);
    const blob = await repackZipWithDeletions(state13.archiveIntake, { textEdits, binaryEdits, deletions });
    const base = ($8("ftRoot").textContent || "archive").replace(/[^\w.-]+/g, "_");
    downloadBlob(blob, "edited-" + base);
    state13.folderExported = true;
    const n = textEdits.size + binaryEdits.size + deletions.size;
    toast8("Archive saved with " + n + " change" + (n === 1 ? "" : "s") + ".");
  } catch (e) {
    toast8("Could not repack archive: " + e.message);
  }
}
function folderContext() {
  const files = (state13.treeEntries || []).map((e) => ({ file: e.file, path: e.path }));
  return {
    files,
    open: async (file) => {
      const node = files.find((f) => f.file === file);
      if (!node) return;
      if (state13.archiveTree && state13.archiveOpenNode) {
        await state13.archiveOpenNode(node.path);
        return;
      }
      state13._skipDiscardGuard = true;
      state13._skipSidebarRoot = true;
      await loadIntake2(await intakeFromFile(file));
      state13.treeApi?.setActive?.(node.path);
    }
  };
}
function setTree(open) {
  $8("fileTree").hidden = !open;
  $8("ftResize").hidden = !open || isMobile3();
  if (isMobile3()) $8("scrim").hidden = !open;
}
var TREE_MIN = 170;
var TREE_MAX = 560;
function applyTreeWidth(px) {
  const w = Math.max(TREE_MIN, Math.min(TREE_MAX, px));
  $8("fileTree").style.flex = "0 0 " + w + "px";
  $8("fileTree").style.width = w + "px";
  try {
    localStorage.setItem("fv:treeWidth", String(w));
  } catch {
  }
}
function initTreeResize() {
  const saved = Number(localStorage.getItem("fv:treeWidth"));
  if (saved) applyTreeWidth(saved);
  $8("ftExpandBtn").addEventListener("click", () => state13.treeApi?.expandAll?.());
  $8("ftCollapseBtn").addEventListener("click", () => state13.treeApi?.collapseAll?.());
  const handle = $8("ftResize");
  let dragging = false;
  const onMove = (e) => {
    if (!dragging) return;
    const left = $8("fileTree").getBoundingClientRect().left;
    applyTreeWidth((e.touches ? e.touches[0].clientX : e.clientX) - left);
    state13.treeApi?.refresh();
    e.preventDefault();
  };
  const onUp = () => {
    dragging = false;
    document.body.style.userSelect = "";
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };
  handle.addEventListener("pointerdown", (e) => {
    if (handle.hidden) return;
    dragging = true;
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    e.preventDefault();
  });
}
function onTreeKey(e) {
  if (!state13.settingsModel?.values?.treeArrowKeys) return;
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  e.preventDefault();
  state13.treeApi?.navigate(e.key === "ArrowDown" ? 1 : -1);
}

// ../../docs/core/archive-tree.js
import { $ as $9, isMobile as isMobile4, state as state14, toast as toast9 } from "./state.js";
function mountArchiveTree(archive, openEntry, loadIntake4, archiveIntake) {
  state14.skipNextFileSidebarRoot = true;
  captureActiveSidebarRoot();
  const entries = (archive.entries || []).filter((entry) => entry?.name && !entry.dir).map((entry) => ({
    path: entry.name,
    originalPath: entry.name,
    encrypted: !!entry.encrypted,
    file: {
      name: entry.name.split("/").pop() || entry.name,
      size: Number(entry.size) || 0
    }
  }));
  if (!entries.length) return;
  state14.treeEntries = entries;
  state14.folderEdits = /* @__PURE__ */ new Map();
  state14.folderMoves = /* @__PURE__ */ new Map();
  state14.binaryEdits = /* @__PURE__ */ new Map();
  state14.archiveIntake = archiveIntake || null;
  state14.currentFolderPath = null;
  state14.sessionTree = false;
  state14.archiveTree = true;
  const rootName = archive.rootName || "Archive";
  $9("ftNotice").hidden = true;
  $9("ftRoot").textContent = rootName;
  $9("ftRoot").title = "Archive: " + rootName;
  $9("treeBtn").hidden = false;
  $9("repoBtn").hidden = true;
  $9("ftExportBtn").hidden = !archiveIntake;
  $9("ftExportBtn").title = "Download archive with your edits applied";
  $9("ftSearch").hidden = false;
  $9("ftSearchInput").value = "";
  $9("ftSearchCount").textContent = "";
  let archiveRoot = null;
  async function openArchiveNode(nodeOrPath, {
    skipFolderFlush = false,
    sidebarNavigationToken = null
  } = {}) {
    const node = typeof nodeOrPath === "string" ? entries.find((entry) => entry.path === nodeOrPath) : nodeOrPath;
    if (!node) {
      toast9("Could not open " + nodeOrPath);
      return false;
    }
    if (node.encrypted || !openEntry) {
      toast9("Password-protected archive entries cannot be opened yet.");
      return false;
    }
    try {
      if (!skipFolderFlush) flushFolderEdit();
      if (!skipFolderFlush && state14.currentFolderPath && state14.binaryEdit?.dirty) {
        (state14.binaryEdits = state14.binaryEdits || /* @__PURE__ */ new Map()).set(state14.currentFolderPath, state14.binaryEdit);
      }
      const stashed = state14.folderEdits.get(node.path);
      const intake = stashed != null ? intakeFromText(stashed, node.file.name) : await openEntry(node.path);
      if (!intake) {
        toast9("Could not open " + node.path);
        return false;
      }
      state14._skipDiscardGuard = true;
      state14._skipSidebarRoot = true;
      const loaded = await loadIntake4(intake, { sidebarNavigationToken });
      if (loaded === false) return false;
      state14.currentFolderPath = node.path;
      archiveRoot.currentFolderPath = node.path;
      state14.treeApi?.setActive?.(node.path);
      if (isMobile4()) setTree(false);
      return true;
    } catch {
      toast9("Could not open " + node.path);
      return false;
    }
  }
  state14.archiveOpenNode = openArchiveNode;
  state14.archiveDeletes = /* @__PURE__ */ new Set();
  state14.treeApi = renderTree($9("ftBody"), buildTree(entries), {
    onOpen: openArchiveNode,
    onMove: null
  });
  archiveRoot = addArchiveRoot({
    label: rootName,
    entries,
    openNode: (entry, path, options) => openArchiveNode(path || entry.path, options),
    archiveIntake,
    alreadyCaptured: true
  });
  archiveRoot.archiveOpenNode = openArchiveNode;
  state14.archiveOpenNode = openArchiveNode;
  if (archiveIntake) mountDeletePanel(entries);
  setTree(true);
}
function mountDeletePanel(entries) {
  const host = $9("ftBody");
  if (!host) return;
  document.querySelector(".arc-del-panel")?.remove();
  const panel = document.createElement("div");
  panel.className = "arc-del-panel";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "arc-del-toggle";
  toggle.textContent = "🗑 Delete entries…";
  toggle.setAttribute("aria-expanded", "false");
  const list = document.createElement("div");
  list.className = "arc-del-list";
  list.hidden = true;
  for (const entry of entries) {
    const row = document.createElement("label");
    row.className = "arc-del-row";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "arc-del-cb";
    cb.dataset.path = entry.path;
    cb.addEventListener("change", () => {
      if (cb.checked) state14.archiveDeletes.add(entry.path);
      else state14.archiveDeletes.delete(entry.path);
      state14.folderExported = false;
      row.classList.toggle("arc-del-marked", cb.checked);
      const n = state14.archiveDeletes.size;
      toggle.textContent = n ? `🗑 ${n} marked for deletion` : "🗑 Delete entries…";
    });
    const name = document.createElement("span");
    name.className = "arc-del-name";
    name.textContent = entry.path;
    row.append(cb, name);
    list.append(row);
  }
  toggle.addEventListener("click", () => {
    list.hidden = !list.hidden;
    toggle.setAttribute("aria-expanded", String(!list.hidden));
  });
  panel.append(toggle, list);
  host.parentNode?.insertBefore(panel, host.nextSibling);
}
function clearArchiveTree({ keepRoot = false } = {}) {
  if (!state14.archiveTree) return;
  state14.treeApi?.stop?.();
  if (!keepRoot) state14.treeEntries = null;
  state14.archiveTree = false;
  state14.archiveOpenNode = null;
  state14.archiveIntake = null;
  state14.binaryEdits = null;
  state14.archiveDeletes = null;
  document.querySelector(".arc-del-panel")?.remove();
  if (!keepRoot) setTree(false);
}

// ../../docs/core/app.js
import { $ as $12, isMobile as isMobile5, state as state19, toast as toast14, themeIsDark as themeIsDark2, escapeHtml as escapeHtml4, debounce as debounce2 } from "./state.js";

// ../../docs/core/companion-ui.js
import { $ as $10, state as state16, toast as toast13, escapeHtml as escapeHtml3 } from "./state.js";

// ../../docs/core/companion.js
var BASE = "http://127.0.0.1:7700";
var LS_ENABLED = "fv:companion:enabled";
var LS_TOKEN = "fv:companion:token";
var _token = localStorage.getItem(LS_TOKEN) || null;
function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(navigator.userAgent || "");
}
function isEnabled() {
  return !isMobileDevice() && localStorage.getItem(LS_ENABLED) === "true";
}
function setEnabled(on) {
  localStorage.setItem(LS_ENABLED, on ? "true" : "false");
}
function requireEnabled() {
  if (!isEnabled()) throw new Error("Companion is disabled");
}
async function detectCompanion() {
  if (!isEnabled()) return false;
  try {
    const res = await Promise.race([
      fetch(`${BASE}/ping`),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 500))
    ]);
    if (!res.ok) return false;
    const json = await res.json();
    if (json.ok !== true) return false;
    if (json.token) setToken(json.token);
    return true;
  } catch {
    return false;
  }
}
function setToken(token) {
  _token = token;
  if (token) localStorage.setItem(LS_TOKEN, token);
  else localStorage.removeItem(LS_TOKEN);
}
function getToken() {
  return _token;
}
async function findFile(name, size) {
  requireEnabled();
  const params = new URLSearchParams({ name, size });
  const res = await fetch(`${BASE}/find-file?${params}`);
  if (!res.ok) throw new Error(`find-file failed: ${res.status}`);
  return (await res.json()).matches;
}
async function findFolder(relPath, size, mtime) {
  if (!isEnabled()) return [];
  const params = new URLSearchParams({ relPath, size, mtime });
  const res = await fetch(`${BASE}/find-folder?${params}`);
  if (!res.ok) throw new Error(`find-folder: ${res.status}`);
  return (await res.json()).matches;
}
async function saveFile(absolutePath, bytes) {
  requireEnabled();
  const res = await fetch(`${BASE}/file?path=${encodeURIComponent(absolutePath)}`, {
    method: "POST",
    headers: { "X-Companion-Token": _token || "", "Content-Type": "application/octet-stream" },
    body: bytes
  });
  if (!res.ok) throw new Error(`save failed: ${res.status}`);
  return res.json();
}
async function deleteFile(absolutePath) {
  requireEnabled();
  const res = await fetch(`${BASE}/file?path=${encodeURIComponent(absolutePath)}`, {
    method: "DELETE",
    headers: { "X-Companion-Token": _token || "" }
  });
  if (!res.ok) throw new Error(`delete failed: ${res.status}`);
  return res.json();
}
async function revealFile(absolutePath) {
  requireEnabled();
  const res = await fetch(`${BASE}/reveal?path=${encodeURIComponent(absolutePath)}`, {
    method: "POST",
    headers: { "X-Companion-Token": _token || "" }
  });
  if (!res.ok) throw new Error(`reveal failed: ${res.status}`);
  return res.json();
}
async function getWatchedPaths() {
  requireEnabled();
  const res = await fetch(`${BASE}/watched-paths`);
  return (await res.json()).paths;
}
async function listFiles(path) {
  requireEnabled();
  const res = await fetch(`${BASE}/files?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`files failed: ${res.status}`);
  return (await res.json()).entries;
}
async function getTree(absRoot) {
  requireEnabled();
  const res = await fetch(`${BASE}/tree?path=${encodeURIComponent(absRoot)}`);
  if (!res.ok) throw new Error(`tree failed: ${res.status}`);
  return res.json();
}
async function fetchFileBlob(absPath) {
  requireEnabled();
  const res = await fetch(`${BASE}/file?path=${encodeURIComponent(absPath)}`);
  if (!res.ok) throw new Error(`read failed: ${res.status}`);
  return res.blob();
}
function watchFolder(rootAbs, onChange) {
  if (!isEnabled() || !rootAbs) return () => {
  };
  const es = new EventSource(`${BASE}/watch`);
  const norm = (p) => (p || "").replace(/\\/g, "/");
  const root = norm(rootAbs).replace(/\/+$/, "");
  es.onmessage = (e) => {
    try {
      const ev = JSON.parse(e.data);
      if (ev.kind === "other") return;
      if (norm(ev.path).startsWith(root)) onChange(ev);
    } catch {
    }
  };
  es.onerror = () => {
  };
  return () => es.close();
}
async function getLogs({ level, q, since, limit } = {}) {
  requireEnabled();
  const params = new URLSearchParams();
  if (level) params.set("level", level);
  if (q) params.set("q", q);
  if (since) params.set("since", since);
  if (limit) params.set("limit", String(limit));
  const res = await fetch(`${BASE}/logs?${params}`);
  if (!res.ok) throw new Error(`logs failed: ${res.status}`);
  return (await res.json()).entries;
}
async function addWatchedPath(path) {
  requireEnabled();
  const res = await fetch(`${BASE}/watched-paths`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Companion-Token": _token || "" },
    body: JSON.stringify({ path })
  });
  const result = await res.json().catch(() => null);
  if (!res.ok) throw new Error(result?.error || `add watched folder failed: ${res.status}`);
  return result;
}
async function pickFolder() {
  if (!isEnabled()) return null;
  try {
    const res = await fetch(`${BASE}/path-picker`, {
      method: "POST",
      headers: { "X-Companion-Token": _token || "" }
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
async function removeWatchedPath(path) {
  requireEnabled();
  const res = await fetch(`${BASE}/watched-paths`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", "X-Companion-Token": _token || "" },
    body: JSON.stringify({ path })
  });
  const result = await res.json().catch(() => null);
  if (!res.ok) throw new Error(result?.error || `remove watched folder failed: ${res.status}`);
  return result;
}
function watchFile(absolutePath, onChanged) {
  if (!isEnabled() || !absolutePath) return () => {
  };
  const es = new EventSource(`${BASE}/watch`);
  es.onmessage = (e) => {
    try {
      const event = JSON.parse(e.data);
      if (event.path === absolutePath && event.kind !== "other") {
        onChanged(event);
      }
    } catch {
    }
  };
  es.onerror = () => {
  };
  return () => es.close();
}

// ../../docs/core/companion-browse.js
import { toast as toast10 } from "./state.js";
var sepOf = (p) => p.includes("\\") && !p.includes("/") ? "\\" : "/";
function joinPath(dir, name) {
  const s = sepOf(dir);
  return dir.endsWith(s) ? dir + name : dir + s + name;
}
var parentOf = (dir) => {
  const s = sepOf(dir);
  const i = dir.lastIndexOf(s);
  return i > 0 ? dir.slice(0, i) : dir;
};
async function browseForFolder({ title = "Choose a folder:" } = {}) {
  let roots2;
  try {
    roots2 = await getWatchedPaths();
  } catch {
    roots2 = [];
  }
  if (!roots2 || !roots2.length) {
    toast10("No watched folders yet — add one in Companion settings first.");
    return null;
  }
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "companion-browse";
    const done = (val) => {
      try {
        dialog.close();
      } catch {
      }
      dialog.remove();
      resolve(val);
    };
    let current = roots2.length === 1 ? roots2[0] : null;
    async function render() {
      dialog.innerHTML = "";
      const h = document.createElement("div");
      h.className = "companion-browse-title";
      h.textContent = title;
      const crumb = document.createElement("div");
      crumb.className = "companion-browse-path";
      crumb.textContent = current || "Watched folders";
      const list = document.createElement("div");
      list.className = "companion-browse-list";
      list.textContent = "Loading…";
      const footer = document.createElement("div");
      footer.className = "companion-browse-footer";
      const upBtn = document.createElement("button");
      upBtn.className = "btn small";
      upBtn.textContent = "⬆ Up";
      upBtn.disabled = !current;
      upBtn.addEventListener("click", () => {
        if (!current) return;
        current = roots2.includes(current) ? null : parentOf(current);
        render();
      });
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "btn small";
      cancelBtn.textContent = "Cancel";
      cancelBtn.addEventListener("click", () => done(null));
      const newBtn = document.createElement("button");
      newBtn.className = "btn small";
      newBtn.textContent = "+ New folder";
      newBtn.disabled = !current;
      newBtn.addEventListener("click", () => {
        const name = (prompt("New subfolder name (it will be created here):") || "").trim();
        if (!name) return;
        if (/[\\/]/.test(name) || name === "." || name === "..") {
          toast10("Invalid folder name.");
          return;
        }
        done(joinPath(current, name));
      });
      const okBtn = document.createElement("button");
      okBtn.className = "btn small companion-browse-ok";
      okBtn.textContent = "Create here";
      okBtn.disabled = !current;
      okBtn.addEventListener("click", () => done(current));
      footer.append(upBtn, newBtn, cancelBtn, okBtn);
      dialog.append(h, crumb, list, footer);
      if (!current) {
        list.innerHTML = "";
        for (const r of roots2) addRow(list, r, () => {
          current = r;
          render();
        });
        return;
      }
      let entries;
      try {
        entries = await listFiles(current);
      } catch (err) {
        list.textContent = "Could not read folder: " + err.message;
        return;
      }
      const dirs = entries.filter((e) => e.isDir).sort((a, b) => a.name.localeCompare(b.name));
      list.innerHTML = "";
      if (!dirs.length) {
        const empty = document.createElement("div");
        empty.className = "companion-browse-empty";
        empty.textContent = "(no subfolders — use “Create here” to put the file in this folder)";
        list.appendChild(empty);
      }
      for (const d of dirs) addRow(list, "📁 " + d.name, () => {
        current = joinPath(current, d.name);
        render();
      });
    }
    function addRow(list, label, onClick) {
      const b = document.createElement("button");
      b.className = "companion-browse-row";
      b.textContent = label;
      b.addEventListener("click", onClick);
      list.appendChild(b);
    }
    document.body.appendChild(dialog);
    dialog.showModal();
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      done(null);
    });
    render();
  });
}

// ../../docs/core/companion-folder.js
import { state as state15, toast as toast11 } from "./state.js";
var MAX_SYNC_FILES = 1e3;
var DEBOUNCE_MS = 1200;
var LS_AUTO = "fv:companion:autorefresh";
var getFolderContext = () => null;
var autoRefresh = false;
var _watchCleanup = null;
var _debounce = null;
var _refreshBtn = null;
var _autoBtn = null;
var _spinnerOwner = null;
var _busyRoots = /* @__PURE__ */ new WeakSet();
function setupFolderRefresh({ getFolderContext: getter }) {
  getFolderContext = getter || getFolderContext;
  autoRefresh = localStorage.getItem(LS_AUTO) === "true";
}
function rootInfo(context = getFolderContext()) {
  const sidebarRoot = context?.sidebarRoot;
  const root = context?.root;
  if (!sidebarRoot || !root || sidebarRoot.companionFolderRoot !== root) return null;
  const sep = root.includes("\\") && !root.includes("/") ? "\\" : "/";
  const base = root.endsWith(sep) ? root.slice(0, -1) : root;
  return {
    sidebarRoot,
    root,
    sep,
    base,
    linkGeneration: sidebarRoot._companionLinkGeneration || 0,
    authorizationGeneration: context.authorizationGeneration
  };
}
var absOf = (ri, rel) => ri.base + ri.sep + rel.split("/").join(ri.sep);
function contextStillLinked(ri) {
  const current = getFolderContext();
  return !!ri && current?.authorizationGeneration === ri.authorizationGeneration && state15.sidebarRoots?.includes(ri.sidebarRoot) && ri.sidebarRoot.companionFolderRoot === ri.root && (ri.sidebarRoot._companionLinkGeneration || 0) === ri.linkGeneration;
}
function contextStillActive(ri) {
  const current = rootInfo();
  return contextStillLinked(ri) && current?.sidebarRoot === ri.sidebarRoot && current.root === ri.root && current.linkGeneration === ri.linkGeneration;
}
function knownFor(ri) {
  const root = ri.sidebarRoot;
  if (root._companionKnownRoot !== ri.root || root._companionKnownGeneration !== ri.linkGeneration) {
    root._companionKnownRoot = ri.root;
    root._companionKnownGeneration = ri.linkGeneration;
    root._companionKnown = /* @__PURE__ */ new Map();
    root._companionSeedGeneration = (root._companionSeedGeneration || 0) + 1;
  }
  return root._companionKnown;
}
function commitKnown(ri, known) {
  if (!contextStillLinked(ri)) return false;
  ri.sidebarRoot._companionSeedGeneration = (ri.sidebarRoot._companionSeedGeneration || 0) + 1;
  ri.sidebarRoot._companionKnown = known;
  return true;
}
function onlineName(rel) {
  const slash = rel.lastIndexOf("/");
  const dir = slash >= 0 ? rel.slice(0, slash + 1) : "";
  const name = slash >= 0 ? rel.slice(slash + 1) : rel;
  const dot = name.lastIndexOf(".");
  const baseName = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  return dir + baseName + " (online)" + ext;
}
async function seedKnown(ri = rootInfo()) {
  if (!ri) return;
  const seedGeneration = (ri.sidebarRoot._companionSeedGeneration || 0) + 1;
  ri.sidebarRoot._companionSeedGeneration = seedGeneration;
  try {
    const t = await getTree(ri.root);
    if (!contextStillLinked(ri) || ri.sidebarRoot._companionSeedGeneration !== seedGeneration) return;
    ri.sidebarRoot._companionKnown = new Map(
      (t.files || []).map((f) => [f.path, { size: f.size, mtime: f.mtime || 0 }])
    );
    return true;
  } catch {
    return false;
  }
}
function ensureButtons() {
  if (_refreshBtn) return;
  const head = document.querySelector(".ft-head");
  if (!head) return;
  _refreshBtn = document.createElement("button");
  _refreshBtn.className = "icon-btn ft-tree-action";
  _refreshBtn.id = "ftRefreshBtn";
  _refreshBtn.title = "Sync folder with disk (companion)";
  _refreshBtn.setAttribute("aria-label", "Sync folder with disk");
  _refreshBtn.textContent = "⟳";
  _refreshBtn.addEventListener("click", () => refreshFolderFromDisk({ manual: true }));
  _autoBtn = document.createElement("button");
  _autoBtn.className = "icon-btn ft-tree-action ft-auto";
  _autoBtn.id = "ftAutoRefreshBtn";
  _autoBtn.textContent = "auto";
  _autoBtn.addEventListener("click", () => setAuto(!autoRefresh));
  const closeBtn = head.querySelector(".ft-close");
  head.insertBefore(_refreshBtn, closeBtn || null);
  head.insertBefore(_autoBtn, closeBtn || null);
  reflectAuto();
}
function reflectAuto() {
  if (!_autoBtn) return;
  _autoBtn.classList.toggle("ft-auto-on", autoRefresh);
  _autoBtn.title = autoRefresh ? "Auto-sync ON — applies disk changes as they happen. Click to turn off." : "Auto-sync OFF — click to apply disk changes automatically.";
}
function setAuto(on) {
  autoRefresh = on;
  localStorage.setItem(LS_AUTO, on ? "true" : "false");
  reflectAuto();
  if (on) {
    startWatch();
    toast11("Auto-sync on — the tree updates when files change on disk.", 3e3);
  } else stopWatch();
}
function startWatch() {
  stopWatch();
  const ri = rootInfo();
  if (!ri || !autoRefresh) return;
  _watchCleanup = watchFolder(ri.root, () => onDiskChange(ri));
}
function stopWatch() {
  if (_watchCleanup) {
    _watchCleanup();
    _watchCleanup = null;
  }
  clearTimeout(_debounce);
}
function onDiskChange(ri) {
  if (!contextStillActive(ri)) return;
  clearTimeout(_debounce);
  _debounce = setTimeout(() => {
    if (contextStillActive(ri)) refreshFolderFromDisk({ silent: true });
  }, DEBOUNCE_MS);
}
function onFolderRootResolved() {
  const ri = rootInfo();
  if (!ri) {
    onFolderRootCleared();
    return;
  }
  stopWatch();
  ensureButtons();
  if (_refreshBtn) _refreshBtn.hidden = false;
  if (_autoBtn) _autoBtn.hidden = false;
  document.body.classList.add("companion-folder-active");
  if (!knownFor(ri).size) seedKnown(ri);
  if (autoRefresh) startWatch();
}
function onFolderRootCleared() {
  stopWatch();
  if (_refreshBtn) _refreshBtn.hidden = true;
  if (_autoBtn) _autoBtn.hidden = true;
  document.body.classList.remove("companion-folder-active");
}
async function refreshFolderFromDisk({ manual = false, silent = false } = {}) {
  const ri = rootInfo();
  if (!ri) {
    if (manual) toast11("No companion folder linked.");
    return;
  }
  const root = ri.sidebarRoot;
  if (_busyRoots.has(root)) return;
  _busyRoots.add(root);
  let spinnerToken = null;
  if (_refreshBtn && contextStillActive(ri)) {
    spinnerToken = {};
    _spinnerOwner = spinnerToken;
    _refreshBtn.classList.add("ft-spin");
  }
  try {
    if (!knownFor(ri).size) {
      await seedKnown(ri);
      if (!contextStillLinked(ri)) return;
    }
    const known = new Map(knownFor(ri));
    let tree;
    try {
      tree = await getTree(ri.root);
    } catch (e) {
      if (!silent) toast11("Sync failed: " + e.message);
      return;
    }
    if (!contextStillLinked(ri)) return;
    const now = new Map((tree.files || []).map((f) => [f.path, { size: f.size, mtime: f.mtime || 0 }]));
    const added = [], modified = [], removed = [];
    for (const [p, m] of now) {
      const prev = known.get(p);
      if (!prev) added.push(p);
      else if (prev.size !== m.size || prev.mtime !== m.mtime) modified.push(p);
    }
    for (const p of known.keys()) if (!now.has(p)) removed.push(p);
    if (!added.length && !modified.length && !removed.length) {
      commitKnown(ri, now);
      if (manual && contextStillActive(ri)) toast11("No changes on disk.");
      return;
    }
    if (added.length + modified.length > MAX_SYNC_FILES) {
      toast11(`Too many changes (${added.length + modified.length}) to sync at once.`, 5e3);
      return;
    }
    const byRel = /* @__PURE__ */ new Map();
    for (const e of root.treeEntries || []) byRel.set(e.path, e);
    const folderEdits = root.folderEdits || /* @__PURE__ */ new Map();
    const conflicts = [];
    for (const rel of removed) {
      if (folderEdits.has(rel)) {
        conflicts.push({ name: rel.split("/").pop(), kind: "removed" });
        continue;
      }
      byRel.delete(rel);
    }
    for (const rel of [...added, ...modified]) {
      let blob;
      try {
        blob = await fetchFileBlob(absOf(ri, rel));
      } catch (e) {
        if (!silent) toast11("Sync failed: " + e.message);
        return;
      }
      if (!contextStillLinked(ri)) return;
      const file = new File([blob], rel.split("/").pop());
      if (modified.includes(rel) && folderEdits.has(rel)) {
        const onlineRel = onlineName(rel);
        byRel.set(onlineRel, { file, path: onlineRel, originalPath: onlineRel });
        conflicts.push({ name: rel.split("/").pop(), kind: "modified" });
      } else {
        const existing = byRel.get(rel);
        if (existing) byRel.set(rel, { ...existing, file });
        else byRel.set(rel, { file, path: rel, originalPath: rel });
      }
    }
    if (!contextStillLinked(ri)) return;
    root.treeEntries = [...byRel.values()];
    commitKnown(ri, now);
    if (contextStillActive(ri)) {
      state15.treeEntries = root.treeEntries;
      state15.folderEdits = folderEdits;
      renderSidebarRoots(root, root.currentFolderPath, { skipCapture: true });
    }
    const parts = [];
    if (added.length) parts.push(added.length + " added");
    if (modified.length) parts.push(modified.length + " changed");
    if (removed.length) parts.push(removed.length + " removed");
    if (contextStillActive(ri) && (manual || !silent)) toast11("Folder synced: " + parts.join(", "));
    if (contextStillActive(ri) && conflicts.length) {
      const names = conflicts.map((c) => c.name).join(", ");
      toast11(`Heads up: you have local edits in ${names}, and they also changed on disk. Your version is kept; the disk copy was added as "(online)" — open both to compare and decide.`, 9e3);
    }
  } finally {
    _busyRoots.delete(root);
    if (_refreshBtn && _spinnerOwner === spinnerToken) {
      _spinnerOwner = null;
      _refreshBtn.classList.remove("ft-spin");
    }
  }
}

// ../../docs/core/companion-settings.js
import { toast as toast12 } from "./state.js";
function looksLikeRiskyPath(p) {
  const raw = (p || "").trim();
  if (raw === "/" || raw === "\\") return "the filesystem root";
  const s = raw.replace(/\\/g, "/").replace(/\/+$/, "");
  const lower = s.toLowerCase();
  if (lower === "") return "the filesystem root";
  if (/^[a-z]:$/.test(lower)) return "an entire drive";
  const exact = /* @__PURE__ */ new Set([
    "/home",
    "/users",
    "/usr",
    "/etc",
    "/var",
    "/bin",
    "/sbin",
    "/opt",
    "/lib",
    "/lib64",
    "/system",
    "/library",
    "/mnt",
    "/mnt/c",
    "/media",
    "/dev",
    "/proc",
    "/sys",
    "/root",
    "/boot",
    "c:/windows",
    "c:/users",
    "c:/program files",
    "c:/program files (x86)",
    "c:/programdata"
  ]);
  if (exact.has(lower)) return "a system or very large folder";
  if (/^[a-z]:\/(windows|program files|program files \(x86\)|programdata)(\/|$)/.test(lower)) return "a Windows system folder";
  return null;
}
var COMPANION_ENDPOINTS = [
  ["GET /ping", "nothing sent; version + capabilities + session token back"],
  ["GET /watched-paths", "nothing sent; your configured folder paths back"],
  ["POST/DELETE /watched-paths", "a folder path to add/remove"],
  ["GET /find-file", "filename + size (no content); matching absolute paths back"],
  ["GET /find-folder", "a relative path; matching root folders back"],
  ["GET /file", "an absolute path; file bytes back"],
  ["POST /file", "an absolute path + new bytes (save-back / create)"],
  ["DELETE /file", "an absolute path; deletes a file or recursive subfolder, never a watched root"],
  ["GET /files", "a folder path; its directory listing back"],
  ["GET /tree", "a watched root path; its recursive file listing back"],
  ["GET /watch", "nothing sent; change/delete paths streamed (SSE)"],
  ["GET /logs", "optional filters; the companion’s own activity log back"],
  ["POST /reveal", "an absolute path; opens it in the OS file manager"],
  ["POST /path-picker", "nothing; desktop app shows the native folder dialog, adds the choice"]
];
function appendCompanionDownloadPanel(panel) {
  const info = document.createElement("div");
  info.className = "companion-download";
  const title = document.createElement("div");
  title.className = "companion-folders-label";
  title.textContent = "Get the Companion";
  const description = document.createElement("p");
  description.textContent = "The Companion is an optional local app that lets this viewer save files and delete files or subfolders inside folders you choose. It never deletes a watched root. The viewer works fully without it.";
  const net = document.createElement("p");
  net.className = "companion-net";
  net.innerHTML = "It listens only on loopback at <code>127.0.0.1:7700</code>, so it is not exposed to the LAN or internet. Loopback is machine-wide, not per account: any local process or OS account able to reach it can use the Companion’s permissions to act inside watched roots. CORS and the session token do not authenticate local processes. The browser CORS barrier allows this deployed viewer and pages served from <code>localhost</code> or <code>127.0.0.1</code> on any port; those pages can read <code>/ping</code>, including its session token. File reads and mutations are restricted to watched roots you explicitly add, and only mutating requests require the token.";
  const tableLabel = document.createElement("p");
  tableLabel.className = "companion-table-label";
  tableLabel.textContent = "Every request it can make (inspect them in your Network tab):";
  const table = document.createElement("table");
  table.className = "companion-endpoints";
  for (const [ep, flow] of COMPANION_ENDPOINTS) {
    const tr = document.createElement("tr");
    const tdEp = document.createElement("td");
    tdEp.innerHTML = `<code>${ep}</code>`;
    const tdFlow = document.createElement("td");
    tdFlow.textContent = flow;
    tr.append(tdEp, tdFlow);
    table.appendChild(tr);
  }
  const source = document.createElement("a");
  source.href = "https://github.com/jdeworks/file-viewer/tree/v0.1.0/companion";
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  source.textContent = "Review the companion source code before building →";
  const checksum = document.createElement("p");
  checksum.className = "companion-checksum";
  checksum.textContent = "Compare a download’s SHA-256 with the published checksum. This checks transfer integrity; it is not proof of publisher identity or software safety.";
  const signing = document.createElement("p");
  signing.className = "companion-checksum";
  signing.textContent = "Builds are unsigned, so antivirus or SmartScreen may warn about a new binary that opens a loopback port and accesses files. A warning alone proves neither malware nor safety. Building from reviewed source with a toolchain and dependencies you trust gives you more control, but is not a guarantee.";
  const download = document.createElement("a");
  download.className = "companion-download-btn";
  download.href = "https://github.com/jdeworks/file-viewer/releases";
  download.target = "_blank";
  download.rel = "noopener noreferrer";
  download.textContent = "Download from GitHub Releases";
  info.append(title, description, net, tableLabel, table, source, checksum, signing, download);
  panel.appendChild(info);
}
function appendLogsPanel(panel) {
  const wrap = document.createElement("details");
  wrap.className = "companion-logs";
  const sum = document.createElement("summary");
  sum.textContent = "Activity log";
  wrap.appendChild(sum);
  const controls = document.createElement("div");
  controls.className = "companion-logs-controls";
  const levelSel = document.createElement("select");
  levelSel.className = "companion-logs-level";
  [["info", "All"], ["warn", "Warnings +"], ["error", "Errors only"]].forEach(([v, label]) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = label;
    levelSel.appendChild(o);
  });
  const qInput = document.createElement("input");
  qInput.type = "text";
  qInput.placeholder = "filter text…";
  qInput.className = "companion-logs-q";
  const sinceInput = document.createElement("input");
  sinceInput.type = "datetime-local";
  sinceInput.className = "companion-logs-since";
  sinceInput.title = "Only entries at or after this time";
  const refreshBtn = document.createElement("button");
  refreshBtn.className = "btn small";
  refreshBtn.textContent = "Refresh";
  controls.append(levelSel, qInput, sinceInput, refreshBtn);
  const listEl = document.createElement("div");
  listEl.className = "companion-logs-list";
  async function load() {
    if (!isEnabled() || !isCompanionAvailable()) {
      listEl.innerHTML = '<div class="companion-logs-empty">Companion offline — start it to see activity.</div>';
      return;
    }
    listEl.innerHTML = '<div class="companion-logs-empty">Loading…</div>';
    let since;
    if (sinceInput.value) {
      const d = new Date(sinceInput.value);
      if (!isNaN(d.getTime())) since = d.toISOString();
    }
    let entries;
    try {
      entries = await getLogs({ level: levelSel.value, q: qInput.value.trim() || void 0, since, limit: 500 });
    } catch {
      listEl.innerHTML = '<div class="companion-logs-empty">Could not load logs.</div>';
      return;
    }
    if (!entries || !entries.length) {
      listEl.innerHTML = '<div class="companion-logs-empty">No matching log entries.</div>';
      return;
    }
    listEl.innerHTML = "";
    for (const e of entries.slice().reverse()) {
      const row = document.createElement("div");
      row.className = "companion-logs-row companion-logs-" + (e.level || "info");
      const ts = document.createElement("span");
      ts.className = "companion-logs-ts";
      ts.textContent = (e.ts || "").replace("T", " ").replace(/(\.\d+)?Z$/, "");
      const lv = document.createElement("span");
      lv.className = "companion-logs-lv";
      lv.textContent = (e.level || "").toUpperCase();
      const msg = document.createElement("span");
      msg.className = "companion-logs-msg";
      msg.textContent = e.msg || "";
      row.append(ts, lv, msg);
      listEl.appendChild(row);
    }
  }
  refreshBtn.addEventListener("click", load);
  levelSel.addEventListener("change", load);
  sinceInput.addEventListener("change", load);
  qInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      load();
    }
  });
  wrap.addEventListener("toggle", () => {
    if (wrap.open) load();
  });
  wrap.append(controls, listEl);
  panel.appendChild(wrap);
}
function renderCompanionSettings(container) {
  const old = container.querySelector(".companion-panel");
  if (old) old.remove();
  const panel = document.createElement("details");
  panel.className = "set-group companion-panel";
  panel.open = false;
  const summary = document.createElement("summary");
  summary.innerHTML = `Companion <span class="companion-status-dot ${isCompanionAvailable() ? "connected" : ""}">${isCompanionAvailable() ? "● connected" : "○ not found"}</span>`;
  panel.appendChild(summary);
  if (isMobileDevice()) {
    const note = document.createElement("p");
    note.className = "companion-net";
    note.textContent = "The Companion is a desktop-only feature (it runs a local app on your computer). It is not available on phones or tablets.";
    panel.appendChild(note);
    container.prepend(panel);
    return;
  }
  const enableRow = document.createElement("div");
  enableRow.className = "set-row";
  const enableLabel = document.createElement("label");
  enableLabel.textContent = "Enable companion";
  enableLabel.htmlFor = "companionEnabledToggle";
  const enableToggle = document.createElement("input");
  enableToggle.type = "checkbox";
  enableToggle.id = "companionEnabledToggle";
  enableToggle.checked = isEnabled();
  enableToggle.addEventListener("change", async () => {
    setEnabled(enableToggle.checked);
    if (enableToggle.checked) {
      const ok = await detectCompanion();
      if (!isEnabled()) return;
      setCompanionAvailable(ok);
      tokenEl.value = getToken() || "";
      const connected = isCompanionAvailable();
      document.body.classList.toggle("companion-active", connected);
      summary.innerHTML = `Companion <span class="companion-status-dot ${connected ? "connected" : ""}">${connected ? "● connected" : "○ not found"}</span>`;
      syncSaveBtn();
      updateConnButton(connected);
      if (connected) showCompanionIndicator();
      else toast12("Companion not found — is it running on :7700?");
      if (connected) refreshFolders();
      else foldersList.innerHTML = '<span class="companion-folders-empty">Start the Companion app to manage folders.</span>';
    } else {
      setCompanionAvailable(false);
      document.body.classList.remove("companion-active");
      summary.innerHTML = `Companion <span class="companion-status-dot">○ not found</span>`;
      syncSaveBtn();
      updateConnButton(false);
    }
  });
  const testBtn = document.createElement("button");
  testBtn.className = "btn small";
  testBtn.textContent = "Test connection";
  testBtn.addEventListener("click", async () => {
    if (!isEnabled()) {
      toast12("Enable companion first.");
      return;
    }
    testBtn.disabled = true;
    const ok = await detectCompanion();
    testBtn.disabled = false;
    if (!isEnabled()) return;
    setCompanionAvailable(ok);
    tokenEl.value = getToken() || "";
    const connected = isCompanionAvailable();
    document.body.classList.toggle("companion-active", connected);
    summary.innerHTML = `Companion <span class="companion-status-dot ${connected ? "connected" : ""}">${connected ? "● connected" : "○ not found"}</span>`;
    syncSaveBtn();
    updateConnButton(connected);
    toast12(connected ? "Companion connected ✓" : "Companion not found — is it running?");
  });
  const enableControls = document.createElement("div");
  enableControls.style.display = "flex";
  enableControls.style.gap = "8px";
  enableControls.style.alignItems = "center";
  enableControls.append(enableToggle, testBtn);
  enableRow.append(enableLabel, enableControls);
  panel.appendChild(enableRow);
  const tokenRow = document.createElement("div");
  tokenRow.className = "set-row";
  const tokenLabel = document.createElement("label");
  tokenLabel.textContent = "Token";
  const tokenWrap = document.createElement("div");
  tokenWrap.className = "companion-token-wrap";
  const tokenEl = document.createElement("input");
  tokenEl.type = "password";
  tokenEl.className = "companion-token-input companion-token-reveal";
  tokenEl.placeholder = "paste token here";
  tokenEl.value = getToken() || "";
  tokenEl.setAttribute("autocomplete", "off");
  tokenEl.setAttribute("spellcheck", "false");
  tokenEl.addEventListener("click", () => {
    tokenEl.type = tokenEl.type === "password" ? "text" : "password";
  });
  tokenEl.addEventListener("change", () => setToken(tokenEl.value));
  tokenEl.addEventListener("input", () => setToken(tokenEl.value));
  tokenWrap.appendChild(tokenEl);
  tokenRow.append(tokenLabel, tokenWrap);
  panel.appendChild(tokenRow);
  const foldersLabel = document.createElement("div");
  foldersLabel.className = "companion-folders-label";
  foldersLabel.textContent = "Watched folders";
  panel.appendChild(foldersLabel);
  const foldersList = document.createElement("div");
  foldersList.className = "companion-folders-list";
  panel.appendChild(foldersList);
  async function refreshFolders() {
    foldersList.innerHTML = '<span class="companion-folders-loading">Loading…</span>';
    try {
      const paths = await getWatchedPaths();
      foldersList.innerHTML = "";
      if (!paths || paths.length === 0) {
        foldersList.innerHTML = '<span class="companion-folders-empty">No watched folders.</span>';
      } else {
        for (const p of paths) {
          const row = document.createElement("div");
          row.className = "companion-folder-row";
          const pathSpan = document.createElement("span");
          pathSpan.className = "companion-folder-path";
          pathSpan.textContent = p;
          const removeBtn = document.createElement("button");
          removeBtn.className = "companion-folder-remove";
          removeBtn.textContent = "✕";
          removeBtn.title = "Remove folder";
          removeBtn.addEventListener("click", async () => {
            try {
              await removeWatchedPath(p);
              await refreshFolders();
            } catch (err) {
              toast12("Remove failed: " + err.message);
            }
          });
          row.append(pathSpan, removeBtn);
          foldersList.appendChild(row);
        }
      }
    } catch {
      foldersList.innerHTML = '<span class="companion-folders-empty">Could not load (companion offline?).</span>';
    }
  }
  const addRow = document.createElement("div");
  addRow.className = "companion-add-row";
  const addInput = document.createElement("input");
  addInput.type = "text";
  addInput.className = "companion-add-input";
  addInput.placeholder = "/absolute/path";
  const addBtn = document.createElement("button");
  addBtn.className = "btn small";
  addBtn.textContent = "+ Add";
  addBtn.addEventListener("click", async () => {
    const p = addInput.value.trim();
    if (!p) return;
    const risk = looksLikeRiskyPath(p);
    if (risk && !confirm(`"${p}" looks like ${risk}.

Watching it makes the companion scan it recursively on every file lookup and save, which can be slow and exposes a large number of files. Add it anyway?`)) return;
    try {
      await addWatchedPath(p);
      addInput.value = "";
      await refreshFolders();
    } catch (err) {
      toast12("Add failed: " + err.message);
    }
  });
  addInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addBtn.click();
    }
  });
  const pickBtn = document.createElement("button");
  pickBtn.className = "btn small";
  pickBtn.textContent = "📁 Pick…";
  pickBtn.title = "Choose a folder with the native dialog (desktop companion)";
  pickBtn.addEventListener("click", async () => {
    pickBtn.disabled = true;
    try {
      const res = await pickFolder();
      if (res === null) {
        toast12("Native picker needs the desktop companion app — type a path instead.");
        return;
      }
      if (res.ok) {
        await refreshFolders();
        const risk = looksLikeRiskyPath(res.chosen || "");
        if (risk) toast12(`Heads up: that folder looks like ${risk} — watching it may be slow.`, 5e3);
      } else if (res.error) toast12("Pick failed: " + res.error);
    } catch (err) {
      toast12("Pick failed: " + err.message);
    } finally {
      pickBtn.disabled = false;
    }
  });
  addRow.append(addInput, addBtn, pickBtn);
  panel.appendChild(addRow);
  appendLogsPanel(panel);
  appendCompanionDownloadPanel(panel);
  container.prepend(panel);
  if (isCompanionAvailable()) refreshFolders();
  else foldersList.innerHTML = '<span class="companion-folders-empty">Start the Companion app to manage folders.</span>';
}

// ../../docs/core/companion-ui.js
var companionAvailable = false;
var companionLinkedPath = null;
var companionFolderRoot = null;
var loadIntakeCallback = null;
var _watchCleanup2 = null;
var _fileWatchGeneration = 0;
var _healthTimer = null;
var _availabilityGeneration = 0;
var _selfSaved = /* @__PURE__ */ new Map();
var SELF_SAVE_WINDOW_MS = 4e3;
function markSelfSaved(absPath) {
  _selfSaved.set(absPath, Date.now() + SELF_SAVE_WINDOW_MS);
}
function wasSelfSaved(absPath) {
  const expiry = _selfSaved.get(absPath);
  if (expiry == null) return false;
  if (Date.now() > expiry) {
    _selfSaved.delete(absPath);
    return false;
  }
  _selfSaved.delete(absPath);
  return true;
}
function initCompanionUi({ loadIntake: loadIntake4 }) {
  loadIntakeCallback = loadIntake4;
  setupFolderRefresh({
    getFolderContext: () => {
      if (!companionAvailable || !isEnabled() || !companionFolderRoot) return null;
      const sidebarRoot = state16.sidebarRoots?.find(
        (candidate) => candidate.id === state16.activeSidebarRootId
      );
      if (sidebarRoot?.kind !== "folder" || sidebarRoot.companionFolderRoot !== companionFolderRoot) return null;
      return {
        sidebarRoot,
        root: companionFolderRoot,
        authorizationGeneration: _availabilityGeneration
      };
    }
  });
}
function isCompanionAvailable() {
  return companionAvailable;
}
function setCompanionAvailable(v) {
  const effective = !!v && isEnabled();
  if (effective !== companionAvailable) _availabilityGeneration++;
  companionAvailable = effective;
  document.body.classList.toggle("companion-active", companionAvailable && isEnabled());
  if (!companionAvailable || !isEnabled()) {
    companionFolderRoot = null;
    state16.companionOperationToken = null;
    state16.companionReloadToken = null;
    setCompanionLinked(null, { persist: false });
    onFolderRootCleared();
  } else {
    const activeRoot = state16.sidebarRoots?.find(
      (candidate) => candidate.id === state16.activeSidebarRootId
    );
    companionFolderRoot = activeRoot?.kind === "folder" ? activeRoot.companionFolderRoot || null : null;
    setCompanionLinked(activeRoot?.kind === "file" ? activeRoot.companionLinkedPath || null : null, { persist: false });
    if (companionFolderRoot) onFolderRootResolved();
    else onFolderRootCleared();
    if (companionFolderRoot && state16.currentFolderPath) {
      const currentAbsPath = absolutePathForFile(state16.currentFolderPath);
      if (currentAbsPath) startWatching(currentAbsPath);
    }
  }
  state16.treeApi?.rerender?.();
  syncSaveBtn();
}
function hasCompanionFolderRoot() {
  return !!companionFolderRoot;
}
function resetCompanionFolderRoot() {
  _availabilityGeneration++;
  companionFolderRoot = null;
  onFolderRootCleared();
}
function activateCompanionSidebarRoot(sidebarRoot) {
  companionFolderRoot = companionAvailable && isEnabled() && sidebarRoot?.kind === "folder" ? sidebarRoot.companionFolderRoot || null : null;
  setCompanionLinked(
    companionAvailable && isEnabled() && sidebarRoot?.kind === "file" ? sidebarRoot.companionLinkedPath || null : null,
    { persist: false }
  );
  if (companionFolderRoot) onFolderRootResolved();
  else onFolderRootCleared();
  if (companionFolderRoot && state16.currentFolderPath && !state16.sidebarNavigationPending) {
    const currentAbsPath = absolutePathForFile(state16.currentFolderPath);
    if (currentAbsPath) startWatching(currentAbsPath);
  }
  syncSaveBtn();
}
function captureOperationContext() {
  return {
    authorizationGeneration: _availabilityGeneration,
    intake: state16.intake,
    activeSidebarRootId: state16.activeSidebarRootId || null,
    linkedPath: companionLinkedPath,
    folderRoot: companionFolderRoot,
    currentFolderPath: state16.currentFolderPath || null
  };
}
function beginCompanionOperation() {
  if (state16.companionOperationToken) return null;
  const token = {};
  state16.companionOperationToken = token;
  syncSaveBtn();
  return token;
}
function operationAuthorized(context, token) {
  return !!context && !!token && state16.companionOperationToken === token && companionAvailable && isEnabled() && context.authorizationGeneration === _availabilityGeneration;
}
function operationContextCurrent(context, token) {
  return operationAuthorized(context, token) && state16.intake === context.intake && (state16.activeSidebarRootId || null) === context.activeSidebarRootId && companionLinkedPath === context.linkedPath && companionFolderRoot === context.folderRoot && (state16.currentFolderPath || null) === context.currentFolderPath;
}
function finishCompanionOperation(token) {
  if (state16.companionOperationToken !== token) return;
  state16.companionOperationToken = null;
  if (state16.companionReloadToken === token) state16.companionReloadToken = null;
  syncSaveBtn();
  state16.treeApi?.rerender?.();
}
function showCompanionIndicator() {
  toast13("Companion connected — save files back to disk with 💾", 3500);
}
function promptFolderRootPicker(matches) {
  return new Promise((resolve) => {
    const modal = document.createElement("dialog");
    modal.innerHTML = `
      <h3 style="margin-top:0">Multiple matching folders found</h3>
      <p>Which folder on disk matches the dropped folder?</p>
      <ul style="list-style:none;padding:0;margin:0 0 12px">
        ${matches.map((m, i) => `<li style="margin:4px 0"><button data-idx="${i}" style="width:100%;text-align:left;padding:6px 10px;cursor:pointer">${escapeHtml3(m)}</button></li>`).join("")}
      </ul>
      <button class="cancel-btn">Cancel</button>
    `;
    modal.addEventListener("click", (e) => {
      if (e.target.dataset.idx !== void 0) {
        resolve(matches[parseInt(e.target.dataset.idx)]);
        modal.close();
        modal.remove();
      } else if (e.target.classList.contains("cancel-btn")) {
        resolve(null);
        modal.close();
        modal.remove();
      }
    });
    document.body.appendChild(modal);
    modal.showModal();
  });
}
async function resolveDroppedFolderRoot(entries, targetSidebarRoot = null) {
  if (!companionAvailable || !isEnabled() || !entries || !entries.length) return;
  const targetRoot = targetSidebarRoot || state16.sidebarRoots?.find(
    (candidate) => candidate.id === state16.activeSidebarRootId
  );
  if (targetRoot?.kind !== "folder" || !state16.sidebarRoots?.includes(targetRoot)) return;
  const resolveGeneration = (targetRoot._companionResolveGeneration || 0) + 1;
  targetRoot._companionResolveGeneration = resolveGeneration;
  const availabilityGeneration = _availabilityGeneration;
  const first = entries[0];
  const relPath = first.path || first.file?.webkitRelativePath;
  if (!relPath) return;
  const matches = await findFolder(relPath, first.file?.size ?? 0, first.file?.lastModified ?? 0).catch(() => []);
  let root = null;
  if (matches.length === 1) {
    root = matches[0];
  } else if (matches.length > 1) {
    root = await promptFolderRootPicker(matches);
  }
  if (!companionAvailable || !isEnabled() || availabilityGeneration !== _availabilityGeneration || targetRoot._companionResolveGeneration !== resolveGeneration || !state16.sidebarRoots?.includes(targetRoot)) return;
  targetRoot.companionFolderRoot = root || null;
  targetRoot._companionLinkGeneration = (targetRoot._companionLinkGeneration || 0) + 1;
  const targetStillActive = targetRoot.id === state16.activeSidebarRootId;
  if (targetStillActive) companionFolderRoot = root;
  if (root && targetStillActive) {
    syncSaveBtn();
    onFolderRootResolved();
    const currentAbsPath = absolutePathForFile(state16.currentFolderPath);
    if (currentAbsPath && state16.currentFolderPath) startWatching(currentAbsPath);
  } else if (targetStillActive) {
    onFolderRootCleared();
    syncSaveBtn();
  }
  if (targetStillActive) state16.treeApi?.rerender?.();
}
function absolutePathForFile(relPath, { sidebarPath = false } = {}) {
  if (!companionFolderRoot || !relPath) return null;
  let relFromRoot = relPath.split("/").filter(Boolean);
  if (sidebarPath) {
    const activeRoot = state16.sidebarRoots?.find(
      (candidate) => candidate.id === state16.activeSidebarRootId
    );
    if (!activeRoot || relFromRoot[0] !== activeRoot.label) return null;
    relFromRoot = relFromRoot.slice(1);
  }
  if (!relFromRoot.length) return null;
  const sep = companionFolderRoot.includes("\\") && !companionFolderRoot.includes("/") ? "\\" : "/";
  const base = companionFolderRoot.endsWith(sep) ? companionFolderRoot.slice(0, -1) : companionFolderRoot;
  return base + sep + relFromRoot.join(sep);
}
async function tryAutoLink() {
  if (!companionAvailable || !isEnabled() || !state16.intake) return;
  if (state16.currentFolderPath || companionLinkedPath) return;
  const intake = state16.intake;
  const authorizationGeneration = _availabilityGeneration;
  const { filename, size } = intake;
  let matches;
  try {
    matches = await findFile(filename, size);
  } catch {
    return;
  }
  if (matches && matches.length === 1 && companionAvailable && isEnabled() && authorizationGeneration === _availabilityGeneration && state16.intake === intake && !state16.currentFolderPath && !companionLinkedPath) {
    setCompanionLinked(matches[0]);
    syncSaveBtn();
  }
}
function setCompanionLinked(absPath, { persist: persist2 = true } = {}) {
  companionLinkedPath = absPath;
  if (persist2) {
    const activeRoot = state16.sidebarRoots?.find(
      (candidate) => candidate.id === state16.activeSidebarRootId
    );
    if (activeRoot?.kind === "file") activeRoot.companionLinkedPath = absPath || null;
  }
  const el = $10("companionLinked");
  if (!el) return;
  if (absPath) {
    el.textContent = "📁 " + absPath;
    el.hidden = false;
  } else {
    el.hidden = true;
  }
  if (absPath && companionAvailable && isEnabled()) startWatching(absPath);
  else stopWatching();
}
function startWatching(absolutePath) {
  stopWatching();
  if (!companionAvailable || !isEnabled() || !absolutePath) return;
  const generation = ++_fileWatchGeneration;
  const watchContext = {
    generation,
    authorizationGeneration: _availabilityGeneration,
    absolutePath,
    activeSidebarRootId: state16.activeSidebarRootId || null,
    currentFolderPath: state16.currentFolderPath || null,
    folderRoot: companionFolderRoot,
    linkedPath: companionLinkedPath
  };
  _watchCleanup2 = watchFile(absolutePath, (event) => {
    if (!fileWatchContextCurrent(watchContext)) return;
    if (event.kind !== "remove" && wasSelfSaved(absolutePath)) return;
    showReloadBanner(absolutePath, event.kind, watchContext);
  });
}
function stopWatching() {
  _fileWatchGeneration++;
  if (_watchCleanup2) {
    _watchCleanup2();
    _watchCleanup2 = null;
  }
  document.querySelector(".companion-reload-banner")?.remove();
}
function fileWatchContextCurrent(context) {
  return !!context && context.generation === _fileWatchGeneration && context.authorizationGeneration === _availabilityGeneration && companionAvailable && isEnabled() && (state16.activeSidebarRootId || null) === context.activeSidebarRootId && (state16.currentFolderPath || null) === context.currentFolderPath && companionFolderRoot === context.folderRoot && companionLinkedPath === context.linkedPath;
}
async function reloadFromDisk(absolutePath, watchContext = null) {
  if (!companionAvailable || !isEnabled() || state16.sidebarNavigationPending) return;
  if (watchContext && !fileWatchContextCurrent(watchContext)) return;
  const context = captureOperationContext();
  const token = beginCompanionOperation();
  if (!token) return;
  try {
    const res = await fetch(`http://127.0.0.1:7700/file?path=${encodeURIComponent(absolutePath)}`);
    if (!operationContextCurrent(context, token)) return;
    if (!res.ok) {
      toast13("Reload failed: " + res.status);
      return;
    }
    const blob = await res.blob();
    if (!operationContextCurrent(context, token)) return;
    const file = new File([blob], absolutePath.split(/[\\/]/).pop() || "file", { type: blob.type });
    const intake = await intakeFromFile(file);
    if (!operationContextCurrent(context, token)) return;
    const savedFolderPath = context.currentFolderPath;
    state16._skipDiscardGuard = true;
    state16._skipSidebarRoot = true;
    state16.companionReloadToken = token;
    const loaded = await loadIntakeCallback(intake);
    state16.companionReloadToken = null;
    if (loaded === false || !operationAuthorized(context, token)) return;
    const sidebarRoot = state16.sidebarRoots?.find(
      (candidate) => candidate.id === context.activeSidebarRootId
    );
    if (savedFolderPath) {
      const entry = sidebarRoot?.treeEntries?.find((candidate) => candidate.path === savedFolderPath);
      if (entry) {
        entry.file = file;
        entry.intake = intake;
      }
      sidebarRoot?.folderEdits?.delete(savedFolderPath);
      if (sidebarRoot) sidebarRoot.currentFolderPath = savedFolderPath;
      state16.currentFolderPath = savedFolderPath;
      state16.treeApi?.setActive?.(savedFolderPath);
      companionFolderRoot = context.folderRoot;
      if (companionFolderRoot) startWatching(absolutePath);
    } else {
      const entry = sidebarRoot?.kind === "file" ? sidebarRoot.treeEntries?.[0] : null;
      if (entry) {
        entry.file = file;
        entry.intake = intake;
      }
      sidebarRoot?.folderEdits?.clear?.();
      setCompanionLinked(absolutePath);
    }
    syncSaveBtn();
    toast13("Reloaded from disk");
  } catch (err) {
    if (operationAuthorized(context, token)) toast13("Reload error: " + err.message);
  } finally {
    state16.companionReloadToken = null;
    finishCompanionOperation(token);
  }
}
function showReloadBanner(absolutePath, kind, watchContext) {
  document.querySelector(".companion-reload-banner")?.remove();
  const banner = document.createElement("div");
  banner.className = "companion-reload-banner";
  const msg = document.createElement("span");
  msg.textContent = kind === "remove" ? "File deleted on disk" : "File changed on disk";
  const reloadBtn = document.createElement("button");
  reloadBtn.className = "reload-btn";
  reloadBtn.textContent = "Reload";
  reloadBtn.addEventListener("click", () => {
    banner.remove();
    reloadFromDisk(absolutePath, watchContext);
  });
  const dismissBtn = document.createElement("button");
  dismissBtn.className = "dismiss-btn";
  dismissBtn.textContent = "✕";
  dismissBtn.title = "Dismiss";
  dismissBtn.addEventListener("click", () => banner.remove());
  banner.append(msg, reloadBtn, dismissBtn);
  document.body.prepend(banner);
}
function syncSaveBtn() {
  const btn = $10("saveBtn");
  if (!btn) return;
  const diskActionsReady = companionAvailable && isEnabled() && !state16.sidebarNavigationPending && !state16.companionOperationToken;
  const isFolderFile = !!(state16.currentFolderPath && state16.treeEntries && !state16.sessionTree);
  const folderSaveReady = isFolderFile ? !!companionFolderRoot : true;
  const canSaveBinaryEdit = !!(state16.binaryEdit?.dirty && typeof state16.binaryEdit.getBytes === "function");
  const wholeFileLoaded = !!state16.intake && !state16.intake.truncated;
  const show = diskActionsReady && wholeFileLoaded && (!state16.intake.isBinary || canSaveBinaryEdit) && folderSaveReady;
  btn.hidden = !show;
  const delBtn = $10("deleteBtn");
  if (delBtn) {
    const linked = !!companionLinkedPath || isFolderFile && !!companionFolderRoot;
    delBtn.hidden = !(diskActionsReady && !!state16.intake && linked);
  }
  if (show || delBtn && !delBtn.hidden) layoutTopbar();
}
async function onSaveClick() {
  if (!companionAvailable || !isEnabled() || !state16.intake || state16.sidebarNavigationPending || state16.companionOperationToken) return;
  if (state16.intake.truncated) {
    syncSaveBtn();
    toast13("Save disabled: this viewer loaded only part of the file. Download a copy or reopen the complete file before saving to disk.");
    return;
  }
  const context = captureOperationContext();
  const token = beginCompanionOperation();
  if (!token) return;
  const { filename, size } = context.intake;
  $10("saveBtn").disabled = true;
  try {
    let absPath = null;
    let isCreate = false;
    if (state16.currentFolderPath && companionFolderRoot) {
      absPath = absolutePathForFile(state16.currentFolderPath);
    }
    if (!absPath) {
      absPath = companionLinkedPath;
    }
    if (!absPath) {
      let matches;
      try {
        matches = await findFile(filename, size);
      } catch (err) {
        if (operationContextCurrent(context, token)) toast13("Companion: could not search — " + err.message);
        return;
      }
      if (!operationContextCurrent(context, token)) return;
      if (!matches || matches.length === 0) {
        if (!confirm(`Couldn't find "${filename}" in your watched folders.

Do you want to create it as a new file? You'll choose which watched folder to put it in.`)) return;
        const dir = await browseForFolder({ title: `Choose a folder to create "${filename}" in:` });
        if (!operationContextCurrent(context, token)) return;
        if (!dir) return;
        absPath = joinPath(dir, filename);
        isCreate = true;
      } else if (matches.length === 1) {
        absPath = matches[0];
      } else {
        absPath = await pickCompanionPath(matches);
        if (!operationContextCurrent(context, token)) return;
        if (!absPath) return;
      }
    }
    if (!operationContextCurrent(context, token)) return;
    const isBinaryEdit = !!(state16.binaryEdit?.dirty && typeof state16.binaryEdit.getBytes === "function");
    const binaryEdit = state16.binaryEdit;
    const msg = isBinaryEdit ? `Overwrite image on disk?

${absPath}

This replaces the original file with the edited image bytes.` : `Save to:
${absPath}?`;
    if (!isCreate && !confirm(msg)) return;
    const bytes = isBinaryEdit ? await binaryEdit.getBytes() : state16.rawview ? new TextEncoder().encode(state16.rawview.getValue()) : context.intake.bytes || new TextEncoder().encode(context.intake.text || "");
    if (!operationContextCurrent(context, token) || isBinaryEdit && state16.binaryEdit !== binaryEdit) return;
    const savedFile = new File([bytes], filename, {
      type: context.intake.mimeType || "",
      lastModified: Date.now()
    });
    const savedIntake = await intakeFromFile(savedFile);
    if (!operationContextCurrent(context, token)) return;
    try {
      await saveFile(absPath, bytes);
      markSelfSaved(absPath);
      if (!operationContextCurrent(context, token)) return;
      const sidebarRoot = state16.sidebarRoots?.find(
        (candidate) => candidate.id === context.activeSidebarRootId
      );
      const storedEntry = context.currentFolderPath ? sidebarRoot?.treeEntries?.find((candidate) => candidate.path === context.currentFolderPath) : sidebarRoot?.kind === "file" ? sidebarRoot.treeEntries?.[0] : null;
      if (storedEntry) {
        storedEntry.file = savedFile;
        storedEntry.intake = savedIntake;
      }
      Object.assign(context.intake, {
        bytes: savedIntake.bytes,
        text: savedIntake.text,
        size: savedIntake.size,
        loadedBytes: savedIntake.loadedBytes,
        truncated: false
      });
      if (!state16.currentFolderPath) setCompanionLinked(absPath);
      if (isBinaryEdit) state16.binaryEdit.dirty = false;
      if (state16.sessionEdits.has(state16.intake.filename)) {
        state16.sessionIntakes.set(state16.intake.filename, { ...state16.sessionIntakes.get(state16.intake.filename), text: state16.rawview?.getValue?.() || state16.sessionEdits.get(state16.intake.filename) });
        state16.sessionEdits.delete(state16.intake.filename);
        state16.treeApi?.setEdited?.(state16.intake.filename, false);
      }
      if (state16.currentFolderPath && state16.folderEdits.has(state16.currentFolderPath)) {
        state16.folderEdits.delete(state16.currentFolderPath);
        state16.treeApi?.setEdited?.(state16.currentFolderPath, false);
      }
      state16.rawview?.markClean?.();
      state16.downloadedSinceEdit = true;
      syncSaveBtn();
      toast13((isCreate ? "Created on disk: " : "Saved to disk: ") + absPath);
    } catch (err) {
      if (operationContextCurrent(context, token)) toast13("Save failed: " + err.message);
    }
  } finally {
    $10("saveBtn").disabled = false;
    finishCompanionOperation(token);
  }
}
async function onDeleteClick() {
  if (!companionAvailable || !isEnabled() || !state16.intake || state16.sidebarNavigationPending || state16.companionOperationToken) return;
  const context = captureOperationContext();
  const token = beginCompanionOperation();
  if (!token) return;
  const { filename, size } = context.intake;
  const btn = $10("deleteBtn");
  if (btn) btn.disabled = true;
  try {
    let absPath = null;
    if (state16.currentFolderPath && companionFolderRoot) absPath = absolutePathForFile(state16.currentFolderPath);
    if (!absPath) absPath = companionLinkedPath;
    if (!absPath) {
      let matches;
      try {
        matches = await findFile(filename, size);
      } catch (err) {
        if (operationContextCurrent(context, token)) toast13("Companion: could not search — " + err.message);
        return;
      }
      if (!operationContextCurrent(context, token)) return;
      if (!matches || matches.length === 0) {
        toast13("File not found in watched folders.");
        return;
      }
      absPath = matches.length === 1 ? matches[0] : await pickCompanionPath(matches);
      if (!operationContextCurrent(context, token)) return;
      if (!absPath) return;
    }
    if (!confirm(`Delete "${filename}" from disk?

${absPath}

This permanently deletes the file and cannot be undone. (It stays open here, so you can still re-download this copy.)`)) return;
    if (!operationContextCurrent(context, token)) return;
    try {
      await deleteFile(absPath);
      if (!operationContextCurrent(context, token)) return;
      setCompanionLinked(null);
      syncSaveBtn();
      toast13("Deleted from disk: " + absPath);
    } catch (err) {
      if (operationContextCurrent(context, token)) toast13("Delete failed: " + err.message);
    }
  } finally {
    if (btn) btn.disabled = false;
    finishCompanionOperation(token);
  }
}
async function deleteTreePath({ path, isFolder, name }) {
  if (!companionAvailable || !isEnabled() || !companionFolderRoot || state16.sidebarNavigationPending || state16.companionOperationToken) {
    toast13("Companion folder not linked.");
    return;
  }
  const absPath = absolutePathForFile(path, { sidebarPath: true });
  if (!absPath) {
    toast13("Could not resolve that path on disk.");
    return;
  }
  const context = captureOperationContext();
  const token = beginCompanionOperation();
  if (!token) return;
  const msg = isFolder ? `Delete the folder "${name}" and everything inside it from disk?

${absPath}

This permanently deletes the folder and all its contents and cannot be undone.` : `Delete "${name}" from disk?

${absPath}

This permanently deletes the file and cannot be undone.`;
  if (!confirm(msg)) {
    finishCompanionOperation(token);
    return;
  }
  try {
    if (!operationContextCurrent(context, token)) return;
    await deleteFile(absPath);
    if (!operationContextCurrent(context, token)) return;
    if (companionLinkedPath === absPath) setCompanionLinked(null);
    toast13((isFolder ? "Folder deleted: " : "Deleted: ") + absPath);
    refreshFolderFromDisk({ silent: true });
  } catch (err) {
    if (operationContextCurrent(context, token)) toast13("Delete failed: " + err.message);
  } finally {
    finishCompanionOperation(token);
  }
}
async function revealTreePath({ path }) {
  if (!companionAvailable || !isEnabled() || !companionFolderRoot || state16.sidebarNavigationPending || state16.companionOperationToken) {
    toast13("Companion folder not linked.");
    return;
  }
  const absPath = absolutePathForFile(path, { sidebarPath: true });
  if (!absPath) {
    toast13("Could not resolve that path on disk.");
    return;
  }
  const context = captureOperationContext();
  const token = beginCompanionOperation();
  if (!token) return;
  try {
    await revealFile(absPath);
    if (!operationContextCurrent(context, token)) return;
  } catch (err) {
    if (operationContextCurrent(context, token)) toast13("Reveal failed: " + err.message);
  } finally {
    finishCompanionOperation(token);
  }
}
function pickCompanionPath(paths) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;";
    const card = document.createElement("div");
    card.className = "companion-picker";
    const title = document.createElement("div");
    title.className = "companion-picker-title";
    title.textContent = "Multiple matches — choose a file to save:";
    card.appendChild(title);
    for (const p of paths) {
      const btn = document.createElement("button");
      btn.className = "companion-picker-item";
      btn.textContent = p;
      btn.addEventListener("click", () => {
        overlay.remove();
        resolve(p);
      });
      card.appendChild(btn);
    }
    const cancel = document.createElement("button");
    cancel.className = "companion-picker-cancel";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", () => {
      overlay.remove();
      resolve(null);
    });
    card.appendChild(cancel);
    overlay.appendChild(card);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(null);
      }
    });
    document.body.appendChild(overlay);
  });
}
var POLL_CONNECTED_MS = 3e4;
var BACKOFF_MS = [5e3, 1e4, 3e4, 6e4];
var _backoffIdx = 0;
function scheduleHealth(ms) {
  clearTimeout(_healthTimer);
  _healthTimer = setTimeout(healthTick, ms);
}
async function healthTick() {
  _healthTimer = null;
  if (!isEnabled()) {
    scheduleHealth(BACKOFF_MS[BACKOFF_MS.length - 1]);
    return;
  }
  let ok = false;
  try {
    ok = await detectCompanion();
  } catch {
    ok = false;
  }
  if (ok !== companionAvailable) {
    setCompanionAvailable(ok);
    if (!isCompanionAvailable()) {
      if (isEnabled()) toast13("Companion disconnected — is it still running on :7700?");
    } else showCompanionIndicator();
  }
  const connected = isCompanionAvailable();
  updateConnButton(connected);
  if (connected) {
    _backoffIdx = 0;
    scheduleHealth(POLL_CONNECTED_MS);
  } else {
    scheduleHealth(BACKOFF_MS[Math.min(_backoffIdx++, BACKOFF_MS.length - 1)]);
  }
}
function startHealthCheck() {
  if (_healthTimer) return;
  _backoffIdx = 0;
  scheduleHealth(companionAvailable ? POLL_CONNECTED_MS : BACKOFF_MS[0]);
}
function updateConnButton(connected) {
  const btn = $10("companionStatusBtn");
  if (!btn) return;
  if (!isEnabled()) {
    btn.hidden = true;
    return;
  }
  btn.hidden = false;
  btn.classList.toggle("conn-up", connected);
  btn.classList.toggle("conn-down", !connected);
  btn.textContent = connected ? "●" : "❗";
  btn.title = connected ? "Companion connected (127.0.0.1:7700)" : "Companion not reachable — click to retry / how to start it";
}
async function onConnButtonClick() {
  if (!isEnabled()) return;
  let ok = await detectCompanion();
  if (!ok) {
    toast13("Trying to start the Companion…", 2500);
    try {
      const f = document.createElement("iframe");
      f.style.display = "none";
      f.src = "fvcompanion://start";
      document.body.appendChild(f);
      setTimeout(() => f.remove(), 1500);
    } catch {
    }
    for (let i = 0; i < 8 && !ok; i++) {
      await new Promise((r) => setTimeout(r, 700));
      ok = await detectCompanion().catch(() => false);
    }
  }
  setCompanionAvailable(ok);
  const connected = isCompanionAvailable();
  updateConnButton(connected);
  if (connected) {
    _backoffIdx = 0;
    startHealthCheck();
    showCompanionIndicator();
  } else {
    toast13("Could not reach or start the Companion. Start it manually (the tray app or companion.exe in your fv-companion folder); it connects automatically. See ⋯ Settings → Companion to get it.", 9e3);
  }
}
function detectCompanionOnStartup() {
  if (!isEnabled()) return;
  detectCompanion().then((ok) => {
    setCompanionAvailable(ok);
    const connected = isCompanionAvailable();
    if (connected) showCompanionIndicator();
    updateConnButton(connected);
    startHealthCheck();
  });
}

// ../../docs/core/session-tree.js
import { $ as $11, state as state17 } from "./state.js";
var loadIntakeCallback2 = null;
function initSessionTree({ loadIntake: loadIntake4 }) {
  loadIntakeCallback2 = loadIntake4;
}
function updateSessionTree(intake, { skipSidebarRoot = false } = {}) {
  if (state17.skipNextFileSidebarRoot) {
    state17.skipNextFileSidebarRoot = false;
    return;
  }
  if (!skipSidebarRoot) addFileRoot(intake);
  if (state17.sidebarRoots?.length) return;
  if (state17.treeEntries && !state17.sessionTree) return;
  const alreadyTracked = state17.sessionIntakes.has(intake.filename);
  state17.sessionIntakes.set(intake.filename, intake);
  if (state17.sessionIntakes.size < 2) return;
  if (state17.sessionTree && alreadyTracked) {
    state17.treeApi?.setActive?.(intake.filename);
    state17.treeApi?.setEdited?.(intake.filename, state17.sessionEdits.has(intake.filename));
    return;
  }
  const entries = [...state17.sessionIntakes.entries()].map(([name, si]) => ({
    file: new File([si.bytes || (si.text != null ? si.text : "")], name),
    path: name
  }));
  state17.treeEntries = entries;
  state17.sessionTree = true;
  state17.folderMoves = /* @__PURE__ */ new Map();
  if (state17.treeApi) state17.treeApi.stop();
  state17.treeApi = renderTree($11("ftBody"), buildTree(entries), { onOpen: (node) => {
    flushSessionEdit();
    const edited = state17.sessionEdits.get(node.path);
    const si = edited != null ? intakeFromText(edited, node.path) : state17.sessionIntakes.get(node.path);
    if (!si) return;
    state17._skipDiscardGuard = true;
    loadIntakeCallback2(si);
  } });
  $11("ftRoot").textContent = "Session";
  $11("ftRoot").title = "Session files";
  $11("repoBtn").hidden = true;
  $11("ftExportBtn").hidden = true;
  $11("ftSearch").hidden = true;
  $11("treeBtn").hidden = false;
  setTree(true);
  state17.treeApi.setActive(intake.filename);
  for (const path of state17.sessionEdits.keys()) state17.treeApi.setEdited(path, true);
}
function flushSessionEdit() {
  if (state17.currentFolderPath || !state17.rawview?.isDirty()) return false;
  const filename = state17.intake?.filename;
  if (!filename || !state17.sessionIntakes.has(filename)) return false;
  const text = state17.rawview.getValue();
  state17.sessionEdits.set(filename, text);
  state17.sessionIntakes.set(filename, { ...state17.sessionIntakes.get(filename), text });
  state17.treeApi?.setEdited?.(filename, true);
  return true;
}
async function createNewFile() {
  const name = prompt("New file name (include an extension, e.g. notes.md, script.js, data.json):", "untitled.txt");
  if (name == null) return;
  const filename = name.trim() || "untitled.txt";
  if (state17.type && !$11("workspace").hidden) {
    flushFolderEdit();
    const prevName = state17.intake.filename;
    const prevText = state17.rawview ? state17.rawview.getValue() : state17.intake.text || "";
    const prevFile = new File([prevText], prevName, { type: "text/plain" });
    const newFile = new File([""], filename, { type: "text/plain" });
    const entries = [{ file: prevFile, path: prevName }, { file: newFile, path: filename }];
    state17.sessionTree = false;
    state17.sessionIntakes = /* @__PURE__ */ new Map();
    state17.sessionEdits = /* @__PURE__ */ new Map();
    state17.treeEntries = entries;
    state17.folderEdits = /* @__PURE__ */ new Map([[prevName, prevText]]);
    state17.folderMoves = /* @__PURE__ */ new Map();
    state17.folderExported = false;
    const tree = buildTree(entries);
    state17.treeApi = renderTree($11("ftBody"), tree, { onOpen: (node) => {
      const stashed = state17.folderEdits.get(node.path);
      const intake = stashed != null ? intakeFromText(stashed, node.path.split("/").pop()) : intakeFromText("", node.path.split("/").pop());
      state17._skipDiscardGuard = true;
      loadIntakeCallback2(intake).then(() => {
        state17.currentFolderPath = node.path;
      });
    } });
    $11("ftRoot").textContent = "New files";
    $11("ftRoot").title = "New files";
    $11("repoBtn").hidden = true;
    $11("ftExportBtn").hidden = true;
    $11("ftSearch").hidden = true;
    $11("treeBtn").hidden = false;
    setTree(true);
    state17._skipDiscardGuard = true;
  }
  await loadIntakeCallback2(intakeFromText("", filename));
  if (state17.treeEntries) {
    state17.currentFolderPath = filename;
    state17.treeApi?.setActive?.(filename);
  }
  requestAnimationFrame(() => state17.rawview?.focus?.());
}

// ../../docs/core/viewer-open.js
import { state as state18 } from "./state.js";
var loadIntakeCallback3 = null;
var viewerActionsPromise3 = null;
function viewerActions3() {
  if (!viewerActionsPromise3) viewerActionsPromise3 = import("../games/metagame/viewer-actions.js");
  return viewerActionsPromise3;
}
function initViewerOpen({ loadIntake: loadIntake4 }) {
  loadIntakeCallback3 = loadIntake4;
}
async function openExampleFile(path, opts = {}) {
  const clean = String(path || "").replace(/^\/?docs\/examples\//, "").replace(/^\/?examples\//, "");
  if (!clean) return false;
  const index = await fetch("examples/summary.json").then((r) => r.ok ? r.json() : []).catch(() => []);
  const meta = Array.isArray(index) ? index.find((entry) => entry.file === clean) : null;
  const res = await fetch("examples/" + clean);
  if (!res.ok) return false;
  const buf = new Uint8Array(await res.arrayBuffer());
  state18._skipDiscardGuard = true;
  await loadIntakeCallback3(await intakeFromFile(new File([buf], clean.split("/").pop(), { type: opts.mime || meta?.mime || "" })));
  return true;
}
async function openViewerFile(path, opts = {}) {
  const target = String(path || "");
  if (opts.text != null) {
    state18._skipDiscardGuard = true;
    await loadIntakeCallback3(intakeFromText(String(opts.text), target.split("/").pop() || opts.filename || "generated.txt"));
    viewerActions3().then(({ recordMetagameViewerOpen }) => recordMetagameViewerOpen({ path: target, opts }));
    return true;
  }
  if (target.includes("/docs/bts/") || target.includes("/bts/")) {
    const clean = target.replace(/^\/?docs\/bts\//, "").replace(/^\/?bts\//, "");
    const res = await fetch("bts/" + clean);
    if (!res.ok) return false;
    const text = await res.text();
    state18._skipDiscardGuard = true;
    await loadIntakeCallback3(intakeFromText(text, clean));
    viewerActions3().then(({ recordMetagameViewerOpen }) => recordMetagameViewerOpen({ path: target, opts }));
    return true;
  }
  const opened = await openExampleFile(target, opts);
  if (opened) viewerActions3().then(({ recordMetagameViewerOpen }) => recordMetagameViewerOpen({ path: target, opts }));
  return opened;
}
async function openBlobFile(blob, name, opts = {}) {
  if (!blob || !loadIntakeCallback3) return false;
  const filename = name || "recording";
  const type = opts.mime || blob.type || "";
  state18._skipDiscardGuard = true;
  await loadIntakeCallback3(await intakeFromFile(new File([blob], filename, { type })));
  viewerActions3().then(({ recordMetagameViewerOpen }) => recordMetagameViewerOpen({ path: filename, opts }));
  return true;
}
async function searchViewerFile(path, query, opts = {}) {
  const target = String(path || "");
  const clean = target.replace(/^\/?docs\/examples\//, "").replace(/^\/?examples\//, "");
  const text = opts.text || (state18.intake?.filename === clean.split("/").pop() ? state18.rawview?.getValue?.() || state18.intake.text : null);
  const sourceText = text == null ? await fetch("examples/" + clean).then((r) => r.ok ? r.text() : "").catch(() => "") : text;
  const line = sourceText.split(/\r?\n/).find((entry) => entry.includes(query));
  const result = line && line.trim();
  viewerActions3().then(({ recordStage2SearchResult, recordStage7Search, recordStage10EchoSearch }) => {
    recordStage2SearchResult({ file: target || clean, query, result });
    recordStage7Search({ file: target || clean, query, result });
    recordStage10EchoSearch({ file: target || clean, query, result });
  });
  return { found: Boolean(result), result };
}

// ../../docs/core/global-screensaver.js
var IDLE_MS = 3e5;
var STATE_MS = 1800;
var PULSE_MS = 1600;
var BOOT = [
  "\n  ┌────────────────────────────────┐\n  │  FILE  VIEWER  OS  v0.1         │\n  │                                │\n  │  Booting...                    │\n  └────────────────────────────────┘",
  "\n  ┌────────────────────────────────┐\n  │  FILE  VIEWER  OS  v0.1         │\n  │                                │\n  │  Booting... ▓▓▓▓▓▓              │\n  └────────────────────────────────┘",
  "\n  ┌────────────────────────────────┐\n  │  FILE  VIEWER  OS  v0.1         │\n  │  ██████████████████████████    │\n  │  Initializing subsystems...    │\n  └────────────────────────────────┘",
  "\n  ┌────────────────────────────────┐\n  │  FILE  VIEWER  OS  v0.1         │\n  │  ██████████████████████████    │\n  │  [ OK ] ansi-palette ready     │\n  └────────────────────────────────┘",
  "\n  ┌────────────────────────────────┐\n  │  FILE  VIEWER  OS  v0.1         │\n  │  ██████████████████████████    │\n  │  All systems nominal.          │\n  └────────────────────────────────┘",
  "\n  ┌────────────────────────────────┐\n  │  FILE  VIEWER  OS  v0.1         │\n  │                                │\n  │  > _                           │\n  └────────────────────────────────┘"
];
var IDLE_FRAMES = [
  "\n  ╔════════════════════════════════╗\n  ║        SCREENSAVER ACTIVE       ║\n  ║                                ║\n  ║    move or press any key       ║\n  ║          to dismiss            ║\n  ╚════════════════════════════════╝",
  "\n  ╔════════════════════════════════╗\n  ║        SCREENSAVER ACTIVE       ║\n  ║                                ║\n  ║                                ║\n  ║                                ║\n  ╚════════════════════════════════╝"
];
function suppressed() {
  if (document.hidden) return true;
  if (document.fullscreenElement) return true;
  const games = document.querySelector(".games-overlay");
  if (games && !games.hidden) return true;
  for (const el of document.querySelectorAll("video, audio")) {
    if (!el.paused && !el.ended && el.readyState > 2) return true;
  }
  return false;
}
function installGlobalScreensaver() {
  let idleTimer = 0, frameTimer = 0, overlay = null, pre = null, i = 0;
  function paint(text) {
    if (pre) pre.textContent = text;
  }
  function step() {
    if (i < BOOT.length) {
      paint(BOOT[i]);
      i++;
      frameTimer = setTimeout(step, STATE_MS);
    } else {
      paint(IDLE_FRAMES[(i - BOOT.length) % IDLE_FRAMES.length]);
      i++;
      frameTimer = setTimeout(step, PULSE_MS);
    }
  }
  function show() {
    if (overlay || suppressed()) {
      arm();
      return;
    }
    overlay = document.createElement("div");
    overlay.className = "fv-ss-overlay";
    pre = document.createElement("pre");
    pre.className = "fv-ss-pre";
    overlay.appendChild(pre);
    (document.getElementById("app") || document.body).appendChild(overlay);
    requestAnimationFrame(() => overlay && overlay.classList.add("fv-ss-on"));
    i = 0;
    step();
  }
  function dismiss() {
    clearTimeout(frameTimer);
    frameTimer = 0;
    if (overlay) {
      overlay.remove();
      overlay = null;
      pre = null;
    }
    arm();
  }
  function arm() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(show, IDLE_MS);
  }
  function onActivity() {
    if (overlay) dismiss();
    else arm();
  }
  const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "wheel", "scroll"];
  EVENTS.forEach((ev) => document.addEventListener(ev, onActivity, { passive: true, capture: true }));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && overlay) dismiss();
    else arm();
  });
  arm();
  const api = {
    force() {
      clearTimeout(idleTimer);
      show();
      return !!overlay;
    },
    isActive: () => !!overlay,
    dismiss,
    suppressed
  };
  try {
    window.__fvScreensaver = api;
  } catch {
  }
  return api;
}

// ../../docs/core/detect-lite.js
var litePromise = null;
function liteData() {
  if (!litePromise) {
    litePromise = fetch("core/detect-lite.generated.json").then((res) => res.ok ? res.json() : { types: [] }).catch(() => ({ types: [] }));
  }
  return litePromise;
}
function extensionOf(filename) {
  const base = String(filename || "").toLowerCase().split("/").pop();
  const idx = base.lastIndexOf(".");
  return idx > 0 ? base.slice(idx + 1) : "";
}
async function rankLiteCandidates(intake, limit = 5) {
  const data = await liteData();
  const ext = extensionOf(intake?.filename);
  const mime = String(intake?.mimeType || "").toLowerCase();
  const rows = [];
  for (const type of data.types || []) {
    let score = 0;
    if (ext && type.extensions?.includes(ext)) score += 2;
    if (mime && type.mimes?.some((needle) => mime.includes(needle))) score += 1;
    if (score > 0) rows.push({ type, score });
  }
  rows.sort((a, b) => b.score - a.score || a.type.label.localeCompare(b.type.label));
  return rows.slice(0, limit);
}

// ../../docs/core/request-lifecycle.js
function once(fn, onError) {
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    try {
      fn();
    } catch (error) {
      onError?.(error);
    }
  };
}
function createLatestRequestController({ onCleanupError } = {}) {
  let sequence = 0;
  let current = null;
  function begin(snapshot = {}) {
    current?.dispose("superseded");
    const aborter = new AbortController();
    const cleanups = /* @__PURE__ */ new Set();
    const cleanupByFunction = /* @__PURE__ */ new Map();
    let disposed = false;
    const request = {
      id: ++sequence,
      snapshot: Object.freeze({ ...snapshot }),
      signal: aborter.signal,
      isCurrent() {
        return current === request && !disposed;
      },
      registerCleanup(fn) {
        if (typeof fn !== "function") return () => {
        };
        if (cleanupByFunction.has(fn)) return cleanupByFunction.get(fn).release;
        const cleanup = once(fn, onCleanupError);
        if (disposed) {
          cleanup();
          return () => {
          };
        }
        cleanups.add(cleanup);
        const release = () => {
          cleanups.delete(cleanup);
          cleanupByFunction.delete(fn);
        };
        cleanupByFunction.set(fn, { cleanup, release });
        return release;
      },
      dispose(reason = "invalidated") {
        if (disposed) return;
        disposed = true;
        if (current === request) current = null;
        try {
          aborter.abort(reason);
        } catch {
          aborter.abort();
        }
        for (const cleanup of [...cleanups].reverse()) cleanup();
        cleanups.clear();
        cleanupByFunction.clear();
      }
    };
    current = request;
    return request;
  }
  return {
    begin,
    invalidate(reason) {
      current?.dispose(reason);
    },
    isCurrent(request) {
      return current === request && request?.isCurrent();
    },
    current() {
      return current;
    }
  };
}

// ../../docs/core/app.js
var previewRequests = createLatestRequestController({
  onCleanupError: (error) => console.warn("Preview cleanup failed:", error)
});
var activationRequests = createLatestRequestController({
  onCleanupError: (error) => console.warn("Activation cleanup failed:", error)
});
function beginActivation(intake) {
  previewRequests.invalidate("new activation intent");
  return activationRequests.begin({ intake });
}
function activationIsCurrent(activation) {
  return activationRequests.isCurrent(activation) && activation.snapshot.intake === state19.intake;
}
function snapshotSettings(values) {
  try {
    return structuredClone(values || {});
  } catch {
    return { ...values || {} };
  }
}
var previewTestHook = null;
async function previewCheckpoint(stage, request) {
  if (typeof previewTestHook !== "function") return;
  await previewTestHook({
    stage,
    id: request.id,
    snapshot: request.snapshot,
    signal: request.signal,
    onCleanup: (cleanup) => request.registerCleanup(cleanup)
  });
}
var knownRegistryPromise = null;
function knownRegistry() {
  if (!knownRegistryPromise) knownRegistryPromise = import("../known/registry.generated.js");
  return knownRegistryPromise;
}
var detectRuntimePromise = null;
function detectRuntime() {
  if (!detectRuntimePromise) detectRuntimePromise = import("./detect.js");
  return detectRuntimePromise;
}
var registryRuntimePromise = null;
function registryRuntime() {
  if (!registryRuntimePromise) registryRuntimePromise = import("./registry-runtime.generated.js");
  return registryRuntimePromise;
}
var typeSelectPromise = null;
function typeSelectRuntime() {
  if (!typeSelectPromise) typeSelectPromise = import("./type-select.js");
  return typeSelectPromise;
}
async function loadIntake3(intake, { sidebarNavigationToken = null } = {}) {
  if (state19.sidebarNavigationPending && sidebarNavigationToken !== state19.sidebarNavigationToken) return false;
  if (state19.companionOperationToken && state19.companionReloadToken !== state19.companionOperationToken) return false;
  const fromTree = state19._skipDiscardGuard;
  const skipSidebarRoot = state19._skipSidebarRoot;
  if (fromTree && !state19.sidebarNavigationPending && !flushSessionEdit()) captureActiveSidebarRoot();
  if (state19._skipDiscardGuard) state19._skipDiscardGuard = false;
  if (state19._skipSidebarRoot) state19._skipSidebarRoot = false;
  else {
    const retainedSessionEdit = flushSessionEdit();
    const retainedSidebarEdit = retainedSessionEdit ? false : captureActiveSidebarRoot();
    const retainedCurrentEdit = retainedSessionEdit || retainedSidebarEdit;
    const onlyRetainedSessionEdits = (state19.sessionEdits.size > 0 || retainedSidebarEdit) && state19.folderEdits.size === 0 && !state19.binaryEdit?.dirty && !(state19.rawview?.isDirty() && !retainedCurrentEdit);
    if (!onlyRetainedSessionEdits && !confirmDiscard()) return false;
  }
  if (!fromTree) {
    state19.folderEdits = /* @__PURE__ */ new Map();
    state19.folderMoves = /* @__PURE__ */ new Map();
    state19.folderExported = false;
    clearArchiveTree({ keepRoot: true });
  }
  if (intake.truncated) {
    const mb = (intake.size / 1048576).toFixed(0);
    const shown = (intake.loadedBytes / 1048576).toFixed(0);
    if (!confirm(`This file is ${mb} MB — too large to load fully. Only the first ${shown} MB will be shown. Open anyway?`)) return false;
  } else if (!intake.streamed && intake.size > LARGE_FILE_BYTES) {
    const mb = (intake.size / 1048576).toFixed(1);
    if (!confirm(`This file is ${mb} MB. Large files may be slow in the editor. Open anyway?`)) return false;
  }
  const activation = beginActivation(intake);
  state19.downloadedSinceEdit = true;
  state19.binaryEdit = null;
  state19.currentFolderPath = null;
  state19.intake = intake;
  metaBtnClicks = 0;
  clearTimeout(_metaBtnTimer);
  setCompanionLinked(null, { persist: false });
  if (!fromTree) resetCompanionFolderRoot();
  const liteCandidates = await rankLiteCandidates(intake);
  if (!activationIsCurrent(activation)) return false;
  if (liteCandidates.length) {
    showFileLoading("Detecting file type", { detail: liteCandidates.map((row) => row.type.label).join(", ") });
  }
  const [{ pickType }, { populateTypeSelect }] = await Promise.all([detectRuntime(), typeSelectRuntime()]);
  if (!activationIsCurrent(activation)) return false;
  const enableEmulators = readGlobalKey("enableEmulators", false) === true;
  const { type, ranking } = pickType(intake, { enableEmulators });
  const { matchAllKnown } = await knownRegistry();
  if (!activationIsCurrent(activation)) return false;
  state19.knownCandidates = matchAllKnown(intake, ranking);
  populateTypeSelect(ranking, type.id, !!state19.settingsModel?.values?.showAllTypes, intake, state19.knownCandidates);
  if (!await activateType(type, null, activation)) return false;
  if (!activationIsCurrent(activation)) return false;
  showFileLoading(null);
  if (intake.truncated) {
    const shown = (intake.loadedBytes / 1048576).toFixed(0);
    const total = (intake.size / 1048576).toFixed(0);
    toast14(`Large file: showing the first ${shown} MB of ${total} MB.`, 6e3);
  }
  updateSessionTree(intake, { skipSidebarRoot });
  applyLayout();
  if (!fromTree) tryAutoLink();
  maybeUnlockEasteregg(intake.text);
  return true;
}
function maybeUnlockEasteregg(text) {
  if (!text || !state19.games || state19.games.isUnlocked()) return;
  if (!/(^|\n)\s*import\s+easteregg\b/.test(text)) return;
  state19.games.unlock();
  $12("gamesBtn").hidden = false;
  toast14("🎮 import easteregg — arcade unlocked!");
  state19.games.open();
}
function showFileLoading(message, { detail = "" } = {}) {
  let el = document.getElementById("fileLoadStatus");
  if (!message) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("div");
    el.id = "fileLoadStatus";
    el.className = "file-loading";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.innerHTML = '<span class="boot-spinner-ring" aria-hidden="true"></span><span class="file-loading-copy"><span class="file-loading-label"></span><span class="file-loading-detail"></span></span>';
    document.body.appendChild(el);
  }
  el.querySelector(".file-loading-label").textContent = message;
  const detailEl = el.querySelector(".file-loading-detail");
  detailEl.textContent = detail;
  detailEl.hidden = !detail;
}
async function openFolderEntries(entries) {
  const folderRoot = await loadFolder(entries);
  if (!folderRoot) return false;
  resolveDroppedFolderRoot(entries, folderRoot);
  return true;
}
function showIntake() {
  $12("intake").hidden = false;
  $12("workspace").hidden = true;
  $12("repoPanel").hidden = true;
  if (isMobile5()) layoutTopbar();
}
async function openSidebarDropSideBySide(node) {
  if (!state19.intake) return;
  if (!node?.file) {
    toast14("Could not find that sidebar file.");
    return;
  }
  try {
    const path = node.path || node.sidebarInnerPath || node.file.name;
    const edited = state19.folderEdits?.get(path) ?? state19.sessionEdits?.get(path);
    const intake2 = edited != null ? intakeFromText(edited, path.split("/").pop()) : await intakeFromFile(node.file);
    const { openSideBySideWithIntake } = await import("./sidebyside.js");
    await openSideBySideWithIntake(intake2);
  } catch (err) {
    toast14("Could not read file: " + err.message);
  }
}
async function activateType(type, knownOverride = null, activation = null) {
  const request = activation || beginActivation(state19.intake);
  const intake = request.snapshot.intake;
  const [settingsModel, { matchKnown }] = await Promise.all([
    getModel(type),
    knownRegistry()
  ]);
  if (!activationIsCurrent(request)) return false;
  state19.type = type;
  state19.settingsModel = settingsModel;
  state19.known = knownOverride || matchKnown(intake, type);
  state19.forceBase = false;
  updateEnhanceChip();
  $12("intake").hidden = true;
  $12("workspace").hidden = false;
  $12("repoPanel").hidden = true;
  $12("fileId").hidden = false;
  $12("fileName").textContent = state19.intake.filename;
  $12("settingsBtn").hidden = false;
  $12("metaBtn").hidden = false;
  $12("typeHelpBtn").hidden = false;
  const canRaw = type.capabilities.rawView;
  $12("previewOnlyBadge").hidden = canRaw !== false;
  const canPreview = type.capabilities.preview || !!state19.known && !state19.forceBase;
  const canDiff = type.capabilities.diff && canRaw && !state19.intake.isBinary;
  const canCompare = canRaw && !state19.intake.isBinary;
  const both = canRaw && canPreview;
  $12("viewMode").hidden = !both || isMobile5();
  $12("rawMode").hidden = !canDiff;
  $12("compareBtn").hidden = !canCompare;
  $12("downloadBtn").hidden = !canDiff;
  $12("formatBtn").hidden = !(canRaw && ["json", "code"].includes(type.id));
  syncSaveBtn();
  $12("tabbar").style.display = both && isMobile5() ? "flex" : "none";
  $12("screenshotBtn").hidden = !(type.capabilities.screenshot && canPreview);
  const preferredMode = ["raw", "split", "preview"].includes(type.preferredMode) ? type.preferredMode : "split";
  state19.mode = both ? preferredMode : canPreview && !canRaw ? "preview" : "raw";
  state19.rawMode = "current";
  resetCompare();
  state19.tab = both ? isMobile5() ? "preview" : "raw" : canPreview && !canRaw ? "preview" : "raw";
  state19.htmlAllowScripts = false;
  state19.htmlAsked = false;
  if (canRaw) {
    const built = await buildRawView({
      isCurrent: () => activationIsCurrent(request),
      signal: request.signal
    });
    if (built === false || !activationIsCurrent(request)) return false;
  } else {
    state19.rawview?.dispose();
    state19.rawview = null;
    $12("editor").innerHTML = "";
  }
  clearPreview();
  if (canPreview) await renderPreview3();
  else clearPreview();
  if (!activationIsCurrent(request)) return false;
  applyLayout();
  if (isMobile5()) layoutTopbar();
  return true;
}
async function renderPreview3() {
  const type = state19.type;
  const intake = state19.intake;
  if (!type || !intake) {
    clearPreview();
    return false;
  }
  const known = state19.known;
  const forceBase = state19.forceBase;
  const useKnown = known && !forceBase;
  const snapshot = {
    intake,
    type,
    known,
    forceBase,
    renderMode: useKnown ? "enhanced" : "default",
    layoutMode: state19.mode,
    mobile: isMobile5(),
    settingsModel: state19.settingsModel,
    settings: snapshotSettings(state19.settingsModel?.values),
    folder: folderContext(),
    htmlAllowScripts: state19.htmlAllowScripts,
    htmlAsked: state19.htmlAsked,
    theme: themeIsDark2() ? "dark" : "light"
  };
  const request = previewRequests.begin(snapshot);
  if (!useKnown && !type.loadRenderer) {
    if (request.isCurrent()) clearMountedPreview();
    request.dispose("no renderer");
    return false;
  }
  let rendered;
  try {
    await previewCheckpoint("request-started", request);
    if (!request.isCurrent()) return false;
    const mod = useKnown ? await known.loadRenderer() : await type.loadRenderer();
    if (!request.isCurrent()) return false;
    await previewCheckpoint("module-loaded", request);
    if (!request.isCurrent()) return false;
    const ctx = {
      settings: snapshot.settings,
      folder: snapshot.folder,
      signal: request.signal,
      onCleanup: (cleanup) => request.registerCleanup(cleanup),
      onBinaryEdit: (edit) => {
        if (!request.isCurrent()) return;
        if (state19.archiveTree && state19.currentFolderPath && edit?.dirty) {
          (state19.binaryEdits = state19.binaryEdits || /* @__PURE__ */ new Map()).set(state19.currentFolderPath, edit);
        }
        state19.binaryEdit = edit || null;
        state19.downloadedSinceEdit = !edit?.dirty;
        syncSaveBtn();
      },
      openIntake: async (innerIntake, activePath = null) => {
        if (!request.isCurrent()) return false;
        state19._skipDiscardGuard = true;
        const loaded = await loadIntake3(innerIntake);
        if (loaded !== false && activePath && state19.intake === innerIntake) state19.treeApi?.setActive?.(activePath);
        return loaded;
      },
      toast: (...args) => {
        if (request.isCurrent()) toast14(...args);
      }
    };
    if (type.id === "html") ctx.allowScripts = snapshot.htmlAllowScripts;
    rendered = await mod.render(intake, ctx);
    if (rendered?.revoke) request.registerCleanup(rendered.revoke);
    if (rendered?.destroy && rendered.destroy !== rendered.revoke) request.registerCleanup(rendered.destroy);
    if (!request.isCurrent()) return false;
    await previewCheckpoint("rendered", request);
    if (!request.isCurrent()) return false;
    await previewCheckpoint("before-commit", request);
    if (!request.isCurrent()) return false;
  } catch (err) {
    if (!request.isCurrent()) return false;
    clearMountedPreview();
    if (!navigator.onLine) $12("previewHost").innerHTML = offlineMissHtml();
    else $12("previewHost").innerHTML = '<p style="padding:16px;color:var(--danger)">Preview failed: ' + escapeHtml4(err.message) + "</p>";
    request.dispose("render failed");
    updateExportButton();
    return false;
  }
  if (type.id === "html" && rendered.containsScripts && !snapshot.htmlAllowScripts && !snapshot.htmlAsked) {
    if (!request.isCurrent()) return false;
    state19.htmlAsked = true;
    if (confirm("This HTML contains scripts. Run them in a sandboxed iframe?\n\nThey cannot access this page or your data, but only continue if you trust the source. Cancel to view it sanitized (scripts removed).")) {
      if (!request.isCurrent()) return false;
      state19.htmlAllowScripts = true;
      request.dispose("HTML script choice changed");
      return renderPreview3();
    }
  }
  if (!request.isCurrent()) return false;
  clearMountedPreview();
  if (rendered.parentNode) {
    $12("previewHost").appendChild(rendered.parentNode);
    if (rendered.archiveTree && request.isCurrent()) {
      mountArchiveTree(rendered.archiveTree, rendered.openEntry, loadIntake3, intake);
    }
    state19.lastBodyHtml = rendered.bodyHtml || null;
    state19.previewCleanup = () => request.dispose("preview unmounted");
    state19.preview = { iframe: null, highlight() {
    }, scrollTo() {
    }, destroy() {
      $12("previewHost").innerHTML = "";
    } };
    updateExportButton();
    return true;
  }
  if (rendered.archiveTree && request.isCurrent()) {
    mountArchiveTree(rendered.archiveTree, rendered.openEntry, loadIntake3, intake);
  }
  state19.lastBodyHtml = rendered.fullDoc ? null : rendered.bodyHtml;
  const preview = mountPreview($12("previewHost"), {
    bodyHtml: rendered.bodyHtml,
    fullDoc: rendered.fullDoc,
    allowScripts: !!rendered.ranScripts,
    theme: snapshot.theme,
    style: previewStyle(snapshot.settings),
    onSelect: (src) => {
      if (request.isCurrent()) mapPreviewToRaw(src);
    },
    onHover: (src) => {
      if (request.isCurrent()) mapPreviewToRaw(src, false);
    },
    onScroll: (ratio) => {
      if (request.isCurrent()) syncScrollFromPreview(ratio);
    },
    onOpen: rendered.openEntry ? (name) => {
      if (request.isCurrent()) openInnerEntry(guardedOpenEntry(request, rendered.openEntry), name);
    } : void 0
  });
  request.registerCleanup(() => preview.destroy());
  state19.preview = preview;
  state19.previewCleanup = () => request.dispose("preview unmounted");
  if (rendered.hadUnsafe && request.isCurrent()) toast14("Some unsafe HTML (scripts/handlers) was removed for safety.");
  updateExportButton();
  return true;
}
function guardedOpenEntry(request, openEntry) {
  if (typeof openEntry !== "function") return void 0;
  return async (...args) => {
    if (!request.isCurrent()) return null;
    return openEntry(...args);
  };
}
function clearMountedPreview() {
  const cleanup = state19.previewCleanup;
  state19.previewCleanup = null;
  if (cleanup) cleanup();
  else state19.preview?.destroy();
  state19.preview = null;
  state19.lastBodyHtml = null;
  updateExportButton();
  $12("previewHost").innerHTML = "";
}
function clearPreview() {
  previewRequests.invalidate("preview cleared");
  clearMountedPreview();
}
async function openInnerEntry(openEntry, name) {
  try {
    if (state19.archiveTree && state19.archiveOpenNode) {
      await state19.archiveOpenNode(name);
      return;
    }
    const intake = await openEntry(name);
    if (!intake) {
      toast14("Could not open " + name);
      return;
    }
    state19._skipDiscardGuard = true;
    await loadIntake3(intake);
    state19.treeApi?.setActive?.(name);
  } catch {
    toast14("Could not open " + name);
  }
}
function updateEnhanceChip() {
  const chip = $12("enhanceChip");
  if (!state19.known) {
    chip.hidden = true;
    return;
  }
  chip.hidden = false;
  const showingEnhanced = !state19.forceBase;
  chip.querySelector(".ec-label").textContent = (showingEnhanced ? "✦ Enhanced: " : "Plain view — ") + state19.known.label;
  const btn = chip.querySelector(".ec-toggle");
  btn.textContent = showingEnhanced ? "Show default view" : "Show enhanced view";
}
async function toggleEnhance() {
  if (!state19.known) return;
  state19.forceBase = !state19.forceBase;
  const expected = {
    intake: state19.intake,
    type: state19.type,
    known: state19.known,
    forceBase: state19.forceBase
  };
  updateEnhanceChip();
  await renderPreview3();
  if (state19.intake !== expected.intake || state19.type !== expected.type || state19.known !== expected.known || state19.forceBase !== expected.forceBase) return;
  applyLayout();
}
function openSettings2() {
  renderSettings($12("settingsBody"), state19.settingsModel, { onChange: onSettingsChange, toast: toast14 });
  renderCompanionSettings($12("settingsBody"));
}
async function onSettingsChange(model, changedKey) {
  state19.rawview?.updateOptions(monacoOptions(model));
  if (changedKey === "showAllTypes") {
    persistGlobalKey("showAllTypes", model.values.showAllTypes);
    if (state19.intake && state19.type) {
      const [{ pickType }, { populateTypeSelect }] = await Promise.all([detectRuntime(), typeSelectRuntime()]);
      const { ranking } = pickType(state19.intake, {
        enableEmulators: readGlobalKey("enableEmulators", false) === true
      });
      const selId = state19.known && !state19.forceBase ? "known:" + state19.known.id : state19.type.id;
      populateTypeSelect(ranking, selId, !!state19.settingsModel?.values?.showAllTypes, state19.intake, state19.knownCandidates || []);
    }
  }
  if (changedKey === "reduceMotion") {
    persistGlobalKey("reduceMotion", model.values.reduceMotion);
    applyReduceMotion(model.values.reduceMotion);
  }
  if (changedKey === "enableFfmpeg" || changedKey === "enableArchiveWasm" || changedKey === "enableEmulators") {
    persistGlobalKey(changedKey, model.values[changedKey]);
  }
  if (changedKey === "enableEmulators" && state19.intake && state19.type) {
    const activation = beginActivation(state19.intake);
    const [{ pickType }, { populateTypeSelect }] = await Promise.all([detectRuntime(), typeSelectRuntime()]);
    if (!activationIsCurrent(activation)) return;
    const { type, ranking } = pickType(state19.intake, { enableEmulators: model.values.enableEmulators === true });
    populateTypeSelect(ranking, type.id, !!model.values.showAllTypes, state19.intake, state19.knownCandidates || []);
    if (type.id !== state19.type.id) await activateType(type, null, activation);
    else await renderPreview3();
    return;
  }
  if (!state19.type?.capabilities.preview) return;
  if (changedKey === "previewMaxWidth" || changedKey === "previewWidthMode") applyLayout();
  const cat = model.descriptors.find((d) => d.key === changedKey)?.category;
  const viewerRenderKey = cat && cat.startsWith("viewer") && changedKey !== "syncScroll";
  if (!changedKey || viewerRenderKey) renderPreview3();
}
function applyTheme(dark) {
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.body.classList.toggle("fv-dark", !!dark);
  localStorage.setItem("fv:theme", dark ? "dark" : "light");
  state19.rawview?.setTheme(dark ? "dark" : "light");
  if (state19.preview && state19.type?.capabilities.preview && !state19.binaryEdit?.dirty) renderPreview3();
}
function applyReduceMotion(on) {
  document.documentElement.classList.toggle("reduce-motion", !!on);
}
function openDrawer(id, build) {
  build?.();
  $12(id).hidden = false;
  $12("scrim").hidden = false;
}
function closeDrawers() {
  $12("settingsDrawer").hidden = true;
  $12("metaDrawer").hidden = true;
  $12("scrim").hidden = true;
}
async function openTypeHelp() {
  const dialog = $12("typeHelpDialog");
  if (!dialog) return;
  const { buildTypeHelp } = await import("./type-help.js");
  buildTypeHelp(state19.type?.id, { openExampleFile });
  if (!dialog.dataset.wired) {
    dialog.dataset.wired = "1";
    dialog.querySelector("[data-close]")?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  }
  if (!dialog.open) dialog.showModal();
}
var metaBtnClicks = 0;
var _metaBtnTimer = null;
var META_BTN_MSGS = [
  "You found a secret. Keep clicking...",
  "Interesting. Most people stop before now.",
  "Almost there...",
  "One more."
];
function init() {
  initCompanionUi({ loadIntake: loadIntake3 });
  initSessionTree({ loadIntake: loadIntake3 });
  initSidebarRoots({
    loadIntake: loadIntake3,
    onDelete: deleteTreePath,
    onReveal: revealTreePath,
    onActivate: activateCompanionSidebarRoot
  });
  initViewerOpen({ loadIntake: loadIntake3 });
  installGlobalScreensaver();
  initFolder({
    loadIntake: loadIntake3,
    confirmDiscard,
    // Called after each folder-tree file opens so we can start watching its absolute disk path.
    onFolderFileOpened: (node) => {
      if (!isCompanionAvailable() || !hasCompanionFolderRoot()) return;
      const absPath = absolutePathForFile(node.path);
      if (!absPath) return;
      startWatching(absPath);
      syncSaveBtn();
    },
    // Per-row delete (file or folder) straight from the tree, without opening the file first.
    onTreeDelete: deleteTreePath,
    onTreeReveal: revealTreePath
    // per-row "reveal in file manager"
  });
  initLayout({ renderPreview: renderPreview3, openSettings: openSettings2 });
  initRawPane({ renderPreview: renderPreview3 });
  initCompare({ syncRawModeButtons: syncRawModeButtons2 });
  const saved = localStorage.getItem("fv:theme");
  applyTheme(saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  applyReduceMotion(readGlobalKey("reduceMotion", false));
  wireIntake({
    dropZone: $12("dropZone"),
    fileInput: $12("fileInput"),
    folderInput: $12("folderInput"),
    onIntake: loadIntake3,
    onFolder: openFolderEntries,
    onError: (e) => toast14("Could not read file: " + e.message),
    onFileStatus: showFileLoading,
    onFolderStatus: (message, opts = {}) => {
      if (!message) {
        hideFolderLoading();
        return;
      }
      $12("ftRoot").textContent = "Loading folder";
      $12("treeBtn").hidden = false;
      setTree(true);
      showFolderLoading(message, opts);
    }
  });
  $12("workspace").addEventListener("dragover", (e) => {
    if (e.dataTransfer?.types?.includes(TREE_DRAG_TYPE)) e.preventDefault();
  });
  $12("workspace").addEventListener("drop", async (e) => {
    if (!e.dataTransfer?.types?.includes(TREE_DRAG_TYPE)) return;
    e.preventDefault();
    e.stopPropagation();
    await openSidebarDropSideBySide(getDraggedTreeNode());
  });
  $12("treeBtn").addEventListener("click", () => setTree($12("fileTree").hidden));
  $12("treeCloseBtn").addEventListener("click", () => setTree(false));
  $12("ftRemoveRootBtn").addEventListener("click", removeActiveSidebarRoot);
  $12("fileTree").addEventListener("keydown", onTreeKey);
  $12("repoBtn").addEventListener("click", openRepoView);
  $12("ftExportBtn").addEventListener("click", () => exportFolder(false));
  $12("ftSearchInput").addEventListener("input", onTreeSearchInput);
  $12("ftSearchInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchTreeContents();
    }
  });
  initTreeResize();
  $12("openInlineBtn").addEventListener("click", showIntake);
  $12("newFileBtn").addEventListener("click", createNewFile);
  $12("formatBtn").addEventListener("click", () => state19.rawview?.format());
  initSplitDivider();
  $12("typeSelect").addEventListener("change", async (e) => {
    const val = e.target.value;
    const activation = beginActivation(state19.intake);
    if (val.startsWith("known:")) {
      const knownId = val.slice(6);
      const match = (state19.knownCandidates || []).find((m) => m.known.id === knownId);
      if (match) await activateType(match.baseType, match.known, activation);
      else if (activationIsCurrent(activation)) await renderPreview3();
      return;
    }
    const { getType } = await registryRuntime();
    if (!activationIsCurrent(activation)) return;
    const t = getType(val);
    if (t) await activateType(t, null, activation);
    else if (activationIsCurrent(activation)) await renderPreview3();
  });
  $12("themeBtn").addEventListener("click", () => applyTheme(!themeIsDark2()));
  $12("settingsBtn").addEventListener("click", () => openDrawer("settingsDrawer", openSettings2));
  $12("typeHelpBtn").addEventListener("click", () => openTypeHelp());
  $12("metaBtn").addEventListener("click", async () => {
    metaBtnClicks++;
    clearTimeout(_metaBtnTimer);
    _metaBtnTimer = setTimeout(() => {
      metaBtnClicks = 0;
    }, 2e3);
    if (metaBtnClicks <= 4) {
      const { buildMetadata } = await import("./meta-drawer.js");
      openDrawer("metaDrawer", buildMetadata);
      return;
    }
    if (metaBtnClicks <= 8) {
      toast14(META_BTN_MSGS[metaBtnClicks - 5]);
      return;
    }
    metaBtnClicks = 0;
    clearTimeout(_metaBtnTimer);
    state19.games?.unlock();
    $12("gamesBtn").hidden = false;
    toast14("🎮 Games unlocked!");
    state19.games?.open();
  });
  $12("scrim").addEventListener("click", () => {
    closeDrawers();
    if (isMobile5()) setTree(false);
  });
  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeDrawers));
  $12("fullscreenBtn").addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  });
  $12("screenshotBtn").addEventListener("click", takeScreenshot);
  $12("exportBtn").addEventListener("click", toggleExportMenu);
  $12("enhanceChip").querySelector(".ec-toggle").addEventListener("click", toggleEnhance);
  $12("moreBtn").addEventListener("click", toggleMoreMenu);
  $12("moreMenu").addEventListener("click", (e) => {
    if (e.target.closest("button")) closeMoreMenu();
  });
  document.addEventListener("click", (e) => {
    if (!$12("moreMenu").hidden && !e.target.closest("#moreMenu") && !e.target.closest("#moreBtn")) closeMoreMenu();
    if (!$12("exportMenu").hidden && !e.target.closest("#exportMenu") && !e.target.closest("#exportBtn")) closeExportMenu();
  });
  layoutTopbar();
  document.querySelectorAll("#viewMode button").forEach((b) => b.addEventListener("click", () => {
    state19.mode = b.dataset.mode;
    applyLayout();
  }));
  document.querySelectorAll("#tabbar button").forEach((b) => b.addEventListener("click", () => {
    state19.tab = b.dataset.mode;
    applyLayout();
  }));
  document.querySelectorAll("#rawMode button:not(#compareBtn)").forEach((b) => b.addEventListener("click", () => setRawMode(b.dataset.raw)));
  $12("compareBtn").addEventListener("click", async () => {
    await exitWysiwygForFeature();
    startCompare();
  });
  $12("compareInput").addEventListener("change", onComparePicked);
  initCompareDropTarget();
  $12("compareBar").querySelector(".compare-stop").addEventListener("click", stopCompare);
  $12("downloadBtn").addEventListener("click", downloadCurrent);
  $12("saveBtn").addEventListener("click", onSaveClick);
  $12("deleteBtn").addEventListener("click", onDeleteClick);
  $12("companionStatusBtn").addEventListener("click", onConnButtonClick);
  window.matchMedia("(max-width: 760px)").addEventListener("change", () => {
    layoutTopbar();
    if (!state19.type) return;
    applyLayout();
  });
  window.addEventListener("resize", debounce2(() => {
    if (state19.type) applyPreviewPaneWidth();
  }, 100));
  window.addEventListener("beforeunload", (e) => {
    if (hasUnsavedWork()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  const loadGallery = async () => {
    const host = $12("examples");
    if (host && !host.querySelector(".boot-spinner-ring")) {
      host.innerHTML = '<div class="ex-loading" role="status" aria-live="polite"><span class="boot-spinner-ring" aria-hidden="true"></span><span>Loading examples...</span></div>';
    }
    const { loadExamples } = await import("./examples.js");
    return loadExamples(loadIntake3);
  };
  document.getElementById("loadExamplesBtn")?.addEventListener("click", loadGallery, { once: true });
  initOffline($12("offlineStatus"));
  initOfflineBadge();
  detectCompanionOnStartup();
  import("../games/launcher.js").then(({ initGames }) => {
    const games = initGames({ onToast: toast14 });
    state19.games = games;
    if (games.isUnlocked()) $12("gamesBtn").hidden = false;
    $12("gamesBtn").addEventListener("click", () => games.open());
  });
  async function openExampleByLabel(label) {
    const index = await fetch("examples/index.json").then((r) => r.ok ? r.json() : []).catch(() => []);
    const entry = index.find((e) => e.label === label || e.file === label);
    if (!entry) return false;
    return openExampleFile(entry.file);
  }
  window.__fv = {
    state: state19,
    setRawMode,
    downloadCurrent,
    loadFolder,
    hasUnsavedWork,
    openRepoView,
    openViewerFile,
    openFile: openViewerFile,
    openExampleFile,
    openExampleByLabel,
    openBlobFile,
    searchViewerFile,
    // Expand the active single-file root (e.g. an open GIF) into an in-place folder of
    // entries (e.g. its split frames) — the same sidebar item gains the frames underneath.
    expandFileRootToFolder: (opts) => expandActiveFileRootToFolder(opts),
    persistence: persistence_exports,
    rerenderPreview: renderPreview3,
    setPreviewTestHook: (hook) => {
      previewTestHook = typeof hook === "function" ? hook : null;
    },
    previewRequest: () => {
      const request = previewRequests.current();
      return request ? { id: request.id, snapshot: request.snapshot } : null;
    },
    get games() {
      return state19.games;
    },
    screenshot: () => captureBodyHtml(state19.lastBodyHtml, { theme: themeIsDark2() ? "dark" : "light", style: previewStyle(state19.settingsModel.values) })
  };
  window.__fvOnReady?.({
    openIntake: loadIntake3,
    openFolder: openFolderEntries,
    onError: (err) => toast14("Could not read file: " + err.message)
  });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
