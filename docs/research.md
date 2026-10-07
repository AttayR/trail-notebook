# Research: Trail Notebook (HF26 Week 1, "Touch Grass")

Researched 2026-10-07. Every claim carries a URL. Anything not verified is marked UNVERIFIED.

## 0. Decisions at a glance

| Question | Decision |
|---|---|
| Audio classifier | BirdNET v2.4 `BirdNET_GLOBAL_6K_V2.4_Model_FP16.tflite` (3 s @ 48 kHz in, 6,522 logits out) |
| TFLite runtime | `react-native-fast-tflite` first; fallback `onnxruntime-react-native` with the INT8 ONNX export |
| LLM | Gemma 3 1B IT, GGUF Q4_0 (722 MB), run through `llama.rn` |
| Audio capture | `react-native-audio-api` `AudioRecorder` (raw Float32 PCM) |
| Partner categories | Gemma (primary), Entire (secondary, near-zero cost). Skip ElevenLabs and TabPFN. |
| Biggest threat | Three BirdNET + Gemma entries already exist, but all are desktop. The phone-native, field-tested angle is the differentiator. |

## 1. Existing entries (tag #hf26challenge)

Source list: https://dev.to/t/hf26challenge and the API listing https://dev.to/api/articles?tag=hf26challenge&per_page=100. About 48 posts were visible on 2026-10-07, mostly published Oct 6-7. More will land before the deadline.

### Ideas already taken
- **Birding with BirdNET (3 entries):**
  - "Building Dawn Chorus" is a Python CLI. It runs BirdNET V2.4 via LiteRT on CPU and Gemma 3 4B via Ollama on a Windows PC. It uses 72 mocked tests and tested one real 2-minute clip. https://dev.to/ajaypraneeth15/building-dawn-chorus-a-local-gemma-walk-companion-offline-birdsong-id-with-birdnet-and-mock-22ng
  - "Field Notes: an offline birding companion" is a Python CLI. It uses `birdnetlib`, Gemma 3 1B via Ollama, SQLite, and TabPFN forecasting. It claims the Gemma, TabPFN and Entire categories. It has no formal field test and calls itself an "experimental hobby project". https://dev.to/amitverma0509/field-notes-an-offline-birding-companion-birdnet-gemma-tabpfn-2ei7
  - "BirdSnap Offline" is a Streamlit app with BirdNET via ONNX. It does not use Gemma, and its field test is only planned. https://dev.to/krishna_kumar_612c63ef69e/birdsnap-offline-identify-bird-calls-with-local-ai-1bk1
- **Offline or local Gemma "companion" apps (crowded):** Grounded (https://dev.to/adpirs/grounded-the-zero-signal-outdoor-companion-powered-by-local-gemma-3-touchgrass-2dh9), GrassQuest (https://dev.to/vaibhavi_pednekar_a378c06/grassquest-an-offline-scavenger-hunt-that-gets-you-off-your-phone-powered-by-gemma-5b9n), Touch Grass Bingo (https://dev.to/nitsuj/touch-grass-bingo-an-offline-ai-walk-card-that-never-leaves-your-browser-9kj), TrailCard (https://dev.to/aakif-kohari/trailcard-a-gemma-powered-trail-planner-that-works-with-no-signal-k90), Trail Council (https://dev.to/krushna_kodgirwar_1355634/trail-council-four-tiny-ai-agents-on-my-laptop-that-decide-if-i-should-go-hiking-169p), and a 1B "tells you to touch grass" post (https://dev.to/c_k_74275275b328c851fce40/i-built-an-ai-that-tells-you-to-touch-grass-locally-with-gemma-3-1b-1ga5).
- **Gardening:** Pincode Garden (https://dev.to/ishaan-jindal/pincode-garden-what-to-plant-this-week-from-your-pincode-3847) and a local-Gemma garden planner (https://dev.to/wwwamankumar288/i-built-a-garden-planner-with-local-gemma-that-ends-by-telling-you-to-go-outside-2il5).
- **Generic "AI tells you to go outside" and scavenger-hunt posts:** about 20 of them.

### Crowded
Generic "AI nudges you outside", scavenger hunts, and "offline Gemma companion" posts.

### Gaps and our differentiation
1. **Native phone app.** None of the three birding entries is mobile. They are CLI or Streamlit apps that assume a laptop or PC. The challenge is about getting off the screen, and a laptop cannot go on a trail. Trail Notebook is a phone you hold up for about 10 seconds and then pocket.
2. **Actually field tested, with numbers.** All three birding posts say a field test is missing or planned. We report airplane-mode runs, latency, battery, and real detections. This also earns the "take it outside" bonus.
3. **The LLM adds something new.** It writes a "listen for next" nudge, and its output is grounded in detections. It does not generate chat. Keep the journal tone distinctive, because writing quality is the heaviest criterion.
4. **Fully on-phone.** Everything runs on the device, including the 1B LLM and the 6,522-class audio model. The others lean on Ollama on a PC.
5. **Prior art to acknowledge honestly:** the official BirdNET Live app is a Flutter app that already does offline on-device ID (https://github.com/birdnet-team/birdnet-live-app), and whoBIRD does the same on Android (https://github.com/woheller69/whoBIRD). We add the journal, nudge and trail context, not the ID itself.

Caveat: the list was fetched through a summarizing tool and may be incomplete. Re-scan on Oct 10 and 11 for new RN or mobile BirdNET entries.

## 2. BirdNET on mobile

### Model choice: V2.4 TFLite (stable)
- Zenodo record "BirdNET Model V2.4", published 2025-03-19. It lists TFLite variants from 45.9 MB (int8) to 124.5 MB (protobuf), an EfficientNetB0-like backbone, and eBird-based range modelling. https://zenodo.org/records/15050749
- Input is `[batch, 144000]` float32, which is 3 s at 48 kHz. Output is `[batch, 6522]` logits, so apply a sigmoid. https://huggingface.co/tphakala/BirdNET-v2.4. Analyzer docs agree on 48 kHz and 3 s chunks: https://birdnet-team.github.io/BirdNET-Analyzer/
- The ready-to-use TFLite files live in whoBIRD-TFlite: `BirdNET_GLOBAL_6K_V2.4_Model_FP16.tflite` (use this one), `..._Model_FP32.tflite`, and two `MData` variants that take location metadata as a second input. https://github.com/woheller69/whoBIRD-TFlite. File sizes are not stated on that page (UNVERIFIED). The Zenodo range suggests roughly 50-60 MB for FP16.
- Labels: the label file ships with the model package (UNVERIFIED which exact path; check the Zenodo zip or Analyzer `checkpoints/V2.4/` after download).
- **Custom ops:** whoBIRD loads these TFLite files with plain `com.google.ai.edge.litert:litert:1.2.0` and no Flex/Select-TF-Ops dependency, so the FP16 file runs on the stock TFLite runtime. https://raw.githubusercontent.com/woheller69/whoBIRD/master/app/build.gradle. Whether the runtime bundled in `react-native-fast-tflite` loads it is UNVERIFIED. Test this first, in the first hour of the build. A search-result summary suggested a `MelSpecLayerSimple` custom layer, but whoBIRD's dependencies imply it is already compiled into builtin ops. Treat the summary as unconfirmed.
- Location filtering: the app can run a separate meta model so that only species plausible at the location and week are kept. whoBIRD does this. https://github.com/woheller69/whoBIRD. For two days of build, skip the meta model and instead use a confidence threshold of about 0.5 plus a "top 3 candidates" display. Add the MData model as a stretch.
- Not usable on-device from RN: the V2.4 INT8/FP16 TFLite variants have no known benefit with the GPU delegate (UNVERIFIED). The `birdnet` library lists TFLite as "CPU only". https://github.com/birdnet-team/birdnet

### BirdNET V3.0 (preview, ONNX): optional later
- V3.0 developer preview, 2025-11-10, CC BY-SA 4.0, 32 kHz variable-length input. https://zenodo.org/record/17571190. The caveat: "Developer preview; models, labels, and code will change."
- GPU-native ONNX export: 11,560 species, 5 s @ 32 kHz. https://huggingface.co/tphakala/BirdNET-v3.0-Models
- The official BirdNET Live Flutter app bundles `BirdNET+_V3.0-preview3.1_Global_10K-pruned_FP16.onnx` (about 65 MB) with a geo-model (about 13 MB). https://github.com/birdnet-team/birdnet-live-app. Its README says the bundled weights are Apache 2.0 and the code is MIT. That conflicts with the CC BY-SA 4.0 notice on the Zenodo and HF pages. Re-check before using it.
- Recommendation: do NOT use V3.0. It is a moving preview and has no TFLite build. V2.4 is stable and has a known TFLite path.

### License of V2.4 (exact) and implications
- GitHub README: code is MIT, models are **CC BY-NC-SA 4.0**. "All educational and research purposes are considered non-commercial use and it is therefore freely permitted to use BirdNET models in any way." https://github.com/birdnet-team/BirdNET-Analyzer (same statement for the `birdnet` package: https://github.com/birdnet-team/birdnet)
- The Zenodo page summary says "Creative Commons Attribution Non-Commercial 4.0" without "ShareAlike". https://zenodo.org/records/15050749. This is a discrepancy. The conservative reading is NC-SA 4.0, as the HF mirror (https://huggingface.co/tphakala/BirdNET-v2.4) and whoBIRD (https://github.com/woheller69/whoBIRD) both state.
- Implications for us:
  1. Project must stay non-commercial. A free hackathon app is fine.
  2. Attribute BirdNET (Kahl, Wood, Klinck), link the license, and cite the Zenodo DOI 10.5281/zenodo.15050749 in the README and post.
  3. Do NOT commit the model file to the repo. Download it at first run from the source, or have a `scripts/fetch-models.sh`. That avoids redistribution questions. If you ever redistribute it, ShareAlike applies to the model, and the app code stays MIT because it is a separate work (UNVERIFIED legal reading, not legal advice).
  4. The post's "why open matters" section can honestly say the model is open-weight but non-commercial. Do not call it "open source" without that nuance.

### Prior art to learn from
- whoBIRD (Android, Kotlin, GPLv3 app, BirdNET CC BY-NC-SA 4.0): downloads the TFLite file at first start, has a meta model and a high-pass filter option, and runs in real time offline. https://github.com/woheller69/whoBIRD
- BirdNET Live (Flutter, Android/iOS/Windows): about 260 MB APK with everything bundled. https://github.com/birdnet-team/birdnet-live-app
- Dawn Chorus: 42-58 ms per 3 s window on desktop CPU. https://dev.to/ajaypraneeth15/building-dawn-chorus-a-local-gemma-walk-companion-offline-birdsong-id-with-birdnet-and-mock-22ng. Phone latency is UNVERIFIED. Expect a few hundred ms per window on mid-range phones, and measure it.

### react-native-fast-tflite viability
- Built on Nitro Modules. It has zero-copy ArrayBuffers, CoreML (iOS) and GPU/NNAPI (Android) delegates, and `.tflite` files are registered as assets in `metro.config.js`. It loads models from assets or remote URLs. https://github.com/mrousavy/react-native-fast-tflite
- Expo: needs a dev build (native module). Its docs describe an Expo config plugin (UNVERIFIED, confirm in the README at install time).
- Run on CPU first. CoreML/GPU delegates are not needed for a model that runs a few windows.
- Fallback runtime: `onnxruntime-react-native` has an Expo config plugin, loads models from file paths (not ArrayBuffers), and supports all operators in v1.13. https://github.com/microsoft/onnxruntime/tree/main/js/react_native. Pair it with the INT8 ONNX export (about 47 MB) or FP32 (about 62 MB) of V2.4 from https://huggingface.co/tphakala/BirdNET-v2.4.

## 3. Gemma on-device in RN

### Recommendation: llama.rn + Gemma 3 1B IT Q4_0 (GGUF)
- **File:** `gemma-3-1b-it-Q4_0.gguf`, 722 MB. Q4_K_M is 806 MB. Q8_0 is 1.07 GB. https://huggingface.co/unsloth/gemma-3-1b-it-GGUF. This repo shows no gating, so the app can download it with no HF login. The Google QAT repo (https://huggingface.co/google/gemma-3-1b-it-qat-q4_0-gguf) is gated and needs a login, so avoid it for in-app download.
- **Library:** `llama.rn` is MIT, with the latest stable v0.12.9 (2026-08-04) and a pre-release v0.13.0-rc.7 (2026-10-05). https://github.com/mybigday/llama.rn/releases. Pin the stable version.
- **Expo:** yes, via `expo-build-properties` and prebuild, so it needs a dev build. From v0.10 it requires the React Native New Architecture. Android is arm64-v8a/x86_64 only. iOS has Metal (Apple7 GPU or newer, not in the simulator). Android has OpenCL for Qualcomm Adreno and an experimental Hexagon NPU path. Models load from `file://` paths, and `context.completion()` streams tokens. https://github.com/mybigday/llama.rn
- **Speed on mid-range phones:** UNVERIFIED for our device. Secondary sources: about 15-17 tok/s at Q4_K_M on a Snapdragon 865 with 8 GB RAM, and 18-25 tok/s CPU on a Snapdragon 7 Gen 3. https://www.ertas.ai/es/blog/llm-android-benchmarks-snapdragon-tensor (a low-authority blog). Google's own figure is 50 tok/s decode on a Galaxy S24 Ultra, which is a flagship, via Google AI Edge. https://developers.googleblog.com/en/gemma-3-on-mobile-and-web-with-google-ai-edge/. A 70-100 token journal entry should take about 5-10 s. Memory is about 800 MB RAM per the same family of sources, so keep the app target at 4 GB+ devices.
- **Prompting:** keep prompts short (species list, time, optional location text), cap `n_predict` at about 120, and run at a low temperature. Gemma 3 270M is available as a smaller fallback (180-543 MB), but its IF-Eval score is only 51.2%. https://huggingface.co/unsloth/gemma-3-270m-it-GGUF

### Alternatives considered
| Option | Verdict |
|---|---|
| `react-native-executorch` (Software Mansion) | Lists Gemma 4, Llama and Phi, plus Whisper and Kokoro, and an Expo resource fetcher. https://executorch.swmansion.com/. Memory and min-OS details were not in what I could read (UNVERIFIED). Not chosen: we need a Gemma 3 build and a known-good GGUF path. |
| MediaPipe LLM Inference / Google AI Edge | Fastest numbers (50 tok/s on S24 Ultra), but it is not an RN-first path, and I found no maintained RN binding (UNVERIFIED). Skip. |
| Gemma 4 E2B | Apache 2.0, GGUF Q4_0 is 2.84 GB (https://huggingface.co/ggml-org/gemma-4-E2B-it-GGUF). Too heavy to download and run on mid-range phones in a 2-day build. Whether llama.rn v0.12.9 supports the Gemma 4 architecture is UNVERIFIED. The release notes did not mention it. |

### Gemma license
- Gemma 3 weights fall under the Gemma Terms of Use (last modified 2026-04-01). It permits commercial use, Google claims no rights in outputs, and you must pass on the use restrictions and the Prohibited Use Policy and include the notice "Gemma is provided under and subject to the Gemma Terms of Use found at ai.google.dev/gemma/terms" when redistributing. https://ai.google.dev/gemma/terms
- Gemma 4 uses Apache 2.0 instead. https://ai.google.dev/gemma/terms and https://huggingface.co/ggml-org/gemma-4-E2B-it-GGUF
- Plan: do not bundle weights in the repo or the APK. Download from Hugging Face at first run. Add a NOTICE section to the README with the Gemma notice text and a link to the terms.

### Which Gemma version does the prize want?
- The MLH Hack Days "Best Use of Gemma" module names **Gemma 4 via the Gemini API**. https://hacktoberfest-handbook.mlh.com/hack-days-partner-modules/partner-challenge-google-gemma. That is the Hack Day program, not necessarily the DEV challenge. I could not find the DEV Gemma category text (the DEV pages I could read omit it). UNVERIFIED.
- Existing DEV entries use Gemma 3 locally and claim the Gemma category, for example https://dev.to/amitverma0509/field-notes-an-offline-birding-companion-birdnet-gemma-tabpfn-2ei7.
- Mitigation: build the model path as a config constant (`MODEL_URL`, chat template). If the user wants Gemma 4 E2B, swap the URL and test whether llama.rn loads it. Ask the user to check the Gemma category wording in the DEV template before the final pitch.

## 4. Audio capture in Expo (raw PCM)

Recommendation: **`react-native-audio-api` (Software Mansion)**.
- `AudioRecorder` has a configurable `sampleRate` (examples 44100 or 48000) and an `onAudioReady` callback delivering an `AudioBuffer` with PCM. `getChannelData(0)` returns a `Float32Array`. The docs warn that "the actual sample rate may differ depending on hardware", and they say nothing about built-in resampling. https://docs.swmansion.com/react-native-audio-api/docs/inputs/audio-recorder
- Expo config plugin: add `"react-native-audio-api"` to `plugins` with `iosMicrophonePermission`, `androidPermissions: ["android.permission.RECORD_AUDIO"]`, and optionally `androidForegroundService: true`. Same page.
- Why not `expo-audio`: it records to files (AAC/M4A/WAV) and I found no raw-PCM streaming API in what I read (UNVERIFIED). `@siteed/expo-audio-studio` is a possible alternative that streams PCM (https://classic.yarnpkg.com/en/package/@siteed/expo-audio-studio), but I did not verify it.
- Pipeline: request 48000 Hz, record 9-10 s into a Float32 ring buffer, check `buffer.sampleRate`. If it is not 48000, resample with a linear interpolator in JS (about 20 lines). Slice into 3 s windows (144,000 samples) with 1.5 s hop, run BirdNET on each, and keep the max sigmoid score per species. Also convert Float32 samples to the range expected by the model: BirdNET takes float samples in [-1, 1] (UNVERIFIED from the model page, but the Analyzer reads audio normalized to float).
- Optional: a simple high-pass filter at around 200 Hz, as whoBIRD offers. https://github.com/woheller69/whoBIRD

## 5. Partner categories

Reference: prize list in the hf26-rules skill and https://dev.to/challenges/hf26. The $200 featured list I could read from DEV shows Render, TabPFN and Tinker. Gemma, Entire and ElevenLabs descriptions were not readable (UNVERIFIED), but the skill lists Gemma as featured ($200) and Entire and ElevenLabs as $100.

1. **Gemma (enter).** It is the actual journal writer, runs offline, and carries the story. Integration: `llama.rn` loads `gemma-3-1b-it-Q4_0.gguf`; README names the model and links its license. Judges of this category check that the model is identified in the README and shown in code or demo (per https://hacktoberfest-handbook.mlh.com/hack-days-partner-modules/partner-challenge-google-gemma). Show the code path and the airplane-mode demo.
2. **Entire (enter, low cost).** Entire records AI-agent sessions in Git, creates checkpoints and links them to commits. Claude Code is a supported agent. By default it pushes checkpoint metadata to the code remote. https://docs.entire.io/core-concepts. Minimal integration: install the Entire CLI, enable it in the repo before the build starts, build with the agent, and link or embed the session in the "My Agent Session" section. The exact CLI enable command was not in the docs I read (UNVERIFIED; follow https://docs.entire.io/guides/checkpoints/capture-checkpoints). The user must authenticate. Privacy: checkpoints include prompts and tool output, so scrub secrets before the repo goes public.
3. **ElevenLabs (do not enter).** It is a cloud API, so it would break the "fully offline" claim, which is the core of the write-up. At most use pre-generated narration for the demo video, clearly labelled as demo-only. If hands-free audio of the entry is wanted in-app, use the platform's native TTS (`expo-speech`, UNVERIFIED offline behaviour per device) instead. ElevenLabs credits come from hacktoberfest.com/my/promos and the user claims those.
4. **TabPFN (skip).** Field Notes already claims it (forecasting species from observation history). It would add scope with no payoff in 2 days.

## 6. Risks and mitigations

| # | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| 1 | BirdNET TFLite does not load in `react-native-fast-tflite` (ops or runtime version) | Medium / high | Spike in hour 1 using a bundled 10 s test clip. If it fails within about 60 min, switch to `onnxruntime-react-native` with the V2.4 INT8 ONNX (https://huggingface.co/tphakala/BirdNET-v2.4). Then fall back to the modes below. |
| 2 | Phone sample rate not 48 kHz, wrong normalization, or noisy mic gives garbage IDs | Medium / high | Check `sampleRate` on every buffer, resample, and validate against a known birdsong WAV played from a laptop speaker before going outside. Show top-3 with confidence, not one claim. |
| 3 | LLM too slow or memory kills the app on a mid-range phone | Medium / medium | Q4_0 1B, `n_predict` about 120, short prompts, free the BirdNET interpreter before loading Gemma if RAM is tight, fall back to Gemma 3 270M or a template note. Always show the species result before the LLM text arrives (stream tokens). |
| 4 | Native build trouble with Expo dev build, New Architecture, two native modules | Medium / high | Build the dev build on day 1 morning on a real Android and iPhone. Use the `llama.rn` stable v0.12.9, not the rc. Do not use Expo Go. |
| 5 | Model downloads fail or are too big | Low / medium | Download over Wi-Fi, show progress and resumable download, total about 60 MB (BirdNET) + 722 MB (Gemma). Pre-load both on the test phone. |
| 6 | License mistakes | Low / high | Do not commit weights. Attribute BirdNET and Gemma in README and post. State non-commercial use. Note the Zenodo vs GitHub license wording discrepancy. |
| 7 | A competing BirdNET + Gemma entry is stronger on writing | High / medium | Lead with a real field story and measured numbers, since writing is the heaviest criterion. Re-scan entries on Oct 10. |
| 8 | Gemma category might require Gemma 4 | Unknown / medium | UNVERIFIED. Keep the model URL swappable. Ask the user to confirm the category text. |
| 9 | Deadline slip | Medium / high | Cut order: meta model, map, extra screens. Never cut the field test or writing time. Publish by Sunday PKT evening. |

### Fallback if BirdNET-in-RN is blocked
1. **ONNX path** (first fallback): same V2.4 model through `onnxruntime-react-native`, INT8 about 47 MB or FP32 about 62 MB. https://huggingface.co/tphakala/BirdNET-v2.4
2. **Manual-observation mode:** the user taps or types what they hear or see (species name, or "small brown bird, rising whistle"). Gemma still writes the journal entry and the "listen for next" nudge. The LLM and offline story stay intact, but the audio-ID wow factor is lost, so say so in the post. This is the guaranteed floor, and it should be built first as the Gemma-only mode (about 2 hours) so there is always a demo.
3. **Different audio classifier:** only if both above fail. I have not verified a good alternative. Google's YAMNet exists but is not a bird-species classifier (UNVERIFIED), so it would be a weak substitute.

## 7. Unverified list
- Whether `react-native-fast-tflite` loads the BirdNET V2.4 FP16 file.
- BirdNET and Gemma latency on our target phones (all numbers above come from other devices or secondary sources).
- Exact label file path and exact FP16 file size.
- DEV's Gemma, Entire and ElevenLabs category text, and whether Gemma 4 is required.
- Whether llama.rn v0.12.9 loads Gemma 4.
- Entire CLI enable command.
- Whether `expo-audio` lacks raw PCM streaming, and whether `@siteed/expo-audio-studio` fits.
- Legal reading of NC-SA ShareAlike for an app that downloads the model at runtime.
