// Form editor for INI / .conf / .properties files.
// Sections are collapsible groups; each key-value pair is an editable row.
import { parseIni } from './renderer.js';

function serializeIni(sections) {
  const parts = [];
  for (const sec of sections) {
    if (sec.name === null) {
      // Global section: key=value pairs at the top, no header
      for (const p of sec.pairs) {
        parts.push(`${p.key || 'key'} = ${p.value || ''}`);
      }
    } else {
      if (parts.length) parts.push('');
      parts.push(`[${sec.name}]`);
      for (const p of sec.pairs) {
        parts.push(`${p.key || 'key'} = ${p.value || ''}`);
      }
    }
  }
  return parts.join('\n');
}

export class IniFormEditor {
  constructor(container, text, onChange) {
    // Deep-clone so mutations stay internal until getValue()
    this._sections = parseIni(text).map(s => ({
      name: s.name,
      pairs: s.pairs.map(p => ({ key: p.key, value: p.value })),
      collapsed: false,
    }));
    // If nothing was parsed, start with a blank global section
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
    this._container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'ini-form';

    // ── Sections ────────────────────────────────────────────────────────────
    const body = document.createElement('div');
    body.className = 'ini-body';

    this._sections.forEach((sec, si) => {
      const group = document.createElement('div');
      group.className = 'ini-section' + (sec.collapsed ? ' ini-collapsed' : '');

      // Section header row
      const header = document.createElement('div');
      header.className = 'ini-section-header';
      header.title = 'Click to collapse/expand';

      const arrow = document.createElement('span');
      arrow.className = 'ini-arrow';
      arrow.textContent = sec.collapsed ? '▶' : '▼';

      const titleEl = document.createElement('span');
      titleEl.className = 'ini-section-title';
      titleEl.textContent = sec.name === null ? '(global)' : `[${sec.name}]`;

      const headerActions = document.createElement('span');
      headerActions.className = 'ini-header-actions';

      // Rename section (not for the null/global section)
      if (sec.name !== null) {
        const renameInput = document.createElement('input');
        renameInput.type = 'text';
        renameInput.className = 'ini-section-name';
        renameInput.value = sec.name;
        renameInput.placeholder = 'Section name';
        renameInput.spellcheck = false;
        renameInput.addEventListener('click', e => e.stopPropagation());
        renameInput.addEventListener('input', () => {
          this._sections[si].name = renameInput.value;
          titleEl.textContent = `[${renameInput.value}]`;
          this._notify();
        });
        headerActions.append(renameInput);
      }

      // Delete section button
      const delSecBtn = document.createElement('button');
      delSecBtn.type = 'button';
      delSecBtn.className = 'ini-del-section';
      delSecBtn.title = 'Delete section';
      delSecBtn.textContent = '×';
      delSecBtn.addEventListener('click', e => {
        e.stopPropagation();
        this._sections.splice(si, 1);
        if (!this._sections.length) {
          this._sections = [{ name: null, pairs: [], collapsed: false }];
        }
        this._renderAndNotify();
      });
      headerActions.append(delSecBtn);

      header.append(arrow, titleEl, headerActions);
      header.addEventListener('click', () => {
        this._sections[si].collapsed = !this._sections[si].collapsed;
        this._render();
      });
      group.append(header);

      // Pairs list
      const pairList = document.createElement('div');
      pairList.className = 'ini-pairs';
      if (!sec.collapsed) {
        sec.pairs.forEach((pair, pi) => {
          const row = document.createElement('div');
          row.className = 'ini-row';

          const keyInput = document.createElement('input');
          keyInput.type = 'text';
          keyInput.className = 'ini-key';
          keyInput.value = pair.key;
          keyInput.placeholder = 'key';
          keyInput.spellcheck = false;
          keyInput.addEventListener('input', () => {
            this._sections[si].pairs[pi].key = keyInput.value;
            this._notify();
          });

          const eq = document.createElement('span');
          eq.className = 'ini-eq';
          eq.textContent = '=';

          const valInput = document.createElement('input');
          valInput.type = 'text';
          valInput.className = 'ini-val';
          valInput.value = pair.value;
          valInput.placeholder = 'value';
          valInput.spellcheck = false;
          valInput.addEventListener('input', () => {
            this._sections[si].pairs[pi].value = valInput.value;
            this._notify();
          });

          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'ini-del';
          delBtn.title = 'Delete row';
          delBtn.textContent = '×';
          delBtn.addEventListener('click', () => {
            this._sections[si].pairs.splice(pi, 1);
            this._renderAndNotify();
          });

          row.append(keyInput, eq, valInput, delBtn);
          pairList.append(row);
        });

        // Add row button
        const addRowBtn = document.createElement('button');
        addRowBtn.type = 'button';
        addRowBtn.className = 'ini-add-row';
        addRowBtn.textContent = '+ Add key';
        addRowBtn.addEventListener('click', () => {
          this._sections[si].pairs.push({ key: '', value: '' });
          this._renderAndNotify();
          // Focus the new key input
          const inputs = pairList.querySelectorAll('.ini-key');
          inputs[inputs.length - 1]?.focus();
        });
        pairList.append(addRowBtn);
      }

      group.append(pairList);
      body.append(group);
    });

    wrapper.append(body);

    // ── Add section button ───────────────────────────────────────────────────
    const footer = document.createElement('div');
    footer.className = 'ini-footer';
    const addSecBtn = document.createElement('button');
    addSecBtn.type = 'button';
    addSecBtn.className = 'ini-add-section';
    addSecBtn.textContent = '+ Add section';
    addSecBtn.addEventListener('click', () => {
      this._sections.push({ name: 'NewSection', pairs: [], collapsed: false });
      this._renderAndNotify();
    });
    footer.append(addSecBtn);
    wrapper.append(footer);

    this._container.append(wrapper);
  }

  getValue() { return serializeIni(this._sections); }
  destroy() { this._container.innerHTML = ''; }
}
