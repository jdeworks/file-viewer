export function defaultState() {
  return {
    version: 1,
    run: {
      active: false,
      seed: "stage2-vertical-slice",
      floor: 1,
      floorSeed: "stage2-floor-1",
      generatedFloors: {},
      entity: {
        hp: 30,
        maxHp: 30,
        atk: 5,
        def: 2,
        spd: 1,
        sight: 7,
        level: 1,
        xp: 0,
        gold: 0,
        glyphsThisRun: 0,
        equipment: {
          weapon: "hand_cursor",
          armor: null,
          ring: null,
          amulet: null
        },
        inventory: ["minor_parse_potion"],
        hotbar: ["minor_parse_potion", null, null, null]
      },
      identifiedItems: {},
      combatLog: [
        "tokens. not bits. different.",
        "the first room draws itself around @."
      ],
      boss: {
        reached: false,
        phase: 1,
        unlocked: false,
        defeated: false,
        hp: 150,
        attempts: 0,
        lockHintStep: 0,
        unlockNotified: false
      }
    },
    meta: {
      glyphsBanked: 0,
      parseDepth: 0,
      shopUpgrades: {},
      bestFloor: 0,
      floorsCleared: {},
      deaths: 0,
      bossAttempts: 0,
      firstClearComplete: false
    }
  };
}

export function normalizeState(state) {
  const fresh = defaultState();
  const target = state && typeof state === "object" ? state : {};
  target.version = 1;
  target.run = mergePlain(fresh.run, target.run);
  target.run.entity = mergePlain(fresh.run.entity, target.run.entity);
  target.run.entity.equipment = mergePlain(fresh.run.entity.equipment, target.run.entity.equipment);
  target.run.boss = mergePlain(fresh.run.boss, target.run.boss);
  target.meta = mergePlain(fresh.meta, target.meta);
  return target;
}

function mergePlain(base, override) {
  return { ...base, ...(override && typeof override === "object" ? override : {}) };
}
