// Stage 1 commentary messages. Each entry:
//   { id, text, trigger, condition, maxCount, removeAfterFire }
//
// trigger: 'game-start' | 'bit-earn' | 'buy' | 'bit-lose' | 'bell-open' | 'any'
// condition(state): boolean — only fire if true
// maxCount: number (max times to fire) | undefined (unlimited)
// removeAfterFire: boolean — remove from active checks after first fire

export const MESSAGES1 = [
  {
    id: 'bell-nothing',
    text: 'nothing here',
    trigger: 'game-start',
    condition: () => true,
    maxCount: 1,
    removeAfterFire: true,
  },
  {
    id: 'bell-firstsight',
    text: 'I can see something',
    trigger: 'bit-earn',
    condition: (state) => state.bits >= 10,
    maxCount: 1,
    removeAfterFire: true,
  },
  {
    id: 'bell-stronger',
    text: 'I feel stronger already',
    trigger: 'buy',
    condition: (state) => (state.totalBought || 0) < 5,
    maxCount: undefined,
    removeAfterFire: false,
  },
  {
    id: 'bell-reset',
    text: 'where did everything go :(',
    trigger: 'bit-lose',
    condition: (state) => state.bits === 0,
    maxCount: undefined,
    removeAfterFire: false,
  },
  {
    id: 'bell-halfway',
    text: 'halfway there',
    trigger: 'bit-earn',
    condition: (state) => (state.totalBits || 0) >= 500,
    maxCount: 1,
    removeAfterFire: true,
  },
  {
    id: 'bell-patient',
    text: 'patience has a cost',
    trigger: 'buy',
    condition: (state) => (state.totalBought || 0) >= 10,
    maxCount: 1,
    removeAfterFire: true,
  },
];
