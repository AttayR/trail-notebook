---
name: field-test-log
description: Template and process for the outdoor field test (the challenge's bonus points) — what to capture outside and how to turn it into evidence for the post. Use before and after the user takes the app outside.
---
# Field test log

Never invent field results. Only record what the user did, saw, and captured.

## Before going out (checklist for the user)
- [ ] Models downloaded; phone in **airplane mode** (screenshot as proof)
- [ ] Battery % noted
- [ ] Screen recorder ready; camera for photos of the place and you using it
- [ ] Plan 20–30 min in a park/garden/trail

## Template → `docs/field-test.md`
```markdown
# Field Test — <date>, <place (general, no exact home address)>
- Device / OS:
- Start battery: __%  End battery: __%
- Network: airplane mode ✅/❌
- Duration: __ min

## What happened (timeline)
| Time | What I did | What the app said | Correct? | Notes |
|---|---|---|---|---|

## Numbers
- Detections attempted / correct:
- Avg response time:
- Screen time vs total time outside: __ / __ min

## Moments worth writing about
- (funny, surprising, failed, delightful)

## What broke / what I'd change

## Media
- photos/…  video/…
```
Afterward: compress photos (≤ 300 KB each) into `post/assets/`, and hand the log to `devto-writer`.
Privacy: blur faces of strangers and exact home location in media.
