// s1achpanel.js — Stage 1 Achievements tab.
// Lists EVERY achievement (locked + unlocked), what each is for, and the global multiplier each
// grants (×1.02 → +2% to clicks & passive income). Secrets stay hidden until earned. Split out of
// stage1.js so the panel can grow without bloating the renderer.

import { ACHIEVEMENTS1 } from './achievements1.js';
import { escapeHtml } from './s1bell.js';

const PER_ACH_MULT = 1.02;   // mirrors achievMult() in s1economy.js (1.02 ^ achievements.length)

export function renderAchievementsPanel({ panelsEl, state }) {
  const unlocked = new Set(state.achievements || []);
  // ach-boss-cheat-found is a legacy no-op entry (condition: () => false) — keep it out of the list.
  const list = ACHIEVEMENTS1.filter((a) => a.id !== 'ach-boss-cheat-found');
  const n = list.filter((a) => unlocked.has(a.id)).length;
  const total = Math.pow(PER_ACH_MULT, n);
  const pct = Math.round((total - 1) * 100);

  const head = '<div class="mg-s1-ach-head">'
    + '<span class="mg-s1-ach-count">🏆 ' + n + ' / ' + list.length + '</span>'
    + '<span class="mg-s1-ach-mult">×' + total.toFixed(2)
    + ' <small>+' + pct + '% to clicks &amp; income</small></span>'
    + '</div>';

  const rows = list.map((a) => {
    const got = unlocked.has(a.id);
    const secret = a.secret && !got;
    const icon = secret ? '❔' : (a.icon || '🏆');
    const name = secret ? '??? <span class="mg-s1-ach-secret">hidden</span>' : escapeHtml(a.name);
    const desc = secret ? 'Unlock condition hidden — keep playing.' : escapeHtml(a.bell || '');
    const cls = got ? ' mg-s1-ach-got' : ' mg-s1-ach-locked';
    return '<div class="mg-s1-ach' + cls + '">'
      + '<span class="mg-s1-ach-icon">' + icon + '</span>'
      + '<span class="mg-s1-ach-text"><strong>' + name + '</strong>'
      + '<span class="mg-s1-ach-desc">' + desc + '</span></span>'
      + '<span class="mg-s1-ach-chip" title="Each achievement grants ×1.02 to clicks &amp; income">+2%</span>'
      + '</div>';
  }).join('');

  panelsEl.innerHTML = '<div class="mg-s1-panel" data-panel="achievements">'
    + head + '<div class="mg-s1-ach-list">' + rows + '</div></div>';
}
