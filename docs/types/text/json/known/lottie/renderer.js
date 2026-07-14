import { vendor } from '../../../../../core/script-loader.js';
import { assignDroppedFiles, prepareAnimation } from './assets.js';
import { mountLottieExports } from './exports.js';
import { lottieSummary, parseLottie } from './model.js';

const CSS = `
.lottie-doc{font-family:system-ui,sans-serif;color:var(--fg,#202124);padding:14px;box-sizing:border-box;min-height:100%}
.lottie-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}.lottie-title{font-size:18px;font-weight:700}.lottie-sub{font-size:12px;color:var(--fg-2,#667085);margin-top:2px}
.lottie-meta{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 12px}.lottie-chip{font-size:11px;border:1px solid var(--border,#d0d5dd);border-radius:999px;padding:3px 8px;background:var(--bg-2,#f7f8fa)}
.lottie-stage{height:min(58vh,560px);min-height:280px;border:1px solid var(--border,#d0d5dd);border-radius:10px;overflow:hidden;background:repeating-conic-gradient(#f5f5f5 0 25%,#fff 0 50%) 50%/18px 18px;position:relative;outline:none}.lottie-stage:focus-visible{box-shadow:0 0 0 3px color-mix(in srgb,var(--accent,#2563eb) 35%,transparent);border-color:var(--accent,#2563eb)}
.fv-dark .lottie-stage{background:repeating-conic-gradient(#24272b 0 25%,#1d2024 0 50%) 50%/18px 18px}.lottie-frame{display:block;border:0;width:100%;height:100%;background:transparent}
.lottie-controls{display:grid;grid-template-columns:auto auto auto auto minmax(120px,1fr) auto auto;gap:8px;align-items:center;margin-top:10px}.lottie-controls button,.lottie-controls select,.lottie-export-panel button,.lottie-export-panel select,.lottie-export-panel input{font:inherit;border:1px solid var(--border,#cfd4dc);border-radius:6px;background:var(--bg,#fff);color:inherit;padding:5px 9px}.lottie-controls button,.lottie-export-panel button{cursor:pointer}.lottie-controls button:disabled,.lottie-export-panel button:disabled{cursor:default;opacity:.55}.lottie-controls input[type=range]{width:100%}
.lottie-mode{display:flex;gap:5px;align-items:center;font-size:12px;white-space:nowrap}.lottie-frame-label{font:12px ui-monospace,monospace;min-width:72px;text-align:right}.lottie-status{font-size:12px;color:var(--fg-2,#667085);min-height:18px;margin-top:5px}
.lottie-export-panel{margin-top:8px;padding:10px;border:1px solid var(--border,#d0d5dd);border-radius:8px;background:var(--bg-2,#f7f8fa)}.lottie-export-settings,.lottie-export-actions{display:flex;align-items:end;gap:10px;flex-wrap:wrap}.lottie-export-actions{align-items:center;margin-top:9px}.lottie-export-field{display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--fg-2,#667085)}.lottie-export-field input,.lottie-export-field select{color:var(--fg,#202124)}.lottie-export-number{display:flex;align-items:center}.lottie-export-number input{width:78px;border-radius:6px 0 0 6px}.lottie-export-suffix{align-self:stretch;display:flex;align-items:center;padding:0 7px;border:1px solid var(--border,#cfd4dc);border-left:0;border-radius:0 6px 6px 0;color:var(--fg,#202124);background:var(--bg,#fff)}.lottie-export-fps{width:84px}.lottie-export-background-wrap{display:flex;gap:5px}.lottie-export-color{width:42px;padding:2px!important}.lottie-export-loop{font-size:12px;display:flex;align-items:center;min-height:31px}.lottie-export-loop input{margin:0 3px 0 0}.lottie-export-progress{width:min(100%,520px);height:8px;margin-top:9px}.lottie-export-status{font-size:12px;color:var(--fg-2,#667085);min-height:18px;margin-top:4px}.lottie-export-frames{display:flex;flex-direction:column;gap:5px;max-height:260px;overflow:auto;margin-top:9px}.lottie-export-frame{display:grid;grid-template-columns:42px minmax(110px,1fr) auto auto;align-items:center;gap:7px;font-size:12px}.lottie-export-frame img{width:40px;height:40px;object-fit:contain;border:1px solid var(--border,#d0d5dd);background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 50%/10px 10px}.lottie-export-frame a{color:inherit}
.lottie-messages{margin:10px 0;padding:0;list-style:none}.lottie-messages li{font-size:12px;padding:6px 9px;margin:4px 0;border-left:3px solid #d97706;background:#fff7ed}.fv-dark .lottie-messages li{background:#3b2a18}
.lottie-assets{border:1px dashed var(--border,#98a2b3);border-radius:8px;padding:12px;margin-top:10px;text-align:center;font-size:12px}.lottie-assets.drag{border-color:#2563eb;background:#eff6ff}.fv-dark .lottie-assets.drag{background:#17223b}.lottie-assets button{font:inherit;margin-left:6px}.lottie-assets ul{text-align:left;margin:8px auto 0;max-width:640px}.lottie-error{padding:14px;border-left:3px solid #c62828;background:#ffebee}.fv-dark .lottie-error{background:#3b1f22}
@media(max-width:700px){.lottie-doc{padding:9px}.lottie-stage{min-height:240px;height:48vh}.lottie-controls{grid-template-columns:auto auto 1fr auto}.lottie-mode{grid-column:1/3}.lottie-controls input[type=range]{grid-column:2/4}.lottie-frame-label{grid-column:4}.lottie-export-toggle{grid-column:1/-1}.lottie-export-settings{align-items:stretch}.lottie-export-field{flex:1 1 120px}.lottie-export-frame{grid-template-columns:42px 1fr auto}.lottie-export-frame a{display:none}}
`;

function attr(value) {
  return String(value).replace(/[&"<>]/g, (c) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' }[c]));
}

function frameDocument(playerUrl) {
  const origin = new URL(playerUrl).origin;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' ${attr(origin)}; style-src 'unsafe-inline'; img-src data: blob:; font-src 'none'; media-src 'none'; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'">
    <style>html,body,#animation{width:100%;height:100%;margin:0;overflow:hidden;background:transparent}svg{display:block}#exportAnimation{position:fixed;left:-100000px;top:0;overflow:hidden;pointer-events:none}#exportCanvas{display:none}</style>
    <script src="${attr(playerUrl)}"></script></head><body><div id="animation"></div><div id="exportAnimation"></div><canvas id="exportCanvas"></canvas><script>
    (function(){
      var MARK='__fvLottie', animation=null, pristine=null, ip=0, interactionMode='once', exporter=null, exportState=null, exportBusy=false;
      function copy(value){ return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value)); }
      function send(type, extra, transfer){ parent.postMessage(Object.assign({__fvLottie:1,type:type},extra||{}),'*',transfer||[]); }
      function destroyPreview(){ if(animation){ try{animation.destroy();}catch(e){} animation=null; } document.getElementById('animation').textContent=''; }
      function destroyExport(){ if(exporter){ try{exporter.destroy();}catch(e){} exporter=null; } exportState=null; exportBusy=false; document.getElementById('exportAnimation').textContent=''; }
      function destroy(){ destroyExport(); destroyPreview(); pristine=null; }
      function setInteractionMode(value){ interactionMode=value||'once'; document.body.style.cursor=interactionMode==='click'?'pointer':'default'; }
      function nextPaint(){ return new Promise(function(resolve){ requestAnimationFrame(function(){ resolve(); }); }); }
      function canvasBlob(canvas){ return new Promise(function(resolve,reject){ canvas.toBlob(function(blob){ blob?resolve(blob):reject(new Error('PNG rasterization failed.')); },'image/png'); }); }
      function imageFromBlob(blob){ return new Promise(function(resolve,reject){ var url=URL.createObjectURL(blob), image=new Image(); image.onload=function(){ URL.revokeObjectURL(url); resolve(image); }; image.onerror=function(){ URL.revokeObjectURL(url); reject(new Error('The generated SVG could not be decoded.')); }; image.src=url; }); }
      async function startExport(msg){
        if(!pristine) throw new Error('The animation is not ready for export.');
        destroyExport();
        var width=Math.floor(Number(msg.width)),height=Math.floor(Number(msg.height));
        if(!(width>0&&height>0)) throw new Error('Invalid export dimensions.');
        var container=document.getElementById('exportAnimation');
        container.style.width=width+'px'; container.style.height=height+'px';
        var canvas=document.getElementById('exportCanvas'); canvas.width=width; canvas.height=height;
        exportState={jobId:msg.jobId,width:width,height:height,background:/^#[0-9a-f]{6}$/i.test(msg.background||'')?msg.background:''};
        exporter=window.lottie.loadAnimation({container:container,renderer:'svg',loop:false,autoplay:false,animationData:copy(pristine),rendererSettings:{preserveAspectRatio:'xMidYMid meet',progressiveLoad:false}});
        exporter.addEventListener('DOMLoaded',function(){
          if(!exportState||exportState.jobId!==msg.jobId) return;
          // lottie_light's initial paused DOM has identity transforms until it
          // visits a different frame. Prime once so an export beginning at frame
          // zero receives the authored position/scale instead of that placeholder.
          if(exporter.totalFrames>0) exporter.goToAndStop(Math.min(1,Math.max(0.0001,exporter.totalFrames/2)),true);
          exporter.goToAndStop(0,true); send('export-ready',{jobId:msg.jobId});
        });
        exporter.addEventListener('data_failed',function(){ send('export-error',{jobId:msg.jobId,message:'The export renderer could not decode this animation.'}); destroyExport(); });
      }
      async function captureExportFrame(msg){
        if(!exportState||!exporter||exportState.jobId!==msg.jobId) throw new Error('The export job is no longer active.');
        if(exportBusy) throw new Error('The previous frame is still being rasterized.');
        exportBusy=true;
        try{
          exporter.goToAndStop(Math.max(0,Number(msg.relativeFrame)||0),true);
          await nextPaint();
          if(!exportState||exportState.jobId!==msg.jobId) throw new Error('The export job was cancelled.');
          var source=document.querySelector('#exportAnimation svg');
          if(!source) throw new Error('The export renderer produced no SVG frame.');
          var clone=source.cloneNode(true);
          clone.setAttribute('xmlns','http://www.w3.org/2000/svg'); clone.setAttribute('width',String(exportState.width)); clone.setAttribute('height',String(exportState.height));
          var svgBlob=new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'});
          // Chromium does not consistently decode serialized SVG through
          // createImageBitmap inside an opaque-origin iframe. A blob-backed Image
          // stays inside the same sandbox/CSP and is reliable for SVG raster input.
          var sourceImage=await imageFromBlob(svgBlob);
          var canvas=document.getElementById('exportCanvas'),ctx=canvas.getContext('2d');
          ctx.clearRect(0,0,canvas.width,canvas.height);
          if(exportState.background){ ctx.fillStyle=exportState.background; ctx.fillRect(0,0,canvas.width,canvas.height); }
          ctx.drawImage(sourceImage,0,0,canvas.width,canvas.height); sourceImage.close&&sourceImage.close();
          if(typeof createImageBitmap==='function'){
            var bitmap=await createImageBitmap(canvas);
            send('export-frame',{jobId:msg.jobId,sequence:msg.sequence,width:canvas.width,height:canvas.height,bitmap:bitmap},[bitmap]);
          }else{
            send('export-frame',{jobId:msg.jobId,sequence:msg.sequence,width:canvas.width,height:canvas.height,blob:await canvasBlob(canvas)});
          }
        }finally{ exportBusy=false; }
      }
      document.addEventListener('click',function(){ if(interactionMode==='click') send('interaction',{kind:'click'}); },true);
      window.addEventListener('message',async function(event){
        if(event.source!==parent) return;
        var msg=event.data;
        if(!msg||msg[MARK]!==1) return;
        try{
          if(msg.type==='load'){
            destroy(); ip=Number(msg.ip)||0; setInteractionMode(msg.mode); pristine=copy(msg.animationData);
            if(!window.lottie||typeof window.lottie.loadAnimation!=='function') throw new Error('The vendored Lottie player did not load.');
            animation=window.lottie.loadAnimation({container:document.getElementById('animation'),renderer:'svg',loop:!!msg.loop,autoplay:!!msg.autoplay,animationData:copy(pristine),rendererSettings:{preserveAspectRatio:'xMidYMid meet',progressiveLoad:false}});
            animation.setSpeed(Number(msg.speed)||1);
            animation.addEventListener('DOMLoaded',function(){ if(!msg.autoplay) animation.goToAndStop(0,true); send('loaded',{frame:ip}); });
            animation.addEventListener('enterFrame',function(event){ send('frame',{frame:ip+(Number(event.currentTime)||0)}); });
            animation.addEventListener('complete',function(){ send('complete'); });
            animation.addEventListener('data_failed',function(){ send('error',{message:'The player could not decode this animation.'}); });
          } else if(msg.type==='play'&&animation) animation.play();
          else if(msg.type==='pause'&&animation) animation.pause();
          else if(msg.type==='restart'&&animation){ animation.goToAndPlay(0,true); }
          else if(msg.type==='seek'&&animation){ animation.goToAndStop(Math.max(0,(Number(msg.frame)||ip)-ip),true); send('frame',{frame:Number(msg.frame)||ip}); }
          else if(msg.type==='speed'&&animation) animation.setSpeed(Number(msg.value)||1);
          else if(msg.type==='loop'&&animation) animation.loop=!!msg.value;
          else if(msg.type==='mode') setInteractionMode(msg.value);
          else if(msg.type==='export-start') await startExport(msg);
          else if(msg.type==='export-frame') await captureExportFrame(msg);
          else if(msg.type==='export-end'&&exportState&&exportState.jobId===msg.jobId) destroyExport();
          else if(msg.type==='destroy') destroy();
        }catch(error){
          var message=error&&error.message?error.message:String(error);
          if(/^export-/.test(msg.type||'')) send('export-error',{jobId:msg.jobId,sequence:msg.sequence,message:message});
          else send('error',{message:message});
        }
      });
      window.addEventListener('unload',destroy);
      send('ready',{available:!!(window.lottie&&window.lottie.loadAnimation)});
    })();
    </script></body></html>`;
}

function createSandbox(slot, animationData, summary, { autoplay, loop, mode, onState, onError }) {
  const iframe = document.createElement('iframe');
  iframe.className = 'lottie-frame';
  iframe.title = 'Lottie animation preview';
  iframe.tabIndex = -1;
  iframe.referrerPolicy = 'no-referrer';
  iframe.setAttribute('sandbox', 'allow-scripts');
  const playerUrl = vendor('lottie/lottie_light.min.js');
  let ready = false;
  let destroyed = false;
  const pending = new Map();
  function post(message) {
    iframe.contentWindow?.postMessage({ __fvLottie: 1, ...message }, '*');
  }
  function request(message, responseType, timeoutMs = 120000) {
    if (!ready || destroyed) return Promise.reject(new Error('The Lottie sandbox is not ready.'));
    const key = `${responseType}:${message.jobId}:${message.sequence ?? ''}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(key);
        reject(new Error('The Lottie sandbox timed out while rendering a frame.'));
      }, timeoutMs);
      pending.set(key, { resolve, reject, timer, jobId: message.jobId });
      post(message);
    });
  }
  function settle(message) {
    const key = `${message.type}:${message.jobId}:${message.sequence ?? ''}`;
    const item = pending.get(key);
    if (!item) return false;
    pending.delete(key); clearTimeout(item.timer); item.resolve(message); return true;
  }
  function rejectJob(jobId, message) {
    for (const [key, item] of pending) {
      if (item.jobId !== jobId) continue;
      pending.delete(key); clearTimeout(item.timer); item.reject(new Error(message));
    }
  }
  function onMessage(event) {
    if (event.source !== iframe.contentWindow) return;
    const message = event.data;
    if (!message || message.__fvLottie !== 1) return;
    if (message.type === 'ready') {
      ready = true;
      if (!message.available) { onError('The vendored Lottie player could not be initialized.'); return; }
      post({ type: 'load', animationData, ip: summary.inFrame, autoplay, loop, mode, speed: 1 });
    } else if (message.type === 'export-error') rejectJob(message.jobId, message.message || 'Lottie frame export failed.');
    else if (message.type === 'export-ready' || message.type === 'export-frame') settle(message);
    else if (message.type === 'error') onError(message.message || 'Lottie playback failed.');
    else onState(message);
  }
  window.addEventListener('message', onMessage);
  iframe.srcdoc = frameDocument(playerUrl);
  slot.replaceChildren(iframe);
  return {
    iframe,
    command(type, extra = {}) { if (ready) post({ type, ...extra }); },
    startExport(options) { return request({ type: 'export-start', ...options }, 'export-ready'); },
    captureExportFrame(jobId, sequence, relativeFrame) {
      return request({ type: 'export-frame', jobId, sequence, relativeFrame }, 'export-frame');
    },
    endExport(jobId) {
      if (ready) post({ type: 'export-end', jobId });
      rejectJob(jobId, 'The Lottie export was cancelled.');
    },
    destroy() {
      destroyed = true;
      if (ready) post({ type: 'destroy' });
      for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error('The Lottie sandbox was destroyed.')); }
      pending.clear();
      window.removeEventListener('message', onMessage);
      iframe.remove();
    },
  };
}

function addMessage(list, text) {
  const item = document.createElement('li');
  item.textContent = text;
  list.appendChild(item);
}

function buildHost(summary) {
  const host = document.createElement('div');
  host.className = 'lottie-doc';
  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);
  const header = document.createElement('header');
  header.className = 'lottie-head';
  const heading = document.createElement('div');
  const title = document.createElement('div'); title.className = 'lottie-title'; title.textContent = summary.name;
  const sub = document.createElement('div'); sub.className = 'lottie-sub'; sub.textContent = `Lottie ${summary.version}`;
  heading.append(title, sub); header.appendChild(heading); host.appendChild(header);
  const meta = document.createElement('div'); meta.className = 'lottie-meta';
  for (const value of [`${summary.width} × ${summary.height}`, `${summary.fps} fps`, `${summary.frames} frames`, `${summary.duration.toFixed(2)} s`, `${summary.layers} layer${summary.layers === 1 ? '' : 's'}`, `${summary.assets} asset${summary.assets === 1 ? '' : 's'}`]) {
    const chip = document.createElement('span'); chip.className = 'lottie-chip'; chip.textContent = value; meta.appendChild(chip);
  }
  host.appendChild(meta);
  const messages = document.createElement('ul'); messages.className = 'lottie-messages'; host.appendChild(messages);
  const stage = document.createElement('div'); stage.className = 'lottie-stage'; stage.tabIndex = 0; stage.setAttribute('role', 'group'); stage.setAttribute('aria-label', 'Lottie animation preview'); stage.dataset.playbackMode = 'once'; host.appendChild(stage);
  const controls = document.createElement('div'); controls.className = 'lottie-controls';
  const modeLabel = document.createElement('label'); modeLabel.className = 'lottie-mode'; modeLabel.appendChild(document.createTextNode('Mode'));
  const mode = document.createElement('select'); mode.className = 'lottie-mode-select'; mode.setAttribute('aria-label', 'Playback mode');
  for (const [value, label] of [['once', 'Play once'], ['loop', 'Loop'], ['hover', 'Hover'], ['click', 'Click']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = label; mode.appendChild(option);
  }
  modeLabel.appendChild(mode);
  const play = document.createElement('button'); play.type = 'button'; play.textContent = 'Pause'; play.setAttribute('aria-label', 'Pause animation');
  const restart = document.createElement('button'); restart.type = 'button'; restart.textContent = 'Restart';
  const speed = document.createElement('select'); speed.setAttribute('aria-label', 'Playback speed');
  for (const value of ['0.5', '1', '2']) { const option = document.createElement('option'); option.value = value; option.textContent = value + '×'; if (value === '1') option.selected = true; speed.appendChild(option); }
  const scrub = document.createElement('input'); scrub.type = 'range'; scrub.min = String(summary.inFrame); scrub.max = String(Math.max(summary.inFrame, summary.outFrame - 0.001)); scrub.step = '0.01'; scrub.value = String(summary.inFrame); scrub.setAttribute('aria-label', 'Animation frame');
  const frameLabel = document.createElement('span'); frameLabel.className = 'lottie-frame-label'; frameLabel.textContent = `${Math.round(summary.inFrame)} / ${Math.ceil(summary.outFrame - 1)}`;
  controls.append(modeLabel, play, restart, speed, scrub, frameLabel); host.appendChild(controls);
  const status = document.createElement('div'); status.className = 'lottie-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); host.appendChild(status);
  const assetBox = document.createElement('div'); assetBox.className = 'lottie-assets'; assetBox.hidden = true;
  const assetText = document.createElement('span');
  const choose = document.createElement('button'); choose.type = 'button'; choose.textContent = 'Choose assets';
  const input = document.createElement('input'); input.type = 'file'; input.multiple = true; input.hidden = true;
  const assetList = document.createElement('ul'); assetBox.append(assetText, choose, input, assetList); host.appendChild(assetBox);
  return { host, messages, stage, controls, mode, play, restart, speed, scrub, frameLabel, status, assetBox, assetText, choose, input, assetList };
}

export async function render(intake, ctx = {}) {
  let animation;
  try { animation = parseLottie(intake); }
  catch (error) {
    const node = document.createElement('div'); node.className = 'lottie-error'; node.textContent = error.message;
    return { parentNode: node };
  }
  const summary = lottieSummary(animation);
  const ui = buildHost(summary);
  const supplied = new Map();
  const reduceMotion = !!ctx.settings?.reduceMotion;
  let player = null;
  let destroyed = false;
  let playbackMode = 'once';
  let playing = !reduceMotion;
  let completed = false;
  let currentFrame = summary.inFrame;
  let hoverEngaged = false;
  let readyBase = '';
  let lastMissing = [];
  let refreshGeneration = 0;
  const exportUi = mountLottieExports({
    controls: ui.controls,
    summary,
    filename: intake.filename,
    getPlayer: () => player,
    getPlaybackMode: () => playbackMode,
    openIntake: ctx.openIntake,
  });

  function syncPlayLabel() {
    ui.play.textContent = playing ? 'Pause' : 'Play';
    ui.play.setAttribute('aria-label', (playing ? 'Pause' : 'Play') + ' animation');
  }

  function setPlaying(value) {
    playing = !!value;
    syncPlayLabel();
  }

  function syncFrame(frame) {
    currentFrame = Math.max(summary.inFrame, Math.min(summary.outFrame - 0.001, frame));
    ui.scrub.value = String(currentFrame);
    ui.frameLabel.textContent = `${Math.round(currentFrame)} / ${Math.ceil(summary.outFrame - 1)}`;
  }

  function automaticallyPlays() {
    return !reduceMotion && (playbackMode === 'once' || playbackMode === 'loop');
  }

  function updateReadyStatus() {
    if (!readyBase) return;
    if (playbackMode === 'click') ui.status.textContent = `${readyBase} Click the animation to play.`;
    else if (reduceMotion) ui.status.textContent = `${readyBase} Reduce Motion is on — use Play or Restart to animate.`;
    else if (playbackMode === 'hover') ui.status.textContent = `${readyBase} Hover or focus the animation to play.`;
    else ui.status.textContent = readyBase;
  }

  function resetToStart() {
    completed = false;
    setPlaying(false);
    syncFrame(summary.inFrame);
    player?.command('seek', { frame: summary.inFrame });
  }

  function restartPlayback() {
    if (!player) return;
    completed = false;
    player.command('loop', { value: playbackMode === 'loop' });
    player.command('restart');
    setPlaying(true);
  }

  function applyPlaybackMode() {
    playbackMode = ui.mode.value;
    hoverEngaged = false;
    ui.stage.dataset.playbackMode = playbackMode;
    player?.command('mode', { value: playbackMode });
    player?.command('loop', { value: playbackMode === 'loop' });
    if (automaticallyPlays()) restartPlayback();
    else resetToStart();
    updateReadyStatus();
  }

  syncPlayLabel();

  async function refresh() {
    if (destroyed) return;
    const generation = ++refreshGeneration;
    exportUi.setReady(false);
    player?.destroy(); player = null;
    readyBase = ''; hoverEngaged = false;
    ui.stage.replaceChildren(); ui.messages.replaceChildren(); ui.assetList.replaceChildren();
    ui.assetBox.hidden = true; ui.status.textContent = 'Preparing animation…';
    const prepared = await prepareAnimation(animation, { folder: ctx.folder, supplied });
    if (destroyed || generation !== refreshGeneration) return;
    for (const warning of prepared.warnings) addMessage(ui.messages, warning);
    for (const item of prepared.blocked) addMessage(ui.messages, `${item.ref || 'Asset'}: ${item.reason}.`);
    lastMissing = [...prepared.missing, ...prepared.blocked.filter((item) => item.target)];
    const retryable = [...prepared.missing, ...prepared.blocked.filter((item) => item.target)];
    if (retryable.length) {
      ui.assetBox.hidden = false;
      ui.assetText.textContent = `${retryable.length} referenced image asset${retryable.length === 1 ? ' is' : 's are'} missing or blocked. Drop the exact files here or `;
      for (const item of retryable) { const li = document.createElement('li'); li.textContent = `${item.ref || item.target} — ${item.reason}`; ui.assetList.appendChild(li); }
    }
    if (prepared.blocked.length || prepared.missing.length) {
      setPlaying(false);
      ui.status.textContent = 'Playback is paused until every explicit image reference is resolved safely.';
      const error = document.createElement('div'); error.className = 'lottie-error'; error.textContent = 'Animation not started: referenced resources could cause incomplete or unsafe playback.'; ui.stage.appendChild(error);
      return;
    }
    const autoplay = automaticallyPlays();
    completed = false;
    syncFrame(summary.inFrame);
    setPlaying(autoplay);
    ui.status.textContent = reduceMotion ? 'Reduce Motion is on — press Play to start.' : 'Loading player…';
    player = createSandbox(ui.stage, prepared.data, summary, {
      autoplay,
      loop: playbackMode === 'loop',
      mode: playbackMode,
      onError(message) { ui.status.textContent = 'Preview failed: ' + message; setPlaying(false); exportUi.setReady(false); },
      onState(message) {
        if (message.type === 'loaded') {
          readyBase = prepared.assetBytes ? `Ready — ${prepared.assetBytes.toLocaleString()} bytes of local image assets embedded.` : 'Ready — self-contained animation.';
          updateReadyStatus();
          exportUi.setReady(true);
        }
        if (message.type === 'frame' && Number.isFinite(message.frame)) {
          syncFrame(message.frame);
        }
        if (message.type === 'complete' && playbackMode !== 'loop') { completed = true; setPlaying(false); }
        if (message.type === 'interaction' && message.kind === 'click' && playbackMode === 'click') restartPlayback();
      },
    });
  }

  ui.mode.addEventListener('change', applyPlaybackMode);
  ui.play.addEventListener('click', () => {
    if (!player) return;
    if (playing) { player.command('pause'); setPlaying(false); return; }
    if (completed) restartPlayback();
    else { player.command('play'); setPlaying(true); }
  });
  ui.restart.addEventListener('click', restartPlayback);
  ui.speed.addEventListener('change', () => player?.command('speed', { value: Number(ui.speed.value) }));
  ui.scrub.addEventListener('input', () => { completed = false; setPlaying(false); player?.command('seek', { frame: Number(ui.scrub.value) }); });
  ui.stage.addEventListener('pointerenter', () => {
    if (playbackMode !== 'hover' || hoverEngaged) return;
    hoverEngaged = true;
    if (!reduceMotion) restartPlayback();
  });
  ui.stage.addEventListener('pointerleave', () => {
    if (playbackMode !== 'hover') return;
    hoverEngaged = false;
    resetToStart();
  });
  ui.stage.addEventListener('focusin', () => {
    if (playbackMode !== 'hover' || hoverEngaged) return;
    hoverEngaged = true;
    if (!reduceMotion) restartPlayback();
  });
  ui.stage.addEventListener('focusout', (event) => {
    if (playbackMode !== 'hover' || ui.stage.contains(event.relatedTarget)) return;
    hoverEngaged = false;
    resetToStart();
  });
  ui.stage.addEventListener('click', (event) => {
    if (playbackMode === 'click' && event.target === ui.stage) restartPlayback();
  });
  ui.stage.addEventListener('keydown', (event) => {
    if (playbackMode !== 'click' || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    restartPlayback();
  });
  ui.choose.addEventListener('click', () => ui.input.click());

  async function acceptFiles(files) {
    if (!assignDroppedFiles(files, lastMissing, supplied)) { ctx.toast?.('No dropped file matched an unresolved Lottie asset.'); return; }
    await refresh();
  }
  ui.input.addEventListener('change', () => { acceptFiles(ui.input.files); ui.input.value = ''; });
  ui.assetBox.addEventListener('dragover', (event) => { event.preventDefault(); ui.assetBox.classList.add('drag'); if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'; });
  ui.assetBox.addEventListener('dragleave', () => ui.assetBox.classList.remove('drag'));
  ui.assetBox.addEventListener('drop', (event) => { event.preventDefault(); event.stopPropagation(); ui.assetBox.classList.remove('drag'); acceptFiles(event.dataTransfer?.files); });

  await refresh();
  const destroy = () => { if (destroyed) return; destroyed = true; refreshGeneration += 1; exportUi.destroy(); player?.destroy(); player = null; };
  ctx.onCleanup?.(destroy);
  return { parentNode: ui.host, destroy };
}
