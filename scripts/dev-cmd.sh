#!/usr/bin/env bash
# Dev-only: send a command to the running dev build (see src/services/devCommands.ts).
# iOS Simulator by default; Android when ANDROID_SERIAL is set.
# Usage: scripts/dev-cmd.sh '{"action":"navigate","href":"/journal?diag=1"}'
set -euo pipefail
TMP=$(mktemp)
printf '%s' "$1" > "$TMP"
"$(dirname "$0")/dev-push.sh" "$TMP" dev-command.json
rm -f "$TMP"
echo "sent: $1"
