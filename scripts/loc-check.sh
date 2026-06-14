#!/usr/bin/env bash
# Lines-of-code housekeeping check. Surfaces source files that have grown large enough to be
# worth splitting — run before a commit so size creep is visible while it's still cheap to fix.
# Vendored libraries (docs/vendor/) are third-party and excluded.
#
#   ./scripts/loc-check.sh            # report only (never fails)
#   ./scripts/loc-check.sh --strict   # exit 1 if any file exceeds the HARD cap (CI-style gate)
#
# Thresholds: files over SOFT get a "consider splitting" note; files over HARD are flagged louder.
# These are deliberately advisory — splitting is a judgement call, not an automatic failure.
set -euo pipefail
cd "$(dirname "$0")/.."

SOFT=300
HARD=500
strict=0
[[ "${1:-}" == "--strict" ]] && strict=1

# Authored source only: docs/ JS+CSS minus vendor, plus the test/util scripts.
mapfile -t files < <(
  { find docs -type f \( -name '*.js' -o -name '*.css' -o -name '*.mjs' \) -not -path 'docs/vendor/*';
    find scripts tests -type f \( -name '*.sh' -o -name '*.mjs' -o -name '*.js' \) 2>/dev/null; } | sort -u
)

over_hard=0
printf '%s\n' "→ LOC housekeeping (soft=${SOFT}, hard=${HARD}, excludes vendor)…"
# Collect "lines path" for files over SOFT, sorted descending.
report=$(
  for f in "${files[@]}"; do
    n=$(wc -l < "$f")
    if (( n >= SOFT )); then printf '%6d  %s\n' "$n" "$f"; fi
  done | sort -rn
)

if [[ -z "$report" ]]; then
  echo "  ✓ no authored file exceeds ${SOFT} lines"
else
  while read -r n path; do
    if (( n >= HARD )); then echo "  ⚠ ${n}  ${path}   (over hard cap — split soon)"; over_hard=$((over_hard+1));
    else echo "  ·  ${n}  ${path}   (consider splitting)"; fi
  done <<< "$report"
fi

if (( strict == 1 && over_hard > 0 )); then
  echo "✗ ${over_hard} file(s) over the ${HARD}-line hard cap (--strict)"; exit 1
fi
echo "  (advisory — informational only)"
