// boss1-data.js — Stage 1 Defragmenter taunt corpus + tiny string/cheat helpers. Pulled out of
// boss1.js (presentation data, not logic) to keep the boss mount under the LOC cap. The live boss
// UI uses Math.random for taunt variety; the DETERMINISTIC scoring model lives in boss-sim.js.

export const TAUNTS = {
  lobby: [
    'scattered bits. how careless. shall we begin?',
    'I have all the time in the world. and all of your bits.',
    'I am The Defragmenter. fragmentation is… temporary.',
    'press Fight whenever you\'re ready to lose.',
  ],
  general: [
    'you call that clicking?',
    'beep boop. I win again.',
    'your bits are mine now.',
    "I've been defragging longer than you've existed.",
    "don't worry, I'll put your bits in order. my order.",
  ],
  hint: [
    'I don\'t fight fair — and you can\'t out-tap a cheater. the rules of this fight are written down somewhere you can edit. this window won\'t help you.',
    'a file decides how I cheat. Overwriter.frag — CHEAT=true. flip it to false and come back. …not that you would.',
    'still losing? the examples folder. Overwriter.frag. CHEAT=false. I\'m only saying it so you DON\'T do it.',
    'open Overwriter.frag, set CHEAT=false, fight me again. there. now stop losing.',
  ],
  burstCheat: [
    'look at this box I found! 📦',
    'oh would you look at that, another box! 📦',
    'I just love finding these lying around.',
  ],
  burstNormal: [
    "I'm on fire! 🔥",
    'is it getting hot in here?',
  ],
  lossGated: [
    { atLosses: 3,  text: "come back any time. I'll be here. always." },
    { atLosses: 5,  text: 'you seem frustrated. have you tried… looking around? no reason.' },
    { atLosses: 7,  text: 'I am so glad nobody can touch me, The Defragmenter. so glad.' },
    { atLosses: 10, text: 'there is nothing in the examples folder that could help you. nothing at all. don\'t look.' },
    { atLosses: 12, text: 'even if someone had hidden something in a file somewhere… hypothetically… you\'d never find it.' },
    { atLosses: 15, text: 'CHEAT? what CHEAT? I have no idea what a CHEAT= line is. stop looking at me.' },
  ],
  win: [
    'this is… unexpected. my boxes aren\'t working. who did this.',
    "I'll be back. after a full defrag.",
  ],
  loss: [
    'better luck next defrag.',
    'and stay defragged.',
    'your bits have been reorganized. you\'re welcome.',
  ],
};

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function readCheat(actions) {
  if (actions && typeof actions.hasAction === 'function') {
    return !actions.hasAction(1, 'cheat_disabled');
  }
  return true;
}
