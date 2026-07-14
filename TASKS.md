# File Viewer — Open Work

This is the single source of truth for unfinished repository work. Completed entries are removed so this file stays limited to work that still needs attention; code, tests, and Git history remain the authoritative implementation evidence. Technical specifications and user-facing documentation may remain, but they must point here instead of carrying a second unfinished backlog.

## Working contract

- Preserve the static, client-only architecture, sandboxed previews, sanitization boundaries, and zero off-origin default.
- Runtime dependencies stay vendored. Internet-backed actions require an explicit user gesture, a clear disclosure, and graceful offline handling.
- Keep secret/private-key/JWT protections, exact-target Companion writes/deletes, watched-root validation, and safe archive handling intact.
- Keep modules focused and below the repository LOC limits. Regenerate committed bundles and the offline asset manifest after relevant source or asset changes.
- Run focused tests while iterating and ./scripts/check.sh --fast before handoff. Use the release gate before a tag and the memory-capped exhaustive sweep only when explicitly needed.
- Keep every indexed sample in the exhaustive examples-catalog automation. Reduce parser failures to focused fixtures before fixing the parser.

## Open work

No open implementation items.

## Tracker hygiene

- Add new unfinished work only here.
- Remove completed entries in the same change that finishes them.
- Keep implementation details near the code or in durable technical specifications; do not create another roadmap, tasklist, tracker, goal, or build-log Markdown file.
