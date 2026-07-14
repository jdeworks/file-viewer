// Visible Monaco language/indentation status. Language overrides are intentionally scoped to the
// active registry type plus filename/extension, so choosing Python for .py files cannot turn every
// file handled by the broad `code` type into Python.
import { $, toast } from './state.js';
import { LANGUAGE_LABELS } from '../types/text/code/langmap.js';

const CHOICES = [
  'plaintext', 'markdown', 'javascript', 'typescript', 'python', 'json', 'html', 'css', 'scss',
  'less', 'xml', 'yaml', 'ini', 'sql', 'shell', 'powershell', 'bat', 'cpp', 'csharp', 'java',
  'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala', 'objective-c', 'fsharp', 'vb', 'hcl',
  'graphql', 'protobuf', 'dockerfile', 'makefile', 'wgsl', 'solidity', 'lua', 'r', 'perl', 'dart',
  'elixir', 'clojure',
];

const EXTRA_LABELS = {
  plaintext: 'Plain text', markdown: 'Markdown', json: 'JSON', yaml: 'YAML',
};

function labelFor(language) {
  return EXTRA_LABELS[language] || LANGUAGE_LABELS[language] || language || 'Plain text';
}

function fileScope(intake) {
  const base = String(intake?.filename || intake?.name || 'file').split('/').pop().toLowerCase();
  const dot = base.lastIndexOf('.');
  if (dot > 0 && dot < base.length - 1) return '.' + base.slice(dot + 1);
  return base || 'file';
}

export function editorLanguageStorageKey(type, intake) {
  return `fv:editor-language:${type?.id || 'raw'}:${fileScope(intake)}`;
}

export function readEditorLanguage(type, intake) {
  try {
    const value = localStorage.getItem(editorLanguageStorageKey(type, intake)) || '';
    return value && value !== 'auto' ? value : '';
  } catch { return ''; }
}

export function resolveEditorLanguage(type, intake, detectedLanguage) {
  return readEditorLanguage(type, intake) || detectedLanguage || 'plaintext';
}

export function hideEditorStatus() {
  const host = $('editorStatus');
  if (host) host.hidden = true;
  $('rawPane')?.classList.remove('has-editor-status');
}

export function mountEditorStatus({ rawview, type, intake, detectedLanguage, configuredIndentation }) {
  const host = $('editorStatus');
  const select = $('editorLanguageSelect');
  const indent = $('editorIndentStatus');
  if (!host || !select || !indent || !rawview || intake?.isBinary) {
    hideEditorStatus();
    return;
  }

  const override = readEditorLanguage(type, intake);
  const languages = [...new Set([detectedLanguage, override, ...CHOICES].filter(Boolean))];
  select.replaceChildren(new Option(`Auto — ${labelFor(detectedLanguage)}`, 'auto'));
  for (const language of languages) select.add(new Option(labelFor(language), language));
  select.value = override || 'auto';
  select.title = `Syntax highlighting for ${fileScope(intake)} files. Auto detected ${labelFor(detectedLanguage)}.`;
  select.onchange = () => {
    const chosen = select.value;
    const language = chosen === 'auto' ? detectedLanguage : chosen;
    try {
      const key = editorLanguageStorageKey(type, intake);
      if (chosen === 'auto') localStorage.removeItem(key);
      else localStorage.setItem(key, chosen);
    } catch { /* private mode */ }
    rawview.setLanguage(language || 'plaintext');
    toast(chosen === 'auto'
      ? `Language restored to detected ${labelFor(detectedLanguage)}.`
      : `${labelFor(language)} highlighting remembered for ${fileScope(intake)} files.`);
  };

  const actual = rawview.indentation?.() || configuredIndentation;
  const style = actual.insertSpaces ? `${actual.tabSize} spaces` : 'tabs';
  const temporary = actual.detected && (actual.insertSpaces !== configuredIndentation.insertSpaces
    || (actual.insertSpaces && actual.tabSize !== configuredIndentation.tabSize));
  indent.textContent = temporary ? `${style} · detected` : style;
  indent.title = temporary
    ? `This file uses ${style}; that temporary model override does not change your saved editor settings.`
    : `Indentation: ${style}${actual.detected ? ' (detected from this file)' : ''}.`;
  indent.dataset.temporary = temporary ? '1' : '0';

  host.hidden = false;
  $('rawPane')?.classList.add('has-editor-status');
  requestAnimationFrame(() => rawview.layout?.());
}
