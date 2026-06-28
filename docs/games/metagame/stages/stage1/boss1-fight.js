// boss1-fight.js — Stage 1 Defragmenter live 20s click-contest loop. Pulled out of boss1.js to keep
// the boss mount under the LOC cap. Pure behaviour move: builds the fight DOM, reads the cheat ONCE
// at start (§10A.5), runs the per-tap shadow + auto-floor + burst auto-fires, and calls onFinish.
//
// THE UN-CHEAT IS LOAD-BEARING: while the cheat is active the shadow/floor/bursts make the contest
// structurally unwinnable; the matching deterministic model lives in boss-sim.js.

import { FIGHT_MS, BURST_MS, makeBurstSchedule, fightParams } from './boss-sim.js';
import { TAUNTS, pick, readCheat } from './boss1-data.js';

// makeFight({ arena, actions, setT, setI, clearTimer, on, onFinish }) → startFight()
//   onFinish(userScore, bossScore, cheatActive) is called ~1s after time expires (the freeze + reveal).
export function makeFight({ arena, actions, setT, setI, clearTimer, on, onFinish }) {
  return function startFight() {
    const cheatActive = readCheat(actions);              // §10A.5 — locked once, here.
    const p = fightParams(cheatActive);                  // shadow/floor/burst params (un-cheat-aware).
    const bursts = makeBurstSchedule(Date.now(), cheatActive);
    let userScore = 0, bossScore = 0, bossAcc = 0;
    let tapTimes = [];
    let lastFloorTick = 0;
    const fightStart = Date.now();
    let fightActive = true;
    let activeBurstKey = null;   // tracks which burst is currently "on" for taunt/visual edges.

    arena.innerHTML =
      '<div class="mg-defrag-arena mg-defrag-fight-on mg-fade-in">'
      + '<div class="mg-defrag-header">THE DEFRAGMENTER</div>'
      + '<div class="mg-defrag-taunt-wrap"><div class="boss-taunt">'
      + '<span class="boss-taunt-avatar">⚙️</span>'
      + '<div class="boss-taunt-bubble"></div></div></div>'
      + '<div class="mg-defrag-scores">'
      + '<div class="mg-defrag-side mg-defrag-user"><div class="mg-defrag-label">YOU</div>'
      + '<div class="mg-defrag-score" id="user-score">0</div><div class="mg-defrag-bar user-bar"></div></div>'
      + '<div class="mg-defrag-timer">20.0s</div>'
      + '<div class="mg-defrag-side mg-defrag-boss"><div class="mg-defrag-label">BOSS</div>'
      + '<div class="mg-defrag-score" id="boss-score">0</div><div class="mg-defrag-bar boss-bar"></div></div>'
      + '</div>'
      + '<button class="mg-defrag-tap" type="button">TAP TAP TAP</button>'
      + '<div class="mg-defrag-status"></div></div>';

    const arenaEl = arena.querySelector('.mg-defrag-arena');
    const userEl = arena.querySelector('#user-score');
    const bossEl = arena.querySelector('#boss-score');
    const userBar = arena.querySelector('.user-bar');
    const bossBar = arena.querySelector('.boss-bar');
    const timerEl = arena.querySelector('.mg-defrag-timer');
    const statusEl = arena.querySelector('.mg-defrag-status');
    const bubble = arena.querySelector('.boss-taunt-bubble');
    const tapBtn = arena.querySelector('.mg-defrag-tap');

    const showTaunt = (text) => { if (bubble) bubble.textContent = text; };
    showTaunt(pick(TAUNTS.general));   // fight-start taunt (§10C.4)

    function updateDisplay() {
      userEl.textContent = String(userScore);
      bossEl.textContent = String(bossScore);
      const max = Math.max(userScore, bossScore, 1);
      userBar.style.setProperty('--w', (100 * userScore / max) + '%');
      bossBar.style.setProperty('--w', (100 * bossScore / max) + '%');
    }

    function onTap() {
      if (!fightActive) return;
      userScore += 1;
      const now = Date.now();
      const elapsed = now - fightStart;
      const inBurst = bursts.some((b) => elapsed >= b.start && elapsed < b.end);
      if (inBurst && cheatActive) bossAcc += 1.5; else bossAcc += p.shadow;
      bossScore = Math.floor(bossAcc);
      tapTimes.push(now);
      tapTimes = tapTimes.filter((t) => now - t < 3000);
      updateDisplay();
    }
    on(tapBtn, 'click', onTap);

    // 100 ms tick: timer, auto-tick floor, burst auto-fires + visuals, repaint.
    const tickId = setI(() => {
      const now = Date.now();
      const elapsed = now - fightStart;
      const remaining = Math.max(0, FIGHT_MS - elapsed);
      timerEl.textContent = (remaining / 1000).toFixed(1) + 's';

      // Auto-tick floor (§10B.3): boss keeps a baseline pulse slightly faster than the user.
      const userRateMs = tapTimes.length > 1
        ? (tapTimes[tapTimes.length - 1] - tapTimes[0]) / (tapTimes.length - 1)
        : 999;
      const bossFloorMs = p.floorMs(userRateMs);
      if (now - lastFloorTick >= bossFloorMs) {
        bossAcc += p.floorWeight;
        bossScore = Math.floor(bossAcc);
        lastFloorTick = now;
      }

      // Burst handling (§10B.4): visual edge + evenly spaced boss auto-fires.
      const burst = bursts.find((b) => elapsed >= b.start && elapsed < b.end);
      const key = burst ? burst.start : null;
      if (key !== activeBurstKey) {
        // Burst boundary changed.
        arenaEl.classList.remove('mg-defrag-burst-hot', 'mg-defrag-burst-warm');
        if (burst) {
          arenaEl.classList.add(cheatActive ? 'mg-defrag-burst-hot' : 'mg-defrag-burst-warm');
          statusEl.textContent = cheatActive ? '🔥 the Defragmenter surges…' : 'the Defragmenter surges…';
          showTaunt(pick(cheatActive ? TAUNTS.burstCheat : TAUNTS.burstNormal));
        } else {
          statusEl.textContent = '';
        }
        activeBurstKey = key;
      }
      if (burst) {
        // Evenly spaced auto-fires across the 800 ms window.
        const autoCount = p.burstCount;
        const autoWeight = p.burstWeight;
        const want = Math.min(autoCount, Math.floor((elapsed - burst.start) / (BURST_MS / autoCount)) + 1);
        while (burst.fired < want) {
          bossAcc += autoWeight;
          burst.fired++;
        }
        bossScore = Math.floor(bossAcc);
      }

      updateDisplay();

      if (remaining <= 0) {
        fightActive = false;
        clearTimer(tickId);
        tapBtn.disabled = true;
        arenaEl.classList.remove('mg-defrag-burst-hot', 'mg-defrag-burst-warm');
        // Freeze, 1 s pause, then reveal (§10B.6).
        setT(() => onFinish(userScore, bossScore, cheatActive), 1000);
      }
    }, 100);
  };
}
