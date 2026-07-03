// Shared metagame modal (UX audit F6) — one standard overlay every stage reuses instead of rolling
// its own. A fixed, viewport-centred panel over a dimmed backdrop: internal scroll (max-height 80vh),
// close via the × button, a click on the backdrop, or Esc, and focus moves into the panel on open.
// NO pagination — the caller supplies ONE content element (typically a `.mg-modal-grid` of cards) that
// renders everything at once. One modal at a time is the caller's responsibility (hold the handle).
//
// openModal({ title, contentEl, onClose, className }) → { el, panel, body, close }
//   title      — head label (string)
//   contentEl  — the body content node (appended into `.mg-modal-body`)
//   onClose    — called once when the modal closes (× / backdrop / Esc / handle.close())
//   className  — optional extra class on the panel for per-stage theming
// The backdrop is appended to <body> (z-index above the dev menu) and self-removes on close; the Esc
// listener is torn down with it, so nothing leaks. close() is idempotent.

export function openModal({ title = "", contentEl, onClose, className } = {}) {
  const backdrop = document.createElement("div");
  backdrop.className = "mg-modal-backdrop";

  const panel = document.createElement("div");
  panel.className = "mg-modal" + (className ? " " + className : "");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  if (title) panel.setAttribute("aria-label", title);
  panel.tabIndex = -1;

  const head = document.createElement("div");
  head.className = "mg-modal-head";
  const titleEl = document.createElement("div");
  titleEl.className = "mg-modal-title";
  titleEl.textContent = title;
  const x = document.createElement("button");
  x.type = "button";
  x.className = "mg-modal-x";
  x.setAttribute("aria-label", "close");
  x.innerHTML = "&#10005;";
  head.append(titleEl, x);

  const body = document.createElement("div");
  body.className = "mg-modal-body";
  if (contentEl) body.appendChild(contentEl);

  panel.append(head, body);
  backdrop.appendChild(panel);

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKey, true);
    backdrop.remove();
    onClose?.();
  }
  function onKey(event) {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
  }

  x.addEventListener("click", close);
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) close(); });
  document.addEventListener("keydown", onKey, true);
  document.body.appendChild(backdrop);

  // Move focus into the panel so keyboard users land inside the dialog (Esc/scroll work immediately).
  (panel.querySelector("button, a, input, select, textarea") || panel).focus?.();

  return { el: backdrop, panel, body, close };
}
