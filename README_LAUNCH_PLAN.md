# File Viewer v0.1.0 Public Beta Launch Plan

## Goal

Prepare the repository and optional Companion for a credible `v0.1.0` public beta: replace the
stale README with accurate launch documentation, align the visible product status, add real
desktop/mobile screenshots, and create a local build-only Companion release packager. Hidden
Bit Foundry/metagame work remains outside the public release contract.

## Requirements

- Position File Viewer as a private, browser-based file workbench in public beta.
- Use stable `140+ base types` language and curated format groups.
- Describe default, script-enabled HTML, and Companion network modes separately.
- Disclose external document resources and block remote Markdown images by default.
- Publish Windows desktop/server and Linux AppImage/deb Companion artifacts with checksums and
  third-party notices; do not commit binaries.
- Keep publishing manual: enable Issues, create a local `v0.1.0` tag, build and smoke artifacts,
  push the tag, publish a GitHub prerelease, then push `dev`.

## Plan

1. Rewrite `README.md` as a user-first launch page with a compact developer guide.
2. Change the in-app status to `Public beta` and cover it in the core smoke suite.
3. Add a deterministic Playwright capture script and repository-only desktop/mobile screenshots.
4. Correct Companion security, deletion, unsigned-binary, and runtime-version documentation.
5. Add locked, exact annotated/unpushed-tag release packaging with the full repository gate,
   stable artifact names, SHA-256 verification, package validation, and license notices.
6. Replace Companion name-based process killing with an exclusive loopback listener claim.
7. Hash offline cache versions from asset bytes, including same-size content changes.
8. Regenerate committed runtime/cache artifacts and run focused plus full release validation.

## Validation

- README links, image paths, dimensions, sizes, and rendered presentation.
- Registry count and focused `core-ui`, `interactions`, and `examples-catalog` browser areas.
- Locked Rust tests, current-source Companion E2E, release-script syntax, and artifact validation.
- Adversarial remote-Markdown request coverage and same-size asset-hash regression coverage.
- `./scripts/check.sh --fast` while iterating and full `./scripts/check.sh` before tagging.
- Final `git status`/diff audit, including generated files and untracked assets.

## Risks

- Privacy overstatement: use mode-specific wording and code-backed claims.
- Unsigned binaries: explain warnings accurately; checksums cover integrity, not identity.
- Cross-built defects: smoke every released platform artifact before pushing the tag.
- Stale screenshots or links: generate deterministically and publish release assets before `dev`.

## Open Questions

None.
