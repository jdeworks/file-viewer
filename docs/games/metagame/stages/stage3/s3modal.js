// Shared floating-modal scaffold for Stage 3's Defrag shop and boon draft. Both render as a TRUE
// modal — a dimmed backdrop covering the whole stage with a centred panel floating over the board,
// so the playfield underneath is never replaced or resized. Both are PAGINATED one item per page:
// this helper owns the chrome (head + bank + ×, the page body, and the Prev/Next/indicator nav) and
// the open page index; the caller supplies the per-page content + wiring. Dismiss via × or a click on
// the dimmed backdrop. Input is gated while open by the renderer's `overlay` guard.
//
// Pure presentation + local page state — no game logic, no timers, deterministic.

// opts:
//   title       — head label (string)
//   accentClass — extra class on the panel for theming (e.g. "s3-modal-draft")
//   note        — sub-head explanatory line (string, optional)
//   bank()      — string shown in the head (registers/frag, or "pick 1 · N pending")
//   count()     — number of pages (one item per page)
//   page(i)     — innerHTML for page i
//   wire(el,i,api) — attach listeners to the rendered page; api = { refresh(), close(), goto(i) }
//   onClose()   — called when the modal should close (× or backdrop click)
export function buildPaginatedModal(opts) {
  const { title, accentClass, note, bank, count, page, wire, onClose } = opts;
  const backdrop = document.createElement("div");
  backdrop.className = "s3-modal-backdrop";
  const panel = document.createElement("div");
  panel.className = "s3-modal" + (accentClass ? " " + accentClass : "");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", title);
  backdrop.appendChild(panel);

  let idx = 0;
  const close = () => onClose?.();
  const api = {
    refresh: () => paint(),
    close,
    goto: (i) => { idx = i; paint(); },
  };

  function paint() {
    const total = count();
    if (idx > total - 1) idx = Math.max(0, total - 1);
    if (idx < 0) idx = 0;
    const bankHtml = bank ? bank() : "";
    const body = total ? page(idx) : `<div class="s3-modal-empty">nothing available.</div>`;
    panel.innerHTML = `
      <div class="s3-modal-head">${title}
        ${bankHtml ? `<span class="s3-modal-bank">${bankHtml}</span>` : ""}
        <button type="button" class="s3-modal-x" data-modal="close" aria-label="close">&#10005;</button>
      </div>
      ${note ? `<div class="s3-modal-note">${note}</div>` : ""}
      <div class="s3-modal-page">${body}</div>
      <div class="s3-modal-nav">
        <button type="button" class="s3-modal-btn s3-modal-prev" data-modal="prev" ${idx <= 0 ? "disabled" : ""} aria-label="previous">&#8249; Prev</button>
        <span class="s3-modal-count" aria-live="polite">${total ? idx + 1 : 0} / ${total}</span>
        <button type="button" class="s3-modal-btn s3-modal-next" data-modal="next" ${idx >= total - 1 ? "disabled" : ""} aria-label="next">Next &#8250;</button>
      </div>`;
    panel.querySelector('[data-modal="close"]').addEventListener("click", close);
    panel.querySelector('[data-modal="prev"]').addEventListener("click", () => { if (idx > 0) { idx -= 1; paint(); } });
    panel.querySelector('[data-modal="next"]').addEventListener("click", () => { if (idx < count() - 1) { idx += 1; paint(); } });
    if (total) wire?.(panel.querySelector(".s3-modal-page"), idx, api);
  }

  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) close(); });
  paint();
  return { el: backdrop, api };
}
