// boss1-data.js — Stage 1 Defragmenter taunt corpus + tiny string helpers. Pulled out of
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
    'keep a steady rhythm. every tap counts, even while I surge.',
    'my bursts are brief. stay on the button and take the lead back.',
    'watch the score, not the sparks. consistency beats panic.',
    'you only need to finish one point ahead. keep tapping to the bell.',
  ],
  burst: [
    "I'm on fire! 🔥",
    'is it getting hot in here?',
  ],
  lossGated: [
    { atLosses: 3,  text: "come back any time. I'll be here. always." },
    { atLosses: 5,  text: 'you seem frustrated. try a steady rhythm.' },
    { atLosses: 7,  text: 'the sparks are a distraction. the score is what matters.' },
    { atLosses: 10, text: 'my surges end quickly. keep tapping through them.' },
    { atLosses: 12, text: 'one point ahead is enough. you can do that, surely.' },
    { atLosses: 15, text: 'fine. tap to the bell and do not let up.' },
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
