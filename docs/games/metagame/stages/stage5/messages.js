export const ACTION_NAME = 'counter_wave_calibrated';
// Cosmetic-only live progress signal (transient channel — never persisted, never satisfies the boss
// gate). Carries the accumulating continuousMs so the calibration HUD can animate toward the loop.
export const PROGRESS_ACTION = 'calibration_progress';
export const REQUIRED_ACTION = '5.counter_wave_calibrated';
export const ACHIEVEMENT_ID = 'stage5.counter_wave_calibrated';
export const ACHIEVEMENT_TEXT = 'I listened before I drove.';
export const BTS_PATH = '/docs/bts/signal_racer.bts';
export const TRANSMISSION_HUM_PATH = '/docs/examples/metagame/stage5/transmission_hum.mp3';
export const LOOP_DURATION_MS = 14000;

export const bellMessages = {
  start: 'the road is only a waveform drawn flat.',
  unlock: 'the counter-wave holds for one full loop.',
  defeated: 'the jammer signal collapses into silence.',
};

export const lockedHintLadder = [
  'the jammer bleeds your integrity the whole race. a maxed rig can outrun it — barely.',
  'its suppression wave has a rhythm. the rhythm can be answered.',
  'transmission_hum.mp3 carries the counter-signal.',
  'play transmission_hum.mp3 continuously for one full 14-second loop to cancel the suppression entirely.',
];
