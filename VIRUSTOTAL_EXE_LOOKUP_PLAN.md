# VirusTotal Lookup for Executable Previews

## Goal

Add an explicitly user-initiated VirusTotal report lookup to executable previews while preserving the viewer's zero-off-origin-request default and never uploading file contents.

## Requirements

- Compute and display a local SHA-256 for complete executable files.
- Link to `https://www.virustotal.com/gui/file/<sha256>/detection` only through a user-clicked external anchor.
- Explain that opening VirusTotal sends the hash, not the file contents, and that the free lookup is for non-commercial use.
- Keep the shared preview iframe sandbox and bridge unchanged.
- Never present a partial-file digest as the file's hash.
- Preserve static HTML for print and screenshot support.

## Assumptions

- This integration is intended for non-commercial use.
- Executables above the 64 MiB full-read ceiling do not receive a lookup in v1.
- Ordinary browser navigation metadata may accompany the SHA-256 when VirusTotal is opened.

## Plan

1. Make the EXE renderer asynchronous and compute a lowercase SHA-256 with WebCrypto for every complete intake, including malformed or too-small executable inputs. If hashing is unavailable, continue rendering and explain that SHA-256 is unavailable. If `intake.truncated` is true, do not hash the loaded prefix and explain that the complete file was not loaded.
2. Add the full digest, the documented VirusTotal report link, privacy disclosure, and non-commercial-use caveat. Build the functional external anchor with DOM APIs in a trusted parent-node view, use `target="_blank"` and `rel="noopener noreferrer"`, and continue returning static escaped `bodyHtml` for print, screenshots, and DOM-less tests.
3. Add matching wrapping, link, disclosure, truncated, and unavailable-state styles to both the parent-view and static-preview stylesheets. Do not modify the core iframe sandbox or navigation bridge.
4. Extend unit, browser-area, and renderer-visual coverage for the exact sample digest and URL, external-link attributes, no automatic off-origin request, parent-node mounting, malformed/small inputs, truncated input, hash failure, and long-hash layout.
5. Run focused tests and `./scripts/check.sh --fast`, regenerate the asset manifest through the normal workflow, and inspect the final diff to ensure unrelated dirty changes remain intact.

## Validation

- `node tests/metadata-owned.test.mjs`
- `node tests/smoke-area.mjs binary-types`
- `node tests/release-readiness-renderer-visuals.mjs`
- `./scripts/check.sh --fast`

## Risks

- Hashing a truncated intake would create a false file identity; truncated input is explicitly excluded.
- A normal iframe link cannot navigate under the current sandbox; only the trusted EXE summary moves to the established parent-node path.
- WebCrypto may be unavailable outside a secure browser context; parsing remains usable and the lookup is omitted.
- VirusTotal restricts its free search feature in commercial products/services; the UI states the non-commercial-use boundary.

## Open Questions

None.
