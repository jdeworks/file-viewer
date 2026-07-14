import { vendor } from '../../../../../core/script-loader.js';
import { assignDroppedFiles, prepareAnimation } from './assets.js';
import { lottieSummary, parseLottie } from './model.js';

const CSS = `
.lottie-doc{font-family:system-ui,sans-serif;color:var(--fg,#202124);padding:14px;box-sizing:border-box;min-height:100%}
.lottie-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}.lottie-title{font-size:18px;font-weight:700}.lottie-sub{font-size:12px;color:var(--fg-2,#667085);margin-top:2px}
.lottie-meta{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 12px}.lottie-chip{font-size:11px;border:1px solid var(--border,#d0d5dd);border-radius:999px;padding:3px 8px;background:var(--bg-2,#f7f8fa)}
.lottie-stage{height:min(58vh,560px);min-height:280px;border:1px solid var(--border,#d0d5dd);border-radius:10px;overflow:hidden;background:repeating-conic-gradient(#f5f5f5 0 25%,#fff 0 50%) 50%/18px 18px;position:relative}
.fv-dark .lottie-stage{background:repeating-conic-gradient(#24272b 0 25%,#1d2024 0 50%) 50%/18px 18px}.lottie-frame{display:block;border:0;width:100%;height:100%;background:transparent}
.lottie-controls{display:grid;grid-template-columns:auto auto auto minmax(120px,1fr) auto auto;gap:8px;align-items:center;margin-top:10px}.lottie-controls button,.lottie-controls select{font:inherit;border:1px solid var(--border,#cfd4dc);border-radius:6px;background:var(--bg,#fff);color:inherit;padding:5px 9px}.lottie-controls button{cursor:pointer}.lottie-controls input[type=range]{width:100%}
.lottie-loop{display:flex;gap:4px;align-items:center;font-size:12px}.lottie-frame-label{font:12px ui-monospace,monospace;min-width:72px;text-align:right}.lottie-status{font-size:12px;color:var(--fg-2,#667085);min-height:18px;margin-top:5px}
.lottie-messages{margin:10px 0;padding:0;list-style:none}.lottie-messages li{font-size:12px;padding:6px 9px;margin:4px 0;border-left:3px solid #d97706;background:#fff7ed}.fv-dark .lottie-messages li{background:#3b2a18}
.lottie-assets{border:1px dashed var(--border,#98a2b3);border-radius:8px;padding:12px;margin-top:10px;text-align:center;font-size:12px}.lottie-assets.drag{border-color:#2563eb;background:#eff6ff}.fv-dark .lottie-assets.drag{background:#17223b}.lottie-assets button{font:inherit;margin-left:6px}.lottie-assets ul{text-align:left;margin:8px auto 0;max-width:640px}.lottie-error{padding:14px;border-left:3px solid #c62828;background:#ffebee}.fv-dark .lottie-error{background:#3b1f22}
@media(max-width:700px){.lottie-doc{padding:9px}.lottie-stage{min-height:240px;height:48vh}.lottie-controls{grid-template-columns:auto auto auto 1fr}.lottie-frame-label{grid-column:4}.lottie-loop{grid-column:1/3}}
`;

function attr(value) {
  return String(value).replace(/[&"<>]/g, (c) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' }[c]));
}

function frameDocument(playerUrl) {
  const origin = new URL(playerUrl).origin;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' ${attr(origin)}; style-src 'unsafe-inline'; img-src data:; font-src 'none'; media-src 'none'; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'">
    <style>html,body,#animation{width:100%;height:100%;margin:0;overflow:hidden;background:transparent}svg{display:block}</style>
    <script src="${attr(playerUrl)}"></script></head><body><div id="animation"></div><script>
    (function(){
      var MARK='__fvLottie', animation=null, ip=0;
      function send(type, extra){ parent.postMessage(Object.assign({__fvLottie:1,type:type},extra||{}),'*'); }
      function destroy(){ if(animation){ try{animation.destroy();}catch(e){} animation=null; } document.getElementById('animation').textContent=''; }
      window.addEventListener('message',function(event){
        if(event.source!==parent) return;
        var msg=event.data;
        if(!msg||msg[MARK]!==1) return;
        try{
          if(msg.type==='load'){
            destroy(); ip=Number(msg.ip)||0;
            if(!window.lottie||typeof window.lottie.loadAnimation!=='function') throw new Error('The vendored Lottie player did not load.');
            animation=window.lottie.loadAnimation({container:document.getElementById('animation'),renderer:'svg',loop:!!msg.loop,autoplay:!!msg.autoplay,animationData:msg.animationData,rendererSettings:{preserveAspectRatio:'xMidYMid meet',progressiveLoad:false}});
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
          else if(msg.type==='destroy') destroy();
        }catch(error){ send('error',{message:error&&error.message?error.message:String(error)}); }
      });
      window.addEventListener('unload',destroy);
      send('ready',{available:!!(window.lottie&&window.lottie.loadAnimation)});
    })();
    </script></body></html>`;
}

function createSandbox(slot, animationData, summary, { autoplay, onState, onError }) {
  const iframe = document.createElement('iframe');
  iframe.className = 'lottie-frame';
  iframe.title = 'Lottie animation preview';
  iframe.referrerPolicy = 'no-referrer';
  iframe.setAttribute('sandbox', 'allow-scripts');
  const playerUrl = vendor('lottie/lottie_light.min.js');
  let ready = false;
  function post(message) {
    iframe.contentWindow?.postMessage({ __fvLottie: 1, ...message }, '*');
  }
  function onMessage(event) {
    if (event.source !== iframe.contentWindow) return;
    const message = event.data;
    if (!message || message.__fvLottie !== 1) return;
    if (message.type === 'ready') {
      ready = true;
      if (!message.available) { onError('The vendored Lottie player could not be initialized.'); return; }
      post({ type: 'load', animationData, ip: summary.inFrame, autoplay, loop: true, speed: 1 });
    } else if (message.type === 'error') onError(message.message || 'Lottie playback failed.');
    else onState(message);
  }
  window.addEventListener('message', onMessage);
  iframe.srcdoc = frameDocument(playerUrl);
  slot.replaceChildren(iframe);
  return {
    iframe,
    command(type, extra = {}) { if (ready) post({ type, ...extra }); },
    destroy() {
      if (ready) post({ type: 'destroy' });
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
  const stage = document.createElement('div'); stage.className = 'lottie-stage'; host.appendChild(stage);
  const controls = document.createElement('div'); controls.className = 'lottie-controls';
  const play = document.createElement('button'); play.type = 'button'; play.textContent = 'Pause'; play.setAttribute('aria-label', 'Pause animation');
  const restart = document.createElement('button'); restart.type = 'button'; restart.textContent = 'Restart';
  const speed = document.createElement('select'); speed.setAttribute('aria-label', 'Playback speed');
  for (const value of ['0.5', '1', '2']) { const option = document.createElement('option'); option.value = value; option.textContent = value + '×'; if (value === '1') option.selected = true; speed.appendChild(option); }
  const scrub = document.createElement('input'); scrub.type = 'range'; scrub.min = String(summary.inFrame); scrub.max = String(Math.max(summary.inFrame, summary.outFrame - 0.001)); scrub.step = '0.01'; scrub.value = String(summary.inFrame); scrub.setAttribute('aria-label', 'Animation frame');
  const frameLabel = document.createElement('span'); frameLabel.className = 'lottie-frame-label'; frameLabel.textContent = `${Math.round(summary.inFrame)} / ${Math.ceil(summary.outFrame - 1)}`;
  const loopLabel = document.createElement('label'); loopLabel.className = 'lottie-loop'; const loop = document.createElement('input'); loop.type = 'checkbox'; loop.checked = true; loopLabel.append(loop, document.createTextNode('Loop'));
  controls.append(play, restart, speed, scrub, frameLabel, loopLabel); host.appendChild(controls);
  const status = document.createElement('div'); status.className = 'lottie-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); host.appendChild(status);
  const assetBox = document.createElement('div'); assetBox.className = 'lottie-assets'; assetBox.hidden = true;
  const assetText = document.createElement('span');
  const choose = document.createElement('button'); choose.type = 'button'; choose.textContent = 'Choose assets';
  const input = document.createElement('input'); input.type = 'file'; input.multiple = true; input.hidden = true;
  const assetList = document.createElement('ul'); assetBox.append(assetText, choose, input, assetList); host.appendChild(assetBox);
  return { host, messages, stage, play, restart, speed, scrub, frameLabel, loop, status, assetBox, assetText, choose, input, assetList };
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
  let player = null;
  let destroyed = false;
  let playing = !ctx.settings?.reduceMotion;
  let lastMissing = [];
  let refreshGeneration = 0;

  function syncPlayLabel() {
    ui.play.textContent = playing ? 'Pause' : 'Play';
    ui.play.setAttribute('aria-label', (playing ? 'Pause' : 'Play') + ' animation');
  }
  syncPlayLabel();

  async function refresh() {
    if (destroyed) return;
    const generation = ++refreshGeneration;
    player?.destroy(); player = null;
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
      ui.status.textContent = 'Playback is paused until every explicit image reference is resolved safely.';
      const error = document.createElement('div'); error.className = 'lottie-error'; error.textContent = 'Animation not started: referenced resources could cause incomplete or unsafe playback.'; ui.stage.appendChild(error);
      return;
    }
    ui.status.textContent = ctx.settings?.reduceMotion ? 'Reduce Motion is on — press Play to start.' : 'Loading player…';
    player = createSandbox(ui.stage, prepared.data, summary, {
      autoplay: !ctx.settings?.reduceMotion,
      onError(message) { ui.status.textContent = 'Preview failed: ' + message; playing = false; syncPlayLabel(); },
      onState(message) {
        if (message.type === 'loaded') ui.status.textContent = prepared.assetBytes ? `Ready — ${prepared.assetBytes.toLocaleString()} bytes of local image assets embedded.` : 'Ready — self-contained animation.';
        if (message.type === 'frame' && Number.isFinite(message.frame)) {
          const frame = Math.max(summary.inFrame, Math.min(summary.outFrame - 0.001, message.frame));
          ui.scrub.value = String(frame); ui.frameLabel.textContent = `${Math.round(frame)} / ${Math.ceil(summary.outFrame - 1)}`;
        }
        if (message.type === 'complete' && !ui.loop.checked) { playing = false; syncPlayLabel(); }
      },
    });
  }

  ui.play.addEventListener('click', () => { playing = !playing; player?.command(playing ? 'play' : 'pause'); syncPlayLabel(); });
  ui.restart.addEventListener('click', () => { playing = true; player?.command('restart'); syncPlayLabel(); });
  ui.speed.addEventListener('change', () => player?.command('speed', { value: Number(ui.speed.value) }));
  ui.loop.addEventListener('change', () => player?.command('loop', { value: ui.loop.checked }));
  ui.scrub.addEventListener('input', () => { playing = false; syncPlayLabel(); player?.command('seek', { frame: Number(ui.scrub.value) }); });
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
  const destroy = () => { if (destroyed) return; destroyed = true; refreshGeneration += 1; player?.destroy(); player = null; };
  ctx.onCleanup?.(destroy);
  return { parentNode: ui.host, destroy };
}
