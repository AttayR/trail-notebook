# User hands-on checks (reported by the user in chat)

## 2026-10-08 — Samsung Galaxy S23 Ultra (SM-S918B, Android 16, debug build)
- Tried both modes: Listen (mic → BirdNET → Gemma) and manual observation.
- Both worked the same as on the iOS simulator.
- Gemma note appeared in ~3–4 s (user's estimate, not instrumented).
- Network: WiFi ON during this check (not an offline test).
- Listen returned a bird species name (which species and correctness not yet reported).

## 2026-10-08 — Offline check on S23 Ultra (user-run)
- Phone in **airplane mode**.
- Played a **Yellow-vented Bulbul** call from a YouTube recording (on another device) to the phone mic — indoor sanity test, NOT a field recording.
- Listen mode **correctly identified Yellow-vented Bulbul** while offline.
- Gemma produced the note offline, with Next suggestion: "walk to the corner of the garden, observe the area".
- ✅ Offline claim verified by the user on a real phone (Listen + Gemma). Still to capture: screenshots, instrumented timings.
- Screenshot: post/assets/s23-offline-bulbul-result.png — top: Yellow-vented Bulbul (Pycnonotus goiavier) "very likely"; alternates: Pacific Koel (possible), Human whistle (possible). Total shown "11.3 s" (includes ~9 s listening). Spot: "Back garden". Label "written by Gemma on this phone".
- Observation: a non-bird class ("Human whistle") appears in alternates — consider hiding BirdNET non-bird labels from the alternates list.
