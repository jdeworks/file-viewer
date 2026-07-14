# Example fixture policy

`index.json` is the shipped sample catalog and `compatibility.json` records the completed capability and fixture-quality audit for every registered type and enhanced known-file view. Matrix version 3 is generated from the live registries and catalog; every row is marked `auditStatus: "validated"` and must name at least one fixture that really selects that base or enhanced viewer.

Run `node scripts/audit-example-catalog.mjs` to verify catalog files, declared detector results, concrete enhanced-view IDs, and provenance triples. `--fix` normalizes legacy enhanced markers to the viewer the real detector selects. Run `node scripts/gen-example-compatibility.mjs` after registry or catalog changes, then `node tests/example-compatibility.test.mjs` to enforce the full matrix.

## Generating fixtures

Simple structured and text examples stay as reviewed source files. The project does not expose a sample-generator UI and does not maintain a generic local generator: such a generator would mostly reproduce short files that are easier to understand, review, and vary directly, while adding another user surface and schema to maintain.

Formats that require exact binary layout, checksums, media encoding, or container structure use narrow deterministic scripts named `scripts/gen-sample-*`. A generator should state how to run it, avoid network access, produce byte-for-byte stable output, and have a focused structural or renderer test. This keeps complicated fixture construction reproducible without turning generation into a product feature.

Repository-authored fixtures inherit the repository license and are identified by the absence of external `source` metadata. External or derived assets must carry all three catalog fields: `source`, `license`, and `attribution`. A partial provenance record is invalid.

License names in the catalog describe the terms checked at promotion time. Sources are pinned to a specific upstream file or release where possible; copyright notices required by permissive binary licenses are preserved in the corresponding `attribution` field. A source page without an explicit redistribution grant is not a license.

## Promoting external samples

Do not add an external download directly to `index.json`. FileExamples.com slugs in the compatibility matrix are discovery hints, not an approval or download mechanism. First verify that a candidate's license permits redistribution, record its origin and any derivation, inspect it for secrets or personal data, validate detection and rendering offline, and add focused coverage for the behavior it is meant to exercise. Unvetted downloads stay outside the shipped catalog.

Every indexed sample is exercised by the exhaustive examples-catalog lane. When a catalog sample exposes a parser failure, reduce that failure to the smallest representative focused fixture before changing the parser; keep the catalog file as end-to-end coverage when redistribution remains safe.

The catalog deliberately includes broad programming-language coverage, binary/container and 3D fixtures with structural tests, locally unlockable password-protected PDF, SQLCipher-v4 SQLite, and ZIP fixtures, three explicit malformed text/data fixtures, and a self-contained semantic HTML theme showcase exercised in light and dark mode. These are maintained as representative quality lanes; adding arbitrary volume is not a substitute for a focused detector/parser assertion.
