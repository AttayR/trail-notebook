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
