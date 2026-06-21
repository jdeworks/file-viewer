// Per-pane formatting toolbar for side-by-side panes. Each toolbar targets the pane's OWN
// createRawView controller (passed in) — never the global `state.rawview` — so two panes format
// independently. Two flavors:
//   • markdown panes  → bold / italic / strike / heading (H1–H3) / lists / quote / code (reuses
//     the pure edit-actions helpers, mirroring rawpane-markdown.js).
//   • other text/code → the text utilities (sort / trim / dedup / base64) using the SHARED pure
//     transforms from text-utils.js, exactly like the main rawpane-toolbars.js text-utils bar.
// Out of scope (note as follow-ups): the markdown table picker, link-from-clipboard, WYSIWYG.
import { markdownHeading, markdownWrap, markdownStrikethrough, markdownInlineCode,
  markdownCodeBlock, markdownBlockquote, markdownBulletList, markdownOrderedList,
} from '../types/markdown/edit-actions.js';
import { getTrimMode, setTrimMode, lineTransformFor, b64encode, b64decode } from './text-utils.js';

// A getRawview() accessor is used (not the controller directly) because a pane's rawview is created
// lazily — the toolbar is built before Source has ever been shown. ensureRawview ensures it exists.
function mkBtn(label, title) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'sbs-tool';
  b.textContent = label;
  if (title) b.title = title;
  return b;
}

// ── Markdown toolbar ──────────────────────────────────────────────────────────
// Each action mirrors rawpane-markdown.js: same helper, same expandToLines flag.
const MD_ACTIONS = [
  { label: 'B', title: 'Bold', fn: (t) => markdownWrap(t, '**', 'strong text') },
  { label: 'I', title: 'Italic', fn: (t) => markdownWrap(t, '*', 'emphasis') },
  { label: 'S', title: 'Strikethrough', fn: (t) => markdownStrikethrough(t) },
  { label: 'H1', title: 'Heading 1', fn: (t) => markdownHeading(t, 1), lines: true },
  { label: 'H2', title: 'Heading 2', fn: (t) => markdownHeading(t, 2), lines: true },
  { label: 'H3', title: 'Heading 3', fn: (t) => markdownHeading(t, 3), lines: true },
  { label: '• List', title: 'Bullet list', fn: (t) => markdownBulletList(t), lines: true },
  { label: '1. List', title: 'Numbered list', fn: (t) => markdownOrderedList(t), lines: true },
  { label: 'Quote', title: 'Blockquote', fn: (t) => markdownBlockquote(t), lines: true },
  { label: '`code`', title: 'Inline code', fn: (t) => markdownInlineCode(t) },
  { label: 'Block', title: 'Code block', fn: (t) => markdownCodeBlock(t) },
];

function buildMarkdownToolbar(bar, ensureRawview) {
  bar.dataset.kind = 'markdown';
  for (const a of MD_ACTIONS) {
    const btn = mkBtn(a.label, a.title);
    btn.dataset.mdAction = a.title;
    btn.addEventListener('click', async () => {
      const rv = await ensureRawview();
      rv.transformSelection(a.fn, { expandToLines: !!a.lines, source: 'sbs-md' });
    });
    bar.appendChild(btn);
  }
}

// ── Text-utilities toolbar (text / code panes) ──────────────────────────────────
const TEXT_UTILS = [
  { label: 'Sort ↑', title: 'Sort lines ascending', action: 'sortAsc' },
  { label: 'Sort ↓', title: 'Sort lines descending', action: 'sortDesc' },
  { label: 'Dedup', title: 'Remove duplicate lines', action: 'dedup' },
  { label: 'Trim', title: 'Trim whitespace', action: 'trim' },
  { label: 'Trim L', title: 'Trim leading whitespace', action: 'ltrim' },
  { label: 'Trim R', title: 'Trim trailing whitespace', action: 'rtrim' },
  { label: 'b64 ↑', title: 'Base64 encode', action: 'b64encode' },
  { label: 'b64 ↓', title: 'Base64 decode', action: 'b64decode' },
];

// Apply a line/base64 utility on the pane's OWN rawview (selection-aware, like applyTextUtil).
function applyPaneUtil(rv, action) {
  const lineFn = lineTransformFor(action);
  if (lineFn) {
    const fn = (t) => lineFn(t.split('\n')).join('\n');
    const range = rv.selectionRange?.();
    if (range && !range.isEmpty?.()) {
      rv.transformSelection(fn, { expandToLines: true, selectInserted: true });
    } else {
      rv.transformAll(fn);
    }
    return;
  }
  const text = rv.getValue();
  const sel = rv.selectionText?.();
  const hasSel = sel && sel.trim();
  if (action === 'b64encode') {
    try {
      const encoded = b64encode(hasSel ? sel : text);
      if (hasSel) rv.replaceSelection(encoded); else rv.transformAll(() => encoded);
    } catch { /* ignore: bad input */ }
  } else if (action === 'b64decode') {
    try {
      const decoded = b64decode((hasSel ? sel : text).trim());
      if (hasSel) rv.replaceSelection(decoded); else rv.transformAll(() => decoded);
    } catch { /* ignore: not valid base64 */ }
  }
}

function buildTextUtilsToolbar(bar, ensureRawview) {
  bar.dataset.kind = 'textutils';
  for (const u of TEXT_UTILS) {
    const btn = mkBtn(u.label, u.title);
    btn.dataset.textutil = u.action;
    btn.addEventListener('click', async () => {
      const rv = await ensureRawview();
      applyPaneUtil(rv, u.action);
    });
    bar.appendChild(btn);
  }
  // Trim-mode cycle button — shares the SAME localStorage key as the main toolbar.
  const modeBtn = mkBtn('', 'Toggle trim mode (whitespace vs. + blank lines)');
  modeBtn.className = 'sbs-tool sbs-tool-mode';
  const syncMode = () => { modeBtn.textContent = getTrimMode() === 'ws+lines' ? 'WS+lines' : 'WS'; };
  modeBtn.addEventListener('click', () => {
    setTrimMode(getTrimMode() === 'ws+lines' ? 'ws' : 'ws+lines');
    syncMode();
  });
  syncMode();
  bar.appendChild(modeBtn);
}

// Build a formatting toolbar row for an editable pane into `bar` (a .sbs-tools element).
// `typeId` selects the markdown vs. text-utils flavor. `ensureRawview` returns the (lazy) rawview.
export function buildPaneToolbar(bar, typeId, ensureRawview) {
  if (typeId === 'markdown') buildMarkdownToolbar(bar, ensureRawview);
  else buildTextUtilsToolbar(bar, ensureRawview);
}
