# Build log: Trail Notebook

Running log for the "How I Built It" section. Times are local (PKT). Newest entries at the bottom.

## Environment (2026-10-07)
- macOS (Darwin 27.0), Xcode 27.0 (27A266a), CocoaPods via Homebrew, JDK 17.0.19 (Temurin), Android SDK at `~/Library/Android/sdk`.
- Node 24.18.0, npm 11.16.0.
- Expo SDK 57 (`expo ~57.0.27`), React Native 0.86.3, React 19.2.3, TypeScript ~6.0.3.
- No physical test phone confirmed yet. Native verification is on the iOS Simulator (iPhone 17 / iOS 26.5) and/or Android emulator. Anything speed- or mic-related must be re-verified on a real device (list kept at the end of this file).

## T1 Project skeleton
- Added Expo Router (`expo-router ~57.0.25`) with `main: expo-router/entry`, routes in `src/app/` (`_layout`, `index` = Listen, `journal`, `setup`). Removed `App.tsx` / `index.ts`.
- Folder layout from architecture section 5. `src/config.ts` holds the model manifest. Exact Gemma byte size taken from the Hugging Face `x-linked-size` header: `gemma-3-1b-it-Q4_0.gguf` = 721,918,496 bytes. Also added Gemma 3 270M Q8_0 (291,546,144 bytes) as a switchable variant via `EXPO_PUBLIC_LLM_VARIANT=270m`.
- Problem: `npx expo install jest-expo jest @types/jest -- --save-dev` failed with npm ERESOLVE. A peer-optional `react-dom` resolved to 19.3.0, which wants react 19.3 while SDK 57 pins react 19.2.3. Fix: `npx expo install react-dom` (pins 19.2.3), then the dev-deps install succeeded.
- Problem: TypeScript 6 no longer auto-includes every `@types/*` package, so `describe`/`it` were unknown in tests. Fix: `"types": ["jest"]` in `tsconfig.json`.
- npm 11 now blocks package install scripts by default ("allow-scripts"). Harmless so far (fsevents, unrs-resolver); watch for native packages that rely on postinstall.
- ESLint set up by `expo lint` (`eslint-config-expo` flat config).
- Verified: `tsc --noEmit` clean, `jest` 3/3, `expo lint` clean, `expo export --platform ios` bundles (7 s). Navigation verified on the simulator in T2.

## T2 Native modules + first dev build (iOS Simulator)
Versions installed 2026-10-07:
- `llama.rn` 0.12.9 (pinned exact; npm `latest` tag currently points at 0.13.0-rc.7, so a plain `npm install llama.rn` would have pulled the release candidate). llama.cpp build 10256.
- `react-native-fast-tflite` 3.0.1 + `react-native-nitro-modules` 0.37.1
- `react-native-audio-api` 0.13.6 (needs `react-native-worklets`; SDK 57 pins 0.10.1)
- `expo-sqlite` 57.0.4 (SQLite 3.50.3), `expo-file-system` 57.0.7, `expo-location` 57.0.20, `expo-build-properties` 57.0.22
- `react-native-reanimated` pinned to 4.5.1 via `npx expo install`

Problems and fixes:
- npm ERESOLVE again: npm auto-installed `react-native-reanimated@4.7.1` (a required peer of expo-router's drawer dependency), which wants worklets 0.13, while SDK 57 pins worklets 0.10. Fix: `npx expo install react-native-reanimated` (4.5.1).
- llama.rn downloads its prebuilt `rnllama.xcframework` and Android `jniLibs` in `postinstall`. npm 11 blocks install scripts by default, so run `node ./node_modules/llama.rn/install/download-native-artifacts.js` after install (documented in README). The xcframework includes an `ios-arm64_x86_64-simulator` slice, so the simulator build links.
- llama.rn config plugin: `enableOpenCL` is deprecated, use `enableOpenCLAndHexagon`.
- `pod install` crashed with `Unicode Normalization not appropriate for ASCII-8BIT` (CocoaPods 1.17 on Ruby 4.0). Fix: run with `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`.
- `react-native-audio-api` plugin defaults turn on iOS background audio and an Android foreground service. Turned both off for now (walk mode N3 can enable them later) and set `disableFFmpeg: true` because we only record PCM and do not decode files.

Timings: `pod install` 4 min 08 s (first run). `expo run:ios` clean build 3 min 45 s on this Mac. 0 errors, 1 warning (script sandboxing in RNAudioAPI).

Verification (iOS Simulator, iPhone 17 / iOS 26.5): the app launches and redirects to Setup. Diagnostics loads each native module and calls one function:
- OK llama.rn: build 10256, backend devices MTL0, BLAS, CPU
- OK react-native-fast-tflite: `loadTensorflowModel` available (no model loaded yet; that is T9)
- OK react-native-audio-api: `AudioRecorder` constructed
- OK expo-sqlite: in-memory DB, `sqlite_version()` = 3.50.3
- OK expo-file-system: documents dir resolved, ~113 GB free (host disk)
- expo-location: `getForegroundPermissionsAsync` timed out (>8 s) on the first two calls after a simulator boot, then returned `undetermined` on the third. All location calls in the app need a timeout (T7 uses 5 s).
Screens: `docs/screens/t2-first-launch.png`, `docs/screens/t2-native-modules.png` (that capture shows a location timeout; a later run logged OK).

Simulator automation problem: the simulator runs headless here (no Simulator.app GUI, no idb/cliclick), and every `simctl openurl` for a custom scheme triggers an "Open in Trail Notebook?" system dialog that cannot be dismissed from the CLI. Fix: a `__DEV__`-only command channel (`src/services/devCommands.ts`). `scripts/dev-cmd.sh '<json>'` writes `dev-command.json` into the app's Documents dir through `xcrun simctl get_app_container`, and the app polls for it every second (navigate, start download, test Gemma, manual note, delete models). It is inert in release builds. `scripts/sim-shot.sh <name>` saves screenshots to `docs/screens/`. `xcrun simctl launch` reconnects the dev client to Metro with no dialog.

Android: not built yet (the emulator path is still open; iOS simulator was enough to clear the T2 native risk).

## T3 Core part 1
- `src/core/`: `types.ts`, `context/time.ts` (part of day, hemisphere-aware season, clock), `birdnet/confidence.ts` (0.8 / 0.5 / 0.15 thresholds as words), `llm/prompt.ts`, `llm/parse.ts`, `llm/template.ts`, `util/id.ts`. Pure TypeScript, no RN imports.
- Decision: confidence thresholds live in core (not `config.ts`) so core stays dependency-free.
- The manual input is sanitised before it enters the prompt: newlines collapsed, double quotes swapped for single quotes, capped at 200 chars. This keeps the facts block well-formed.
- 40 tests passed on the first run.

## T4 Model downloader + Setup
- SDK 57 `expo-file-system` (new object API): `File.downloadFileAsync(url, destFile, { idempotent, onProgress, signal })` downloads to a temp file and moves it into place only on success. `File.createDownloadTask` (pause/resume) also exists; not needed yet.
- Integrity check: exact byte size from the manifest, plus a free-space check (needs 1.1x the model size).
- Problem: the first in-app download was silently aborted. Fast Refresh remounted the Setup screen, and the hook's unmount cleanup called `abort()`. A real user navigating away would hit the same bug. Fix: `services/models/downloadManager.ts` holds module-level download state; screens subscribe with `useSyncExternalStore`, and nothing aborts on unmount.
- Verified on the simulator:
  - Progress bar while downloading (`docs/screens/t4-setup-downloading.png`).
  - Full in-app download of `gemma-3-1b-it-Q4_0.gguf`: 721,918,496 bytes in **362.6 s** (about 2 MB/s on this connection). The SHA-256 of the downloaded file is `27ee88e0...b0276e`, which matches the Hugging Face `x-linked-etag`.
  - Setup routes to Listen on completion (`t4-after-download-listen.png`). Kill and relaunch goes straight to Listen (`t4-relaunch-skips-setup.png`). Moving the file away and relaunching returns to Setup (`t4-missing-file-back-to-setup.png`).
- `scripts/fetch-models.sh [--sim] [--270m]` downloads to `models-cache/` (gitignored) and can copy into the simulator container. The README documents the download steps and licenses.

## T5 Gemma service
- `services/llm/gemmaWriter.ts` implements the `NoteWriter` interface over llama.rn: background `initLlama` (n_ctx 1024, `n_gpu_layers` 99 on iOS with an automatic CPU retry if GPU init fails), streamed completion, abort via `stopCompletion`, and metrics for `llm_load`, `llm_ttft` and `llm_gen` (tokens, tok/s, prompt tokens). `services/llm/writeNote.ts` adds the 30 s soft timeout: the template note is shown and saved, and Gemma's text replaces it if Gemma finishes.
- The metric sink writes to the SQLite `metrics` table and prints `[metric]` console lines.
- Simulator numbers (iPhone 17 sim on an Apple-silicon Mac; NOT representative of a phone): model load 371-408 ms with `gpu: true` (Metal works in this simulator, contrary to the research note). Prompt eval about 55 tok/s (142-token prompt: TTFT 2.6 s). Decode 39-45 tok/s. A 20-36 token note takes 2-3.5 s. A repeat prompt hits llama.rn's prompt cache (TTFT 35 ms).
- **Problem: first real output ignored the format.** Gemma 3 1B echoed the instruction ("NOTE: one or two sentences.") and put the nudge in an unlabeled last paragraph. Fixes:
  1. Apply the Gemma chat template by hand (`core/llm/gemmaFormat.ts`) and **prefill the model turn with `NOTE:`**, using llama.rn `prompt` instead of `messages`.
  2. Rewrite the instruction placeholders in parentheses.
  3. The parser strips echoed instruction text and treats a trailing paragraph as NEXT when the label is missing. A regression test uses the real output.
  After the fix, 3 of 3 runs returned clean `NOTE:` / `NEXT:` lines (`docs/screens/t5-test-gemma.png`). Example: "NOTE: A small brown bird was observed hopping beneath the hedge. / NEXT: Listen for a short rising whistle." The notes are short and somewhat literal. Prompt wording is worth iterating for the write-up (writing quality matters).
- Airplane mode: the simulator shares the Mac's network and cannot toggle airplane mode. Inference never touches the network (the model loads from a local `file://`), but the airplane-mode proof must be done on a real phone.

## T6 SQLite + Journal
- `services/db/schema.ts`: lazy singleton `openDatabaseAsync('trail.db')`, `PRAGMA foreign_keys = ON`, WAL, and `PRAGMA user_version` migrations (v1 = entries, detections, metrics + indexes from architecture 4.1). `services/db/entries.ts`: insert (transaction incl. detections), update note, list newest first with detections joined, and `speciesSince` for the "already logged today" prompt line.
- Row-to-domain mapping is pure (`core/db/rows.ts`), with unit tests, as is coordinate rounding (2 decimals).
- Journal: rows grouped as time + spot + title (top species or manual text), tap to expand (detections with raw scores, note, Next, source tag, rounded coordinates, mode). The Diagnostics panel and license notice sit at the bottom.
- Verified on the simulator: seeded 4 entries via the dev channel (`t6-journal-seeded.png`), force-quit, relaunched. The 4 entries are still listed newest first, and the first expands to show the note and Next (`t6-journal-after-restart-expanded.png`). Host-side `sqlite3` check: 4 entries, 4 detections.

## T7 Manual observation flow (demo floor)
- Listen screen: `StatusChip` (Gemma idle / warming up / Ready / unavailable), a disabled `ListenButton` placeholder until BirdNET lands (caption explains), `ManualInput` open by default while listen mode is unavailable, `SpotNameField` (remembers the last value in kv), and a `ResultCard` with a streaming `NoteText`.
- `hooks/useManualNote.ts`: sanitise the input, then fetch coarse location (5 s bound, rounded to 2 decimals) and "already logged today" in parallel, then build the manual prompt, then run Gemma with the soft timeout. The entry is auto-saved; saves are serialised so a late Gemma update never runs before the template insert.
- `services/location.ts`: every location call is time-bounded (the T2 lesson). The last known position is preferred over a fresh fix.
- Simulator setup for this test: `xcrun simctl privacy booted grant location com.hf26.trailnotebook` and `xcrun simctl location booted set 31.5204,74.3587` (the permission alert cannot be tapped headless).
- Verified (iPhone 17 simulator):
  1. Normal: "three crows chasing a hawk over the canal, loud harsh calls" at Canal bank. Gemma note plus Next in **3.1 s** end to end, `note_source=gemma`, lat/lon stored as 31.52 / 74.36 (`t7-manual-streaming.png`, `t7-manual-result.png`).
  2. Soft timeout forced to 300 ms: the template note appears and is saved first ("Saved a quick note; Gemma is still writing..."). Gemma finishes at 2.0 s and the row is updated to `note_source=gemma` (`t7-timeout-template-first.png`, `t7-timeout-gemma-replaced.png`).
  3. Forced Gemma failure: the template note is saved with `note_source=template` in 40 ms (`t7-forced-template.png`).
  4. Force-quit and relaunch: all three entries are in Journal, newest first, with correct sources (`t7-journal-after-restart.png`).
- Not verified here: airplane mode (simulator limitation, see T5). Real-phone timing.
- Observed note quality (for the write-up): "Three crows are actively pursuing a hawk over the canal." / Next: "Listen for the hawk's calls." It is correct but plain. Prompt tuning for a warmer field-journal voice is a good follow-up.

## Must re-verify on a real device
- Airplane-mode run of the whole manual flow (offline proof for the post).
- Gemma load time, TTFT and tok/s on the phone (simulator numbers come from the Mac's GPU and are not representative). Check `n_gpu_layers` on Android (CPU first).
- Peak RAM with Gemma loaded (Xcode memory gauge / `dumpsys meminfo`).
- In-app 722 MB download over phone Wi-Fi (iOS uses a background URLSession by default; check that backgrounding the app does not break it).
- Location permission prompt flow (pre-granted on the simulator).
- Mic capture sample rate and level (T10). The simulator mic is the Mac's input and says nothing about a phone mic.
- Android build has not been run at all yet.

## T8 Core part 2 (Friday task, done Wednesday night)
- `core/audio/resample.ts` (linear, plus `clampUnit`), `accumulator.ts` (fixed capacity, drops overflow, progress), `windows.ts` (144k windows with a 72k hop; a short buffer is zero-padded to one window), `level.ts` (RMS and a dB-scaled 0..1 meter), `wav.ts` (PCM 16/24/32 and float32, WAVE_FORMAT_EXTENSIBLE, stereo downmix). `core/birdnet/labels.ts` ("Sci_Common" lines, 6,522 count check) and `scores.ts` (sigmoid with sensitivity, max over windows, top-k with the 0.15 floor, ranked detections, "confident" at 0.5 or above).
- All architecture-listed core tests pass: 68 in total. The resample test (44.1 kHz 1 kHz sine to 48 kHz) keeps the zero-crossing count within 1%.
- **Fixture WAV not added yet.** Wikimedia Commons was unreachable from this machine (HTTP 000), and the xeno-canto v2 API is gone (404; v3 needs an API key, which the user would have to create). Candidate for T9: BirdNET-Analyzer's own `birdnet_analyzer/example/soundscape.wav` (11.5 MB, reachable on GitHub). It is ideal for validation because the Analyzer's documented output gives the expected species. Its audio license is not stated, so it will be fetched by script into `models-cache/` and **not committed**. A short CC0/CC BY clip for the repo still needs a source the user can confirm.
