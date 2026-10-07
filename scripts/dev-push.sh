#!/usr/bin/env bash
# Dev-only: copy a host file into the app's Documents dir on the current target.
# Target: iOS Simulator (default) or Android when ANDROID_SERIAL is set.
# Usage: scripts/dev-push.sh <host-file> <name-in-Documents>
set -euo pipefail
BUNDLE_ID=com.hf26.trailnotebook
SRC="$1"; NAME="$2"
if [ -n "${ANDROID_SERIAL:-}" ]; then
  adb -s "$ANDROID_SERIAL" push "$SRC" "/data/local/tmp/$NAME" >/dev/null 2>&1
  adb -s "$ANDROID_SERIAL" shell "run-as $BUNDLE_ID sh -c 'mkdir -p files && cp /data/local/tmp/$NAME files/$NAME.tmp && mv files/$NAME.tmp files/$NAME'"
  adb -s "$ANDROID_SERIAL" shell rm "/data/local/tmp/$NAME"
else
  DATA=$(xcrun simctl get_app_container booted "$BUNDLE_ID" data)
  mkdir -p "$DATA/Documents"
  cp "$SRC" "$DATA/Documents/$NAME.tmp"
  mv "$DATA/Documents/$NAME.tmp" "$DATA/Documents/$NAME"
fi
