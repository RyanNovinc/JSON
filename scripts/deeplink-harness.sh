#!/usr/bin/env bash
#
# JSON.fit deep-link test harness (Android emulator / device).
#
# Fires the file-open import, share, and curated-program routes at the installed
# app so the import + cancel paths can be walked by hand. It uses the app's own
# `json-app://` scheme, which toCanonicalUrl (src/navigation/AppNavigator.tsx)
# rewrites to the internal `https://json.fit/import-file?...` route — the exact
# path a real share-sheet / Open-with delivery takes, but with a caller-chosen
# receivedAt nonce.
#
# Requires: adb on PATH, an emulator/device booted, the app installed.
#
# Usage:
#   scripts/deeplink-harness.sh setup            # (re)create the readable fixture
#   scripts/deeplink-harness.sh file [nonce]     # fire a file-open import
#   scripts/deeplink-harness.sh share <shareId>  # fire a p/<id> share link
#   scripts/deeplink-harness.sh curated <slug>   # fire a p/program/<slug> link
#
# Walking the file-open cancel path (the twice-in-a-row test):
#   scripts/deeplink-harness.sh setup
#   scripts/deeplink-harness.sh file            # modal appears -> cancel it
#   scripts/deeplink-harness.sh file            # NEW nonce -> modal appears again
# A fresh receivedAt is necessary AND sufficient to re-admit the same file; the
# only other requirement is that no confirmation modal is already up (the
# !parsedProgram guard ignores a fire while one is showing) — so cancel between fires.
#
set -euo pipefail

PKG=com.RyanNovinc.JSON
# The app's OWN external files dir: readable by the app with no runtime permission.
DIR=/sdcard/Android/data/$PKG/files
# fileUri, percent-encoded ONCE. React Navigation decodes query params exactly
# once, which undoes this single encode and hands the screen the raw file:// URI.
ENC="file%3A%2F%2F%2Fsdcard%2FAndroid%2Fdata%2Fcom.RyanNovinc.JSON%2Ffiles%2Fvalid.json"

# Unique millisecond nonce. macOS `date` has no %N, so `date +%s000` only has
# second precision and two quick fires would collide (identical deliveryKey ->
# the second is a silent no-op). Use real milliseconds instead.
ms () { python3 -c 'import time; print(int(time.time()*1000))'; }

# (Re)create the fixture. An uninstall wipes the app's external dir, so run this
# after every reinstall. This JSON is the minimal shape that passes validation and
# reaches the "Workout Ready" confirmation modal: routine_name + numeric
# days_per_week (>=1) + non-empty blocks[].days[]; a day_name containing "REST"
# lets exercises be empty.
put_fixture () {
  adb shell mkdir -p "$DIR"
  local tmp; tmp="$(mktemp -t jsonfit-valid.XXXXXX.json)"
  cat > "$tmp" <<'JSON'
{
  "routine_name": "Latch Test Program",
  "days_per_week": 1,
  "blocks": [
    { "block_name": "Block 1", "weeks": "1",
      "days": [ { "day_name": "REST DAY", "exercises": [] } ] }
  ]
}
JSON
  adb push "$tmp" "$DIR/valid.json"
  rm -f "$tmp"
}

fire_file () {
  local ts="${1:-$(ms)}"
  echo ">> file-open  nonce=$ts"
  # GOTCHA — the inner single quotes around the URL are load-bearing. Without them
  # the unescaped `&` before receivedAt backgrounds the command in the *device*
  # shell, and the nonce is silently dropped. A dropped nonce looks IDENTICAL to
  # the delivery latch having wedged (second open does nothing), so keep the quotes.
  adb shell "am start -a android.intent.action.VIEW -c android.intent.category.BROWSABLE \
    -d 'json-app://import-file?fileUri=$ENC&receivedAt=$ts'"
}

fire_share () {
  echo ">> share p/$1"
  adb shell "am start -a android.intent.action.VIEW -c android.intent.category.BROWSABLE \
    -d 'json-app://p/$1'"
}

fire_curated () {
  echo ">> curated p/program/$1"
  adb shell "am start -a android.intent.action.VIEW -c android.intent.category.BROWSABLE \
    -d 'json-app://p/program/$1'"
}

case "${1:-}" in
  setup)   put_fixture ;;
  file)    fire_file "${2:-}" ;;
  share)   fire_share "${2:?usage: $0 share <shareId>}" ;;
  curated) fire_curated "${2:?usage: $0 curated <slug>}" ;;
  *) echo "usage: $0 {setup | file [nonce] | share <id> | curated <slug>}"; exit 1 ;;
esac
