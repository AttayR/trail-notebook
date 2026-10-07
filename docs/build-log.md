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
