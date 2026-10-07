# Trail Notebook

An offline field notebook for walks. You hear a bird, hold your phone up for nine seconds, and **BirdNET** identifies the song on the phone. A small open-weight language model, **Gemma 3 1B**, then writes a short journal entry and one thing to look or listen for next. If you would rather describe what you saw ("three crows chasing a hawk over the canal"), type it, and Gemma writes the entry from that.

After a one-time download, everything runs on the phone. There are no accounts, no servers and no network calls, so it works in airplane mode on a trail with no signal.

Built for the DEV Hacktoberfest 2026 "Touch Grass" open-source AI challenge.

## How it works

```
LISTEN   mic, 9 s @ 48 kHz mono float32 (react-native-audio-api)
           -> 5 windows of 3 s, 1.5 s hop
           -> BirdNET V2.4 FP16 TFLite (react-native-fast-tflite, CPU)   6,522 species
           -> sigmoid, max over windows, top 3 (confidence as words: very likely / likely / possible)
           -> "Nothing clear" below 0.5, otherwise:
MANUAL   "what did you notice?" text
           -> short structured prompt (time of day, season, spot, species already logged today)
           -> Gemma 3 1B IT Q4_0 GGUF (llama.rn / llama.cpp), streamed
           -> NOTE + NEXT lines, parsed; deterministic template if Gemma fails or is slow
           -> SQLite journal (expo-sqlite), with an "offline" stamp when written without a network
```

- App: Expo SDK 57, React Native 0.86 (New Architecture), React 19.2, TypeScript, Expo Router. Three screens: Setup, Listen, Journal.
- All pure logic (audio windowing and resampling, WAV parsing, BirdNET post-processing, prompt building, output parsing, metrics) lives in `src/core/` with no React Native imports. It is unit tested with Jest (78 tests).
- The prompt was tuned on the actual model, using an automated comparison over 48 samples. The note's first words are prefilled (`NOTE: <species>` in listen mode), which keeps a 1B model on format and stops it inventing details. See `docs/build-log.md`.

## Measured performance

On a **Samsung Galaxy S23 Ultra** (SM-S918B, Snapdragon 8 Gen 2, Android 16). **This is a flagship phone; expect slower numbers on mid-range devices.** Debug build, `docs/metrics/s23ultra-dev-2026-10-08.json`:

| Step | Result |
|---|---|
| BirdNET model load | 122 ms median |
| BirdNET per 3 s window | 53 ms median (p90 60 ms) |
| Tap-to-species after the 9 s capture | 282 ms median |
| Gemma 3 1B load | 0.9 s median (2.2 s first cold load) |
| Gemma time to first token | 0.83 s median |
| Gemma decode | 39 tok/s median |
| One journal note (17-68 tokens) | 0.5-2.7 s |
| One-time download over home Wi-Fi | 748 MB, about 5.5 min |

BirdNET in the app reproduces a desktop LiteRT reference exactly on a test clip (Black-capped Chickadee 0.815, Tufted Titmouse 0.247, American Tree Sparrow 0.234).

## Requirements

- Node 20+ (built with Node 24) and npm 11.
- iOS: Xcode 16+ and CocoaPods. Android: Android SDK, NDK 27, JDK 17.
- A **development build**. Expo Go cannot load the native modules (llama.rn, fast-tflite, audio-api).
- A phone with about 4 GB of RAM or more. Android arm64, or an iPhone with an A14 or newer chip.

## Setup

```bash
npm install
# npm 11 blocks dependency install scripts. llama.rn downloads its prebuilt native
# libraries (iOS xcframework, Android jniLibs) in postinstall, so run that step by hand:
node ./node_modules/llama.rn/install/download-native-artifacts.js

# iOS (CocoaPods 1.17 on Ruby 4 needs a UTF-8 locale)
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
npx expo run:ios                 # simulator; add --device for a phone

# Android
export ANDROID_HOME=~/Library/Android/sdk
npx expo run:android --device    # a USB-connected phone
```

Checks:

```bash
npx tsc --noEmit
npm test
npx expo lint
```

### Release build (Android APK)

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
# -> android/app/build/outputs/apk/release/app-release.apk
```

The generated project signs release builds with the debug keystore, which is fine for sideloading a demo build. For a store build, create your own keystore, keep it out of git (`*.jks`, `*.keystore` and `/android` are gitignored), and configure signing as described in the Expo docs.

## Model download

Model weights are **not** in this repository or in the app binary. On first launch, the Setup screen downloads them once into the app's documents directory and checks each file by its exact byte size:

| Model | File | Size | Downloaded from | License |
|---|---|---|---|---|
| BirdNET V2.4 labels (English) | `BirdNET_GLOBAL_6K_V2.4_Labels_en.txt` | 259,894 bytes | https://huggingface.co/tphakala/BirdNET-v2.4 (`labels.txt`) | CC BY-NC-SA 4.0 |
| BirdNET V2.4 audio model, FP16 TFLite | `BirdNET_GLOBAL_6K_V2.4_Model_FP16.tflite` | 25,932,528 bytes (25.9 MB) | https://github.com/woheller69/whoBIRD-TFlite | CC BY-NC-SA 4.0 |
| Gemma 3 1B IT, Q4_0 GGUF | `gemma-3-1b-it-Q4_0.gguf` | 721,918,496 bytes (722 MB) | https://huggingface.co/unsloth/gemma-3-1b-it-GGUF (ungated) | Gemma Terms of Use |

Total is about 748 MB. Use Wi-Fi for the first download. After that, the app makes no network requests.

Provenance: both BirdNET files are byte-identical to files in the official BirdNET V2.4 release on Zenodo (doi:10.5281/zenodo.15050749, `BirdNET_v2.4_tflite_fp16.zip`: `audio-model-fp16.tflite`, SHA-256 `5c64ba3f…546b`, and `labels/en_uk.txt`). The mirrors are used only because they serve the files unzipped. The downloaded Gemma file's SHA-256 matches the Hugging Face listing (`27ee88e0…0276e`).

Optional smaller LLM: Gemma 3 270M IT Q8_0 (291,546,144 bytes). Start Metro with `EXPO_PUBLIC_LLM_VARIANT=270m` to use it.

### Developer scripts (not needed to use the app)

- `scripts/fetch-models.sh [--sim] [--270m]` downloads Gemma into `models-cache/` (gitignored) and optionally copies it into the booted iOS Simulator app.
- `scripts/dev-fixture.sh` fetches BirdNET-Analyzer's example soundscape into `models-cache/`, cuts 9 s, and pushes it to a dev build, so Listen can be tested without a live bird. The clip's license is not stated, so it is never committed. Set `ANDROID_SERIAL` to target an Android device.
- `scripts/dev-cmd.sh '<json>'` drives a **dev build only** (navigate, start a download, run Listen on the test clip, write a manual note, export metrics). It works through a command file in the app's documents folder. Release builds ignore it.

## Privacy

Audio is analysed in memory and never saved or uploaded. Location is optional and coarse (rounded to about 1 km), and it is stored only in the local journal. The app has no accounts, analytics or servers. The only network use is the one-time model download on the Setup screen.

## Project layout

```
src/app/        routes: _layout, index (Listen), journal, setup
src/components/ UI pieces (ListenButton, ResultCard, NoteText, Journal rows, Diagnostics, Metrics)
src/hooks/      useObservation (listen + manual state machine), useModels, useJournal
src/services/   thin wrappers over native modules: llama.rn writer, fast-tflite BirdNET,
                audio recorder, downloader, SQLite, location, network, metrics export
src/core/       pure TypeScript + tests: audio, birdnet, llm prompt/parse/template, metrics
docs/           research, architecture, build log, metrics, screenshots
```

## Licenses and attribution

- **App source code:** MIT, see `LICENSE`. That license covers this repository's code only; model weights are excluded and keep their own licenses.
- **Gemma:** Gemma is provided under and subject to the Gemma Terms of Use found at ai.google.dev/gemma/terms. Use is also subject to the Gemma Prohibited Use Policy (https://ai.google.dev/gemma/prohibited_use_policy). The GGUF conversion is by Unsloth (https://huggingface.co/unsloth/gemma-3-1b-it-GGUF).
- **BirdNET V2.4:** Stefan Kahl, Connor M. Wood, Maximilian Eibl, Holger Klinck. "BirdNET: A deep learning solution for avian diversity monitoring." *Ecological Informatics* 61 (2021): 101236. K. Lisa Yang Center for Conservation Bioacoustics, Cornell Lab of Ornithology, and Chemnitz University of Technology. Model release DOI: 10.5281/zenodo.15050749. The models are licensed **CC BY-NC-SA 4.0** (https://creativecommons.org/licenses/by-nc-sa/4.0/), so this project is **non-commercial**. The Zenodo record's metadata says CC BY-NC 4.0, while the BirdNET GitHub, the Hugging Face mirror and whoBIRD say CC BY-NC-SA 4.0. We follow the stricter NC-SA reading. The unzipped FP16 file is mirrored by whoBIRD-TFlite (https://github.com/woheller69/whoBIRD-TFlite, CC BY-NC-SA 4.0) and the labels by tphakala/BirdNET-v2.4 on Hugging Face.
- **Libraries:** llama.rn (MIT) and llama.cpp (MIT); react-native-fast-tflite (MIT) with TensorFlow Lite (Apache 2.0); react-native-audio-api (MIT); Expo and React Native (MIT).
- **Test audio (development only, not distributed):** `soundscape.wav` from BirdNET-Analyzer (https://github.com/birdnet-team/BirdNET-Analyzer). It is downloaded by script and not included in this repository.
