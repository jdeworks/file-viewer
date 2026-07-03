// overlay.js — Stage 5 Signal Racer: the post-round RESULT card + in-flow PIT STOP (UX audit #1 + M2).
// A race no longer ends in a log line: it ends on a podium beat — placement / packets / par — with the
// upgrade decision offered right there ("PIT STOP — pick 1 of 2", skippable) so the store never needs
// its own screen. Pure DOM builder; the renderer owns the seed for the offer and wires clicks via
// data- attributes (data-pit=<statId> / data-pit-skip / data-overlay=continue|retry).

import { UPGRADES, levelOf, maxLevelOf, costOf, isMaxed } from './shop.js';

const STAT = new Map(UPGRADES.map((u) => [u.id, u]));

function priceSpan(cost) {
  const s = document.createElement('span');
  s.className = 's5-pit-price';
  s.textContent = Number.isFinite(cost) ? ` ${cost}p` : ' —';
  return s;
}

// summary: { title, detail, continueLabel }. offers: stat-id[] (empty once the pit is resolved).
// resolvedNote: a one-line "upgraded Engine" / "skipped" shown after the player picks. canRetry: bool.
export function buildResultOverlay({ summary, offers = [], shop = {}, packets = 0, canRetry = false, resolvedNote = '' }) {
  const card = document.createElement('div');
  card.className = 's5-overlay-card';

  const head = document.createElement('div');
  head.className = 's5-overlay-head';
  head.textContent = summary.title;
  const sub = document.createElement('div');
  sub.className = 's5-overlay-sub';
  sub.textContent = summary.detail || '';
  card.append(head, sub);

  if (offers.length) {
    const pit = document.createElement('div');
    pit.className = 's5-pit';
    const ph = document.createElement('div');
    ph.className = 's5-pit-head';
    ph.textContent = `PIT STOP — pick 1 (${packets}p)`;
    pit.append(ph);
    const row = document.createElement('div');
    row.className = 's5-pit-offers';
    for (const id of offers) {
      const def = STAT.get(id);
      if (!def) continue;
      const cost = costOf(shop, id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.pit = id;
      btn.className = 's5-pit-btn';
      btn.title = def.desc;
      btn.disabled = isMaxed(shop, id) || Number(packets) < cost;
      btn.append(`${def.label} ${levelOf(shop, id)}→${levelOf(shop, id) + 1}/${maxLevelOf(id)}`, priceSpan(cost));
      row.append(btn);
    }
    pit.append(row);
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 's5-pit-skip';
    skip.dataset.pitSkip = '1';
    skip.textContent = 'skip pit';
    pit.append(skip);
    card.append(pit);
  } else if (resolvedNote) {
    const note = document.createElement('div');
    note.className = 's5-pit-note';
    note.textContent = resolvedNote;
    card.append(note);
  }

  const actions = document.createElement('div');
  actions.className = 's5-overlay-actions';
  const cont = document.createElement('button');
  cont.type = 'button';
  cont.dataset.overlay = 'continue';
  cont.className = 's5-overlay-continue';
  cont.textContent = summary.continueLabel || 'continue';
  actions.append(cont);
  if (canRetry) {
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.dataset.overlay = 'retry';
    retry.textContent = 'retry';
    actions.append(retry);
  }
  card.append(actions);
  return card;
}
