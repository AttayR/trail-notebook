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

## T10 Mic capture (Friday task, done Wednesday night)
- `services/audio/recorder.ts`: check/request mic permission (`AudioManager`), iOS session `record` + **`measurement` mode** (turns off voice processing and automatic gain, so BirdNET hears raw ambience rather than a voice-optimised signal). `onAudioReady` asks for 48 kHz mono in 100 ms buffers. The accumulator is sized from the sample rate the device actually reports on the first buffer, and the result is resampled to 48 kHz only when needed, then clamped to [-1, 1]. There is an RMS level per chunk, a safety timeout (capture + 5 s), and cleanup always stops the recorder and deactivates the session.
- Diagnostics "Test mic (9 s)" button plus a `testMic` dev command.
- Simulator: `xcrun simctl privacy booted grant microphone com.hf26.trailnotebook` (note: granting a privacy permission kills the running app).
- Verified on the iPhone 17 simulator (the input is the Mac's microphone): **432,000 samples at 48 kHz, device delivered 48,000 Hz natively** (no resampling), 90 chunks of 4,800 frames, peak level 0.59, non-zero signal (`docs/screens/t10-mic-result.png`).
- Observation: the call took 12.5 s for a 9 s capture, so about 3.5 s goes to permission check, session activation and recorder start on the simulator. Measure this on a phone. If it is similar, pre-activate the audio session when Listen mounts so the countdown starts immediately.
- Must re-check on a real phone: delivered sample rate (many Android devices give 44.1 or 48 kHz), level with the phone held up outdoors, and the start-up latency above.

---
# Thursday 2026-10-08 (continued overnight)

## Primary test device: Samsung Galaxy S23 Ultra (flagship)
`adb -s R5CW902N0BB`: `ro.product.model=SM-S918B`, Android 16 (SDK 36), SoC `SM8550` (Snapdragon 8 Gen 2), arm64-v8a, MemTotal 11,309,736 kB (expo-device reports 10.8 GB), 226 GB free. **This is a flagship. Every phone number below is labelled "S23 Ultra (flagship)" and must not be presented as mid-range performance.** Only our package (`com.hf26.trailnotebook`) was installed or touched.

## T9 BirdNET spike: PASS on react-native-fast-tflite (no ONNX fallback needed, about 40 min)
- **Model source:** `BirdNET_GLOBAL_6K_V2.4_Model_FP16.tflite` from the whoBIRD-TFlite GitHub mirror, **25,932,528 bytes**. Its SHA-256 `5c64ba3f...546b` is **identical** to `audio-model-fp16.tflite` inside the official Zenodo `BirdNET_v2.4_tflite_fp16.zip` (doi:10.5281/zenodo.15050749). The mirror is used only because it serves the file unzipped.
- **Labels:** the HF mirror `tphakala/BirdNET-v2.4/labels.txt` (259,894 bytes) is byte-identical to Zenodo `labels/en_uk.txt`, with 6,522 lines. whoBIRD's own `labels_en.txt` differs from Zenodo in one line (3214), so I did not use it.
- **License note:** Zenodo's API reports `cc-by-nc-4.0`; the GitHub, HF and whoBIRD pages say CC BY-NC-SA 4.0. We follow the stricter NC-SA.
- **Test clip:** BirdNET-Analyzer's `example/soundscape.wav` (120 s, 48 kHz mono int16; license not stated, so it is fetched by `scripts/dev-fixture.sh` into gitignored `models-cache/` and never committed). Seconds 0-9 are the fixture.
- **Ground truth:** a Python reference with `ai-edge-litert` (LiteRT) on the host, using the same windowing (5 x 3 s, 1.5 s hop, max of sigmoid): **Black-capped Chickadee 0.815**, Tufted Titmouse 0.247, American Tree Sparrow 0.234. The 120 s non-overlapping pass found Black-capped Chickadee, House Finch and Dark-eyed Junco, which match the Analyzer's documented example species. Host CPU: 29 ms per window.
- **Tensors via fast-tflite:** input `1x144000 float32`, output `1x6522`. Loaded from `file://` with the CPU delegate.
- **BUG found and fixed:** the first in-app result was "Tufted Titmouse 0.187", which did not match the reference. Per-window argmax logging showed the logits were **identical to Python** (window 0 argmax 4771 = chickadee, logit 1.482). The bug was ours: `react-native-fast-tflite` is zero-copy and **reuses its output ArrayBuffer on every `run()`**, so `new Float32Array(out)` (a view) for each window ended up pointing at the last window's scores. Fix: `new Float32Array(out.slice(0))`. After the fix the app reproduces the reference exactly (0.815 / 0.247 / 0.234) on iOS and Android.
- **Latency:**
  - iOS Simulator (Mac): load 70 ms, 5 windows 158-212 ms (about 30 ms per window).
  - **S23 Ultra (flagship):** load 102-141 ms (median 122 ms), **53 ms median per 3 s window** (p90 60 ms, n=40), 5 windows in 268-296 ms.

## T11 Listen flow end to end
- `hooks/useObservation.ts` replaces `useManualNote`: one state machine for manual and listen. Listen runs capture (mic, or `__DEV__` fixture via `{"action":"listen","source":"fixture"}`), then haptic, then BirdNET, then top-3 detections. If the top score is below 0.5 it shows the "Nothing clear" card with the faint guesses and a "Tell it instead" link, and saves nothing. Otherwise it runs Gemma with the detections prompt and "already logged today", then saves the entry with its detections. Location and network state are looked up while listening.
- `ListenButton` now shows the countdown seconds, with the mic level as ring thickness, plus a progress bar.
- Offline stamp (architecture N2, pulled forward because it proves the offline claim): `expo-network` state is saved per entry and shown as "offline" in the card and Journal.
- New native modules (rebuilt both platforms): expo-haptics, expo-battery, expo-clipboard, expo-device, expo-network (all `~57.0.x`).
- **Bug (S23 Ultra):** the first real mic tap hung forever at 0%. On Android, `AudioManager.requestRecordingPermissions()` never resolved after the user tapped Allow (the permission shows `granted=true, USER_SET`), and `setAudioSessionActivity` is iOS-only anyway. Fix: the permission request is bounded at 20 s and re-checked afterwards; session calls are iOS-only and bounded at 3 s.
- Note: several mic runs in the logs were started by a person tapping Listen on the phone, not by the app. Logcat attribution confirmed nothing fires on its own.
- **Mic on S23 Ultra (flagship):** delivers **48,000 Hz natively** (no resampling), 90 x 4,800-frame buffers, 432,000 samples, peak level 0.63 indoors. 9 s capture in 9,179 ms, so about 180 ms start-up (the iOS simulator needed about 3.5 s).
- Verified: iOS Simulator fixture run gives chickadee card + Gemma note + saved (`docs/screens/t11-ios-listen-fixture-result.png`). S23 Ultra fixture runs give the same species and a Gemma note in 0.9-2.3 s after classification (`docs/screens/android/a4-listen-fixture-result.png`).
- Not yet done: a real bird through the phone mic outdoors (field test).

## T12 Metrics capture + export
- `core/metrics/summary.ts` (pure, tested) aggregates per kind (count, min, median, p90, max, mean), plus tok/s, prompt ms, per-window BirdNET ms, and classify/note ms from extras. `services/metricsExport.ts` builds the JSON: device (expo-device), model files with on-disk bytes, summary and raw rows. It is copied to the clipboard (expo-clipboard) and written to `Documents/metrics-export.json`, so a dev machine can pull it with `adb exec-out run-as ... cat files/metrics-export.json`. Battery level (expo-battery) is recorded at app start and on Journal open. The Diagnostics `MetricsPanel` shows the key numbers and a "Copy metrics JSON" button.
- First export from the S23 Ultra: `docs/metrics/s23ultra-dev-2026-10-08.json` (debug build, phone on USB power). **S23 Ultra (flagship) numbers:**
  - In-app download over home Wi-Fi: labels 1.3 s, BirdNET 12.8 s, Gemma **324.8 s** (722 MB, about 2.2 MB/s).
  - Gemma load 760-2,171 ms (median 896 ms; the first cold load was 2.17 s). `gpu: true` was reported even with `n_gpu_layers 0` on Android; check whether OpenCL is engaged.
  - Gemma prompt eval: 185-313 tokens in 0.8-1.4 s. TTFT median 827 ms (46 ms on a prompt-cache hit). **Decode 39.2 tok/s median** (36.5-43.8). Note generation 0.5-2.7 s.
  - BirdNET as above. Tap-to-species after capture: **282 ms median**.
  - Battery is not meaningful yet (it rose 60 to 68% while charging over USB). Needs an unplugged field session.

## Prompt tuning (Gemma 3 1B Q4_0)
Method: a scratch "prompt lab" bundles the real `src/core` prompt builders with esbuild and runs them through host llama.cpp (`brew install llama.cpp`, 0.6.0) with the same GGUF and the app's sampling (temp 0.4, top_p 0.9, n_predict 120, `NOTE:` prefill). There are 6 fixed cases (3 manual, 3 listen with the fixture's real detections), 4-8 seeds each, scored automatically: format OK, instruction echo, example copied, species named (listen cases), and invented setting words (oak, tree, nest, feather, soil, leaves, weather...).

| Variant | Samples | Format OK | Species named | Invented setting | Example copied |
|---|---|---|---|---|---|
| v0 (original prompt) | 24 | 17 | 12/12 | **11** | 0 |
| v1 vivid "one concrete detail" + example | 12 (eyeballed) | 12 | 6/6 | ~6 (oak tree, branch, nesting, feather) | 0 |
| v2 grounding rules + facts-to-output example | 24 | 23 | 11/12 | 1 | 0 |
| v5/v6 grounding, no example | 24 each | 24 | 3-4/12 | 0 | 0 |
| v2 + listen prefill `NOTE: <top species>` | 48 | 48 | 24/24 | 0 | 1 |
| **v9 shipped** = v2, place removed from example + species prefill | 48 | **48** | **24/24** | **1** | **0** |

Before (v0), same 3 listen cases:
- "The Black-capped Chickadee was identified as a very likely species of bird. Tufted Titmouse and American Tree Sparrow are possible, but less probable based on the sound." / Next: "Listen for the distinct, high-pitched chirping of a Black-capped Chickadee."
- "The Dark-eyed Junco was identified as a very likely bird, possibly a Dark-eyed Junco. House Finches are also possible, though less probable given the time of day." / Next: "Look for movement in the oak trees." (invented oak trees)
- "The birdNET identified a House Finch, likely, was heard at 12:15 PM in the back garden. It's likely a common resident of this area." / Next: "Look for signs of activity – perhaps a flurry of feathers or a quick hop."

After (v9 + species prefill), same cases:
- "Black-capped Chickadee was heard, close by." / Next: "Walk slowly along the trail."
- "Dark-eyed Junco was heard, chirping steadily." / Next: "Walk to the edge of the field, carefully observing."
- "House Finch is nearby, moving quickly." / Next: "Walk slowly towards the house."

On the S23 Ultra after the change: "Black-capped Chickadee is heard, a sharp, insistent call." / "...close by." / "...loud and insistent." All three were `note_source=gemma`.

Honest read: the tuned notes are much more **grounded and consistently formatted**: inventions dropped from 11/24 to 1/48, and the format holds every time. They are only **modestly more vivid**: shorter, present tense, sometimes a sound detail ("sharp, insistent call"), but often plain. Pushing for vividness (v1) made a 1B model invent trees and nests. For a field notebook that claims "only what you heard", we chose grounded over florid.
Other fixes found while tuning:
1. The 1B model sometimes continues the prefilled `NOTE:` with the bracketed placeholder text. The parser now strips echoed placeholders and returns null (so the template is used) when nothing real remains.
2. With a place name in the style example, the S23 Ultra copied "reservoir path" into NEXT 3 of 3 times. The place was removed from the example, and `finalizeNote` now rejects lines that use example-only words (wren/reservoir) unless the facts contain them.
3. Listen mode prefills the species name, which eliminated the echo failure that hit the chickadee case twice on the phone.

## Fixes from the first phone sessions
- **Duplicate Listen screen:** on first launch `index` rendered `<Redirect href="/setup">` but stayed mounted with all its hooks. Setup then `replace`d itself with a second `index`, so one dev command created two entries (one Gemma, one template because Gemma was busy). The route wrapper now holds only the redirect; the Listen component, with its hooks, mounts only when the models are ready. Verified: one entry per command on the S23 Ultra.
- **Manual prefill:** manual notes start with a time/place opener (`NOTE: Evening at Canal bank.`). On the phone, one manual run had restated the input verbatim inside parentheses. In the lab (24 samples each) neither variant produced verbatim copies, but the opener gives each entry a journal anchor, e.g. "Evening at Canal bank. Three crows are actively pursuing a hawk." / Next: "Walk towards the source of the call."
- Location: no permission prompt appeared during the dev-command manual run on the phone (the permission is still `granted=false`). Added `[location]` status logging. The entry is saved without coordinates, as designed.
- Observed: one Gemma run on the phone decoded at 19.4 tok/s instead of about 39 (the first completion right after a cold app start). Watch for this in the release build.
- **User hands-on check** (from `docs/user-device-notes.md`, reported by the user): on the S23 Ultra **in airplane mode**, Listen identified a **Yellow-vented Bulbul** from a YouTube clip played to the phone mic, and Gemma wrote the note + Next offline in about 3-4 s (user's estimate). Manual mode also worked.

## Non-bird classes (from the user's offline bulbul screenshot)
- The user's S23 Ultra airplane-mode run (`post/assets/s23-offline-bulbul-result.png`, owned by the writer) showed Yellow-vented Bulbul "very likely", with "Pacific Koel" and **"Human whistle"** as alternates; 11.3 s total including the 9 s capture.
- BirdNET V2.4 has 11 environmental classes whose scientific name equals the common name: Dog, Engine, Environmental, Fireworks, Gun, Human non-vocal, Human vocal, Human whistle, Noise, Power tools, Siren. (Two crickets, *Gryllus assimilis* and *Miogryllus saussurei*, follow the same naming pattern but are real species and are kept.)
- `core/birdnet/scores.ts` `analyzeScores()`: these classes are removed from the ranked alternates and therefore from the Gemma prompt. If one of them is the overall top-1, is at least "likely" (0.5) and beats the best bird, the card says "Didn't catch a bird. It sounded like a human whistle..." and no species is named or saved. 4 new unit tests.
- Device check (iOS Simulator, synthetic 1.2-2.4 kHz gliding tones as the fixture): BirdNET top-1 was `Siren 0.847`, so the non-bird path triggered and no bird was named (verified from logs; no screenshot because the shared simulator was showing another app at that moment).
