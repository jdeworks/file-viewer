import { createDefaultEq } from './mixer-eq-schema.js';
import { updateLane, updateElement } from './mixer-model.js';
import { buildLaneClips, firstElementForLane } from './mixer-audio-multi-ui.js';
import { clamp } from './mixer-audio-listen-helpers.js';

const DEFAULT_DYNAMICS = { thresholdDb: -18, ratio: 4, makeupDb: 3 };

// Build the per-lane editor modal. The modal is appended to root ONCE and lives in the DOM
// (hidden=true when closed). Input handlers update model + refresh clip WITHOUT calling render().
export function buildLaneEditorModal(laneModel, element, { getProject, setProject, clipLanes, getViewport }) {
  const laneId = laneModel.id;
  const refreshClip = () => {
    const p = getProject(); const v = getViewport();
    const cl = clipLanes.get(laneId);
    if (cl) cl.update(buildLaneClips(p, laneId, v.cursorMs, v.pxPerMs * 1000));
  };

  const modal = document.createElement('div');
  modal.className = 'mmx-mix-lane-modal';
  modal.dataset.laneId = laneId;
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  const titleId = `mmx-lane-title-${laneId}`;
  modal.setAttribute('aria-labelledby', titleId);
  let opener = null;

  const panel = document.createElement('div');
  panel.className = 'mmx-mix-lane-modal-panel';
  const header = buildModalHeader(laneModel.label || 'Lane');
  header.querySelector('.mmx-mix-lane-modal-title').id = titleId;
  panel.append(header);

  const body = document.createElement('div');
  body.className = 'mmx-mix-lane-modal-body';

  // Identity and the controls intentionally removed from the narrow lane gutter.
  const labelInp = document.createElement('input');
  labelInp.type = 'text';
  labelInp.className = 'mmx-mix-lane-label-input';
  labelInp.value = laneModel.label || '';
  labelInp.setAttribute('aria-label', 'Lane label');
  labelInp.addEventListener('input', () => {
    const value = labelInp.value;
    setProject(updateLane(getProject(), laneId, (lane) => ({ ...lane, label: value })));
    header.querySelector('.mmx-mix-lane-modal-title').textContent = value || 'Lane';
  });
  const source = mkSpan(sourceIdentity(getProject(), laneId), 'mmx-mix-lane-source');
  const identityRow = mkRow('mmx-mix-lane-modal-row mmx-mix-lane-identity', [
    mkSpan('Source', 'mmx-mix-lane-modal-field-label'), source,
    mkSpan('Label', 'mmx-mix-lane-modal-field-label'), labelInp,
  ]);
  const mute = mkBtn('Mute', 'al-btn mmx-mix-mute');
  mute.dataset.laneId = laneId;
  mute.setAttribute('aria-pressed', laneModel.muted ? 'true' : 'false');
  const solo = mkBtn('Solo', 'al-btn mmx-mix-solo');
  solo.dataset.laneId = laneId;
  solo.setAttribute('aria-pressed', laneModel.solo ? 'true' : 'false');
  const stateRow = mkRow('mmx-mix-lane-modal-row mmx-mix-lane-state', [mute, solo]);

  // Gain
  const initGain = laneModel.audio?.gain ?? 1;
  const gainLbl = mkSpan(`Gain (${Math.round(initGain * 100)}%)`, 'mmx-mix-lane-modal-field-label');
  const gainInp = mkRange('mmx-mix-lane-modal-gain', 0, 2, 0.01, initGain, 'Lane gain');
  gainInp.addEventListener('input', () => {
    const v = clamp(Number(gainInp.value), 0, 2);
    gainLbl.textContent = `Gain (${Math.round(v * 100)}%)`;
    setProject(updateLane(getProject(), laneId, (l) => ({ ...l, audio: { ...l.audio, gain: v } })));
    refreshClip();
  });
  const gainRow = mkRow('mmx-mix-lane-modal-row', [gainLbl, gainInp]);

  // Fade in — required class name for test selector compatibility
  const initFi = element?.audio?.fadeInMs ?? 0;
  const fiLbl = mkSpan(`Fade in (${(initFi / 1000).toFixed(1)}s)`, 'mmx-mix-lane-modal-field-label');
  const fiInp = mkRange('mmx-mix-fade-in', 0, 5000, 10, initFi, 'Fade in');
  fiInp.dataset.laneId = laneId;
  fiInp.addEventListener('input', () => {
    const v = Math.max(0, Number(fiInp.value));
    fiLbl.textContent = `Fade in (${(v / 1000).toFixed(1)}s)`;
    const eid = firstElementForLane(getProject(), laneId)?.id;
    if (!eid) return;
    setProject(updateElement(getProject(), eid, (el) => ({ ...el, audio: { ...el.audio, fadeInMs: v } })));
    refreshClip();
  });

  // Fade out — required class name for test selector compatibility
  const initFo = element?.audio?.fadeOutMs ?? 0;
  const foLbl = mkSpan(`Fade out (${(initFo / 1000).toFixed(1)}s)`, 'mmx-mix-lane-modal-field-label');
  const foInp = mkRange('mmx-mix-fade-out', 0, 5000, 10, initFo, 'Fade out');
  foInp.dataset.laneId = laneId;
  foInp.addEventListener('input', () => {
    const v = Math.max(0, Number(foInp.value));
    foLbl.textContent = `Fade out (${(v / 1000).toFixed(1)}s)`;
    const eid = firstElementForLane(getProject(), laneId)?.id;
    if (!eid) return;
    setProject(updateElement(getProject(), eid, (el) => ({ ...el, audio: { ...el.audio, fadeOutMs: v } })));
    refreshClip();
  });
  const fadeRow = mkRow('mmx-mix-lane-modal-row', [fiLbl, fiInp, foLbl, foInp]);

  // EQ / Dynamics toggle buttons
  const eqBtn = mkBtn('EQ', 'al-btn mmx-mix-lane-eq-btn');
  const dynBtn = mkBtn('Dynamics', 'al-btn mmx-mix-lane-dyn-btn');
  const actRow = mkRow('mmx-mix-lane-modal-actions', [eqBtn, dynBtn]);

  // EQ section (hidden until EQ button clicked)
  const eqSection = buildEqSection(laneModel, { getProject, setProject, laneId });
  eqSection.hidden = true;
  eqBtn.addEventListener('click', () => {
    eqSection.hidden = !eqSection.hidden;
    eqBtn.setAttribute('aria-pressed', eqSection.hidden ? 'false' : 'true');
  });

  // Dynamics section (hidden until Dynamics button clicked)
  const dynSection = buildDynamicsSection(laneModel, { getProject, setProject, laneId });
  dynSection.hidden = true;
  dynBtn.addEventListener('click', () => {
    dynSection.hidden = !dynSection.hidden;
    dynBtn.setAttribute('aria-pressed', dynSection.hidden ? 'false' : 'true');
  });

  body.append(identityRow, stateRow, gainRow, fadeRow, actRow, eqSection, dynSection);
  panel.append(body);
  modal.append(panel);
  const close = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    opener?.focus?.();
    opener = null;
  };
  modal.__open = (trigger) => {
    opener = trigger || document.activeElement;
    modal.hidden = false;
    labelInp.focus();
    labelInp.select();
  };
  modal.__close = close;
  header.querySelector('.mmx-mix-lane-modal-close').addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'Tab') {
      const focusable = [...panel.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled])')]
        .filter((node) => !node.closest('[hidden]'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  return modal;
}

// Sync modal slider values on render() without rebuilding the modal.
export function updateLaneModalValues(modal, laneModel, element, project = null) {
  if (!modal) return;
  const gainInp = modal.querySelector('.mmx-mix-lane-modal-gain');
  const gainLbl = gainInp?.closest('.mmx-mix-lane-modal-row')?.querySelector('.mmx-mix-lane-modal-field-label');
  const fiInp = modal.querySelector('.mmx-mix-fade-in');
  const foInp = modal.querySelector('.mmx-mix-fade-out');
  const labelInp = modal.querySelector('.mmx-mix-lane-label-input');
  const title = modal.querySelector('.mmx-mix-lane-modal-title');
  const source = modal.querySelector('.mmx-mix-lane-source');
  const mute = modal.querySelector('.mmx-mix-mute');
  const solo = modal.querySelector('.mmx-mix-solo');
  if (labelInp && document.activeElement !== labelInp) labelInp.value = laneModel.label || '';
  if (title) title.textContent = laneModel.label || 'Lane';
  if (source) source.textContent = sourceIdentity(project || { lanes: [laneModel], elements: element ? [element] : [], assets: [] }, laneModel.id);
  if (mute) mute.setAttribute('aria-pressed', laneModel.muted ? 'true' : 'false');
  if (solo) solo.setAttribute('aria-pressed', laneModel.solo ? 'true' : 'false');
  if (gainInp && document.activeElement !== gainInp) {
    const g = laneModel.audio?.gain ?? 1;
    gainInp.value = String(g);
    if (gainLbl) gainLbl.textContent = `Gain (${Math.round(g * 100)}%)`;
  }
  if (fiInp && document.activeElement !== fiInp) fiInp.value = String(element?.audio?.fadeInMs ?? 0);
  if (foInp && document.activeElement !== foInp) foInp.value = String(element?.audio?.fadeOutMs ?? 0);
}

function sourceIdentity(project, laneId) {
  const element = firstElementForLane(project, laneId);
  if (!element) return 'No source';
  const asset = (project.assets || []).find((candidate) => candidate.id === element.assetId);
  return asset?.name || element.audio?.roomTone?.kind || element.type || 'Source';
}

function buildModalHeader(title) {
  const header = document.createElement('div');
  header.className = 'mmx-mix-lane-modal-header';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'mmx-mix-lane-modal-close al-btn';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Close lane editor');
  header.append(mkSpan(title, 'mmx-mix-lane-modal-title'), closeBtn);
  return header;
}

function buildEqSection(laneModel, { getProject, setProject, laneId }) {
  const section = document.createElement('div');
  section.className = 'mmx-mix-lane-eq-section';
  section.append(mkSpan('EQ', 'mmx-mix-lane-modal-section-title'));
  const eq = laneModel.audio?.eq || createDefaultEq();
  const bandsEl = document.createElement('div');
  bandsEl.className = 'mmx-mix-lane-eq-bands';
  eq.bands.forEach((band, i) => {
    const freqStr = band.frequency >= 1000 ? `${band.frequency / 1000}kHz` : `${band.frequency}Hz`;
    const lbl = mkSpan(`${freqStr} (${band.gainDb.toFixed(1)}dB)`, 'mmx-mix-lane-eq-band-label');
    const inp = mkRange('mmx-mix-lane-eq-band-gain', -12, 12, 0.5, band.gainDb, `EQ ${freqStr}`);
    inp.dataset.bandIndex = String(i);
    inp.addEventListener('input', () => {
      const v = Number(inp.value);
      lbl.textContent = `${freqStr} (${v.toFixed(1)}dB)`;
      const p = getProject();
      const lm = p.lanes.find((l) => l.id === laneId);
      if (!lm) return;
      const curEq = lm.audio?.eq || createDefaultEq();
      const newBands = curEq.bands.map((b, idx) => (idx === i ? { ...b, gainDb: v } : b));
      setProject(updateLane(p, laneId, (l) => ({ ...l, audio: { ...l.audio, eq: { ...curEq, bands: newBands } } })));
    });
    const col = document.createElement('div');
    col.className = 'mmx-mix-lane-eq-band';
    col.append(lbl, inp);
    bandsEl.append(col);
  });
  section.append(bandsEl);
  return section;
}

function buildDynamicsSection(laneModel, { getProject, setProject, laneId }) {
  const section = document.createElement('div');
  section.className = 'mmx-mix-lane-dynamics-section';
  section.append(mkSpan('Dynamics (compressor — affects mix playback)', 'mmx-mix-lane-modal-section-title'));
  const dynamics = laneModel.audio?.dynamics || DEFAULT_DYNAMICS;
  const fields = [
    { key: 'thresholdDb', label: 'Threshold', min: -60, max: 0, step: 0.5, fmt: (v) => `${v.toFixed(1)}dB` },
    { key: 'ratio', label: 'Ratio', min: 1, max: 20, step: 0.1, fmt: (v) => `${v.toFixed(1)}:1` },
    { key: 'makeupDb', label: 'Makeup', min: 0, max: 24, step: 0.5, fmt: (v) => `${v.toFixed(1)}dB` },
  ];
  const row = document.createElement('div');
  row.className = 'mmx-mix-lane-dynamics-row';
  for (const f of fields) {
    const init = dynamics[f.key] ?? DEFAULT_DYNAMICS[f.key];
    const lbl = mkSpan(`${f.label} (${f.fmt(init)})`, 'mmx-mix-lane-modal-field-label');
    const inp = mkRange(`mmx-mix-lane-dyn-${f.key}`, f.min, f.max, f.step, init, f.label);
    inp.addEventListener('input', () => {
      const v = Number(inp.value);
      lbl.textContent = `${f.label} (${f.fmt(v)})`;
      const p = getProject();
      const lm = p.lanes.find((l) => l.id === laneId);
      if (!lm) return;
      const curDyn = lm.audio?.dynamics || { ...DEFAULT_DYNAMICS };
      setProject(updateLane(p, laneId, (l) => ({ ...l, audio: { ...l.audio, dynamics: { ...curDyn, [f.key]: v } } })));
    });
    const col = document.createElement('div');
    col.className = 'mmx-mix-lane-dyn-field';
    col.append(lbl, inp);
    row.append(col);
  }
  section.append(row);
  return section;
}

function mkRange(cls, min, max, step, value, ariaLabel) {
  const inp = document.createElement('input');
  Object.assign(inp, { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value) });
  if (cls) inp.className = cls;
  if (ariaLabel) inp.setAttribute('aria-label', ariaLabel);
  return inp;
}
function mkBtn(text, cls) {
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = cls; btn.textContent = text;
  btn.setAttribute('aria-pressed', 'false'); return btn;
}
function mkRow(cls, children) {
  const row = document.createElement('div');
  row.className = cls; for (const c of children) row.append(c); return row;
}
function mkSpan(text, cls) {
  const el = document.createElement('span'); el.className = cls; el.textContent = text; return el;
}
