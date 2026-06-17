import {
  applyProtocolChapter9Unlock,
  getBossLockState,
  playProtocolCard,
  recordLockedBossAttempt,
  startProtocolTurn
} from "./boss.js";
import { protocolCards, phaseRules } from "./content.js";
import { ACTION_NAME, BTS_PATH, EPUB_PATH } from "./messages.js";

export function renderStage6({
  host,
  state,
  actions,
  achievements,
  bell,
  bts,
  viewer,
  save,
  onStageComplete
}) {
  const root = document.createElement("section");
  root.className = "stage6-protocol-codex";
  root.innerHTML = `
    <header class="s6-hud">
      <div><strong>PROTOCOL CODEX</strong></div>
      <div>phase <span data-field="phase"></span></div>
      <div>boss hp <span data-field="hp"></span></div>
      <div>handshakes <span data-field="handshakes"></span></div>
    </header>
    <div class="s6-layout">
      <section class="s6-boss" aria-label="The Refused Connection">
        <h2>The Refused Connection</h2>
        <div class="s6-status" data-field="status"></div>
        <p data-field="hint"></p>
        <div class="s6-turn" data-field="turn"></div>
      </section>
      <section class="s6-reference" aria-label="Chapter 9 protocol rules"></section>
    </div>
    <div class="s6-cards" aria-label="protocol cards"></div>
    <ol class="s6-log" aria-label="protocol combat log"></ol>
    <div class="s6-controls">
      <button type="button" data-action="boss">challenge</button>
      <button type="button" data-action="new-turn">new turn</button>
      <button type="button" data-action="epub">open codex</button>
      <button type="button" data-action="bts" hidden>open trace.bts</button>
    </div>
  `;

  host.replaceChildren(root);

  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const cards = root.querySelector(".s6-cards");
  const reference = root.querySelector(".s6-reference");
  const log = root.querySelector(".s6-log");
  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });

  reference.replaceChildren(...phaseRules.map((rule) => {
    const item = document.createElement("article");
    item.innerHTML = `<strong>${rule.title}</strong><span>${rule.rule}</span>`;
    return item;
  }));

  cards.replaceChildren(...protocolCards.map((card) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.card = card.id;
    button.innerHTML = `<strong>${card.id}</strong><span>${card.type}</span><small>${card.text}</small>`;
    return button;
  }));

  function repaint() {
    const lock = getBossLockState({ actions, state });
    fields.phase.textContent = String(state.boss.phase);
    fields.hp.textContent = state.boss.defeated ? "0" : String(state.boss.hp);
    fields.handshakes.textContent = String(state.handshakes);
    fields.status.textContent = `${lock.status}${lock.defeated ? " / defeated" : ""}`;
    fields.hint.textContent = lock.hint;
    fields.turn.textContent = `first ${state.boss.turn?.firstCard || "none"} / ACK ${state.boss.turn?.playedAck ? "yes" : "no"}`;
    log.replaceChildren(...state.log.slice(-6).map((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      return item;
    }));
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
  }

  root.addEventListener("click", (event) => {
    const cardButton = event.target.closest("button[data-card]");
    if (cardButton) {
      playProtocolCard({ state, card: cardButton.dataset.card });
      if (state.boss.defeated) {
        completeOnce({ stage: 6, defeated: true, reward: { handshakes: 80 }, btsPath: BTS_PATH });
      }
      persistAndPaint();
      return;
    }

    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "boss") challengeBoss();
    if (button.dataset.action === "new-turn") startProtocolTurn(state);
    if (button.dataset.action === "epub") openEpub({ viewer, actions, achievements, bell, state });
    if (button.dataset.action === "bts") openBts({ bts, viewer });
    persistAndPaint();
  });

  repaint();

  return {
    repaint,
    destroy() {
      root.remove();
    }
  };

  function challengeBoss() {
    state.boss.reached = true;
    if (!getBossLockState({ actions, state }).unlocked) {
      recordLockedBossAttempt(state);
      return;
    }
    applyProtocolChapter9Unlock({ state, achievements, bell });
  }

  function persistAndPaint() {
    if (typeof save === "function") save();
    repaint();
  }
}

export function openEpub({ viewer, actions, achievements, bell, state }) {
  actions?.setAction?.(6, ACTION_NAME, { source: "stage6-codex", file: EPUB_PATH, chapter: 9 });
  applyProtocolChapter9Unlock({ state, achievements, bell });
  if (viewer && typeof viewer.openFile === "function") viewer.openFile(EPUB_PATH, { source: "stage6" });
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(EPUB_PATH, { source: "stage6" });
}

function openBts({ bts, viewer }) {
  if (bts && typeof bts.open === "function") bts.open(6);
  else if (bts && typeof bts.openBts === "function") bts.openBts(6);
  else if (viewer && typeof viewer.openFile === "function") viewer.openFile(BTS_PATH);
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(BTS_PATH);
}

function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}
