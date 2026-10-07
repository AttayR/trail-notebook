# Architecture: Trail Notebook

Written 2026-10-07 by the app-architect agent. Inputs: `CLAUDE.md`, `PLAN.md`, `docs/research.md`, skills `on-device-ai-rn` and `hf26-rules`.
Build window: Thu 2026-10-08 to Fri 2026-10-09, one developer (the `rn-builder` agent). Field test Fri evening to Sat.

## 0. Decisions at a glance

| Area | Decision |
|---|---|
| App shell | Existing Expo SDK ~57 / RN 0.86 / React 19.2 / TS scaffold. New Architecture (default). Dev build via `npx expo prebuild` + `npx expo run:android|ios`. Never Expo Go. |
| Navigation | Expo Router (per `AGENTS.md`), routes in `src/app/`. Three routes, no more. |
| LLM | Gemma 3 1B IT, `gemma-3-1b-it-Q4_0.gguf` (722 MB) from `unsloth/gemma-3-1b-it-GGUF`, run with `llama.rn` pinned to stable v0.12.9. URL lives in `src/config.ts`, swappable. |
| Audio classifier | BirdNET V2.4 `BirdNET_GLOBAL_6K_V2.4_Model_FP16.tflite` through `react-native-fast-tflite`. Fallback: V2.4 INT8 ONNX through `onnxruntime-react-native`. |
| Audio capture | `react-native-audio-api` `AudioRecorder`, Float32 PCM, request 48 kHz, resample in pure TS if the hardware returns another rate. |
| Storage | `expo-sqlite` for journal, detections and metrics. `expo-sqlite/kv-store` for small settings and model state (no extra native module, so no MMKV). |
| Model delivery | `expo-file-system` download on first run (Wi-Fi recommended), stored in the app documents directory, verified by byte size. Weights never go in git or in the binary. |
| Location | `expo-location`, coarse (Balanced accuracy), GPS only. No reverse geocoding. Coordinates rounded to 2 decimals (about 1 km) plus an optional user-typed spot name. |
| Build order | Gemma-only **manual observation mode first** (demo floor), BirdNET **listen mode second**. |
| Testing | Pure-TS core in `src/core/` (no React Native imports), unit tested with Jest using the `jest-expo` preset. Device behaviour verified with a bundled birdsong fixture WAV. |
| Partner categories | Gemma (primary, $200) and Entire (agent session, $100). Not ElevenLabs, not TabPFN. |

Design principle applied everywhere: the phone is held up for about 10 seconds, buzzes when it has an answer, and goes back in the pocket. One primary action, "Listen".

---

## 1. User flow (outside first)

The story the post will tell, in order. Steps marked (once) happen only at install.

1. (once, at home on Wi-Fi) Install the app. The Setup screen explains in two lines what will be downloaded (about 60 MB bird model, about 720 MB Gemma) and why: "so it works with no signal". Tap **Download**. Progress bar for each file. When done, the app goes to Listen and never shows Setup again.
2. Walk out the door. Put the phone in airplane mode if you want to prove the point. Nothing changes in the app.
3. Hear a bird. Take the phone out, open the app (it opens on Listen), tap the one big **Listen** button and hold the phone up.
4. A 9-second ring countdown fills. No other UI moves. The phone buzzes once when listening ends.
5. The result card appears on the same screen within about 2 to 3 seconds: top species (common name, scientific name, a confidence word such as "very likely" or "possible"), up to two other candidates in small type.
6. Gemma's note streams in under the species: one or two sentences for the journal, then a **Next** line, a short thing to look or listen for in the next few minutes ("Walk toward the hedge line and listen for a second, softer call answering the first."). The entry is saved automatically. Optionally (NICE) the note is read aloud with on-device TTS, so the screen can stay off.
7. Pocket the phone and follow the nudge. That is the experience; the screen time was about 20 seconds.
8. If BirdNET hears nothing confident, the card says "Nothing clear. Try again closer, or tell me what you noticed." and offers the manual input.
9. Manual mode (also the guaranteed floor): tap "Tell it instead", type "small brown bird, rising whistle near the hedge" (or "three crows chasing a hawk"). Gemma writes the same note + Next line without claiming a species ID.
10. Back home, open **Journal**: a list of today's and past entries, newest first, each row expandable to show detections, note, Next line, time, spot name and an "offline" stamp if it was written with no network.
11. NICE, walk mode: tap "Start walk", lock the phone. Every N minutes (default 3) the app records 9 s and classifies in the background. Tap "End walk" to get one Gemma summary entry of the whole walk.

---

## 2. Screens and components

Exactly three routes. The result card is part of Listen, entry detail is an inline expansion in Journal, and diagnostics are a collapsible section at the bottom of Journal. No modals that act as extra screens.

| Route | File | Shown when | Purpose |
|---|---|---|---|
| Setup | `src/app/setup.tsx` | First run, or a model file is missing or wrong size | One-time model download, licenses, mic and location permission prompts |
| Listen (home) | `src/app/index.tsx` | Every launch after setup | The one primary action and the result |
| Journal | `src/app/journal.tsx` | Tap "Journal" text link on Listen | History, diagnostics, metrics export |

`src/app/_layout.tsx` is a Stack with headers hidden on Listen. It redirects to `/setup` if `kv.modelState` is not complete.

### Components (`src/components/`)

| Component | Used on | Notes |
|---|---|---|
| `DownloadProgress` | Setup | Per-file name, MB done / total, percent, retry button, error text |
| `LicenseNotice` | Setup, Journal | BirdNET CC BY-NC-SA 4.0 attribution + Gemma Terms notice text |
| `ListenButton` | Listen | Large circular button (at least 160 dp), doubles as the countdown ring while recording, shows mic level as ring thickness (simple RMS) |
| `StatusChip` | Listen | "Gemma warming up" / "Ready" / "Offline" small chip, top corner |
| `ResultCard` | Listen | Holds `DetectionList` + `NoteText` + Save state; dismiss returns to idle |
| `DetectionList` | Listen, Journal | Top species large, up to 2 candidates small, confidence words not raw numbers (raw numbers in Journal expansion) |
| `NoteText` | Listen, Journal | Streams tokens; renders "NOTE" body and "Next:" line separately; tag "written by Gemma on this phone" or "template" |
| `ManualInput` | Listen | Collapsed link "Tell it instead"; expands into one multiline TextInput + "Write note" button |
| `SpotNameField` | Listen | Optional, remembers last value in kv ("Riverside path"). Collapsed by default |
| `JournalRow` | Journal | Time, spot, top species or manual text; tap to expand |
| `DiagnosticsPanel` | Journal | Collapsed. Model files and sizes, device info, last latencies, "Copy metrics JSON", "Re-download models" |
| `WalkControls` (NICE) | Listen | "Start walk" / "End walk", count of samples taken |

State: plain React state + three hooks (`useModels`, `useListen`, `useJournal`) and a small `ServicesContext` that holds the singleton classifier, LLM and DB handles. No Redux, no Zustand.

---

## 3. ML pipeline

### 3.1 Diagram

```
LISTEN MODE
 mic (react-native-audio-api AudioRecorder, request 48 kHz mono Float32)
   |  onAudioReady chunks
   v
 core/audio/accumulator  -> 9.0 s buffer (432,000 samples at 48 kHz)
   |  if buffer.sampleRate != 48000: core/audio/resample (linear) -> 48 kHz
   |  clamp to [-1, 1]
   v
 core/audio/windows  -> 5 windows of 144,000 samples (3 s), hop 72,000 (1.5 s)
   v
 BirdNET V2.4 FP16 TFLite (react-native-fast-tflite, CPU)
   input  float32 [1, 144000]   output float32 [1, 6522] logits     x5 windows
   v
 core/birdnet/scores: sigmoid(logit * sensitivity=1.0) -> max per class over windows
   -> top-k (k=3), candidates >= 0.15, "confident" >= 0.5
   -> labels (core/birdnet/labels: "Scientific_Common" -> {sci, common})
   v
 Detection[]  ---------------------------------------------> ResultCard (shown immediately)
   |
   +-- context: local time, part of day, season (from date + hemisphere of lat),
   |            spot name or rounded lat/lon, species already logged today
   v
 core/llm/prompt  -> chat messages (short, structured, confidence as words)
   v
 Gemma 3 1B IT Q4_0 GGUF (llama.rn, n_ctx 1024, n_predict 120, temp 0.4, top_p 0.9,
                          stop "<end_of_turn>", streamed tokens)
   v
 core/llm/parse -> { note, next }   (fallback: core/llm/template if parse fails or timeout 30 s)
   v
 SQLite: entries + detections + metrics          (+ NICE: expo-speech reads it aloud)

MANUAL MODE (built first)
 TextInput "what you noticed"  -> same context -> core/llm/prompt(manual) -> Gemma -> parse -> SQLite
```

### 3.2 Model files

| Model | File | Format / quant | Download size | Source (configurable in `src/config.ts`) | License |
|---|---|---|---|---|---|
| Gemma 3 1B IT | `gemma-3-1b-it-Q4_0.gguf` | GGUF, Q4_0 | 722 MB | `https://huggingface.co/unsloth/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_0.gguf` (ungated) | Gemma Terms of Use |
| BirdNET V2.4 | `BirdNET_GLOBAL_6K_V2.4_Model_FP16.tflite` | TFLite, FP16 weights | about 50-60 MB (UNVERIFIED, record real size in T9) | whoBIRD-TFlite repo (exact raw/LFS URL to confirm in T9) | CC BY-NC-SA 4.0 |
| BirdNET labels | `BirdNET_GLOBAL_6K_V2.4_Labels.txt` (English common names) | text, 6,522 lines | under 1 MB | BirdNET-Analyzer V2.4 labels (exact path to confirm in T9) | same as model |
| Fallback: BirdNET V2.4 ONNX | INT8 export | ONNX INT8 | about 47 MB | `huggingface.co/tphakala/BirdNET-v2.4` | CC BY-NC-SA 4.0 |
| Fallback: Gemma 3 270M IT | Q8_0 GGUF | GGUF | about 290 MB (check) | `huggingface.co/unsloth/gemma-3-270m-it-GGUF` | Gemma Terms of Use |

Each manifest entry in `src/config.ts` has `{ id, url, filename, bytes, license }`. `bytes` is the integrity check (hashing 722 MB in JS is too slow; use a native md5 only if the SDK 57 file API exposes one).

### 3.3 Size budget

| Item | Budget |
|---|---|
| Release app binary (APK arm64 / IPA) | under 80 MB (llama.cpp + TFLite native libs) |
| One-time download | under 800 MB total (722 + about 60 + labels) |
| On-disk total after setup | under 900 MB |
| Peak RAM during note generation | under 1.5 GB (Gemma about 800 MB + BirdNET about 60 MB + app). Target devices: 4 GB RAM or more, Android arm64 or iPhone with A14+ |
| SQLite DB after a month of use | under 5 MB |

### 3.4 Latency targets (mid-range phone, e.g. Snapdragon 7-class or iPhone 12+)

| Step | Target | Hard limit / action |
|---|---|---|
| BirdNET model load (cold) | under 1.5 s | load once on Listen mount, keep alive |
| BirdNET per 3 s window | under 500 ms | if over 1 s: drop to 3 windows (hop 3 s) |
| Tap Listen to species on screen | 9 s capture + under 3 s inference | |
| Gemma context load (cold, after app start) | under 8 s, done in background while user walks | show "Gemma warming up" chip |
| Gemma time to first token | under 2 s after prompt | |
| Gemma decode speed | at least 8 tok/s | if under 5 tok/s: fallback F-L2/F-L3 |
| Full note (up to 120 tokens) | under 15 s | 30 s timeout -> template note, Gemma text replaces it if it finishes |

### 3.5 Prompt (draft, owned by `src/core/llm/prompt.ts`)

Gemma 3 has no real system role (the chat template folds it into the first user turn), so the builder emits one user message. Confidence is passed as words, not numbers, because a 1B model handles words better. The Next line is constrained to an outdoor action so the model does not invent species that may not occur locally.

```
You write one entry in a walker's field notebook. Use only the facts below. Calm, concrete, no emojis, no greetings.
Facts:
- Time: 07:42, early morning, autumn
- Place: Riverside path
- Heard (identified by BirdNET on this phone): Common Myna (very likely); House Sparrow (possible)
- Already logged today: Rose-ringed Parakeet
Write exactly two lines:
NOTE: one or two sentences for the journal.
NEXT: one short thing to look or listen for in the next few minutes, phrased as an action outdoors.
```

Manual variant replaces the "Heard" line with `- The walker noticed: "<text>"` and adds `Do not state a species identity as fact.` Text input is trimmed to 200 characters.

Confidence words: >= 0.8 "very likely", >= 0.5 "likely", >= 0.15 "possible". Below 0.15 is not shown.

### 3.6 Model lifecycle

- BirdNET: loaded when Listen mounts (from `file://` path via `loadTensorflowModel({ url })`), kept for the session. Use async `run`, not `runSync`, to keep the JS thread free.
- Gemma: `initLlama` started in background right after setup completes and on each app start (`n_ctx 1024`, `n_gpu_layers` 99 on iOS Metal, 0 on Android first; try OpenCL later only if CPU misses targets). Released on `AppState` background only if the OS signals memory pressure; otherwise kept.
- Never run a Gemma completion while BirdNET windows are still running; the pipeline is sequential.

---

## 4. Data model and storage

### 4.1 SQLite (`expo-sqlite`, file `trail.db`, `PRAGMA user_version` migrations)

```
entries
  id            TEXT PRIMARY KEY      -- core/util/id (time + random, no native UUID needed)
  created_at    INTEGER NOT NULL      -- epoch ms
  mode          TEXT NOT NULL         -- 'manual' | 'listen' | 'walk'
  manual_text   TEXT                  -- manual mode input
  spot_name     TEXT
  lat           REAL                  -- rounded to 2 decimals
  lon           REAL
  note          TEXT                  -- parsed NOTE
  next_nudge    TEXT                  -- parsed NEXT
  note_source   TEXT NOT NULL         -- 'gemma' | 'template'
  model_id      TEXT                  -- e.g. 'gemma-3-1b-it-Q4_0'
  offline       INTEGER               -- 1 if no network at write time (NICE: expo-network)
  walk_id       TEXT                  -- NICE: groups walk samples
  raw_output    TEXT                  -- unparsed LLM text, for debugging and the write-up

detections
  id            INTEGER PRIMARY KEY AUTOINCREMENT
  entry_id      TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE
  label_index   INTEGER NOT NULL
  scientific    TEXT NOT NULL
  common        TEXT NOT NULL
  confidence    REAL NOT NULL         -- max sigmoid over windows
  rank          INTEGER NOT NULL      -- 1..3

metrics
  id            INTEGER PRIMARY KEY AUTOINCREMENT
  created_at    INTEGER NOT NULL
  kind          TEXT NOT NULL         -- 'birdnet_load' | 'birdnet_window' | 'listen_total' | 'llm_load'
                                      -- | 'llm_ttft' | 'llm_gen' | 'download' | 'battery'
  value         REAL NOT NULL         -- ms, or percent for battery
  extra         TEXT                  -- JSON: tokens, tok_s, device model, platform, entry_id

CREATE INDEX idx_entries_created ON entries(created_at DESC);
CREATE INDEX idx_detections_entry ON detections(entry_id);
```

### 4.2 Key-value (`expo-sqlite/kv-store`)

| Key | Value |
|---|---|
| `modelState` | JSON `{ gemma: { path, bytes, ok }, birdnet: {...}, labels: {...} }` |
| `lastSpotName` | string |
| `settings` | JSON `{ listenSeconds: 9, confThreshold: 0.5, speakNotes: false, walkIntervalMin: 3 }` |

MMKV is deliberately not used: kv-store ships with `expo-sqlite`, which we need anyway, and saves one native module.

---

## 5. Folder structure

```
/ (repo root, existing Expo scaffold)
  app.json                 plugins: expo-router, expo-sqlite, expo-location, expo-build-properties,
                           react-native-audio-api (mic permission strings), llama.rn / fast-tflite if they ship plugins
  package.json             "main": "expo-router/entry", "test": "jest", jest preset "jest-expo"
  metro.config.js          only if needed (fixture .wav asset ext; models are NOT bundled)
  README.md                setup, model download, licenses, NOTICE (Gemma), BirdNET attribution + DOI
  .gitignore               *.gguf *.tflite *.onnx models-cache/ ios/ android/
  assets/
    fixtures/birdsong-10s.wav   short CC0/CC BY clip, attribution in README (device validation only)
  scripts/
    fetch-models.sh        dev convenience: downloads weights to models-cache/ (gitignored)
  src/
    app/                   routes only
      _layout.tsx
      index.tsx            Listen
      journal.tsx
      setup.tsx
    components/            see section 2
    hooks/
      useModels.ts         download state, load state for both models
      useListen.ts         record -> classify -> write note -> save state machine
      useJournal.ts
    services/              thin wrappers over native modules, no business logic
      ServicesContext.tsx
      models/downloader.ts
      classifier/Classifier.ts        interface { load(path), classify(samples48k): Promise<Float32Array[]> }
      classifier/tfliteClassifier.ts
      classifier/onnxClassifier.ts    only if fallback F-B2 is triggered
      llm/NoteWriter.ts               interface { load(), write(messages, onToken, signal) }
      llm/gemmaWriter.ts              llama.rn
      audio/recorder.ts               react-native-audio-api
      location.ts
      db/schema.ts  db/entries.ts  db/metrics.ts
      kv.ts
      metrics.ts                      timer helpers -> db + console "[metric]" lines
    core/                  PURE TypeScript, no react-native / expo imports
      types.ts
      audio/resample.ts    linear resample any rate -> 48000
      audio/accumulator.ts collect Float32 chunks to N samples
      audio/windows.ts     slice into 144k windows with hop
      audio/wav.ts         parse 16-bit PCM / float WAV -> Float32 + sampleRate (fixture path)
      audio/level.ts       RMS for the level ring
      birdnet/labels.ts    parse "Sci_Common" lines
      birdnet/scores.ts    sigmoid, max-over-windows, topK, threshold, confidence words
      llm/prompt.ts        buildListenPrompt, buildManualPrompt, buildWalkSummaryPrompt (NICE)
      llm/parse.ts         NOTE/NEXT extraction with fallbacks
      llm/template.ts      deterministic fallback note + nudge
      context/time.ts      partOfDay, season(date, lat), formatClock
      util/id.ts
      __tests__/*.test.ts
    config.ts              model manifest, thresholds, n_predict, timeouts
  docs/
    research.md  architecture.md  build-log.md  field-test.md
```

Testing: `npx expo install jest-expo jest @types/jest -- --save-dev`, add `"jest": { "preset": "jest-expo" }` and `"test": "jest"`. Core tests need no device. Native wrappers are verified on device through the fixture WAV and the Diagnostics panel.

Unit tests the core must have:
- `resample`: 44.1 kHz 1 kHz sine of 1 s -> 48,000 samples, peak frequency preserved (zero-crossing count within 1%).
- `windows`: 432,000 samples -> 5 windows of 144,000; short buffer is zero-padded to one window.
- `accumulator`: chunks of uneven size fill to exactly N; overflow is dropped.
- `wav`: parses a tiny in-test 16-bit header + data; rejects non-PCM.
- `scores`: sigmoid(0)=0.5; max-over-windows; topK order and threshold; confidence words at boundaries.
- `labels`: "Turdus merula_Eurasian Blackbird" -> sci/common; 6,522 count check helper.
- `prompt`: contains species words, no raw numbers, manual variant contains the "do not state" line, input truncated to 200 chars.
- `parse`: well-formed, lowercase "note:", missing NEXT, extra chatter, empty -> template.
- `time`: season flips between hemispheres; partOfDay boundaries.

---

## 6. Ordered task list

Each task is at most 2 h and ends with an acceptance check. Run `npx tsc --noEmit`, `npx expo lint` and `npm test` before calling any task done. Log library versions and dates in `docs/build-log.md`.

Pre-build (user, 10 min): enable Entire in the repo and authenticate before T1 so the whole build session is captured. Confirm which real phone is the primary test device (Android arm64 with 6 GB+ RAM preferred; iPhone A14+ works too).

### Thursday 2026-10-08: native risk first, then the Gemma-only demo floor

| # | Task | Est | Pri | Acceptance check |
|---|---|---|---|---|
| T1 | Project skeleton: add Expo Router (`main: expo-router/entry`, remove `App.tsx`), three stub routes, folder structure from section 5, `src/config.ts`, jest-expo setup with one passing test, `.gitignore` for weights | 1 h | MUST | `npm test`, `tsc`, lint pass; Expo starts and navigates Listen -> Journal stub |
| T2 | Native modules + first dev build on the real phone: `llama.rn@0.12.9`, `react-native-fast-tflite`, `react-native-audio-api`, `expo-sqlite`, `expo-file-system`, `expo-location`, `expo-build-properties`; config plugins and permission strings in `app.json`; `npx expo prebuild --clean` and `run:android` (or `run:ios`) | 2 h | MUST | App launches on the physical phone; Diagnostics stub prints each module's import as OK without a crash |
| T3 | Core part 1: `prompt.ts`, `parse.ts`, `template.ts`, `time.ts`, `id.ts`, `types.ts` with tests | 1.5 h | MUST | All listed core tests for these files pass |
| T4 | Model downloader + Setup screen: manifest, download to documents dir with progress (use the SDK 57 file API that exposes progress; verify in versioned docs), size check, retry, `kv.modelState`, layout redirect | 2 h | MUST | Fresh install downloads Gemma with a visible progress bar; kill and relaunch skips Setup; deleting the file sends you back to Setup |
| T5 | Gemma service (`gemmaWriter.ts`): background `initLlama`, streamed completion, AbortController + 30 s timeout, metrics for load, TTFT, tok/s | 2 h | MUST | In airplane mode a Diagnostics "Test Gemma" button streams a two-line NOTE/NEXT reply; metrics rows recorded |
| T6 | SQLite schema, migrations, entries/detections/metrics repos, kv wrapper; Journal list with expandable rows | 2 h | MUST | Insert test entries, force-quit, relaunch: entries still listed newest first; expanding shows note and next |
| T7 | Manual observation flow end to end on Listen: `ManualInput`, `SpotNameField`, location (rounded), `ResultCard` with streaming `NoteText`, auto-save, template fallback on timeout | 2 h | MUST | **Demo floor:** airplane mode, type an observation, note + Next appear in under 30 s, entry in Journal after restart, `note_source` correct |

End of Thursday: a working offline Gemma app exists even if BirdNET never works.

### Friday 2026-10-09: listen mode, metrics, licenses

| # | Task | Est | Pri | Acceptance check |
|---|---|---|---|---|
| T8 | Core part 2: `resample`, `accumulator`, `windows`, `wav`, `level`, `labels`, `scores` with tests; add fixture WAV + attribution | 1.5 h | MUST | All core tests pass |
| T9 | BirdNET spike (timebox 60 min before switching to F-B2): confirm model + labels URLs, add to manifest, load via fast-tflite from `file://`, classify the fixture WAV through `wav.ts` -> windows -> scores | 2 h | MUST | Fixture species in top 3 with confidence 0.5 or higher; labels count = 6,522; load ms and per-window ms logged; real file size recorded in config |
| T10 | Mic capture (`recorder.ts`): permission flow, `AudioRecorder` at 48 kHz, accumulate 9 s, read actual `sampleRate`, resample when needed, RMS level | 1.5 h | MUST | Diagnostics shows 432,000 samples at 48 kHz after 9 s, non-zero level; sample rate actually delivered by the device logged |
| T11 | Listen flow end to end: `ListenButton` countdown ring, classify, `DetectionList`, prompt with detections + "already logged today", Gemma note, save entry + detections, "Nothing clear" path linking to manual input, haptic buzz at end of capture if `expo-haptics` is cheap to add | 2 h | MUST | Airplane mode, birdsong played from a laptop speaker: correct species card in under 12 s after tapping, note streams, entry with detections in Journal; silence gives the "Nothing clear" card |
| T12 | Metrics + export: timers wired across pipeline, battery level at app start and on Journal open (`expo-battery`), device model, "Copy metrics JSON" (`expo-clipboard`) in Diagnostics | 1.5 h | MUST | Copied JSON contains every metric in section 8 with at least one value |
| T13 | README + licenses: setup, `scripts/fetch-models.sh`, model download explanation, BirdNET attribution (Kahl, Wood, Klinck, DOI 10.5281/zenodo.15050749, CC BY-NC-SA 4.0, non-commercial), Gemma Terms notice text, fixture audio attribution; `LicenseNotice` on Setup and in Journal | 1 h | MUST | `git ls-files` shows no `.gguf/.tflite/.onnx`; README contains the exact Gemma notice sentence; license text visible in app |
| T14 | Release build + polish + airplane-mode dry run: release APK/IPA size, large touch targets, error states, run the QA checklist once indoors | 1.5 h | MUST | Release build installs and works fully in airplane mode; binary size recorded in `docs/build-log.md` |

### NICE (only after T14, in this order)

| # | Task | Est | Pri | Acceptance check |
|---|---|---|---|---|
| N1 | Read note aloud with `expo-speech` (on-device TTS), toggle in settings | 1 h | NICE | Note is spoken in airplane mode with the screen locked right after generation |
| N2 | Offline stamp: `expo-network` state saved on each entry, shown as "written offline" in Journal | 0.5 h | NICE | Entry made in airplane mode shows the stamp |
| N3 | Walk mode, Android first: `androidForegroundService: true` for audio-api, iOS `UIBackgroundModes: audio`; recorder runs, every N min keep 9 s and classify in the background, store detections under `walk_id`; "End walk" builds one Gemma summary in the foreground (`buildWalkSummaryPrompt`) | 2 h + 2 h | NICE | 15-min walk with the screen locked yields at least 4 samples and one summary entry; battery drop recorded. Timebox 4 h total, then drop |
| N4 | BirdNET MData (location/week meta model) filter for implausible species | 2 h | NICE | A species impossible at the test location is filtered out of the fixture result |
| N5 | Import model from local file (`expo-document-picker`) for slow networks | 1 h | NICE | Picking a copied GGUF completes setup without network |
| N6 | Gemma 3 270M toggle in Diagnostics | 1 h | NICE | Switching models reloads and produces a note; tok/s compared in metrics |
| N7 | Share an entry as text (`Share` API from react-native) | 0.5 h | NICE | Share sheet opens with note + species |

Cut order if Friday slips: N-tasks first, then T14 polish (keep the release build), then T12 export UI (keep console `[metric]` logs). Never cut T7, T11, T13, the field test or writing time.

---

## 7. Fallbacks

Each ladder is tried top to bottom. The service interfaces (`Classifier`, `NoteWriter`) exist so a fallback is a new implementation behind the same interface, not a rewrite.

### LLM (Gemma)
- **F-L1** Too slow: reduce `n_ctx` to 512, `n_predict` to 80, shorten prompt; on Android try `n_threads` 4 vs 6; on Qualcomm try OpenCL GPU offload.
- **F-L2** Still under 5 tok/s or out-of-memory: switch manifest to Gemma 3 270M IT GGUF. Still Gemma, so the category holds; say so in the post with numbers.
- **F-L3** llama.rn will not build or load: template note (`core/llm/template.ts`) so the app keeps working, while debugging. If llama.rn is blocked for more than 2 h, evaluate `react-native-executorch` with its Gemma build as a last resort (UNVERIFIED; new library, timebox 2 h).
- Always: species card appears before any LLM text; 30 s timeout swaps in the template and keeps the Gemma text if it later completes.

### BirdNET / classifier
- **F-B1** FP16 file fails to load in fast-tflite: try the FP32 TFLite file (rules out FP16 dequantize op issues).
- **F-B2** fast-tflite blocked after the 60-minute timebox: `onnxruntime-react-native` (has an Expo config plugin, loads from file path) with the V2.4 INT8 ONNX export. Same core pre/post-processing.
- **F-B3** Inference too slow (over 1 s per window): 3 windows with 3 s hop instead of 5; or 6 s capture.
- **F-B4** All classifier paths fail: ship manual-observation mode as the product and state plainly in the post that audio ID did not make it. The offline Gemma story still holds.

### Audio capture
- **F-A1** Device delivers 44.1 kHz or another rate: resample in `core/audio/resample.ts` (already planned).
- **F-A2** `react-native-audio-api` recorder fails: `@siteed/expo-audio-studio` PCM streaming (UNVERIFIED), or `expo-audio` recording a WAV/LPCM file (iOS supports linear PCM; Android needs checking), then decode it with `core/audio/wav.ts`.
- **F-A3** Results are garbage: verify normalization to [-1, 1] and sample rate with the fixture WAV; add a 200 Hz high-pass in core; show top 3 instead of one claim.

### Other
- Downloads fail or stall: retry with resume if the API supports it; N5 file import; for the demo, pre-load both models on the test phone at home.
- `expo-location` denied or no fix in 5 s: save the entry without coordinates; spot name only.
- Expo Router causes trouble with the dev build: fall back to a single-component state switch in `App.tsx` with the same three views (still three screens).
- Walk mode background execution is killed by the OS: drop N3; a foreground "keep screen dim" walk is not worth building.

---

## 8. Metrics for the write-up

Captured automatically into the `metrics` table and as `[metric]` console lines (`adb logcat | grep metric`, or Xcode console), exported via "Copy metrics JSON". Collected on the primary phone, with device model, OS version and RAM written into `docs/field-test.md`.

| Metric | How | Why it matters in the post |
|---|---|---|
| BirdNET model load ms | timer around `loadTensorflowModel` | cold-start cost |
| BirdNET ms per 3 s window (median, p90) | timer around `run`, per window | "a 6,522-species model in X ms on a phone" |
| Tap-to-species ms | Listen start to card render, minus 9 s capture | the felt latency |
| Gemma load ms | timer around `initLlama` | warm-up story |
| Gemma time to first token, tok/s, tokens per note, total note ms | llama.rn completion result timings + own timers | core Gemma proof for the category |
| Peak RAM | Android Studio profiler or `adb shell dumpsys meminfo <package>`; Xcode memory gauge | "fits on a 4 GB phone" claim |
| Release binary size | APK/IPA size from the release build | small app, big download once |
| Download sizes and on-disk size | manifest bytes + file sizes in Diagnostics | honest size cost of going offline |
| Download time on home Wi-Fi | `download` metric | one-time cost |
| Battery drop over the 20-30 min field session | `expo-battery` level at start and end (+ N3 walk) ; optional `adb shell dumpsys batterystats` | "it will not kill your phone on a hike" |
| Offline proof | Screen recording with airplane mode icon visible doing a full Listen -> note -> Journal; N2 offline stamp per entry; code note that the downloader is only reachable from Setup | the "why open matters" section |
| Detection quality | In the field log: each detection marked correct / wrong / unsure, cross-checked by ear or with a second app such as Merlin | honesty; avoids overclaiming |
| Note quality | Save `raw_output`; pick 3 real notes (one good, one weak) for the post | writing-quality material |
| Screen time per observation | from tap to card dismiss (timestamps already logged) | backs the "screen is the shortest part" claim |

Open items for the builder to verify at install time (from research, still UNVERIFIED): fast-tflite loads the FP16 file; exact BirdNET model and labels URLs and sizes; whether fast-tflite and llama.rn need their own Expo config plugins; the SDK 57 `expo-file-system` download-with-progress API; whether `react-native-audio-api` honours 48 kHz on the test phone.
