#!/usr/bin/env bash
# Dev-only: screenshot the booted iOS Simulator into docs/screens/<name>.png
set -euo pipefail
OUT="$(cd "$(dirname "$0")/.." && pwd)/docs/screens/$1.png"
xcrun simctl io booted screenshot "$OUT" >/dev/null 2>&1
echo "$OUT"
