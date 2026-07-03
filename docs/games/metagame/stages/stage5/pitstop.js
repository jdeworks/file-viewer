// pitstop.js — Stage 5 Signal Racer: the between-round PIT STOP offer (UX audit M2/R2). The vehicle
// SHOP MENU is gone; after each round's result the player is offered TWO of the three stats to buy one
// of (skippable). Which two are offered is DETERMINISTIC — seeded by the run seed + round index — so a
// given run always offers the same pair for a given round (no live entropy, replay-safe).

import { makeRng } from './rng.js';
import { UPGRADES, isMaxed } from './shop.js';

const STAT_IDS = UPGRADES.map((u) => u.id); // ['engine','hull','signal']

// Up to TWO stat ids to offer after clearing `roundIdx`. Never offers a maxed stat; if two or fewer
// stats remain buyable, offers exactly those. Pure + deterministic for a (seed, roundIdx, shop).
export function pitStopOffer({ seed, roundIdx, shop = {} }) {
  const avail = STAT_IDS.filter((id) => !isMaxed(shop, id));
  if (avail.length <= 2) return avail;
  const rng = makeRng(`${String(seed)}:pit:${Number(roundIdx) || 0}`);
  return rng.shuffle(avail).slice(0, 2);
}
