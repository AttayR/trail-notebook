#!/usr/bin/env bash
# Dev-only: send a command to the running iOS Simulator dev build (see src/services/devCommands.ts).
# Usage: scripts/dev-cmd.sh '{"action":"navigate","href":"/journal?diag=1"}'
set -euo pipefail
BUNDLE_ID=com.hf26.trailnotebook
DATA=$(xcrun simctl get_app_container booted "$BUNDLE_ID" data)
mkdir -p "$DATA/Documents"
printf '%s' "$1" > "$DATA/Documents/dev-command.json.tmp"
mv "$DATA/Documents/dev-command.json.tmp" "$DATA/Documents/dev-command.json"
echo "sent: $1"
