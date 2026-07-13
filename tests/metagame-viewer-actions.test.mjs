import {
  isSecretTxtFile,
  isStage1OverwriterFile,
  isStage2PassageSearchResult,
  isStage4BlueprintFile,
  isStage5CodexFile,
  parseOverwriterCheat,
  recordMetagameViewerOpen,
  recordSecretTxtOpen,
  recordStage1RawEdit,
  recordStage2SearchResult,
  recordStage3AsciiActivation,
  recordStage4BlueprintOpen,
  recordStage5CodexOpen,
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
  for (const [name, source, disabled] of cases) {
    ok(parseOverwriterCheat(source).disabled === disabled, `Stage 1 parser: ${name}`);
  }
}

{
  ok(isStage1OverwriterFile('/docs/examples/Overwriter.frag'), 'Stage 1 matcher accepts a path');
  ok(shouldSetStage1CheatDisabled({ file: 'Overwriter.frag', text: 'CHEAT=false' }), 'Stage 1 matcher accepts the canonical disabled edit');
  ok(!shouldSetStage1CheatDisabled({ file: 'other.frag', text: 'CHEAT=false' }), 'Stage 1 matcher rejects another file');
  ok(!shouldSetStage1CheatDisabled({ file: 'Overwriter.frag', text: 'CHEAT=true' }), 'Stage 1 matcher rejects an enabled edit');

  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordStage1RawEdit({ file: 'Overwriter.frag', text: 'CHEAT=off', setAction }), 'Stage 1 recorder accepts the disabled edit');
  ok(calls.length === 1 && calls[0][0] === 1 && calls[0][1] === 'cheat_disabled', 'Stage 1 recorder sets the canonical action');
  ok(calls[0][2].source === 'raw-editor' && calls[0][2].value === 'off', 'Stage 1 recorder includes its source and value');
}

{
  ok(isStage2PassageSearchResult({ file: 'cipher.txt', query: 'PASSAGE', result: 'PASSAGE:247' }), 'Stage 2 matcher accepts the canonical search');
  ok(isStage2PassageSearchResult({ file: '/docs/examples/metagame/stage2/cipher.txt', query: 'PASSAGE', match: { text: 'PASSAGE:247' } }), 'Stage 2 matcher accepts path and match-object forms');
  ok(!isStage2PassageSearchResult({ file: 'cipher.txt', query: 'passage', result: 'PASSAGE:247' }), 'Stage 2 matcher keeps the query exact');
  ok(!isStage2PassageSearchResult({ file: 'cipher.txt', query: 'PASSAGE', result: 'PASSAGE:248' }), 'Stage 2 matcher rejects the wrong result');

  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordStage2SearchResult({ file: 'cipher.txt', query: 'PASSAGE', result: 'PASSAGE:247', setAction }), 'Stage 2 recorder accepts the canonical search');
  ok(calls.length === 1 && calls[0][0] === 2 && calls[0][1] === 'search_passage', 'Stage 2 recorder sets the canonical action');
  ok(calls[0][2].source === 'search' && calls[0][2].result === 'PASSAGE:247', 'Stage 2 recorder includes the search result');
}

{
  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordStage3AsciiActivation({ file: 'entity_f_verification.png', setAction }), 'Stage 3 ASCII activation accepts the canonical image');
  ok(calls.length === 1 && calls[0][0] === 3 && calls[0][1] === 'ascii_awakening', 'Stage 3 ASCII activation sets the canonical action');
  ok(!recordStage3AsciiActivation({ file: 'other.png', setAction }), 'Stage 3 ASCII activation rejects another image');
}

{
  ok(isStage4BlueprintFile('/docs/examples/metagame/stage4/towers/upgrades/tier3_blueprints/recursion_points.json'), 'Stage 4 matcher accepts the blueprint path');
  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordStage4BlueprintOpen({ file: 'recursion_points.json', setAction }), 'Stage 4 recorder accepts the blueprint');
  ok(calls.length === 1 && calls[0][0] === 4 && calls[0][1] === 'recursion_blueprint_read', 'Stage 4 recorder sets the canonical action');
  ok(!recordStage4BlueprintOpen({ file: 'waves.json', setAction }), 'Stage 4 recorder rejects another file');
}

{
  ok(isStage5CodexFile('/docs/examples/metagame/stage5/protocols_of_the_entity.epub'), 'Stage 5 matcher accepts the renumbered codex path');
  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordStage5CodexOpen({ file: '/docs/examples/metagame/stage5/protocols_of_the_entity.epub', setAction }), 'Stage 5 codex recorder accepts the canonical EPUB');
  ok(calls.length === 1 && calls[0][0] === 5 && calls[0][1] === 'protocol_ch9_read', 'Stage 5 codex recorder sets the renumbered action');
  ok(calls[0][2].source === 'viewer-open' && calls[0][2].chapter === 9, 'Stage 5 codex recorder includes the chapter');
  ok(!recordStage5CodexOpen({ file: 'wrong.epub', setAction }), 'Stage 5 codex recorder rejects another EPUB');
}

{
  ok(isSecretTxtFile('/docs/examples/secret.txt'), 'Archivist matcher accepts secret.txt');
  const calls = [];
  const setAction = (...args) => calls.push(args);
  ok(recordSecretTxtOpen({ file: 'secret.txt', setAction }), 'Archivist recorder accepts secret.txt');
  ok(calls.length === 1 && calls[0][0] === 0 && calls[0][1] === 'archivist_breadcrumb_found', 'Archivist recorder sets its global action');
}

{
  const cases = [
    ['secret.txt', 0, 'archivist_breadcrumb_found'],
    ['recursion_points.json', 4, 'recursion_blueprint_read'],
    ['protocols_of_the_entity.epub', 5, 'protocol_ch9_read'],
  ];
  for (const [path, stage, action] of cases) {
    const calls = [];
    ok(recordMetagameViewerOpen({ path, setAction: (...args) => calls.push(args) }), `Viewer-open aggregate records ${path}`);
    ok(calls.length === 1 && calls[0][0] === stage && calls[0][1] === action, `Viewer-open aggregate maps ${path} to ${stage}.${action}`);
  }
  ok(!recordMetagameViewerOpen({ path: 'unrelated.txt', setAction: () => {} }), 'Viewer-open aggregate ignores unrelated files');
}

{
  ok(detectMarkdown({ filename: 'bit_foundry.bts', isBinary: false, textSample: '' }) === 0.95, 'Markdown detector supports .bts files');
}

console.log(failed ? `\nMETAGAME VIEWER ACTIONS FAILED (${failed})` : '\nMETAGAME VIEWER ACTIONS PASSED');
process.exit(failed ? 1 : 0);
