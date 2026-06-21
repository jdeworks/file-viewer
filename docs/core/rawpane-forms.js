// Form-editor toggles for env / ini / toml / yaml files. Each swaps Monaco for a structured
// form editor (freezing Monaco read-only while active) and flushes the form's text back into
// Monaco on exit. Extracted from rawpane.js for modularity; the four near-identical toggles are
// collapsed into one parameterized helper (one config row per type).
import { state } from './state.js';
import { EnvFormEditor } from '../types/text/env/form-editor.js';
import { IniFormEditor } from '../types/text/ini/form-editor.js';
import { TomlFormEditor } from '../types/text/toml/form-editor.js';
import { YamlFormEditor } from '../types/text/yaml/form-editor.js';

// Edit-tracking callback for the editors that report changes live (env, ini).
function editTrack(newText) {
  state.intake = { ...state.intake, text: newText };
  state.downloadedSinceEdit = false;
}

// One row per form type. `create(host, text)` builds the editor seeded with the current text:
// env/ini take (host, text, onChange); toml/yaml construct bare then setValue.
const FORMS = {
  env:  { btnId: 'envFormBtn',  hostId: 'envFormHost',  create: (host, text) => new EnvFormEditor(host, text, editTrack) },
  ini:  { btnId: 'iniFormBtn',  hostId: 'iniFormHost',  create: (host, text) => new IniFormEditor(host, text, editTrack) },
  toml: { btnId: 'tomlFormBtn', hostId: 'tomlFormHost', create: (host, text) => { const e = new TomlFormEditor(host); e.setValue(text); return e; } },
  yaml: { btnId: 'yamlFormBtn', hostId: 'yamlFormHost', create: (host, text) => { const e = new YamlFormEditor(host); e.setValue(text); return e; } },
};

const instances = { env: null, ini: null, toml: null, yaml: null };

function setFormMode(kind, on) {
  const cfg = FORMS[kind];
  const editorEl = document.getElementById('editor');
  const btn = document.getElementById(cfg.btnId);
  if (on) {
    const text = state.rawview ? state.rawview.getValue() : (state.intake?.text || '');
    state.rawview?.updateOptions?.({ readOnly: true });   // freeze Monaco while form is active
    let host = document.getElementById(cfg.hostId);
    if (!host) {
      host = document.createElement('div');
      host.id = cfg.hostId;
      host.className = 'editor-host';
      editorEl?.parentNode?.insertBefore(host, editorEl);
    }
    host.hidden = false;
    if (editorEl) editorEl.style.display = 'none';
    instances[kind] = cfg.create(host, text);
  } else {
    if (instances[kind]) {   // flush form value back to Monaco before hiding
      const text = instances[kind].getValue();
      instances[kind].destroy();
      instances[kind] = null;
      if (state.rawview) {
        state.rawview.setValue(text);
        state.rawview.updateOptions?.({ readOnly: false });
      }
      state.intake = { ...state.intake, text };
    }
    const host = document.getElementById(cfg.hostId);
    if (host) host.hidden = true;
    if (editorEl) editorEl.style.display = '';
  }
  if (btn) {
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', String(on));
  }
}

function wireFormBtn(kind) {
  const btn = document.getElementById(FORMS[kind].btnId);
  if (!btn || btn.dataset.wired) return;
  btn.dataset.wired = '1';
  btn.addEventListener('click', () => setFormMode(kind, !btn.classList.contains('active')));
}

// The text of whichever form editor is currently mounted, or null if none — used by rawpane.js
// for unsaved-work detection and download/save (a form editor, when active, owns the live text).
export function getActiveFormValue() {
  for (const kind of ['env', 'ini', 'toml', 'yaml']) {
    if (instances[kind]) return instances[kind].getValue();
  }
  return null;
}

export const setEnvFormMode = (on) => setFormMode('env', on);
export const setIniFormMode = (on) => setFormMode('ini', on);
export const setTomlFormMode = (on) => setFormMode('toml', on);
export const setYamlFormMode = (on) => setFormMode('yaml', on);
export const wireEnvFormBtn = () => wireFormBtn('env');
export const wireIniFormBtn = () => wireFormBtn('ini');
export const wireTomlFormBtn = () => wireFormBtn('toml');
export const wireYamlFormBtn = () => wireFormBtn('yaml');
