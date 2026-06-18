// Secure preview iframe builder. Same approach proven in make-it-look-good:
//   sandbox="allow-scripts" ONLY (no allow-same-origin) => isolated opaque origin,
//   user content can't reach window.parent. srcdoc assembled by string concat.
//
// Two modes:
//   - sanitized (default): user HTML already DOMPurify'd by the type renderer. We inject
//     our OWN trusted bridge script (magic-selector + scroll-sync via postMessage).
//   - scripts (opt-in, WP07 confirm flow): user scripts allowed to run. Bridge still ours.
//
// The bridge talks to the parent only via postMessage (works despite the cross-origin sandbox).
import { DEFAULT_PREVIEW_MAX_WIDTH } from './settings-schema.js';
import { loadGlobal, vendor } from './script-loader.js';

const BRIDGE = `
(function(){
  function send(m){ parent.postMessage(Object.assign({__fv:1}, m), '*'); }
  // Magic selector: hover/click a [data-fv-src] element -> tell parent its source range.
  function srcEl(t){ while(t && t!==document.body){ if(t.dataset && t.dataset.fvSrc) return t; t=t.parentElement; } return null; }
  function openEl(t){ while(t && t!==document.body){ if(t.dataset && t.dataset.fvOpen!=null) return t; t=t.parentElement; } return null; }
  document.addEventListener('mousemove', function(e){
    var el = srcEl(e.target); if(!el) return;
    send({type:'hover', src: el.dataset.fvSrc});
  });
  document.addEventListener('click', function(e){
    // Open-an-entry click (e.g. a file inside a zip) takes precedence over source-mapping.
    var o = openEl(e.target); if(o){ send({type:'open', name: o.dataset.fvOpen}); return; }
    var el = srcEl(e.target); if(!el) return;
    send({type:'select', src: el.dataset.fvSrc});
  });
  // Scroll sync (preview -> parent), ratio based.
  var ticking=false;
  window.addEventListener('scroll', function(){
    if(ticking) return; ticking=true;
    requestAnimationFrame(function(){
      var h=document.documentElement.scrollHeight-window.innerHeight;
      send({type:'scroll', ratio: h>0 ? window.scrollY/h : 0});
      ticking=false;
    });
  }, {passive:true});
  // Parent -> preview: highlight a source range, or scroll to ratio.
  window.addEventListener('message', function(e){
    var d=e.data; if(!d||!d.__fv) return;
    if(d.type==='highlight'){
      document.querySelectorAll('.fv-hl').forEach(function(n){n.classList.remove('fv-hl');});
      if(d.src){ var n=document.querySelector('[data-fv-src="'+CSS.escape(d.src)+'"]'); if(n){ n.classList.add('fv-hl'); n.scrollIntoView({block:'center',behavior:'smooth'}); } }
    } else if(d.type==='scrollTo'){
      var h=document.documentElement.scrollHeight-window.innerHeight; window.scrollTo(0, (d.ratio||0)*h);
    }
  });
  send({type:'ready'});
})();`;

// Preview base CSS now lives in assets/preview.css (real CSS highlighting). Fetched once at module
// load and inlined into every srcdoc <style> — the sandboxed iframe makes no request (the parent
// fetches this same-origin file, which the service worker caches). buildSrcdoc stays synchronous.
// If the fetch ever fails (e.g. offline before it was cached), previews degrade to unstyled rather
// than breaking the module.
let BASE_CSS = "";
try { BASE_CSS = await (await fetch(new URL("../assets/preview.css", import.meta.url))).text(); }
catch { /* keep BASE_CSS empty — previews render unstyled but functional */ }

function previewColors(theme) {
  if (theme === 'dark') return { bg: '#1e1e1e', fg: '#e6e6e6', scheme: 'dark' };
  return { bg: '#fff', fg: '#1a1a1a', scheme: 'light' };
}

function earlyThemeStyle(theme) {
  const c = previewColors(theme);
  return `<style>html{background:${c.bg};color-scheme:${c.scheme};}body{background:${c.bg};color:${c.fg};}</style>\n`;
}

function buildSrcdoc({ bodyHtml, theme, extraHead = '', style = {} }) {
  const bodyClasses = [];
  if (theme === 'dark') bodyClasses.push('fv-dark');
  const vars = [];
  if (Number.isFinite(style.maxWidth)) vars.push(`--fv-maxw:${style.maxWidth}px;`);
  if (Number.isFinite(style.fontSize)) vars.push(`--fv-fontsize:${style.fontSize}px;`);
  if (Number.isFinite(style.lineHeight)) vars.push(`--fv-lh:${style.lineHeight};`);
  if (Number.isFinite(style.padding)) vars.push(`--fv-pad:${style.padding}px;`);
  if (style.readerFontFamily === 'sans') vars.push('--fv-reader-font:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;');
  else if (style.readerFontFamily === 'mono') vars.push('--fv-reader-font:ui-monospace,SFMono-Regular,Menlo,monospace;');
  else vars.push('--fv-reader-font:Georgia,"Times New Roman",serif;');
  if (style.readerTheme === 'sepia') bodyClasses.push('fv-reader-sepia');
  else if (style.readerTheme === 'dark') bodyClasses.push('fv-reader-dark');
  const rootStyle = vars.length ? `<style>:root{${vars.join('')}}</style>` : '';
  const bodyClass = bodyClasses.length ? ' class="' + bodyClasses.join(' ') + '"' : '';
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + earlyThemeStyle(theme)
    + '<style>' + BASE_CSS + '</style>\n' + rootStyle + extraHead + '\n</head>\n'
    + '<body' + bodyClass + '>\n' + bodyHtml + '\n'
    + '<script>' + BRIDGE + '</scr' + 'ipt>\n</body>\n</html>';
}

// container: element to host the iframe. Returns a controller for the parent side.
// Inject our trusted bridge script into a full user document (HTML "run scripts" mode).
function injectBridge(doc) {
  const tag = '<script>' + BRIDGE + '</scr' + 'ipt>';
  return doc.includes('</body>') ? doc.replace('</body>', tag + '</body>') : doc + tag;
}

export function mountPreview(container, { bodyHtml, fullDoc, theme, allowScripts = false, extraHead = '', style = {}, onSelect, onHover, onScroll, onOpen }) {
  container.innerHTML = '';
  const iframe = document.createElement('iframe');
  iframe.className = 'fv-preview-frame';
  iframe.title = 'Rendered preview';
  const colors = previewColors(theme);
  iframe.style.backgroundColor = colors.bg;
  iframe.style.colorScheme = colors.scheme;
  // allow-scripts only. NEVER add allow-same-origin together with allow-scripts.
  iframe.setAttribute('sandbox', 'allow-scripts');
  // fullDoc: render the user's whole document (scripts run in the sandbox). Otherwise wrap
  // the sanitized body fragment in our themed template.
  iframe.srcdoc = fullDoc != null ? injectBridge(fullDoc) : buildSrcdoc({ bodyHtml, theme, extraHead, style });
  container.appendChild(iframe);

  function onMsg(e) {
    if (e.source !== iframe.contentWindow) return;
    const d = e.data;
    if (!d || !d.__fv) return;
    if (d.type === 'select') onSelect?.(d.src);
    else if (d.type === 'hover') onHover?.(d.src);
    else if (d.type === 'scroll') onScroll?.(d.ratio);
    else if (d.type === 'open') onOpen?.(d.name);
  }
  window.addEventListener('message', onMsg);

  const post = (msg) => iframe.contentWindow?.postMessage({ __fv: 1, ...msg }, '*');
  return {
    iframe,
    highlight: (src) => post({ type: 'highlight', src }),
    scrollTo: (ratio) => post({ type: 'scrollTo', ratio }),
    destroy: () => {
      window.removeEventListener('message', onMsg);
      container.innerHTML = '';
    },
  };
}

// Screenshot (WP18): the live preview iframe is a null-origin sandbox, which html2canvas
// can't capture (its clone-iframe trick needs same-origin). So we re-render the ALREADY
// SANITIZED body into a temporary SAME-ORIGIN, off-screen iframe (safe — scripts are gone)
// and capture that. Not used for "run scripts" HTML (no sanitized body to reuse).
// Print / Save as PDF: render the sanitized body into a SAME-ORIGIN temp iframe (the sandboxed
// preview iframe can't call print() without loosening the sandbox) and print that. Forces a
// light theme + page margins for a clean PDF via the browser's "Save as PDF". Self-cleans.
export function printBodyHtml(bodyHtml, { style = {} } = {}) {
  const printCss = '<style>@media print{html,body{background:#fff!important;color:#000!important;}}@page{margin:16mm;}body{max-width:none;}</style>';
  const tmp = document.createElement('iframe');
  tmp.setAttribute('aria-hidden', 'true');
  tmp.style.cssText = 'position:fixed;left:-99999px;top:0;border:0;width:' + (Number(style.maxWidth) || DEFAULT_PREVIEW_MAX_WIDTH) + 'px;height:1px;';
  tmp.srcdoc = buildSrcdoc({ bodyHtml, theme: 'light', style, extraHead: printCss });
  document.body.appendChild(tmp);
  tmp.onload = () => {
    const win = tmp.contentWindow;
    const done = () => { if (tmp.parentNode) tmp.remove(); };
    try {
      win.addEventListener('afterprint', () => setTimeout(done, 300), { once: true });
      win.focus();
      win.print();
    } catch { done(); }
    setTimeout(done, 120000);   // safety net if afterprint never fires
  };
}

export async function captureBodyHtml(bodyHtml, { theme, style = {} }) {
  const html2canvas = await loadGlobal(vendor('html2canvas/html2canvas.min.js'), 'html2canvas');
  const tmp = document.createElement('iframe');
  tmp.style.cssText = 'position:fixed;left:-99999px;top:0;border:0;width:' + (Number(style.maxWidth) || DEFAULT_PREVIEW_MAX_WIDTH) + 'px;height:10px;';
  tmp.srcdoc = buildSrcdoc({ bodyHtml, theme, style });
  document.body.appendChild(tmp);
  try {
    await new Promise((r) => { tmp.onload = r; });
    const doc = tmp.contentDocument;
    tmp.style.height = Math.max(10, doc.body.scrollHeight) + 'px';
    await new Promise((r) => requestAnimationFrame(r));
    const canvas = await html2canvas(doc.body, { scale: 2, backgroundColor: null, useCORS: true });
    return canvas.toDataURL('image/png');
  } finally {
    tmp.remove();
  }
}
