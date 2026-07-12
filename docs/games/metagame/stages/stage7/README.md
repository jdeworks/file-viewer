# Stage 7 — Identity Arbiter: "The Meridian Estate Affair"

**Genre:** detective / deduction. **Theme:** the master of Meridian House is dead, and several
claimants each swear they are the true heir. You are the arbiter — gather the evidence and decide
who is real. Your working currency is **leads**.

## How to play

Work through **seven substages**, each a different proof:

1. **Witness statements** — read the rival claimants' statements and flag the one line in each
   that contradicts something already established about the estate.
2. **Two statements** — Miss Vane and Miss Marchmain are tied on paper. Compare their sworn
   statements side by side and find the one detail that was altered (a benign clerk-difference is a
   decoy).
3. **Movements audit** — mark the one entry in Miss Marchmain's stated movements that could not
   have happened (she cannot be in two places at once).
4. **Paper trail** — open the **appointment record** her claim rests on; it was rescinded.
5. **The second claim** — a later set of claimants forges the estate rolls. Open the records,
   **pin** the evidence, and accuse the impostor with a full **triad** (claimant + claim + source
   fact). The decisive fact only exists once you **open the household register**.
6. **The distant relations** — a wider circle claims a share. Two oddities are innocent, cleared by
   different records; the real lie is exposed only by **searching the estate ledger** for the
   claimed voucher.
7. **The verdict** — name the true heir.

## Controls

- **Click** claimants and their statement lines; use the **flag / diff / mark** buttons.
- **Open (and, for the ledger, search) real files** in the viewer to mint evidence-board facts.
- **Pin** facts, assemble an **accusation triad**, then **name** the impostor / the heir.

## The verdict — the alibi that cannot hold

Miss Vane and Miss Marchmain stay tied on paper. The documents can't separate them — until two of
them are set against each other.

> **Un-cheat:** open Miss Marchmain's **alibi statement** and her **torn letter** in the viewer.
> The alibi swears she sailed from Harwick on the 12th and was at sea; her own letter, **postmarked
> Harwick the 14th**, proves she never left. **Pin both** documents to the board and **connect**
> them — the postmark breaks the alibi. She is eliminated; then commit to the true heir, Miss Vane.
>
> Merely pinning is not enough: only *connecting* the two documents fires the contradiction.

## Notes for maintainers

- The verdict un-cheat fires the action **`7.alibi_contradiction_pinned`** in-stage from the
  evidence-board connect handler (`boss.js → connectAlibiContradiction`). There is no image/EXIF
  mechanic any more.
- Case evidence files are authored in `research/case-fixtures/` and installed to the viewer example
  root by the orchestrator; see that folder's `README.md` for the install list and the central
  file→action wiring (including the ledger **SEARCH gate**: `estate_ledger.csv`, query
  `Voucher 214`, hit token `VOID`).
