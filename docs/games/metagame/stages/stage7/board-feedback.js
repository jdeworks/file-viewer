// board-feedback.js — Stage 7 verdict beats (#4). Built on the shared micro-feedback kit
// (shared/feedback.js) so it is prefers-reduced-motion-aware for free. A CORRECT triad gets a green
// ESTABLISHED stamp over the sockets + a "+N addresses" float + a CASE CLOSED interstitial banner; a
// WRONG one gets a board shake + a red DOES NOT HOLD stamp + a "-10 addresses" float + a red string
// snap on the live triad. The stamp is a spawned node that self-removes on animationend (or a timeout
// fallback that also drives reduced-motion, where animationend never fires).

import { shake, floatNum, banner } from "../../shared/feedback.js";
import { paintBoardStrings } from "./board-strings.js";

const STAMP_MS = 1500;

export function fireVerdict(main, state, { cid, correct, caseName, reward = 0 }) {
  if (!main) return;
  const surface = main.querySelector(".s7-board-surface");
  const plate = main.querySelector(".s7-accuse-plate") || surface || main;
  if (correct) {
    stamp(plate, "ESTABLISHED", "good");
    if (reward) floatNum(plate, `+${reward} addresses`, "good");
    banner(surface || main, `CASE CLOSED — ${caseName}`);
  } else {
    shake(surface || main);
    stamp(plate, "DOES NOT HOLD", "bad");
    floatNum(plate, "-10 addresses", "bad");
    if (surface) paintBoardStrings(surface, state, cid, { verdict: "wrong" });
  }
}

function stamp(host, text, kind) {
  if (!host || typeof document === "undefined") return;
  const el = document.createElement("div");
  el.className = `s7-stamp s7-stamp--${kind}`;
  el.textContent = text;
  host.appendChild(el);
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    el.removeEventListener("animationend", finish);
    el.remove();
  };
  const timer = setTimeout(finish, STAMP_MS);
  el.addEventListener("animationend", finish);
}
