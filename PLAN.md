# End-to-End Plan — HF26 Week 1 "Touch Grass"

Today: **Wed 2026-10-07**. Deadline: **Sun 2026-10-11 23:59 PDT**. ~4.5 days.
Status legend: [ ] todo · [~] in progress · [x] done · 👤 = needs the user

---

## Phase 0 — Setup (Wed, 1h)
- [x] Read challenge rules, template, judging, partner categories
- [x] Project folder + agents + skills + this plan
- [x] Idea locked: **Trail Notebook** (2026-10-07)
- [ ] 👤 Claim partner credits at hacktoberfest.com/my/promos (user logs in themselves)
- [ ] 👤 Click "Sign Up" on the challenge page (optional, for tracking)

## Phase 1 — Research & idea lock (Wed) · agent: `challenge-researcher`
- [ ] Scan already-published entries ("View Entries") → avoid duplicate ideas, find gaps
- [ ] Verify the chosen model runs on-device in RN (library, model size, license)
- [ ] Choose 1–3 partner categories that fit naturally (don't force them)
- Output: `docs/research.md` (idea, differentiator, model + license, partner picks, risks)

### Idea shortlist (recommendation first)
1. **Trail Notebook (recommended)** — offline RN app: hold the phone up, it listens to birdsong
   (BirdNET, on-device TFLite), and a local **Gemma** model turns sightings + GPS + weather-free
   context into a short field-journal entry and a "what to look for next 500 m" prompt. Works with
   zero signal. Screen time = seconds. Partner fits: **Gemma ($200)**, optional ElevenLabs
   (voice field notes), Entire (agent session).
2. **Frost-Date Garden Coach** — offline planner: user's location → frost dates (bundled open
   dataset) → local Gemma tells you what to plant/harvest *this week*, then pushes you outside
   with a 10-min garden task. Partner fits: Gemma, TabPFN (predict frost/yield from CSV).
3. **Foliage Run Router** — picks loop routes with the best fall color using open map data +
   a small open model. Higher risk (map data, routing) for 4 days.

Why #1: strongest "no signal on the trail" story (perfect for the *why open matters* section),
fits the RN skill set, can be field-tested this week for the bonus.

## Phase 2 — Architecture (Wed night) · agent: `app-architect`
- [ ] Screen flow (max 3 screens; screen should be the shortest part of the experience)
- [ ] Model pipeline: audio → BirdNET → species list → Gemma (llama.rn, GGUF, small quant) → note
- [ ] Model delivery: download-once on Wi-Fi, then fully offline; size budget
- [ ] Fallback plan if on-device LLM is too slow (smaller quant / template notes)
- Output: `docs/architecture.md` + task breakdown

## Phase 3 — Build (Thu–Fri) · agent: `rn-builder`
- [x] Expo app scaffold (dev build, not Expo Go — native modules needed) — iOS simulator verified; Android build pending
- [~] Audio capture + BirdNET inference — core audio maths + BirdNET post-processing done and tested (T8); model spike (T9) and mic (T10) pending
- [x] Local LLM integration + prompt for field notes (Gemma 3 1B via llama.rn; manual-observation mode end to end)
- [~] Offline journal storage (SQLite) + simple map/log — SQLite journal done; no map (cut per architecture)
- [~] README with license notes, setup, model download steps — drafted; BirdNET file details pending T9
- [ ] 👤 Create public GitHub repo (Claude prepares; user approves push)

## Phase 4 — QA + Field test (Fri evening–Sat) · agent: `qa-tester`
- [ ] Airplane-mode test end to end (proves offline claim)
- [ ] Measure: model load time, inference latency, battery, app size
- [ ] 👤 **Go outside** (park/garden), use it 20–30 min, take photos + screen recording
- [ ] Log everything in `docs/field-test.md` via `field-test-log` skill
- [ ] 👤 Record a 60–90 s demo video (upload to YouTube unlisted / Loom)

## Phase 5 — Write-up (Sat) · agent: `devto-writer`
- [ ] Draft post in `post/submission.md` following the official template sections
- [ ] Story first: the moment outside, then the build, then "why open matters" with real numbers
- [ ] Cover image, demo embed, GitHub embed, partner categories section
- [ ] Optional: export agent session (DevRelay/Entire) and embed

## Phase 6 — Review & publish (Sun, before noon PKT buffer) · agent: `submission-reviewer`
- [ ] Score draft against judging criteria; fix weak spots
- [ ] Rules checklist (tags, template sections, links work, repo public, license)
- [ ] 👤 Paste into DEV editor (Claude can open the prefilled template) → user reviews → **user confirms publish**
- [ ] Share link in MLH Discord / launch post comments (👤 confirm each post)

---

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| LLM too slow/large on phone | Gemma small quant (~1B class); cap tokens; template fallback |
| Native module build issues | Use Expo dev build early (Thu morning), test on real device first |
| Time crunch | Cut map/extra screens first; never cut field test or writing time |
| License conflict (e.g., non-commercial model) | Keep project non-commercial, state license clearly |
| Deadline time zone | Publish by Sun PKT evening, well before PDT cutoff |
