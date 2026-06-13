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

const BRIDGE = `
(function(){
  function send(m){ parent.postMessage(Object.assign({__fv:1}, m), '*'); }
  // Magic selector: hover/click a [data-fv-src] element -> tell parent its source range.
  function srcEl(t){ while(t && t!==document.body){ if(t.dataset && t.dataset.fvSrc) return t; t=t.parentElement; } return null; }
  document.addEventListener('mousemove', function(e){
    var el = srcEl(e.target); if(!el) return;
    send({type:'hover', src: el.dataset.fvSrc});
  });
  document.addEventListener('click', function(e){
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

const BASE_CSS = `
  :root{color-scheme:light dark;}
  html,body{margin:0;}
  body{font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:20px;max-width:var(--fv-maxw,900px);margin:0 auto;
       color:#1a1a1a;background:#fff;}
  body.fv-dark{color:#e6e6e6;background:#1e1e1e;}
  .fv-hl{outline:2px solid #4c9aff;outline-offset:2px;border-radius:3px;background:rgba(76,154,255,.12);}
  img,video,canvas{max-width:100%;height:auto;}
  pre{overflow:auto;}
  .pdf-doc,.pptx-doc{display:flex;flex-direction:column;align-items:center;gap:14px;}
  .pdf-page,.pptx-slide{box-shadow:0 1px 10px rgba(0,0,0,.3);max-width:100%;}
  .pdf-note{color:#888;font-size:13px;}
  .tabular{font:13px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;}
  .sheet-title{font-family:system-ui,sans-serif;margin:18px 0 4px;}
  .tbl-meta,.tbl-note{font-family:system-ui,sans-serif;color:#888;font-size:12px;margin:2px 0;}
  .table-wrap{overflow-x:auto;border:1px solid #0002;border-radius:6px;}
  table{border-collapse:collapse;width:100%;}
  th,td{border:1px solid #0001;padding:4px 8px;text-align:left;white-space:nowrap;vertical-align:top;}
  thead th{position:sticky;top:0;background:#f3f4f6;z-index:1;}
  tbody tr:nth-child(even){background:#00000006;}
  body.fv-dark thead th{background:#2a2a2a;}
  body.fv-dark .table-wrap{border-color:#fff2;}
  body.fv-dark th,body.fv-dark td{border-color:#ffffff1a;}
  .json-tree{font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;}
  .json-tree details{margin:0;}
  .json-tree summary{cursor:pointer;list-style:none;}
  .json-tree summary::-webkit-details-marker{display:none;}
  .json-tree summary::before{content:"\\25be";display:inline-block;width:1em;color:#888;}
  .json-tree details:not([open])>summary::before{content:"\\25b8";}
  .j-row,.j-node{padding-left:1.2em;}
  .j-children{padding-left:1.2em;border-left:1px solid #8884;margin-left:.3em;}
  .j-key{color:#0b69c7;} body.fv-dark .j-key{color:#7cb7ff;}
  .j-str{color:#1a7f37;} body.fv-dark .j-str{color:#7ee787;}
  .j-num{color:#9a5400;} body.fv-dark .j-num{color:#ffab70;}
  .j-bool{color:#8250df;} body.fv-dark .j-bool{color:#d2a8ff;}
  .j-null{color:#888;} .j-punc{color:#888;} .j-count{color:#aaa;font-size:11px;margin-left:6px;}
  .json-error{font-family:system-ui,sans-serif;color:#d23b3b;padding:14px;border:1px solid #d23b3b55;border-radius:8px;}
  .img-doc{display:flex;justify-content:center;align-items:flex-start;}
  .img-view,.img-doc svg{max-width:100%;height:auto;}`;

function buildSrcdoc({ bodyHtml, theme, extraHead = '', maxWidth }) {
  const darkClass = theme === 'dark' ? ' class="fv-dark"' : '';
  const rootStyle = Number.isFinite(maxWidth) ? `<style>:root{--fv-maxw:${maxWidth}px;}</style>` : '';
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '<style>' + BASE_CSS + '</style>\n' + rootStyle + extraHead + '\n</head>\n'
    + '<body' + darkClass + '>\n' + bodyHtml + '\n'
    + '<script>' + BRIDGE + '</scr' + 'ipt>\n</body>\n</html>';
}

// container: element to host the iframe. Returns a controller for the parent side.
// Inject our trusted bridge script into a full user document (HTML "run scripts" mode).
function injectBridge(doc) {
  const tag = '<script>' + BRIDGE + '</scr' + 'ipt>';
  return doc.includes('</body>') ? doc.replace('</body>', tag + '</body>') : doc + tag;
}

export function mountPreview(container, { bodyHtml, fullDoc, theme, allowScripts = false, extraHead = '', maxWidth, onSelect, onHover, onScroll }) {
  container.innerHTML = '';
  const iframe = document.createElement('iframe');
  iframe.className = 'fv-preview-frame';
  iframe.title = 'Rendered preview';
  // allow-scripts only. NEVER add allow-same-origin together with allow-scripts.
  iframe.setAttribute('sandbox', 'allow-scripts');
  // fullDoc: render the user's whole document (scripts run in the sandbox). Otherwise wrap
  // the sanitized body fragment in our themed template.
  iframe.srcdoc = fullDoc != null ? injectBridge(fullDoc) : buildSrcdoc({ bodyHtml, theme, extraHead, maxWidth: Number(maxWidth) });
  container.appendChild(iframe);

  function onMsg(e) {
    if (e.source !== iframe.contentWindow) return;
    const d = e.data;
    if (!d || !d.__fv) return;
    if (d.type === 'select') onSelect?.(d.src);
    else if (d.type === 'hover') onHover?.(d.src);
    else if (d.type === 'scroll') onScroll?.(d.ratio);
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
