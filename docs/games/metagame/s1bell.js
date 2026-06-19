// s1bell.js — shared metagame bell + event-message runtime.

import { MESSAGES1 } from './messages1.js';

const BELL_KEY = 'fv:games:mg:bell';

export function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function bellLoad() {
  try {
    const s = JSON.parse(localStorage.getItem(BELL_KEY)) || {};
    return {
      messages: Array.isArray(s.messages) ? s.messages : [],
      fired: (s.fired && typeof s.fired === 'object') ? s.fired : {},
      removed: Array.isArray(s.removed) ? s.removed : [],
      lastReadCount: Number(s.lastReadCount) || 0,
    };
  } catch { return { messages: [], fired: {}, removed: [], lastReadCount: 0 }; }
}

export function bellSave(bs) {
  try { localStorage.setItem(BELL_KEY, JSON.stringify(bs)); } catch { /* private mode */ }
}

export function bellAdd(id, text, bs) {
  const state = bs || bellLoad();
  const existing = state.messages.find((m) => m.id === id);
  if (existing) existing.count++;
  else state.messages.push({ id, text, count: 1, ts: Date.now() });
  bellSave(state);
  updateBellDot();
}

let bellRoot = null;

export function updateBellDot() {
  if (!bellRoot) return;
  const bs = bellLoad();
  const total = bs.messages.reduce((s, m) => s + m.count, 0);
  const dot = bellRoot.querySelector('.mg-bell-dot');
  if (dot) dot.hidden = !(total > bs.lastReadCount);
}

export function mountBell(host) {
  const prev = host.querySelector(':scope > .mg-bell-wrap');
  if (prev) prev.remove();
  const wrap = document.createElement('div');
  wrap.className = 'mg-bell-wrap';
  wrap.innerHTML =
    '<button class="mg-bell-btn" type="button" aria-label="Notifications">🔔<span class="mg-bell-dot" hidden></span></button>'
    + '<div class="mg-bell-panel" hidden></div>';
  host.appendChild(wrap);
  bellRoot = wrap;
  const btn = wrap.querySelector('.mg-bell-btn');
  const panel = wrap.querySelector('.mg-bell-panel');

  function renderPanel() {
    const bs = bellLoad();
    if (!bs.messages.length) { panel.innerHTML = '<div class="mg-bell-empty">nothing here</div>'; return; }
    const sorted = [...bs.messages].sort((a, b) => (b.ts || 0) - (a.ts || 0));
    panel.innerHTML = sorted.map((m) =>
      '<div class="mg-bell-msg">' + escapeHtml(m.text) + (m.count > 1 ? ' <span class="mg-bell-x">×' + m.count + '</span>' : '') + '</div>'
    ).join('');
  }

  let onOutside = null;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = panel.hidden;
    panel.hidden = !open;
    if (open) {
      renderPanel();
      const bs = bellLoad();
      bs.lastReadCount = bs.messages.reduce((s, m) => s + m.count, 0);
      bellSave(bs);
      updateBellDot();
      onOutside = (ev) => {
        if (!panel.contains(ev.target) && ev.target !== btn) {
          panel.hidden = true;
          document.removeEventListener('click', onOutside, true);
          onOutside = null;
        }
      };
      document.addEventListener('click', onOutside, true);
    } else if (onOutside) {
      document.removeEventListener('click', onOutside, true);
      onOutside = null;
    }
  });
  updateBellDot();
  return { el: wrap };
}

let activeMessages = null;

function loadActiveMessages(bs) {
  const removed = new Set(bs.removed || []);
  return MESSAGES1.filter((m) => !removed.has(m.id));
}

export function checkMessages(eventType, state, bs, v3Bell = null) {
  if (!activeMessages) activeMessages = loadActiveMessages(bs);
  let changed = false;
  for (const msg of activeMessages.slice()) {
    if (msg.trigger !== eventType && msg.trigger !== 'any') continue;
    if (msg.maxCount !== undefined && (bs.fired[msg.id] || 0) >= msg.maxCount) continue;
    if (!msg.condition(state)) continue;
    bellAdd(msg.id, msg.text, bs);
    v3Bell?.showBell?.(`stage1.${msg.id}`, msg.text, { stage: 1, once: false });
    bs.fired[msg.id] = (bs.fired[msg.id] || 0) + 1;
    if (msg.removeAfterFire) {
      bs.removed = bs.removed || [];
      if (!bs.removed.includes(msg.id)) bs.removed.push(msg.id);
      activeMessages = activeMessages.filter((m) => m.id !== msg.id);
    }
    changed = true;
  }
  if (changed) bellSave(bs);
}

export function removeStageMsgs(msgs) {
  const bs = bellLoad();
  bs.removed = [...new Set([...(bs.removed || []), ...msgs.map((m) => m.id)])];
  bellSave(bs);
  activeMessages = null;
}
