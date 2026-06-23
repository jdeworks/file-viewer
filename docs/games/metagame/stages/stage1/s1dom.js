// s1dom.js — Stage 1 shared DOM/value helpers.
//
// Guarded writers: the 100ms tick repaints the live tab every tick. Setting textContent/innerHTML
// /hidden/disabled to a value an element already holds STILL mutates the DOM (textContent replaces
// child nodes), which churns the UI and can swallow a tap mid-press. These no-op when the value is
// unchanged, so a steady state produces zero DOM writes. Shared by stage1.js and s1shop.js.

export function setText(el, s) { if (el && el.textContent !== s) el.textContent = s; }
// Guarded class toggle: only touches the DOM when the class actually needs to flip (so a steady
// 100ms tick over an unchanged row performs zero classList mutations).
export function setClass(el, name, on) { if (el && el.classList.contains(name) !== !!on) el.classList.toggle(name, !!on); }
export function setHtml(el, s) { if (el && el.innerHTML !== s) el.innerHTML = s; }
export function setHidden(el, b) { if (el && el.hidden !== b) el.hidden = b; }
export function setDisabled(el, b) { if (el && el.disabled !== b) el.disabled = b; }

// Delegate control activation across pointerdown + pointerup + click so a tap registers no matter
// which of those the browser actually delivers. `route(target)` performs the action for the control
// under `target` and returns that control ELEMENT (truthy) if it handled one, else null.
//
// Why all three (the failure modes we observed on a laptop touchpad):
//   • pointerdown (mouse/pen): a fast tap can drop the pointerup/click entirely — only pointerdown
//     arrives. Acting on press means the tap still counts. (Touch is excluded so a press-drag can
//     still scroll on touchscreens; touch taps produce reliable clicks anyway.)
//   • pointerUP drift recovery: after a press the touchpad can "drag-lock" the button held, so when
//     you move to ANOTHER control and release, it's one continuous drag — the browser fires `click`
//     on the common ancestor (the panel), not where you let go. But the pointerup target IS the
//     control you released on, so we activate THAT (skipping it if it's the same control the press
//     already handled).
//   • click: the normal path for touch taps and keyboard (Enter/Space → click, no pointer events).
// A single per-gesture suppress flag keeps a normal tap from firing twice.
export function bindActivate(parentEl, route) {
  let pressedCtrl = null;     // control activated by this gesture's pointerdown (mouse/pen)
  let suppressClick = false;  // we already acted on down/up → ignore the trailing synthetic click

  parentEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    pressedCtrl = route(e.target) || null;
    suppressClick = !!pressedCtrl;
  });

  parentEl.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch') return;
    // Released on a DIFFERENT control than the press handled → the press drifted (stuck-drag); honor
    // the release target, which the synthesized click would otherwise lose to the panel ancestor.
    // isConnected guards the case where the press's action rebuilt the panel (managers renderPanel),
    // which detaches pressedCtrl — there the gesture is already done, so skip recovery.
    if (pressedCtrl && pressedCtrl.isConnected && !pressedCtrl.contains(e.target) && route(e.target)) suppressClick = true;
  });

  parentEl.addEventListener('click', (e) => {
    if (suppressClick) { suppressClick = false; pressedCtrl = null; return; }
    pressedCtrl = null;
    route(e.target);
  });
}

// Press-and-hold auto-repeat for a delegated control: while the control under `selector` is held,
// `action()` fires every `intervalMs`. The FIRST activation is left to bindActivate (which already
// fires on pointerdown/click) — this only adds the repeat — so a quick tap (release before the
// interval elapses) fires exactly once. Holding instead of rapid-tapping is what avoids tripping the
// touchpad's tap-to-drag gesture. A `holdingClass` is toggled on the held control so CSS can show a
// "you can hold this" affordance. Stops on up/cancel/leave/lost-capture/blur so it never runs away.
export function bindHoldRepeat(parentEl, selector, action, intervalMs = 250, holdingClass = 'mg-s1-holding') {
  let timer = null;
  let held = null;
  const stop = () => {
    if (timer) { clearInterval(timer); timer = null; }
    if (held) { held.classList.remove(holdingClass); held = null; }
  };
  parentEl.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;                 // primary button / tap only
    const ctrl = e.target.closest(selector);
    if (!ctrl) return;
    stop();
    held = ctrl;
    ctrl.classList.add(holdingClass);
    timer = setInterval(action, intervalMs);  // first fire already happened via bindActivate
  });
  ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture'].forEach((ev) => parentEl.addEventListener(ev, stop));
  if (typeof window !== 'undefined') window.addEventListener('blur', stop);
}

// BigNum → number, tolerant of legacy plain-number state. Min-clamped to MAX_VALUE.
export function bigToNum(bn) {
  if (bn === null || bn === undefined) return 0;
  if (typeof bn === 'number') return bn;   // legacy plain number
  if (!bn.m) return 0;
  return Math.min(bn.m * Math.pow(10, bn.e || 0), Number.MAX_VALUE);
}
