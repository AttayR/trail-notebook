# Trail Notebook

An offline field notebook for walks. Hold your phone up for a few seconds, and it identifies the birdsong around you on the device. A small open-weight language model (Gemma 3 1B) then writes a short journal entry and one thing to look or listen for next. After a one-time download, everything runs on the phone with no network, so it works in airplane mode on a trail with no signal.

Built for the DEV Hacktoberfest 2026 "Touch Grass" open-source AI challenge.

> Status (2026-10-07): the manual-observation mode (type what you noticed, Gemma writes the note) works end to end. Bird sound ID (BirdNET) and mic capture are in progress.

## How it works

```
mic (48 kHz PCM) -> BirdNET V2.4 (TFLite, on device) -> top species
                                                          |
type what you noticed  ---------------------------------->+-> prompt -> Gemma 3 1B IT (llama.rn, on device)
                                                                         -> NOTE + NEXT -> SQLite journal
```

- App: Expo SDK 57, React Native 0.86 (New Architecture), TypeScript, Expo Router.
- LLM: `llama.rn` 0.12.9 (llama.cpp) running `gemma-3-1b-it-Q4_0.gguf`.
- Audio ID (in progress): `react-native-fast-tflite` running BirdNET V2.4, with `react-native-audio-api` for raw PCM capture.
- Storage: `expo-sqlite` (journal, detections, metrics) and `expo-sqlite/kv-store` (settings).
- Pure TypeScript logic (prompting, parsing, audio maths) lives in `src/core/` and is unit tested with Jest.

## Requirements

- Node 20+ (built with Node 24), npm 11.
- Xcode 16+ with CocoaPods for iOS, or the Android SDK with JDK 17 for Android.
- A development build. Expo Go cannot load the native modules this app uses.
- A phone with 4 GB of RAM or more for Gemma 1B. Android arm64, or an iPhone with an A14 chip or newer.

## Setup

```bash
npm install
# npm 11 blocks dependency install scripts. llama.rn downloads its prebuilt native
# libraries in postinstall, so run that step by hand:
node ./node_modules/llama.rn/install/download-native-artifacts.js

# iOS (CocoaPods needs a UTF-8 locale)
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
npx expo run:ios            # or: npx expo run:ios --device

# Android
export ANDROID_HOME=~/Library/Android/sdk
npx expo run:android
```

Checks:

```bash
npx tsc --noEmit
npm test
npx expo lint
```

## Model download

Model weights are **not** in this repository and not in the app binary. On first launch, the Setup screen downloads them once into the app's documents directory and checks each file by its exact byte size:

| Model | File | Size | Source |
|---|---|---|---|
| Gemma 3 1B IT, Q4_0 | `gemma-3-1b-it-Q4_0.gguf` | 721,918,496 bytes (722 MB) | https://huggingface.co/unsloth/gemma-3-1b-it-GGUF (ungated) |
| Gemma 3 270M IT, Q8_0 (optional, smaller) | `gemma-3-270m-it-Q8_0.gguf` | 291,546,144 bytes | https://huggingface.co/unsloth/gemma-3-270m-it-GGUF |
| BirdNET V2.4 (coming) | `BirdNET_GLOBAL_6K_V2.4_Model_FP16.tflite` | about 50 MB | to be confirmed |

Use Wi-Fi for the first download. After that, the app makes no network requests.

For development, `scripts/fetch-models.sh` downloads the weights to `models-cache/` (gitignored). `scripts/fetch-models.sh --sim` also copies them into the booted iOS Simulator app. To use the smaller 270M model, start Metro with `EXPO_PUBLIC_LLM_VARIANT=270m`.

## Privacy

Audio is analysed in memory and never saved or uploaded. Location is optional, coarse (rounded to about 1 km), and stored only in the local journal. The app has no accounts, analytics, or servers.

## Licenses and attribution

- **App code:** MIT (see `LICENSE`).
- **Gemma:** Gemma is provided under and subject to the Gemma Terms of Use found at ai.google.dev/gemma/terms. Use of Gemma is also subject to the Gemma Prohibited Use Policy (https://ai.google.dev/gemma/prohibited_use_policy). The GGUF conversion comes from Unsloth (https://huggingface.co/unsloth/gemma-3-1b-it-GGUF).
- **BirdNET V2.4:** Stefan Kahl, Connor M. Wood, Maximilian Eibl, Holger Klinck. "BirdNET: A deep learning solution for avian diversity monitoring." Ecological Informatics 61 (2021). K. Lisa Yang Center for Conservation Bioacoustics, Cornell Lab of Ornithology, and Chemnitz University of Technology. Model DOI: 10.5281/zenodo.15050749. The models are licensed **CC BY-NC-SA 4.0** (per https://github.com/birdnet-team/BirdNET-Analyzer). This project is non-commercial. Note that the Zenodo record summary says "CC BY-NC 4.0"; we follow the stricter NC-SA reading.
- **llama.rn / llama.cpp:** MIT. **react-native-fast-tflite:** MIT. **react-native-audio-api:** MIT.
