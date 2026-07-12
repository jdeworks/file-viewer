# Stage 7 case fixtures — "The Meridian Estate Affair"

These are the **new** evidence documents for the human detective rework of Stage 7. They are authored
here (in the stage lane) as **data only**. The orchestrator INSTALLS them to the viewer example root and
WIRES the (central, out-of-lane) file → action map. Nothing in this folder is loaded at runtime.

## Install list (copy verbatim → `docs/examples/metagame/stage7/`)

| Fixture file (here)        | Install destination                                    | Role / fact it mints |
|----------------------------|--------------------------------------------------------|----------------------|
| `rescinded_appointment.txt`| `docs/examples/metagame/stage7/rescinded_appointment.txt` | SS4 Paper Trail — OPEN fires `anchor_chain_examined` → breaks F's trail |
| `alibi_statement.txt`      | `docs/examples/metagame/stage7/alibi_statement.txt`    | Boss doc A (read-only; pinned + connected in-stage) |
| `torn_letter.txt`          | `docs/examples/metagame/stage7/torn_letter.txt`        | Boss doc B (read-only; pinned + connected in-stage) |
| `estate_rules.txt`         | `docs/examples/metagame/stage7/estate_rules.txt`       | Case 2 OPEN `spec_examined` → `fact:spec` (clears H) |
| `household_register.csv`   | `docs/examples/metagame/stage7/household_register.csv` | Case 2 OPEN `route_table_examined` → `fact:route` (**decisive**) |
| `visitors_book.csv`        | `docs/examples/metagame/stage7/visitors_book.csv`      | Case 2 OPEN `access_log_examined` → `fact:activity` |
| `parlour_interview.txt`    | `docs/examples/metagame/stage7/parlour_interview.txt`  | Case 2 OPEN `comms_examined` → `fact:comms` |
| `inheritance_customs.txt`  | `docs/examples/metagame/stage7/inheritance_customs.txt`| Case 3 OPEN `quorum_spec_examined` → `fact:qspec` (clears Q) |
| `solicitor_memo.txt`       | `docs/examples/metagame/stage7/solicitor_memo.txt`     | Case 3 OPEN `audit_examined` → `fact:audit` (clears P) |
| `mourners_register.csv`    | `docs/examples/metagame/stage7/mourners_register.csv`  | Case 3 OPEN `handshake_examined` → `fact:handshake` |
| `estate_ledger.csv`        | `docs/examples/metagame/stage7/estate_ledger.csv`      | Case 3 OPEN `ledger_examined` → `fact:ledgerhint`; **SEARCH** → `fact:session` (decisive) |

The old fixtures (`route_table.csv`, `session_ledger.csv`, `system_spec.json`, `access_log.csv`,
`comms_transcript.txt`, `quorum_spec.json`, `audit_trail.txt`, `handshake_log.csv`, `entity_anchor_0043.txt`,
`entity_f_verification.jpg`, `entity_metadata.json`) are **superseded** and should be removed from the
example root — EXCEPT **`entity_f_verification.png`**, which **stage 3** depends on by filename
(viewer-actions.js STAGE3_ASCII_FILE); leave it in place. Stage 7 no longer references it.

## Central wiring the orchestrator must do (out of this lane)

`docs/games/metagame/viewer-actions.js`:
- `STAGE7_SOURCE_FILES` — replace the **filenames** (first column) with the new names above; **keep the
  action strings** (second column) unchanged. They are internal engine ids (they key which fact card an
  open mints) and are referenced by both `content.js` and `viewer-actions.js` — renaming them would be
  churn for no player-visible gain, so they are deliberately retained despite the re-themed filenames.
- `STAGE7_ANCHOR_FILE` → `rescinded_appointment.txt`.
- **SEARCH gate:** `STAGE7_SEARCH_FILE = 'estate_ledger.csv'`, `STAGE7_SEARCH_QUERY = 'Voucher 214'`,
  `STAGE7_SEARCH_TOKEN = 'VOID'`. Searching `estate_ledger.csv` for `Voucher 214` returns the row
  `Voucher 214,Mr. Sennett,annuity,£60 a year,VOID (cancelled the 15th)` — the matched line contains
  `VOID`, which is the load-bearing hit that mints `fact:session`.
- **Remove** `shouldSetStage7ExifContradiction` / `recordStage7MetadataInspection` and the `STAGE7_FILE`
  (`entity_f_verification.jpg`) constant — the EXIF boss is gone. Also remove the stage-7 hook call in
  `docs/types/image/metadata.js`.

The boss action **`7.alibi_contradiction_pinned`** is **not** fired from `viewer-actions.js` — it is
fired **in-stage** by the evidence-board connect handler (`boss.js → connectAlibiContradiction`, called
from `renderer.js` on the `data-action="connect-alibi"` button). It goes through the same
`actions.setAction(7, …)` bus, so the central save mirror and stage-9 cross-stage read see it normally.
The orchestrator still registers it centrally: `stage-manifest.js` requiredAction, `achievements.js`
mapping, `stages/stage9/crossstage.js` identity key (+ its confront.test fixtures), and a `save.js`
v6→v7 migration mapping the old `7.exif_contradiction_found` action + achievement to the new ids.

## Case logic recap (for verifying the fixtures)

- **Case 2 (The Second Claim), impostor = K (Mr. Peverell):** he claims a *still-in-service* estate-agent
  engagement; `household_register.csv` shows the estate-agent post was **given up last spring** and is
  vacant. Red herring **H (Mrs. Trevisick)**: her "great-aunt by marriage" kinship looks irregular but
  `estate_rules.txt` recognises kinship by marriage.
- **Case 3 (The Distant Relations), impostor = N (Mr. Sennett):** he claims a *honoured* annuity under
  **Voucher 214**; the ledger search proves it **VOID**. Red herrings **Q (Miss Blakeney)** — "natural
  daughter" cleared by `inheritance_customs.txt`; **P (Mr. Iveson)** — "principal legatee" cleared by the
  codicil in `solicitor_memo.txt`.
- **Boss:** the `alibi_statement.txt` swears Miss Marchmain sailed from Harwick on the 12th and was at
  sea; her own `torn_letter.txt`, postmarked **HARWICK the 14th**, proves she never sailed. Pin both,
  connect them → contradiction.
