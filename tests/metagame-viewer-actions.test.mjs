import {
  isStage2PassageSearchResult,
  parseOverwriterCheat,
  recordMetagameViewerOpen,
  recordStage1RawEdit,
  recordStage2SearchResult,
  recordStage4BlueprintOpen,
  recordStage5MediaPlayback,
  recordStage6CodexOpen,
  recordStage7AnchorOpen,
  recordStage7Search,
  recordStage7SourceOpen,
  isStage7SessionSearch,
  shouldSetStage1CheatDisabled,
  stage7SourceAction,
} from '../docs/games/metagame/viewer-actions.js';
import { detect as detectMarkdown } from '../docs/types/markdown/detect.js';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed++; };

{
  const cases = [
    ['missing CHEAT disables', 'alpha\nbeta', true],
    ['empty CHEAT disables', 'CHEAT=', true],
    ['false disables', 'CHEAT=false', true],
    ['zero disables', 'CHEAT=0', true],
    ['no disables', 'CHEAT=no', true],
    ['off disables mixed case', 'CheAt=OFF', true],
    ['true remains enabled', 'CHEAT=true', false],
    ['one remains enabled', 'CHEAT=1', false],
    ['yes remains enabled', 'CHEAT=yes', false],
    ['on remains enabled', 'CHEAT=on', false],
  ];
  for (const [name, text, disabled] of cases) {
    ok(parseOverwriterCheat(text).disabled === disabled, `Stage 1 parser: ${name}`);
  }
}

{
  ok(shouldSetStage1CheatDisabled({ file: 'Overwriter.frag', text: 'CHEAT=false' }), 'Stage 1 matcher: exact Overwriter.frag disabled');
  ok(shouldSetStage1CheatDisabled({ file: '/docs/examples/Overwriter.frag', text: 'log\nCHEAT=\nend' }), 'Stage 1 matcher: path basename accepted');
  ok(!shouldSetStage1CheatDisabled({ file: 'other.frag', text: 'CHEAT=false' }), 'Stage 1 matcher: wrong file ignored');
  ok(!shouldSetStage1CheatDisabled({ file: 'Overwriter.frag', text: 'CHEAT=true' }), 'Stage 1 matcher: truthy value ignored');
}

{
  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordStage1RawEdit({ file: 'Overwriter.frag', text: 'CHEAT=off', setAction }), 'Stage 1 recorder returns true for disabled edit');
  ok(calls.length === 1, 'Stage 1 recorder: setAction called once');
  ok(calls[0][0] === 1 && calls[0][1] === 'cheat_disabled', 'Stage 1 recorder: action id set');
  ok(calls[0][2].source === 'raw-editor' && calls[0][2].file === 'Overwriter.frag' && calls[0][2].value === 'off', 'Stage 1 recorder: payload set');
  ok(!recordStage1RawEdit({ file: 'Overwriter.frag', text: 'CHEAT=on', setAction }), 'Stage 1 recorder returns false for enabled edit');
  ok(calls.length === 1, 'Stage 1 recorder: no setAction for enabled edit');
}

{
  ok(isStage2PassageSearchResult({ file: 'cipher.txt', query: 'PASSAGE', result: 'PASSAGE:247' }), 'Stage 2 matcher: exact canonical search');
  ok(isStage2PassageSearchResult({ file: '/docs/examples/metagame/stage2/cipher.txt', query: 'PASSAGE', match: { text: 'PASSAGE:247' } }), 'Stage 2 matcher: path and object match accepted');
  ok(!isStage2PassageSearchResult({ file: 'cipher.txt', query: 'passage', result: 'PASSAGE:247' }), 'Stage 2 matcher: wrong query case ignored');
  ok(!isStage2PassageSearchResult({ file: 'notes.txt', query: 'PASSAGE', result: 'PASSAGE:247' }), 'Stage 2 matcher: wrong file ignored');
  ok(!isStage2PassageSearchResult({ file: 'cipher.txt', query: 'PASSAGE', result: 'PASSAGE:248' }), 'Stage 2 matcher: wrong result ignored');
}

{
  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordStage2SearchResult({ file: 'cipher.txt', query: 'PASSAGE', result: 'PASSAGE:247', setAction }), 'Stage 2 recorder returns true for canonical search');
  ok(calls.length === 1, 'Stage 2 recorder: setAction called once');
  ok(calls[0][0] === 2 && calls[0][1] === 'search_passage', 'Stage 2 recorder: action id set');
  ok(calls[0][2].source === 'search' && calls[0][2].file === 'cipher.txt' && calls[0][2].value === 'PASSAGE' && calls[0][2].result === 'PASSAGE:247', 'Stage 2 recorder: payload set');
  ok(!recordStage2SearchResult({ file: 'cipher.txt', query: 'PASSAGE', result: 'PASSAGE:248', setAction }), 'Stage 2 recorder returns false for wrong result');
  ok(calls.length === 1, 'Stage 2 recorder: no setAction for wrong result');
}

{
  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordStage5MediaPlayback({ file: 'transmission_hum.mp3', continuousMs: 14000, setAction }), 'Stage 5 media playback recorder returns true at full loop');
  ok(calls.length === 1, 'Stage 5 recorder: setAction called once');
  ok(calls[0][0] === 5 && calls[0][1] === 'counter_wave_calibrated', 'Stage 5 recorder: action id set');
  ok(calls[0][2].source === 'media-playback' && calls[0][2].durationMs === 14000, 'Stage 5 recorder: payload set');
  ok(!recordStage5MediaPlayback({ file: 'transmission_hum.mp3', continuousMs: 13999, setAction }), 'Stage 5 recorder rejects short playback');
  ok(!recordStage5MediaPlayback({ file: 'other.mp3', continuousMs: 14000, setAction }), 'Stage 5 recorder rejects wrong file');
  ok(!recordStage5MediaPlayback({ file: 'transmission_hum.mp3', continuousMs: 14000, seeking: true, setAction }), 'Stage 5 recorder rejects seeking playback');
  ok(calls.length === 1, 'Stage 5 recorder: no extra calls for rejected playback');
}

{
  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordStage4BlueprintOpen({ file: '/docs/examples/metagame/stage4/towers/upgrades/tier3_blueprints/recursion_points.json', setAction }), 'Stage 4 blueprint open recorder returns true for deep path');
  ok(calls.length === 1, 'Stage 4 recorder: setAction called once');
  ok(calls[0][0] === 4 && calls[0][1] === 'recursion_blueprint_read', 'Stage 4 recorder: action id set');
  ok(calls[0][2].source === 'viewer-open' && calls[0][2].file === 'recursion_points.json', 'Stage 4 recorder: payload set');
  ok(recordStage4BlueprintOpen({ file: 'recursion_points.json', setAction }), 'Stage 4 recorder accepts bare basename');
  ok(!recordStage4BlueprintOpen({ file: 'waves.json', setAction }), 'Stage 4 recorder rejects wrong file');
  ok(calls.length === 2, 'Stage 4 recorder: no extra calls for wrong file');
}

{
  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordMetagameViewerOpen({ path: '/docs/examples/metagame/stage4/towers/upgrades/tier3_blueprints/recursion_points.json', opts: {}, setAction }), 'Viewer-open aggregate records Stage 4 blueprint');
  ok(calls.length === 1 && calls[0][0] === 4 && calls[0][1] === 'recursion_blueprint_read', 'Viewer-open aggregate: Stage 4 action id set');
}

{
  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordStage6CodexOpen({ file: '/docs/examples/metagame/stage6/protocols_of_the_entity.epub', setAction }), 'Stage 6 codex open recorder returns true');
  ok(calls.length === 1, 'Stage 6 recorder: setAction called once');
  ok(calls[0][0] === 6 && calls[0][1] === 'protocol_ch9_read', 'Stage 6 recorder: action id set');
  ok(calls[0][2].source === 'viewer-open' && calls[0][2].chapter === 9, 'Stage 6 recorder: payload set');
  ok(!recordStage6CodexOpen({ file: 'wrong.epub', setAction }), 'Stage 6 recorder rejects wrong file');
  ok(calls.length === 1, 'Stage 6 recorder: no extra calls for wrong file');
}

// The stage-7 EXIF metadata recorder was removed with the Meridian rework (2026-07-12): the boss
// un-cheat now fires in-stage from the evidence board (stage7/boss.js), not from the image viewer.

{
  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordStage7AnchorOpen({ file: 'rescinded_appointment.txt', setAction }), 'Stage 7 anchor recorder returns true');
  ok(calls.length === 1 && calls[0][0] === 7 && calls[0][1] === 'anchor_chain_examined', 'Stage 7 anchor recorder: action id set');
  ok(!recordStage7AnchorOpen({ file: 'something_else.txt', setAction }), 'Stage 7 anchor recorder rejects other files');
  ok(calls.length === 1, 'Stage 7 anchor recorder: no extra calls for wrong file');
}

{
  // Stage 7 Case 2 source-file recorders (load-bearing evidence un-cheats).
  ok(stage7SourceAction('household_register.csv') === 'route_table_examined', 'Stage 7 source: household register mapped');
  ok(stage7SourceAction('/docs/examples/metagame/stage7/estate_rules.txt') === 'spec_examined', 'Stage 7 source: estate rules mapped by path');
  ok(stage7SourceAction('visitors_book.csv') === 'access_log_examined', 'Stage 7 source: visitors book mapped');
  ok(stage7SourceAction('parlour_interview.txt') === 'comms_examined', 'Stage 7 source: parlour interview mapped');
  ok(stage7SourceAction('unrelated.csv') === null, 'Stage 7 source: unrelated file unmapped');

  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordStage7SourceOpen({ file: 'household_register.csv', setAction }), 'Stage 7 source recorder returns true for the register');
  ok(calls.length === 1 && calls[0][0] === 7 && calls[0][1] === 'route_table_examined', 'Stage 7 source recorder: route action id set');
  ok(calls[0][2].source === 'viewer-open' && calls[0][2].file === 'household_register.csv', 'Stage 7 source recorder: payload set');
  ok(!recordStage7SourceOpen({ file: 'unrelated_notes.json', setAction }), 'Stage 7 source recorder rejects non-source files');
  ok(calls.length === 1, 'Stage 7 source recorder: no extra calls for wrong file');
}

{
  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordMetagameViewerOpen({ path: '/docs/examples/metagame/stage7/household_register.csv', opts: {}, setAction }), 'Viewer-open aggregate records Stage 7 source file');
  ok(calls.length === 1 && calls[0][0] === 7 && calls[0][1] === 'route_table_examined', 'Viewer-open aggregate: Stage 7 source action id set');
}

{
  // Stage 7 Case 3 (Quorum Ghost) source-file recorders — extra load-bearing opens.
  ok(stage7SourceAction('inheritance_customs.txt') === 'quorum_spec_examined', 'Stage 7 Case 3 source: customs mapped');
  ok(stage7SourceAction('/docs/examples/metagame/stage7/solicitor_memo.txt') === 'audit_examined', 'Stage 7 Case 3 source: memo mapped by path');
  ok(stage7SourceAction('mourners_register.csv') === 'handshake_examined', 'Stage 7 Case 3 source: mourners register mapped');
  ok(stage7SourceAction('estate_ledger.csv') === 'ledger_examined', 'Stage 7 Case 3 source: ledger maps to hint card (open)');

  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordStage7SourceOpen({ file: 'inheritance_customs.txt', setAction }), 'Stage 7 Case 3 source recorder returns true for customs');
  ok(calls.length === 1 && calls[0][1] === 'quorum_spec_examined', 'Stage 7 Case 3 source recorder: quorum action id set');
}

{
  // Stage 7 Case 3 SEARCH un-cheat — the decisive deduction needs a real search, not just an open.
  const VOID_LINE = 'Voucher 214,Mr. Sennett,annuity,\u00a360 a year,VOID (cancelled the 15th)';
  ok(isStage7SessionSearch({ file: 'estate_ledger.csv', query: 'Voucher 214', result: VOID_LINE }), 'Stage 7 search matcher: void voucher line accepted');
  ok(isStage7SessionSearch({ file: '/docs/examples/metagame/stage7/estate_ledger.csv', query: 'voucher 214', match: { text: VOID_LINE } }), 'Stage 7 search matcher: path + object + case-insensitive');
  ok(!isStage7SessionSearch({ file: 'estate_ledger.csv', query: 'Voucher 202', result: 'Voucher 202,Mrs. Trevisick,allowance,\u00a324 a year,honoured' }), 'Stage 7 search matcher: an honoured voucher is not the un-cheat');
  ok(!isStage7SessionSearch({ file: 'household_register.csv', query: 'Voucher 214', result: VOID_LINE }), 'Stage 7 search matcher: wrong file ignored');

  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordStage7Search({ file: 'estate_ledger.csv', query: 'Voucher 214', result: VOID_LINE, setAction }), 'Stage 7 search recorder returns true for the void line');
  ok(calls.length === 1 && calls[0][0] === 7 && calls[0][1] === 'session_revoked_found', 'Stage 7 search recorder: action id set');
  ok(calls[0][2].source === 'search' && calls[0][2].file === 'estate_ledger.csv' && calls[0][2].value === 'VOUCHER 214', 'Stage 7 search recorder: payload set');
  ok(!recordStage7Search({ file: 'estate_ledger.csv', query: 'Voucher 214', result: 'Voucher 214,Mr. Sennett,annuity,\u00a360 a year,honoured', setAction }), 'Stage 7 search recorder rejects an honoured result');
  ok(calls.length === 1, 'Stage 7 search recorder: no extra calls for an honoured result');
}

{
  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordMetagameViewerOpen({ path: 'protocols_of_the_entity.epub', opts: {}, setAction }), 'Viewer-open aggregate records Stage 6');
  // The stage-7 boss gate never fires from the viewer at all since the Meridian rework — it is an
  // in-stage evidence-board connect (stage7/boss.js). Opening the old photo records nothing.
  ok(!recordMetagameViewerOpen({ path: 'entity_f_verification.jpg', opts: { metadataField: 'GPSInfo', entity: 'F' }, setAction }), 'Viewer-open aggregate does NOT fire any Stage 7 boss action at open');
  ok(calls.length === 1, 'Viewer-open aggregate: only Stage 6 fired (Stage 7 boss is board-gated)');
}

{
  ok(detectMarkdown({ filename: 'bit_foundry.bts', isBinary: false, textSample: '' }) === 0.95, 'Markdown detector: .bts extension supported');
}

console.log(failed ? `\nMETAGAME VIEWER ACTIONS FAILED (${failed})` : '\nMETAGAME VIEWER ACTIONS PASSED');
process.exit(failed ? 1 : 0);
