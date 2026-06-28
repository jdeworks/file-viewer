// Stage 5 touch steering — wires the shared on-screen control to the SAME loop.handleKey() the arrow
// keys use, so a race is fully playable by touch. Lanes are ◀ / ▶ (ArrowLeft / ArrowRight) and the
// HI/LO fork channel is ▲ / ▼ (ArrowUp / ArrowDown), matching renderer.js's keydown handler exactly.
// The pad is created hidden; the renderer reveals it only while mode==='playing'.

import { createTouchControls } from "../../touch-controls.js";

// Direction → the arrow-key string forwarded to loop.handleKey (single source of truth for the test).
export const STEER_DPAD = {
  up: { id: "ArrowUp", label: "HI", ariaLabel: "fork high" },
  down: { id: "ArrowDown", label: "LO", ariaLabel: "fork low" },
  left: { id: "ArrowLeft", label: "◀", ariaLabel: "lane left" },
  right: { id: "ArrowRight", label: "▶", ariaLabel: "lane right" },
};

// Pure: fire the live loop's key handler for a steering id, but only mid-race (mirrors renderer onKey's
// `mode !== 'playing'` guard). Exported so a unit test can prove a tap === the keypress.
export function steerAction({ getMode, getLoop }, key) {
  if (getMode() !== "playing") return;
  getLoop()?.handleKey(key);
}

export function createSteer(deps) {
  const controls = createTouchControls({
    className: "s5-steer",
    ariaLabel: "steering",
    dpad: STEER_DPAD,
    onAction: (key) => steerAction(deps, key),
  });
  controls.el.hidden = true;
  return controls;
}
