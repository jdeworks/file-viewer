// Wire a toolbar's named-preset controls (a <select> + Save + Delete) to the presets
// store. Shared by the image studio and the webcam so both get identical behaviour.
//   wirePresetUi({ sel, saveBtn, delBtn, controls, getOptions }) → { refresh }
// `controls.setValue(k,v)` applies a loaded preset key-by-key; `getOptions()` returns the
// current options object to save.
import { listPresets, getPreset, savePreset, deletePreset } from './presets.js';

export function wirePresetUi({ sel, saveBtn, delBtn, controls, getOptions }) {
  if (!sel) return { refresh() {} };
  function refresh(selected) {
    sel.innerHTML = '<option value="">Preset…</option>'
      + listPresets().map((n) => `<option value="${n}">${n}</option>`).join('');
    if (selected) sel.value = selected;
  }
  const apply = (opts) => { if (opts) Object.entries(opts).forEach(([k, v]) => controls.setValue(k, v)); };
  refresh();
  sel.addEventListener('change', () => { const o = getPreset(sel.value); if (o) apply(o); });
  saveBtn?.addEventListener('click', () => {
    const name = (prompt('Save preset as:') || '').trim();
    if (!name) return;
    savePreset(name, getOptions());
    refresh(name);
  });
  delBtn?.addEventListener('click', () => {
    const name = sel.value;
    if (!name) return;
    deletePreset(name); refresh();
  });
  return { refresh };
}
