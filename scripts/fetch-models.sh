#!/usr/bin/env bash
# Dev convenience: download model weights into models-cache/ (gitignored) and,
# optionally, copy them into the booted iOS Simulator app container so the app
# skips the in-app download. Weights are never committed to git.
# Usage: scripts/fetch-models.sh [--sim] [--270m]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="$ROOT/models-cache"
mkdir -p "$CACHE"

NAME=gemma-3-1b-it-Q4_0.gguf
URL=https://huggingface.co/unsloth/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_0.gguf
BYTES=721918496
SIM=0
for a in "$@"; do
  case "$a" in
    --sim) SIM=1 ;;
    --270m)
      NAME=gemma-3-270m-it-Q8_0.gguf
      URL=https://huggingface.co/unsloth/gemma-3-270m-it-GGUF/resolve/main/gemma-3-270m-it-Q8_0.gguf
      BYTES=291546144 ;;
  esac
done

if [ "$(stat -f%z "$CACHE/$NAME" 2>/dev/null || echo 0)" != "$BYTES" ]; then
  echo "Downloading $NAME ($((BYTES / 1000000)) MB)..."
  curl -L --fail -C - -o "$CACHE/$NAME" "$URL"
fi
SIZE=$(stat -f%z "$CACHE/$NAME")
[ "$SIZE" = "$BYTES" ] || { echo "Size mismatch: $SIZE != $BYTES"; exit 1; }
echo "OK $CACHE/$NAME ($SIZE bytes)"

if [ "$SIM" = 1 ]; then
  DATA=$(xcrun simctl get_app_container booted com.hf26.trailnotebook data)
  mkdir -p "$DATA/Documents/models"
  cp "$CACHE/$NAME" "$DATA/Documents/models/$NAME"
  echo "Copied into simulator: $DATA/Documents/models/$NAME"
fi
