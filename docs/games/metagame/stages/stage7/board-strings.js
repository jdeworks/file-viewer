// board-strings.js — Stage 7 evidence-board "red string" SVG overlay (#2). Painted on the board
// surface AFTER layout (positions come from getBoundingClientRect, exactly like the Stage 6 map-edge
// overlay paintMapEdges): the LIVE pinned triad draws as lines converging on the accuse plate (the
// "is this a theory?" feel), and ESTABLISHED links draw as green threads to the eliminated dossier.
// A wrong verdict re-paints the live triad red (opts.verdict === "wrong"); reduced-motion degrades to
// colour-only via CSS. pointer-events:none so a string never intercepts a card tap. Recomputed every
// paint; the SVG is inserted UNDER the cards.

const SVG = "http://www.w3.org/2000/svg";

export function paintBoardStrings(surface, state, caseId = 2, opts = {}) {
  if (!surface || typeof surface.getBoundingClientRect !== "function") return;
  surface.querySelector(":scope > svg.s7-strings")?.remove();
  const rect = surface.getBoundingClientRect();
  if (!rect.width) return; // not laid out yet — a later paint will draw it
  const plate = surface.querySelector(".s7-sockets") || surface.querySelector(".s7-accuse-plate");
  if (!plate) return;

  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "s7-strings");
  svg.setAttribute("aria-hidden", "true");
  const w = surface.scrollWidth;
  const h = surface.scrollHeight;
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

  const pt = (el, anchor) => {
    const b = el.getBoundingClientRect();
    const x = b.left - rect.left + surface.scrollLeft + b.width / 2;
    const yMid = b.top - rect.top + surface.scrollTop + b.height / 2;
    const yTop = b.top - rect.top + surface.scrollTop + Math.min(22, b.height / 2);
    return { x, y: anchor === "top" ? yTop : yMid };
  };
  const target = pt(plate, "top");
  const frag = document.createDocumentFragment();
  const wrong = opts.verdict === "wrong";

  // Live triad: every pinned card of this case → converge on the plate.
  for (const btn of surface.querySelectorAll("[data-pin].is-pinned")) {
    const a = pt(btn, "mid");
    frag.appendChild(line(a.x, a.y, target.x, target.y, "s7-string" + (wrong ? " is-wrong" : "")));
  }
  // Established green threads: draw a locked-in link only where BOTH endpoints exist in this surface.
  for (const link of state?.board?.links || []) {
    if (!link.established) continue;
    const from = surface.querySelector(`[data-pin="${cssEsc(link.from)}"]`);
    const to = surface.querySelector(`[data-pin="${cssEsc(link.to)}"]`);
    if (!from || !to) continue;
    const a = pt(from, "mid");
    const b = pt(to, "mid");
    frag.appendChild(line(a.x, a.y, b.x, b.y, "s7-string is-established"));
  }
  svg.appendChild(frag);
  surface.insertBefore(svg, surface.firstChild);
}

function line(x1, y1, x2, y2, cls) {
  const l = document.createElementNS(SVG, "line");
  l.setAttribute("x1", String(x1));
  l.setAttribute("y1", String(y1));
  l.setAttribute("x2", String(x2));
  l.setAttribute("y2", String(y2));
  l.setAttribute("class", cls);
  return l;
}

function cssEsc(value) {
  return String(value).replace(/["\\]/g, "\\$&");
}
