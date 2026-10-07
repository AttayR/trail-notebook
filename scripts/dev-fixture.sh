#!/usr/bin/env bash
# Dev-only: fetch BirdNET-Analyzer's example soundscape (license not stated, so it
# stays in gitignored models-cache/ and is never committed), cut seconds 0-9
# (reference: Black-capped Chickadee 0.815 with the app's windowing), and push it
# to the app as Documents/dev-fixture.wav. Android when ANDROID_SERIAL is set.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="$ROOT/models-cache"
mkdir -p "$CACHE"
SRC="$CACHE/soundscape.wav"
OUT="$CACHE/fixture-9s.wav"
if [ ! -f "$SRC" ]; then
  curl -L --fail -o "$SRC" https://raw.githubusercontent.com/birdnet-team/BirdNET-Analyzer/main/birdnet_analyzer/example/soundscape.wav
fi
START="${FIXTURE_START:-0}"
python3 - "$SRC" "$OUT" "$START" <<'PY'
import sys, wave
src, out, start = sys.argv[1], sys.argv[2], int(sys.argv[3])
w = wave.open(src)
assert w.getframerate() == 48000 and w.getnchannels() == 1 and w.getsampwidth() == 2
w.setpos(start * 48000)
frames = w.readframes(9 * 48000)
o = wave.open(out, "wb"); o.setnchannels(1); o.setsampwidth(2); o.setframerate(48000); o.writeframes(frames); o.close()
print(f"wrote {out} ({len(frames)//2} samples from {start}s)")
PY
"$(dirname "$0")/dev-push.sh" "$OUT" dev-fixture.wav
echo "pushed dev-fixture.wav"
