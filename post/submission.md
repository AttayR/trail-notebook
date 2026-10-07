---
title: "Trail Notebook: a phone that hears the birds and writes your field notes, with no signal"
published: true
tags: devchallenge, hf26challenge, reactnative, opensource
cover_image: https://raw.githubusercontent.com/AttayR/trail-notebook/19439186a763e6412fe7236570a03da82f7a1a4e/post/assets/cover.png
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05)*

At home, airplane mode on. I hold my phone near a second device playing a Yellow-vented Bulbul call from YouTube, and tap Listen. About 11 seconds later (9 of them listening) the screen says **Yellow-vented Bulbul, very likely**. Then a language model running on the phone writes:

> Yellow-vented Bulbul is clearly audible, a steady, melodic chirp.
> **Next:** Walk to the corner of the garden, observe the area.

To be clear, this was an indoor test with a recording, not a real bird on a trail. But it proves the part I cared about most: the whole loop runs with no network at all, which matters because trails are exactly where the signal drops.

## What I Built

**Trail Notebook** is an offline field notebook for walks. You hear a bird, take the phone out, and tap one button. It listens for 9 seconds, buzzes, and names the species. Then Gemma, running on the phone, writes a two-line entry: a short **NOTE** about the moment and a **NEXT** line telling you what to look or listen for.

Then the phone goes back in your pocket. One button, no feed, no chat box.

**748 MB downloaded once. 282 ms from end of listening to species. 39 tokens/s from Gemma. Zero network after that.**

- **Listen mode:** BirdNET V2.4 (6,522 classes) runs on the phone. You see the top species and up to two alternates, with a confidence word ("very likely", "likely", "possible") instead of a raw score.
- **Tell-it mode:** you saw something, or heard something it can't name? Type "three crows chasing a hawk over the canal". Gemma writes the same NOTE and NEXT, and the prompt tells it not to name a species you didn't.
- **Journal:** every entry is saved locally with the time, an optional spot name, a rough location (rounded to about 1 km) and an "offline" stamp if it was written without a network.

After a one-time download at home, nothing in this loop touches the network.

![Trail Notebook result card on a Galaxy S23 Ultra in airplane mode: Yellow-vented Bulbul, very likely, with a Gemma note and Next line](https://raw.githubusercontent.com/AttayR/trail-notebook/19439186a763e6412fe7236570a03da82f7a1a4e/post/assets/s23-offline-bulbul-result.png)

*The airplane-mode test on my Samsung Galaxy S23 Ultra. The spot field said "Back garden", which is where Gemma got "the garden" from. It only used facts it was given.*

## Demo

![Trail Notebook demo](https://raw.githubusercontent.com/AttayR/trail-notebook/main/docs/demo/trail-notebook-demo.gif)

A 16-second screen recording from a separate indoor run on the S23 Ultra: Listen, countdown, Yellow-vented Bulbul "likely", Gemma streams the note, "Saved to journal · 12.8 s" (including the 9 seconds of listening). [Full-quality MP4](https://github.com/AttayR/trail-notebook/blob/main/docs/demo/trail-notebook-demo.mp4).

**Try it:** [Android APK, v0.1.0](https://github.com/AttayR/trail-notebook/releases/tag/v0.1.0) (arm64, 134 MB). The models are not in the APK. The app downloads them on first launch, so use Wi-Fi.

## Code

{% embed https://github.com/AttayR/trail-notebook %}

The README covers setup, the model download, and the license notices for both models. The pure TypeScript logic (audio windowing, BirdNET post-processing, prompt building, output parsing) lives in `src/core/` with no React Native imports and is covered by 82 unit tests.

## How I Built It

### The stack

- **App:** Expo SDK 57, React Native 0.86 (New Architecture), TypeScript, Expo Router. It needs a development build, not Expo Go, because of the native modules.
- **Bird sound ID:** [BirdNET V2.4](https://github.com/birdnet-team/BirdNET-Analyzer), FP16 TFLite (25.9 MB), run with [`react-native-fast-tflite`](https://github.com/mrousavy/react-native-fast-tflite) on the CPU.
- **Audio:** [`react-native-audio-api`](https://docs.swmansion.com/react-native-audio-api/) gives raw Float32 PCM. The S23 Ultra delivers 48 kHz natively, so no resampling is needed there.
- **Writer:** Gemma 3 1B IT, Q4_0 GGUF (722 MB), run with [`llama.rn`](https://github.com/mybigday/llama.rn) 0.12.9 (llama.cpp under the hood). Journal in `expo-sqlite`.

### The pipeline

```
 mic, 9 s @ 48 kHz (Float32 PCM)
        |
 resample if needed -> clamp to [-1, 1]
        |
 5 windows x 3 s (1.5 s hop)
        |
 BirdNET V2.4 FP16 TFLite  ->  6,522 logits per window
        |
 sigmoid, max per species over windows, drop non-bird classes, top 3
        |                                    \
        |                                     -> species card (shown right away)
 prompt: time, season, spot, species as words
        |
 Gemma 3 1B Q4_0 (llama.rn, streamed)  ->  NOTE + NEXT
        |
 SQLite journal (stamped offline / online)
```

The species card appears before Gemma starts writing, so you never wait on the language model to learn what you heard.

### Five windows, one answer

BirdNET takes exactly 3 seconds of audio at 48 kHz (144,000 samples). A bird rarely sings for exactly those 3 seconds, so the app slides five overlapping windows across the 9-second clip and keeps each species' best score:

```ts
// src/core/birdnet/scores.ts
export function maxOverWindows(windowLogits: Float32Array[], sensitivity = 1): Float32Array {
  if (windowLogits.length === 0) return new Float32Array(0);
  const n = windowLogits[0].length;
  const out = new Float32Array(n);
  for (const logits of windowLogits) {
    if (logits.length !== n) throw new Error('window outputs differ in length');
    for (let i = 0; i < n; i++) {
      const p = sigmoid(logits[i], sensitivity);
      if (p > out[i]) out[i] = p;
    }
  }
  return out;
}
```

Scores of 0.8 or more read "very likely", 0.5 "likely", 0.15 "possible". If nothing reaches 0.5, the card says "Nothing clear" and offers tell-it mode instead of guessing.

One bug worth sharing: `react-native-fast-tflite` reuses its output buffer on every `run()`, so my per-window `Float32Array` views all pointed at the last window's scores. Copying with `out.slice(0)` fixed it, and the app now matches a desktop LiteRT reference exactly on a test clip (Black-capped Chickadee 0.815).

### Keeping a 1B model honest

Gemma gets a short facts block (time, season, spot, what BirdNET heard, species already logged today) and is asked for exactly two lines. In the first run it echoed my instructions back instead. The fix: apply Gemma's chat template by hand and **prefill the model's turn**, so it starts inside the answer. In listen mode the prefill includes the species:

```ts
// src/core/llm/gemmaFormat.ts
export const NOTE_PREFILL = 'NOTE:';

export function listenPrefill(topCommonName: string | undefined): string {
  return topCommonName ? `${NOTE_PREFILL} ${topCommonName}` : NOTE_PREFILL;
}

export function toGemmaPrompt(messages: ChatMessage[], prefill = NOTE_PREFILL): string {
  // Gemma has no system role: fold any system text into the first user turn.
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content);
  const turns = messages.filter((m) => m.role !== 'system');
  let out = '';
  turns.forEach((m, i) => {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const content = i === 0 && system.length ? `${system.join('\n')}\n\n${m.content}` : m.content;
    out += `<start_of_turn>${role}\n${content}<end_of_turn>\n`;
  });
  return `${out}<start_of_turn>model\n${prefill}`;
}
```

Then I tuned the prompt against the real model: a script ran the app's own prompt builders through llama.cpp with the same GGUF and sampling settings, over fixed cases and several seeds, and scored each output automatically.

| | Samples | Format OK | Invented details (trees, nests...) |
|---|---|---|---|
| Original prompt | 24 | 17 | 11 |
| Shipped prompt + species prefill | 48 | 48 | 1 |

Before: "Look for movement in the oak trees" (there were no oak trees in the facts). After: "Dark-eyed Junco was heard, chirping steadily." / Next: "Walk to the edge of the field, carefully observing."

The trade-off: the notes are grounded but plain. Asking for more vivid writing made the 1B model invent branches and nests. For a notebook that should record only what you heard, I chose grounded.

If Gemma is slow or fails, a template note is saved after a 30-second soft timeout, and Gemma's text replaces it when it finishes.

### Numbers from the phone

Measured on a **Samsung Galaxy S23 Ultra** (Snapdragon 8 Gen 2, Android 16), debug build, from the app's metrics export. It's a flagship, so this is a best case.

| Step | S23 Ultra (median) |
|---|---|
| BirdNET per 3 s window | 53 ms (p90 60 ms) |
| Capture end to species on screen | 282 ms |
| Gemma load | 0.9 s (2.2 s first cold load) |
| Gemma time to first token | 0.83 s |
| Gemma decode | 39 tok/s |
| One note (17 to 68 tokens) | 0.5 to 2.7 s |
| Mic start-up | about 180 ms (9 s capture took 9.18 s) |

Gemma is configured with `n_gpu_layers: 0` on Android, although llama.rn reports a GPU device. I haven't confirmed yet whether OpenCL takes any of the work.

### What didn't work (yet)

- **Non-bird classes leaked into alternates.** The bulbul screenshot lists "Human whistle". BirdNET's 11 environmental classes (Dog, Siren...) are now filtered from alternates and from Gemma's prompt. If one clearly wins, the card says it didn't catch a bird.
- **No location filter.** BirdNET can suggest a species that doesn't live where you are, which is why the card shows alternates and confidence words. BirdNET's location model is the next step.
- **The APK is 134 MB** with no models inside, mostly llama.rn's several CPU-specific native builds.
- **Battery and RAM aren't measured yet.** The phone was on USB power for every run.

## Why Does Open Innovation Matter?

Each point below is something a closed, cloud-only API could not do for this app.

**1. It works where the signal stops.** Both models are files on the phone, so Listen, the species card, the Gemma note and the journal all run in airplane mode. I checked that on the S23 Ultra: the bulbul was named and the note written with no network. (The debug build loads its JavaScript from my laptop; the models and inference were all on the phone.)

**2. Your audio never leaves the phone.** The 9-second recording is analysed in memory and thrown away, never saved or uploaded. Location is optional, rounded to about 1 km, and stays in the local journal. A cloud bird-ID API would need your microphone audio and location on someone else's machine.

**3. It costs nothing per use.** You pay one download: 748 MB in total. On my home Wi-Fi, Gemma's 722 MB took 325 seconds and BirdNET took 12.8 seconds. After that, every listen and every note is free, with no API key and no rate limit.

**4. The model is a setting, not a contract.** Gemma is one entry in `src/config.ts`: URL, filename and exact byte size. The app already switches to Gemma 3 270M (292 MB) with one environment variable. A newer Gemma, or one fine-tuned on field-journal writing, is a config change behind a small `NoteWriter` interface.

**5. Open means I can check it.** The downloaded Gemma file's SHA-256 matches its Hugging Face listing. The BirdNET file is byte-identical to the one in the official Zenodo release. Because the weights and the prompt format are open, I could see the echo problem, fix it with a prefill, and measure the fix on the same model the phone runs.

### Licenses

"Open" doesn't mean the same thing for both models:

- **BirdNET V2.4** is open-weight but **non-commercial** (CC BY-NC-SA 4.0). Trail Notebook is free and non-commercial, and the weights are downloaded at first run, not bundled in the repo or the APK.
- **Gemma 3** is open-weight under the Gemma Terms of Use. *Gemma is provided under and subject to the Gemma Terms of Use found at [ai.google.dev/gemma/terms](https://ai.google.dev/gemma/terms).*
- The app code is MIT.

### Credits

- **BirdNET:** Stefan Kahl, Connor M. Wood, Maximilian Eibl and Holger Klinck; K. Lisa Yang Center for Conservation Bioacoustics (Cornell Lab of Ornithology) and Chemnitz University of Technology. Model DOI [10.5281/zenodo.15050749](https://doi.org/10.5281/zenodo.15050749). CC BY-NC-SA 4.0.
- **Gemma 3 1B IT:** Google DeepMind, [Gemma Terms of Use](https://ai.google.dev/gemma/terms). GGUF conversion by [Unsloth](https://huggingface.co/unsloth/gemma-3-1b-it-GGUF).
- **Mirrors:** the unzipped TFLite file from [whoBIRD-TFlite](https://github.com/woheller69/whoBIRD-TFlite) (woheller69), labels from [tphakala/BirdNET-v2.4](https://huggingface.co/tphakala/BirdNET-v2.4).
- **Libraries:** llama.cpp and llama.rn (MIT), react-native-fast-tflite (MIT), react-native-audio-api by Software Mansion (MIT).
- **Prior art:** [BirdNET Live](https://github.com/birdnet-team/birdnet-live-app) and [whoBIRD](https://github.com/woheller69/whoBIRD) already do offline bird ID on phones. Trail Notebook adds the journal, the NEXT nudge and the React Native stack.

## Field test: coming this weekend

Everything above was tested indoors. The plan for this weekend is to take Trail Notebook outside with the phone unplugged and in airplane mode, and log real birds through the phone mic. I want to know three things: how often the species matches what I can confirm, how the notes read for real moments, and how much battery a walk costs.

I'll update this post with what happened, including what went wrong.

## Prize Categories

- **Best Use of Gemma:** Gemma 3 1B IT runs fully on the phone through llama.rn and writes every journal entry and NEXT nudge, online or offline. The prompt was tuned on the same GGUF the phone runs.
