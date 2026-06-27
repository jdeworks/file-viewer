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
  recordStage7MetadataInspection,
  shouldSetStage1CheatDisabled,
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

{
  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordStage7MetadataInspection({ file: 'entity_f_verification.png', field: 'GPSInfo', entity: 'F', setAction }), 'Stage 7 metadata recorder returns true');
  ok(calls.length === 1, 'Stage 7 recorder: setAction called once');
  ok(calls[0][0] === 7 && calls[0][1] === 'exif_contradiction_found', 'Stage 7 recorder: action id set');
  ok(calls[0][2].source === 'viewer-metadata' && calls[0][2].field === 'GPSInfo', 'Stage 7 recorder: payload set');
  ok(!recordStage7MetadataInspection({ file: 'entity_f_verification.png', field: 'DateTimeOriginal', entity: 'F', setAction }), 'Stage 7 recorder rejects non-contradictory metadata');
  ok(!recordStage7MetadataInspection({ file: 'entity_a_verification.png', field: 'GPSInfo', entity: 'A', setAction }), 'Stage 7 recorder rejects wrong entity/file');
  ok(calls.length === 1, 'Stage 7 recorder: no extra calls for rejected metadata');
}

{
  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordStage7AnchorOpen({ file: 'entity_anchor_0043.txt', setAction }), 'Stage 7 anchor recorder returns true');
  ok(calls.length === 1 && calls[0][0] === 7 && calls[0][1] === 'anchor_chain_examined', 'Stage 7 anchor recorder: action id set');
  ok(!recordStage7AnchorOpen({ file: 'something_else.txt', setAction }), 'Stage 7 anchor recorder rejects other files');
  ok(calls.length === 1, 'Stage 7 anchor recorder: no extra calls for wrong file');
}

{
  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordMetagameViewerOpen({ path: 'protocols_of_the_entity.epub', opts: {}, setAction }), 'Viewer-open aggregate records Stage 6');
  ok(recordMetagameViewerOpen({ path: 'entity_f_verification.png', opts: { metadataField: 'GPSInfo', entity: 'F' }, setAction }), 'Viewer-open aggregate records Stage 7 metadata');
  ok(calls.length === 2, 'Viewer-open aggregate records two canonical actions');
}

{
  ok(detectMarkdown({ filename: 'bit_foundry.bts', isBinary: false, textSample: '' }) === 0.95, 'Markdown detector: .bts extension supported');
}

console.log(failed ? `\nMETAGAME VIEWER ACTIONS FAILED (${failed})` : '\nMETAGAME VIEWER ACTIONS PASSED');
process.exit(failed ? 1 : 0);
