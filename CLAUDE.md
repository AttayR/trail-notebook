# HF26 Touch Grass — DEV Hacktoberfest Open-Source AI Challenge (Week 1)

Goal: build a brand-new project with **open-source AI at its core** that gets people
**off the screen and outdoors**, then publish a winning write-up on DEV.

- Challenge page: https://dev.to/challenges/hacktoberfest-week1-2026-10-05
- **Hard deadline: 2026-10-11 23:59 PDT** (= 2026-10-12 ~11:59 AM PKT). Aim to publish by 2026-10-11 evening PKT.
- Required tags: `#devchallenge` `#hf26challenge` (the submission template adds them).
- Judging (in order of weight): **Writing quality** (heaviest) → Relevance to theme → Creativity → Technical execution → Partner tech (optional).
- Bonus: actually take it outside, use it, and report how it went.
- Optional but valued: embed the agent session (DevRelay / Entire).

Owner: React Native developer (Expo/RN experience). Default stack is React Native + on-device open-weight inference.

## Workflow
Follow `PLAN.md`. Phases map to agents in `.claude/agents/` and skills in `.claude/skills/`:

| Phase | Agent | Skills |
|---|---|---|
| 1. Research & idea lock | `challenge-researcher` | `hf26-rules` |
| 2. Architecture | `app-architect` | `on-device-ai-rn`, `hf26-rules` |
| 3. Build | `rn-builder` | `on-device-ai-rn` |
| 4. QA + field test | `qa-tester` | `field-test-log` |
| 5. Write-up | `devto-writer` | `devto-submission`, `hf26-rules` |
| 6. Final review | `submission-reviewer` | `hf26-rules`, `devto-submission` |

## Hard rules
- Never publish, post, comment, or submit anything on DEV/GitHub without explicit user "yes" in chat.
- Never enter passwords, API keys, or tokens into websites; the user does logins and key entry.
- The open-source/open-weight pieces must be what makes the project work — not a decoration on a closed API.
- Respect model licenses (check before shipping; note them in README and post).
