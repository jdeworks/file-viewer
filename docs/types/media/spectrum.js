// Spectrum & EQ panel entry point for the AUDIO renderer.
//
// The implementation now lives in three focused modules so the same code powers
// both the audio-only panel and the video studio's audio-mixing panel:
//   - audio-graph.js    — the shared WebAudio graph (single MediaElementSource per
//                         element, dual analysers for original-vs-processed, EQ,
//                         HPF/LPF, makeup gain for LUFS normalization).
//   - spectrum-draw.js  — canvas drawing, band-energy meter, LUFS measurement,
//                         presets + LUFS targets.
//   - spectrum-panel.js — the panel UI wiring (sliders, presets, A/B, normalize).
//
// This file is the lazy-loaded surface renderer.js dynamic-imports; it just
// re-exports the shared panel so the existing import path keeps working.

export { mountSpectrumPanel } from './spectrum-panel.js';
