// Form editor for .env files. Manages a list of entries (comments, blank lines, vars).
const SENSITIVE_RE = /SECRET|PASSWORD|TOKEN|KEY|API|PRIVATE/i;

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
    this._revealed = new Set(); // indices of revealed sensitive values
    this._render();
  }

  _notify() {
    this._onChange?.(serializeEnv(this._entries));
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
      this._entries.push({ type: 'var', key: '', value: '' });
      this._render();
      // Focus the new key input
      const inputs = this._container.querySelectorAll('.env-key');
      inputs[inputs.length - 1]?.focus();
    });
    toolbar.append(addBtn);
    wrapper.append(toolbar);

    // Rows
    const list = document.createElement('div');
    list.className = 'env-list';

    this._entries.forEach((entry, i) => {
      const row = document.createElement('div');

      if (entry.type === 'blank') {
        row.className = 'env-row env-blank';
        // Blank separator — just spacing
      } else if (entry.type === 'comment') {
        row.className = 'env-row env-comment-row';
        const text = document.createElement('input');
        text.type = 'text'; text.className = 'env-comment-text'; text.value = entry.text || '';
        text.placeholder = 'Comment…';
        text.addEventListener('input', () => { this._entries[i].text = text.value; this._notify(); });
        const delBtn = document.createElement('button');
        delBtn.type = 'button'; delBtn.className = 'env-del'; delBtn.title = 'Delete line'; delBtn.textContent = '×';
        delBtn.addEventListener('click', () => { this._entries.splice(i, 1); this._renderAndNotify(); });
        row.append(document.createTextNode('# '), text, delBtn);
      } else {
        // var entry
        row.className = 'env-row env-var-row';
        const isSensitive = SENSITIVE_RE.test(entry.key || '');
        const isRevealed = this._revealed.has(i);

        const commentToggle = document.createElement('button');
        commentToggle.type = 'button'; commentToggle.className = 'env-toggle'; commentToggle.title = 'Comment out this variable';
        commentToggle.textContent = '#';
        commentToggle.addEventListener('click', () => {
          this._entries[i] = { type: 'comment', text: `${entry.key}=${entry.value}` };
          this._renderAndNotify();
        });

        const keyInput = document.createElement('input');
        keyInput.type = 'text'; keyInput.className = 'env-key'; keyInput.value = entry.key || '';
        keyInput.placeholder = 'KEY'; keyInput.spellcheck = false;
        keyInput.addEventListener('input', () => { this._entries[i].key = keyInput.value; this._notify(); });

        const eq = document.createElement('span');
        eq.className = 'env-eq'; eq.textContent = '=';

        const valInput = document.createElement('input');
        valInput.type = (isSensitive && !isRevealed) ? 'password' : 'text';
        valInput.className = 'env-val'; valInput.value = entry.value || '';
        valInput.placeholder = 'value'; valInput.spellcheck = false;
        valInput.addEventListener('input', () => { this._entries[i].value = valInput.value; this._notify(); });

        const delBtn = document.createElement('button');
        delBtn.type = 'button'; delBtn.className = 'env-del'; delBtn.title = 'Delete variable'; delBtn.textContent = '×';
        delBtn.addEventListener('click', () => { this._entries.splice(i, 1); this._revealed.delete(i); this._renderAndNotify(); });

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
      }
      list.append(row);
    });
    wrapper.append(list);
    this._container.append(wrapper);
  }

  _renderAndNotify() { this._render(); this._notify(); }

  getValue() { return serializeEnv(this._entries); }
  destroy() { this._container.innerHTML = ''; }
}
