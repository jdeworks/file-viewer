// Format toolbars (JSON / YAML / XML / TOML) for the raw editor: Format / Minify / Validate
// actions plus the inline validity indicator. Extracted from rawpane.js for modularity.
// syncHasToolsClass lives in rawpane.js (it also tracks markdown/html toolbars) and is imported
// at call-time — the cycle is safe because it's only invoked inside handlers, never at module load.
import { state, $, toast } from './state.js';
import { loadGlobal, vendor } from './script-loader.js';
import { syncHasToolsClass } from './rawpane.js';

// ── JSON toolbar ──────────────────────────────────────────────────────────────
export function setJsonToolsVisible(visible) {
  const el = $('jsonTools');
  if (!el) return;
  el.hidden = !visible;
  syncHasToolsClass();
  if (!visible) {
    const indicator = $('jsonValidIndicator');
    if (indicator) indicator.hidden = true;
  }
}

export function wireJsonTools() {
  const el = $('jsonTools');
  if (!el || el.dataset.wired) return;
  el.dataset.wired = '1';
  el.addEventListener('click', (e) => {
    const action = e.target.closest('[data-json-action]')?.dataset.jsonAction;
    if (!action) return;
    runJsonAction(action);
  });
}

function updateJsonValidation(valid, errorMsg) {
  const indicator = $('jsonValidIndicator');
  if (!indicator) return;
  indicator.textContent = valid ? '✓ Valid' : ('✗ ' + (errorMsg || 'Invalid JSON'));
  indicator.className = 'json-valid-indicator ' + (valid ? 'json-valid' : 'json-invalid');
  indicator.hidden = false;
  clearTimeout(indicator._hideTimer);
  indicator._hideTimer = setTimeout(() => { indicator.hidden = true; }, 4000);
}

function runJsonAction(action) {
  if (!state.rawview) return;
  const text = state.rawview.getValue();
  if (action === 'format') {
    // Try Monaco's built-in formatter first (honours per-language settings)
    const formatted = state.rawview.format?.();
    if (formatted && typeof formatted.then === 'function') {
      formatted.catch(() => {
        try {
          state.rawview.setValue(JSON.stringify(JSON.parse(text), null, 2));
        } catch (err) {
          toast('Cannot format: ' + (err.message || 'invalid JSON'));
        }
      });
      return;
    }
    // Fallback: manual pretty-print
    try {
      state.rawview.setValue(JSON.stringify(JSON.parse(text), null, 2));
    } catch (err) {
      toast('Cannot format: ' + (err.message || 'invalid JSON'));
    }
  } else if (action === 'minify') {
    try {
      state.rawview.setValue(JSON.stringify(JSON.parse(text)));
    } catch (err) {
      toast('Cannot minify: ' + (err.message || 'invalid JSON'));
    }
  } else if (action === 'validate') {
    try {
      JSON.parse(text);
      updateJsonValidation(true, null);
    } catch (err) {
      updateJsonValidation(false, err.message);
    }
  }
}

// ── YAML toolbar ──────────────────────────────────────────────────────────────
export function setYamlToolsVisible(visible) {
  const el = $('yamlTools');
  if (!el) return;
  el.hidden = !visible;
  syncHasToolsClass();
  if (!visible) {
    const indicator = $('yamlValidIndicator');
    if (indicator) indicator.hidden = true;
  }
}

export function wireYamlTools() {
  const el = $('yamlTools');
  if (!el || el.dataset.wired) return;
  el.dataset.wired = '1';
  $('yamlFormatBtn')?.addEventListener('click', () => runYamlAction('format'));
  $('yamlValidateBtn')?.addEventListener('click', () => runYamlAction('validate'));
}

function updateYamlValidation(valid, message) {
  const indicator = $('yamlValidIndicator');
  if (!indicator) return;
  indicator.textContent = valid ? '✓ Valid YAML' : ('✗ ' + (message || 'Invalid YAML'));
  indicator.className = 'json-valid-indicator ' + (valid ? 'json-valid' : 'json-invalid');
  indicator.hidden = false;
  clearTimeout(indicator._hideTimer);
  indicator._hideTimer = setTimeout(() => { indicator.hidden = true; }, 4000);
}

async function runYamlAction(action) {
  if (!state.rawview) return;
  const text = state.rawview.getValue();
  let jsyaml;
  try {
    jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  } catch (err) {
    toast('Could not load js-yaml: ' + (err.message || err));
    return;
  }
  if (action === 'format') {
    try {
      const parsed = jsyaml.load(text);
      state.rawview.setValue(jsyaml.dump(parsed, { indent: 2 }));
    } catch (err) {
      toast('Cannot format: ' + (err.message || 'invalid YAML'));
    }
  } else if (action === 'validate') {
    try {
      jsyaml.load(text);
      updateYamlValidation(true, null);
    } catch (err) {
      updateYamlValidation(false, (err.message || 'invalid YAML').slice(0, 80));
    }
  }
}

// ── XML toolbar ───────────────────────────────────────────────────────────────
export function setXmlToolsVisible(visible) {
  const el = $('xmlTools');
  if (!el) return;
  el.hidden = !visible;
  syncHasToolsClass();
  if (!visible) {
    const indicator = $('xmlValidIndicator');
    if (indicator) indicator.hidden = true;
  }
}

export function wireXmlTools() {
  const el = $('xmlTools');
  if (!el || el.dataset.wired) return;
  el.dataset.wired = '1';
  $('xmlFormatBtn')?.addEventListener('click', () => runXmlAction('format'));
  $('xmlValidateBtn')?.addEventListener('click', () => runXmlAction('validate'));
}

function updateXmlValidation(valid, message) {
  const indicator = $('xmlValidIndicator');
  if (!indicator) return;
  indicator.textContent = valid ? '✓ Valid XML' : ('✗ ' + (message || 'Invalid XML'));
  indicator.className = 'json-valid-indicator ' + (valid ? 'json-valid' : 'json-invalid');
  indicator.hidden = false;
  clearTimeout(indicator._hideTimer);
  indicator._hideTimer = setTimeout(() => { indicator.hidden = true; }, 4000);
}

function formatXml(text) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');
  const err = doc.querySelector('parseerror, parsererror');
  if (err) throw new Error(err.textContent.split('\n')[0].trim());
  const raw = new XMLSerializer().serializeToString(doc);
  let indent = 0;
  return raw
    .replace(/></g, '>\n<')
    .split('\n')
    .map((line) => {
      if (line.match(/^<\/\w/)) indent--;
      const result = '  '.repeat(Math.max(0, indent)) + line.trim();
      if (line.match(/^<\w[^>]*[^/]>$/) && !line.match(/<.*<.*>/)) indent++;
      return result;
    })
    .join('\n');
}

function runXmlAction(action) {
  if (!state.rawview) return;
  const text = state.rawview.getValue();
  if (action === 'format') {
    try {
      state.rawview.setValue(formatXml(text));
    } catch (err) {
      toast('Cannot format: ' + (err.message || 'invalid XML'));
    }
  } else if (action === 'validate') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/xml');
      const err = doc.querySelector('parseerror, parsererror');
      if (err) throw new Error(err.textContent.split('\n')[0].trim());
      updateXmlValidation(true, null);
    } catch (err) {
      updateXmlValidation(false, (err.message || 'Invalid XML').slice(0, 80));
    }
  }
}

// ── TOML toolbar ──────────────────────────────────────────────────────────────
export function setTomlToolsVisible(visible) {
  const el = $('tomlTools');
  if (!el) return;
  el.hidden = !visible;
  syncHasToolsClass();
  if (!visible) {
    const indicator = $('tomlValidIndicator');
    if (indicator) indicator.hidden = true;
  }
}

export function wireTomlTools() {
  const el = $('tomlTools');
  if (!el || el.dataset.wired) return;
  el.dataset.wired = '1';
  $('tomlValidateBtn')?.addEventListener('click', async () => {
    if (!state.rawview) return;
    try {
      const { parseTOML } = await import('../types/text/toml/toml.js');
      parseTOML(state.rawview.getValue());
      updateTomlValidation(true, '');
    } catch (e) {
      updateTomlValidation(false, (e.message || 'Invalid TOML').slice(0, 80));
    }
  });
}

function updateTomlValidation(valid, message) {
  const indicator = $('tomlValidIndicator');
  if (!indicator) return;
  indicator.textContent = valid ? '✓ Valid TOML' : ('✗ ' + (message || 'Invalid TOML'));
  indicator.className = 'json-valid-indicator ' + (valid ? 'json-valid' : 'json-invalid');
  indicator.hidden = false;
  clearTimeout(indicator._hideTimer);
  indicator._hideTimer = setTimeout(() => { indicator.hidden = true; }, 4000);
}
