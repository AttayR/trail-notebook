---
name: on-device-ai-rn
description: Patterns for running open-weight AI models on-device in React Native/Expo (LLMs, audio classification, speech) — library choices, model formats, sizes, licensing, and performance tips. Use when designing or building the HF26 app's ML features.
---
# On-device open AI in React Native

> Library versions/APIs move fast. Before coding, verify the current README of each library and record version + date in `docs/build-log.md`.

## Candidate building blocks
| Need | Library candidates | Model / format |
|---|---|---|
| Local LLM (text gen) | `llama.rn` (llama.cpp bindings); `react-native-executorch` | Gemma small instruct (GGUF Q4 for llama.rn; .pte for ExecuTorch) |
| Audio / image classification | `react-native-fast-tflite`; `react-native-executorch` | BirdNET (TFLite) for bird sounds; open image classifiers |
| Speech-to-text | `whisper.rn` | whisper tiny/base (ggml) |
| Audio capture | `expo-audio` / `react-native-audio-api` | 48 kHz mono PCM (resample to model's rate) |
| Storage | `expo-sqlite`, `react-native-mmkv` | — |
| Model download | `expo-file-system` (download once, checksum, store in documents dir) | — |

## Rules of thumb
- Use an **Expo dev build** (`npx expo prebuild` / EAS) — Expo Go cannot load these native modules.
- Test on a **real device** early; simulators misrepresent speed and lack mic realism.
- Keep LLM small (~1B class, 4-bit) for mid-range phones; cap `n_predict` (~150 tokens); stream tokens to UI.
- Load models once, keep context alive; release on background if memory pressure.
- Never bundle large weights in the app binary or git; download on first run over Wi-Fi with progress UI.
- Prompt LLMs with structured input (species + confidence + time + location name) and ask for short, specific output.
- Measure and log: model load ms, tokens/s, classification ms, peak memory.

## Licensing (must verify each)
- Gemma: Gemma Terms of Use — attribution + use policy.
- BirdNET models: check current license (historically CC BY-NC-SA 4.0 → non-commercial, share-alike).
- whisper: MIT. llama.cpp/llama.rn: MIT.
Record final licenses in README and the post.
