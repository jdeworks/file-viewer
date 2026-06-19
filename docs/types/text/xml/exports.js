// XML exports: convert to JSON (recursive element→object mapping). Browser-native DOMParser;
// zero dependencies. Attribute names get an "@" prefix; text content becomes "#text".
import { downloadBlob } from '../../../core/exports.js';

function nodeToObj(node) {
  if (node.nodeType === 3) {
    const t = node.nodeValue.trim();
    return t ? t : null;
  }
  if (node.nodeType !== 1) return null;
  const obj = {};
  for (const attr of node.attributes) obj['@' + attr.name] = attr.value;
  const children = [...node.childNodes].map(nodeToObj).filter((v) => v != null);
  if (!children.length) return Object.keys(obj).length ? obj : null;
  if (children.length === 1 && typeof children[0] === 'string' && !Object.keys(obj).length) return children[0];
  if (children.length === 1 && typeof children[0] === 'string') { obj['#text'] = children[0]; return obj; }
  const byTag = {};
  for (const c of node.childNodes) {
    if (c.nodeType !== 1) continue;
    const n = c.tagName;
    const v = nodeToObj(c);
    if (byTag[n] === undefined) byTag[n] = v;
    else if (Array.isArray(byTag[n])) byTag[n].push(v);
    else byTag[n] = [byTag[n], v];
  }
  return Object.assign(obj, byTag);
}

export function getExports(intake) {
  const base = (intake.filename || 'document').replace(/\.[^.]+$/, '');
  return [
    {
      label: 'Convert to JSON',
      run: () => {
        const text = intake.text || new TextDecoder().decode(intake.bytes);
        const doc = new DOMParser().parseFromString(text, 'application/xml');
        const parseErr = doc.querySelector('parsererror');
        if (parseErr) throw new Error('XML parse error: ' + parseErr.textContent.slice(0, 80));
        const root = doc.documentElement;
        const json = { [root.tagName]: nodeToObj(root) };
        downloadBlob(JSON.stringify(json, null, 2), base + '.json', 'application/json');
      },
    },
  ];
}
