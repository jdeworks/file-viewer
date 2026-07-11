# Format capture findings

- Technical passes: 45/45
- Hash-matched manual visual passes: 45/45
- Meaningful technical + visual passes: 45/45
- Distinct meaningful visual base types: 45/144
- Off-origin requests: 0
- Page/console errors: 0
- Manual visual reviews pending: 0

## Technical failures

- None.

## Manual visual failures

- None.

## Reviewed defects (including otherwise passing formats)

- 34-fits [pass]: The fixture contains a valid nonzero 16-bit image plane, but this renderer intentionally exposes only header metadata and does not render astronomy pixels.
- 40-dockerfile [pass]: The optional default Dockerfile overview still concatenates several labels and values, such as Stages2, Base imagenode:20-alpine, and maintainerdemo@example.com.
- 41-docker-compose [pass]: The optional default Compose overview still joins a few summary labels and values, notably Services4 and Compose version3.9.
- 12-layered [pass]: At 390 px, the 100 by 100 dimension/status readout is clipped where the fixed Layers pane begins, although the fit/zoom controls and composite remain usable.

## Programmatic visual-risk flags

- 25-font: 1 visible controls outside viewport
- 23-media: 11 visible controls outside viewport
- 41-docker-compose: 12 visible controls outside viewport

Programmatic flags are triage aids only. Manual verdicts are bound to every current screenshot SHA-256 in `format-manual-review.json`; a recapture invalidates stale judgments.
