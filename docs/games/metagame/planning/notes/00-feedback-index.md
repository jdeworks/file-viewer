# Bit Factory / Defragmenter Plan Feedback Index

Created as a working note set for reviewing the 10-stage metagame plan before continuing
implementation in `~/repos/file-viewer`.

## Note Files

- `01-overall-arc-feedback.md` - theme, player journey, scale, and the boss-lock philosophy.
- `02-stage-by-stage-feedback.md` - concise feedback on Stages 1-9.
- `03-stage-10-feedback.md` - focused critique of the uncertain final stage.
- `04-open-questions.md` - decisions to settle before writing more implementation docs/code.
- `05-stage-10-memory-assembly-design.md` - expanded Stage 10 proposal.
- `06-canonical-contracts.md` - what should be treated as canon before implementation specs.
- `07-implementation-spec-plan.md` - proposed spec package/work breakdown for multi-agent work.
- `08-uncertainties-to-resolve.md` - high-priority decisions to iron out next.

## Short Verdict

The strongest idea is not "10 different genres." The strongest idea is:

> The file viewer teaches itself to the player by turning real viewer capabilities into diegetic
> survival tools for a consciousness waking up inside the app.

That is excellent and worth protecting.

The large scale is intentional: this is a full hidden anthology/metagame inside the file viewer,
with a later crash-course/boss-only mode as a separate extension. The main risk is therefore not
"too big"; it is unclear contracts between stages, file-viewer actions, save state, and the
eventual multi-agent implementation.

The second danger is the boss-lock rule. "Unbeatable without the file viewer tool" gives every
stage a strong learning moment, but if the hinting is too cryptic it becomes hostile. The correct
version is not "the player must guess a hidden app feature." It is:

1. the boss proves normal play cannot solve this,
2. the boss and bell hint at a specific missing kind of information or action,
3. the file viewer tool provides that missing thing,
4. the unlock signal is unmistakable.

Stage 10 is close, but I would change its structure. The examples gallery should not merely unlock
dialogue. It should be the entity assembling its own history. The final "boss" should be choosing
what to do with that assembled history.
