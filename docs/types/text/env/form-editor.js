// Form editor for .env files. Manages a list of entries (comments, blank lines, vars) with
// reveal-on-demand for secrets, comment/uncomment toggles, and undo/redo (buttons + Ctrl+Z/Y).
// Kept in sync with the broader key patterns used by the read-only renderer.js/metadata.js
// (SECRET|PASSWORD|PASSWD|TOKEN|AUTH|CREDENTIAL|PRIVATE|PWD|SALT|SIGNING|MASTER|WEBHOOK) plus
// KEY/API — this must be AT LEAST as protective as the read-only preview's masking, since this
// is the interactive form where a value can otherwise sit in a plain-text input. Real bundled
// examples (SMTP_PWD, APPSMITH_ENCRYPTION_SALT) were shown unmasked here before this was widened.
const SENSITIVE_RE = /SECRET|PASSWORD|PASSWD|PWD|TOKEN|KEY|API|PRIVATE|AUTH|CREDENTIAL|SALT|SIGNING|MASTER|WEBHOOK/i;
// Credentials embedded in a connection-string value (DATABASE_URL=postgres://user:pass@host),
// where the key name itself isn't a secret — still mask the value.
const URL_CREDS = /:\/\/[^\s/:@]+:[^\s/@]+@/;
function hasUrlCreds(v) { return URL_CREDS.test(v || ''); }
// A commented line that still looks like KEY=VALUE — eligible to be un-commented back to a var.
const COMMENTED_VAR = /^([A-Za-z_][\w.]*)\s*=(.*)$/;

// Parse .env text into structured entries
function parseEnv(text) {
  const entries = [];
  for (const line of (text || '').split(/\r?\n/)) {
    const t = line.trim();
    if (!t) {
      entries.push({ type: 'blank' });
    } else if (t.startsWith('#')) {
      entries.push({ type: 'comment', text: t.slice(1).trim() });
    } else {
      const eq = t.indexOf('=');
      if (eq === -1) {
        entries.push({ type: 'comment', text: t }); // treat unrecognized lines as comments
      } else {
        let key = t.slice(0, eq).trim();
        let val = t.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        entries.push({ type: 'var', key, value: val });
      }
    }
  }
  return entries;
}

// Serialize entries back to .env text
function serializeEnv(entries) {
  return entries.map(e => {
    if (e.type === 'blank') return '';
    if (e.type === 'comment') return '# ' + (e.text || '');
    // var: quote value if it contains spaces or special chars
    const val = (e.value || '').includes(' ') || (e.value || '').includes('#')
      ? `"${e.value.replace(/"/g, '\\"')}"`
      : (e.value || '');
    return `${e.key || 'KEY'}=${val}`;
  }).join('\n');
}

export class EnvFormEditor {
  constructor(container, text, onChange) {
    this._entries = parseEnv(text);
    this._onChange = onChange;
    this._container = container;
    this._revealed = new Set();   // indices of revealed sensitive values
    this._undo = [];              // JSON snapshots of _entries before each change
    this._redo = [];
    this._beforeEdit = null;      // snapshot captured when an input gains focus
    this._onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); this._undoOp(); }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); this._redoOp(); }
    };
    container.addEventListener('keydown', this._onKey);
    this._render();
  }

  _notify() { this._onChange?.(serializeEnv(this._entries)); }

  // ── Selection / scope ──
  // Indices to operate on: the selected (entry._sel) entries if any are selected, else all entries.
  _scopeIndices() {
    const sel = [];
    this._entries.forEach((e, i) => { if (e._sel) sel.push(i); });
    if (sel.length) return sel;
    return this._entries.map((_, i) => i);
  }

  // Sort the scoped entries in place: gather them, sort by key (vars) / text (comments) / '' (blanks),
  // then write them back into the same slots they occupied. Non-scoped rows stay put.
  _sortScope() {
    const idx = this._scopeIndices();
    const sortKey = (e) => (e.type === 'var' ? (e.key || '') : e.type === 'comment' ? (e.text || '') : '');
    const sorted = idx.map((i) => this._entries[i]).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    this._pushHistory();
    idx.forEach((slot, n) => { this._entries[slot] = sorted[n]; });
    this._render(); this._notify();
  }

  // Trim leading/trailing whitespace from scoped var keys+values and comment text.
  _trimScope() {
    this._pushHistory();
    for (const i of this._scopeIndices()) {
      const e = this._entries[i];
      if (e.type === 'var') { e.key = (e.key || '').trim(); e.value = (e.value || '').trim(); }
      else if (e.type === 'comment') { e.text = (e.text || '').trim(); }
    }
    this._render(); this._notify();
  }

  // Remove later var entries whose key already appeared (keep first). Uses full order to decide
  // "already appeared", but only removes entries that are in scope.
  _dedupScope() {
    const scope = new Set(this._scopeIndices());
    const seen = new Set();
    const keep = [];
    this._entries.forEach((e, i) => {
      if (e.type === 'var') {
        const k = e.key || '';
        if (seen.has(k)) { if (scope.has(i)) return; /* drop */ }
        else seen.add(k);
      }
      keep.push(e);
    });
    if (keep.length === this._entries.length) return; // nothing removed
    this._pushHistory();
    this._entries = keep;
    this._render(); this._notify();
  }

  // Move the entry at `from` to land at index `to` (drop target's slot).
  _moveEntry(from, to) {
    if (from === to || from < 0 || to < 0) return;
    this._pushHistory();
    const [moved] = this._entries.splice(from, 1);
    if (from < to) to -= 1; // splice shifted indices left
    this._entries.splice(to, 0, moved);
    this._render(); this._notify();
  }

  // ── Undo / redo ──
  _snapshot() { return JSON.stringify(this._entries); }
  _pushHistory() { this._undo.push(this._snapshot()); if (this._undo.length > 100) this._undo.shift(); this._redo = []; }
  _undoOp() {
    if (!this._undo.length) return;
    this._redo.push(this._snapshot());
    this._entries = JSON.parse(this._undo.pop());
    this._render(); this._notify();
  }
  _redoOp() {
    if (!this._redo.length) return;
    this._undo.push(this._snapshot());
    this._entries = JSON.parse(this._redo.pop());
    this._render(); this._notify();
  }
  // Wire an editable input so a committed edit (focus → change) is a single undo step.
  _wireEdit(input) {
    input.addEventListener('focus', () => { this._beforeEdit = this._snapshot(); });
    input.addEventListener('change', () => {
      if (this._beforeEdit && this._beforeEdit !== this._snapshot()) {
        this._undo.push(this._beforeEdit); if (this._undo.length > 100) this._undo.shift(); this._redo = [];
      }
      this._beforeEdit = null;
    });
  }

  _render() {
    this._container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'env-form';

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'env-toolbar';
    const addBtn = document.createElement('button');
    addBtn.type = 'button'; addBtn.className = 'env-btn'; addBtn.textContent = '+ Add variable';
    addBtn.addEventListener('click', () => {
      this._pushHistory();
      this._entries.push({ type: 'var', key: '', value: '' });
      this._render(); this._notify();
      const inputs = this._container.querySelectorAll('.env-key');
      inputs[inputs.length - 1]?.focus();
    });
    const undoBtn = document.createElement('button');
    undoBtn.type = 'button'; undoBtn.className = 'env-btn'; undoBtn.textContent = '↶ Undo';
    undoBtn.title = 'Undo (Ctrl+Z)'; undoBtn.disabled = !this._undo.length;
    undoBtn.addEventListener('click', () => this._undoOp());
    const redoBtn = document.createElement('button');
    redoBtn.type = 'button'; redoBtn.className = 'env-btn'; redoBtn.textContent = '↷ Redo';
    redoBtn.title = 'Redo (Ctrl+Y)'; redoBtn.disabled = !this._redo.length;
    redoBtn.addEventListener('click', () => this._redoOp());

    // Sort / Trim / Dedup — act on the selected rows, or ALL rows if none are selected.
    const anySel = this._entries.some((e) => e._sel);
    const scopeNote = anySel ? ' selected rows' : ' all rows';
    const sortBtn = document.createElement('button');
    sortBtn.type = 'button'; sortBtn.className = 'env-btn'; sortBtn.textContent = 'Sort';
    sortBtn.title = 'Sort' + scopeNote + ' by key (in place)';
    sortBtn.addEventListener('click', () => this._sortScope());
    const trimBtn = document.createElement('button');
    trimBtn.type = 'button'; trimBtn.className = 'env-btn'; trimBtn.textContent = 'Trim';
    trimBtn.title = 'Trim whitespace from' + scopeNote;
    trimBtn.addEventListener('click', () => this._trimScope());
    const dedupBtn = document.createElement('button');
    dedupBtn.type = 'button'; dedupBtn.className = 'env-btn'; dedupBtn.textContent = 'Dedup';
    dedupBtn.title = 'Remove duplicate keys from' + scopeNote + ' (keep first)';
    dedupBtn.addEventListener('click', () => this._dedupScope());

    toolbar.append(addBtn, undoBtn, redoBtn, sortBtn, trimBtn, dedupBtn);
    wrapper.append(toolbar);

    // Rows
    const list = document.createElement('div');
    list.className = 'env-list';

    // Decorate a non-blank row with a drag handle (reorder) + a selection checkbox, and wire
    // HTML5 drag/drop so dropping onto a row moves the dragged entry into that row's slot.
    const decorate = (row, entry, i) => {
      row.draggable = true;
      if (entry._sel) row.classList.add('env-selected');
      const handle = document.createElement('span');
      handle.className = 'env-drag'; handle.textContent = '⠿'; handle.title = 'Drag to reorder';
      const check = document.createElement('input');
      check.type = 'checkbox'; check.className = 'env-check'; check.checked = !!entry._sel;
      check.title = 'Select row';
      check.addEventListener('change', () => {
        this._entries[i]._sel = check.checked;
        row.classList.toggle('env-selected', check.checked);
        // Re-render so the toolbar tooltips/scope reflect the new selection.
        this._render();
      });
      row.addEventListener('dragstart', (e) => {
        // Don't hijack drags that start inside an editable input (lets users select text normally).
        if (e.target instanceof HTMLInputElement) { e.preventDefault(); return; }
        this._dragFrom = i; row.classList.add('env-dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(i)); } catch { /* ignore */ }
      });
      row.addEventListener('dragend', () => { row.classList.remove('env-dragging'); this._dragFrom = null; });
      row.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; row.classList.add('env-dragover'); });
      row.addEventListener('dragleave', () => row.classList.remove('env-dragover'));
      row.addEventListener('drop', (e) => {
        e.preventDefault(); row.classList.remove('env-dragover');
        const from = this._dragFrom ?? Number(e.dataTransfer.getData('text/plain'));
        if (Number.isFinite(from)) {
          // Dropping downward onto a row should place the dragged line after that row;
          // dropping upward places it before. This makes adjacent row drags visibly swap.
          this._moveEntry(from, from < i ? i + 1 : i);
        }
      });
      row.prepend(handle, check);
    };

    this._entries.forEach((entry, i) => {
      const row = document.createElement('div');

      if (entry.type === 'blank') {
        row.className = 'env-row env-blank';
      } else if (entry.type === 'comment') {
        row.className = 'env-row env-comment-row';
        const text = document.createElement('input');
        text.type = 'text'; text.className = 'env-comment-text'; text.value = entry.text || '';
        text.placeholder = 'Comment…';
        text.addEventListener('input', () => { this._entries[i].text = text.value; this._notify(); });
        this._wireEdit(text);
        // A commented-out variable can be turned back into a real variable.
        const m = COMMENTED_VAR.exec((entry.text || '').trim());
        if (m) {
          const uncomment = document.createElement('button');
          uncomment.type = 'button'; uncomment.className = 'env-toggle env-uncomment';
          uncomment.title = 'Un-comment — make this an active variable'; uncomment.textContent = '↩';
          uncomment.addEventListener('click', () => {
            this._pushHistory();
            let val = m[2].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
            this._entries[i] = { type: 'var', key: m[1], value: val };
            this._render(); this._notify();
          });
          row.append(uncomment);
        } else {
          row.append(document.createTextNode('# '));
        }
        const delBtn = document.createElement('button');
        delBtn.type = 'button'; delBtn.className = 'env-del'; delBtn.title = 'Delete line'; delBtn.textContent = '×';
        delBtn.addEventListener('click', () => { this._pushHistory(); this._entries.splice(i, 1); this._render(); this._notify(); });
        row.append(text, delBtn);
        decorate(row, entry, i);
      } else {
        // var entry
        row.className = 'env-row env-var-row';
        const isSensitive = SENSITIVE_RE.test(entry.key || '') || hasUrlCreds(entry.value || '');
        const isRevealed = this._revealed.has(i);

        const commentToggle = document.createElement('button');
        commentToggle.type = 'button'; commentToggle.className = 'env-toggle'; commentToggle.title = 'Comment out this variable';
        commentToggle.textContent = '#';
        commentToggle.addEventListener('click', () => {
          this._pushHistory();
          this._entries[i] = { type: 'comment', text: `${entry.key}=${entry.value}` };
          this._render(); this._notify();
        });

        const keyInput = document.createElement('input');
        keyInput.type = 'text'; keyInput.className = 'env-key'; keyInput.value = entry.key || '';
        keyInput.placeholder = 'KEY'; keyInput.spellcheck = false;
        keyInput.addEventListener('input', () => { this._entries[i].key = keyInput.value; this._notify(); });
        this._wireEdit(keyInput);

        const eq = document.createElement('span');
        eq.className = 'env-eq'; eq.textContent = '=';

        const valInput = document.createElement('input');
        valInput.type = (isSensitive && !isRevealed) ? 'password' : 'text';
        valInput.className = 'env-val'; valInput.value = entry.value || '';
        valInput.placeholder = 'value'; valInput.spellcheck = false;
        valInput.addEventListener('input', () => { this._entries[i].value = valInput.value; this._notify(); });
        this._wireEdit(valInput);

        const delBtn = document.createElement('button');
        delBtn.type = 'button'; delBtn.className = 'env-del'; delBtn.title = 'Delete variable'; delBtn.textContent = '×';
        delBtn.addEventListener('click', () => { this._pushHistory(); this._entries.splice(i, 1); this._revealed.delete(i); this._render(); this._notify(); });

        row.append(commentToggle, keyInput, eq, valInput);

        if (isSensitive) {
          const eyeBtn = document.createElement('button');
          eyeBtn.type = 'button'; eyeBtn.className = 'env-eye'; eyeBtn.title = isRevealed ? 'Hide value' : 'Reveal value';
          eyeBtn.textContent = isRevealed ? '🙈' : '👁';
          eyeBtn.addEventListener('click', () => {
            if (isRevealed) this._revealed.delete(i); else this._revealed.add(i);
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

  getValue() { return serializeEnv(this._entries); }
  destroy() { this._container.removeEventListener('keydown', this._onKey); this._container.innerHTML = ''; }
}
