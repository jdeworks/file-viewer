#!/usr/bin/env bash
set -euo pipefail

root="${1:-docs/examples}"
count=$(find "$root" -maxdepth 1 -type f | wc -l | tr -d ' ')

printf 'Found %s sample files in %s\n' "$count" "$root"
