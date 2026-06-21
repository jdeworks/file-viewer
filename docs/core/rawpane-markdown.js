// Markdown editing tools for the raw editor: the format actions (bold/italic/heading/lists/code/
// table…), the table-size grid picker, and the right-click "sort table by column" context menu.
// Extracted from rawpane.js for modularity. Works against either Monaco (state.rawview) or the
// TipTap WYSIWYG editor when mounted — isWysiwygActive() is the single source of truth. In WYSIWYG
// mode the format actions dispatch native TipTap commands; in Monaco mode they use the pure
// edit-actions helpers.
import { state, $, toast } from './state.js';
import { markdownHeading, markdownTable, markdownWrap, markdownCodeBlock, markdownInlineCode,
  markdownBlockquote, markdownBulletList, markdownOrderedList, markdownStrikethrough,
  sortMarkdownTable, tableSortOptions } from '../types/markdown/edit-actions.js';
import { isWysiwygActive, runWysiwygCommand, insertWysiwygMarkdown } from '../types/markdown/wysiwyg.js';

let tablePicker = null;
let markdownContextMenu = null;

// Inject the GFM task-list (checkbox) toolbar button into #markdownTools. The
// button markup lives here (not index.html) because the toolbar is owned by app
// agents; the delegated [data-md-action] handler in rawpane.js routes it like
// the other list buttons. Idempotent: runs once when the container exists.
function ensureTaskListButton() {
  const bar = document.getElementById('markdownTools');
  if (!bar || bar.querySelector('[data-md-action="task-list"]')) return;
  const ordered = bar.querySelector('[data-md-action="ordered-list"]');
  if (!ordered) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'md-btn';
  btn.dataset.mdAction = 'task-list';
  btn.title = 'Task list (checkboxes)';
  btn.textContent = '☑'; // ☑ ballot box with check
  ordered.insertAdjacentElement('afterend', btn);
}
ensureTaskListButton();
if (typeof document !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureTaskListButton, { once: true });
}

// Source-mode (Monaco) helper: prefix non-empty lines with a GFM checkbox.
function markdownTaskList(text) {
  return String(text || '').split('\n')
    .map((line) => (line.trim() ? '- [ ] ' + line : line))
    .join('\n');
}

export function closeTablePicker() {
  if (tablePicker) { tablePicker.remove(); tablePicker = null; }
}

function showTablePicker(anchorEl) {
  closeTablePicker();
  const picker = document.createElement('div');
  picker.className = 'md-table-picker';
  const ROWS = 5, COLS = 5;
  const cells = [];
  const label = document.createElement('div');
  label.className = 'md-table-picker-label';
  label.textContent = '1×1';
  picker.append(label);
  const grid = document.createElement('div');
  grid.className = 'md-table-picker-grid';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'md-table-picker-cell';
      cell.dataset.r = r; cell.dataset.c = c;
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
      cell.classList.toggle('active', r < rows && c < cols);
    });
  }

  grid.addEventListener('mousemove', (e) => {
    const cell = e.target.closest('.md-table-picker-cell');
    if (!cell) return;
    highlight(Number(cell.dataset.r) + 1, Number(cell.dataset.c) + 1);
  });
  grid.addEventListener('mouseleave', () => highlight(0, 0));
  grid.addEventListener('click', (e) => {
    const cell = e.target.closest('.md-table-picker-cell');
    if (!cell) return;
    const rows = Number(cell.dataset.r) + 1, cols = Number(cell.dataset.c) + 1;
    closeTablePicker();
    if (isWysiwygActive()) {
      insertWysiwygMarkdown(markdownTable(rows, cols));
    } else {
      state.rawview.replaceSelection(markdownTable(rows, cols), { source: 'markdown-table', selectInserted: true });
    }
  });

  const rect = anchorEl.getBoundingClientRect();
  picker.style.left = Math.min(rect.left, window.innerWidth - 180) + 'px';
  picker.style.top = (rect.bottom + 4) + 'px';
}

// In WYSIWYG mode the toolbar dispatches native TipTap commands (toggle mark /
// node) instead of poking literal markdown markers. The table action still uses
// the size-picker, which inserts a generated markdown table at the cursor.
function runMarkdownActionWysiwyg(action, btn) {
  if (action === 'table') {
    if (tablePicker) { closeTablePicker(); return; }
    showTablePicker(btn || document.getElementById('mdTableBtn'));
    return;
  }
  runWysiwygCommand(action);
}

export function runMarkdownAction(action, btn) {
  if (isWysiwygActive()) {
    runMarkdownActionWysiwyg(action, btn);
    return;
  }
  if (!state.rawview || state.type?.id !== 'markdown') return;
  if (action === 'heading') {
    state.rawview.transformSelection((text) => markdownHeading(text, 1), { expandToLines: true, source: 'markdown-heading' });
  } else if (action === 'bold') {
    state.rawview.transformSelection((text) => markdownWrap(text, '**', 'strong text'), { source: 'markdown-bold' });
  } else if (action === 'italic') {
    state.rawview.transformSelection((text) => markdownWrap(text, '*', 'emphasis'), { source: 'markdown-italic' });
  } else if (action === 'strikethrough') {
    state.rawview.transformSelection((text) => markdownStrikethrough(text), { source: 'markdown-strikethrough' });
  } else if (action === 'inline-code') {
    state.rawview.transformSelection((text) => markdownInlineCode(text), { source: 'markdown-inline-code' });
  } else if (action === 'code-block') {
    state.rawview.transformSelection((text) => markdownCodeBlock(text), { source: 'markdown-code-block' });
  } else if (action === 'blockquote') {
    state.rawview.transformSelection((text) => markdownBlockquote(text), { expandToLines: true, source: 'markdown-blockquote' });
  } else if (action === 'bullet-list') {
    state.rawview.transformSelection((text) => markdownBulletList(text), { expandToLines: true, source: 'markdown-bullet-list' });
  } else if (action === 'ordered-list') {
    state.rawview.transformSelection((text) => markdownOrderedList(text), { expandToLines: true, source: 'markdown-ordered-list' });
  } else if (action === 'task-list') {
    state.rawview.transformSelection((text) => markdownTaskList(text), { expandToLines: true, source: 'markdown-task-list' });
  } else if (action === 'table') {
    if (tablePicker) { closeTablePicker(); return; }
    showTablePicker(btn || $('mdTableBtn'));
  }
}

export function onMarkdownContextMenu(e) {
  const selected = state.rawview?.selectionText?.() || '';
  const options = tableSortOptions(selected);
  if (!options.length) return;
  const range = state.rawview.selectionRange?.();
  e.event?.preventDefault?.();
  e.event?.stopPropagation?.();
  showMarkdownTableSortMenu(e.event?.browserEvent || e.event, options, { selected, range });
}

function showMarkdownTableSortMenu(event, options, selection) {
  closeMarkdownContextMenu();
  const menu = document.createElement('div');
  menu.className = 'md-context-menu';
  menu.setAttribute('role', 'menu');
  const title = document.createElement('div');
  title.className = 'md-context-title';
  title.textContent = 'Sort table by';
  menu.append(title);
  for (const opt of options) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = opt.label;
    btn.addEventListener('click', () => {
      const sorted = sortMarkdownTable(selection.selected, opt.index);
      if (sorted && selection.range) state.rawview.replaceRange(selection.range, sorted, { source: 'markdown-table-sort', selectInserted: true });
      closeMarkdownContextMenu();
    });
    menu.append(btn);
  }
  document.body.append(menu);
  const x = event?.clientX || 20;
  const y = event?.clientY || 20;
  menu.style.left = Math.min(x, window.innerWidth - 220) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - 180) + 'px';
  markdownContextMenu = menu;
  setTimeout(() => document.addEventListener('click', closeMarkdownContextMenu, { once: true }), 0);
}

function closeMarkdownContextMenu() {
  markdownContextMenu?.remove();
  markdownContextMenu = null;
}
