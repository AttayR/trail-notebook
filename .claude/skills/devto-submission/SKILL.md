---
name: devto-submission
description: How to draft, format, check, and (only with user confirmation) open the DEV editor for the HF26 Week 1 submission post. Use when writing, reviewing, or preparing to publish the post.
---
# DEV submission post

## Template (exact section order)
```markdown
---
title:
published: false
tags: devchallenge, hf26challenge
cover_image:
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05)*

## What I Built
<!-- What does it do, how does it get people off the screen and into the world? Who is it for? -->

## Demo
<!-- Deployed link or video demo. -->

## Code
<!-- {% embed https://github.com/USER/REPO %} -->

## How I Built It
<!-- Which open-source AI (open-weight models, harnesses, frameworks, local inference) and how the project is built around it. -->

## Why Does Open Innovation Matter?
<!-- What did open make possible that a closed API wouldn't? -->

## My Agent Session
<!-- Optional. DevRelay embed with agent_session tag, or a link. -->

## Prize Categories
<!-- List every partner category entered, or remove section. -->
```
DEV tags allow max 4; the two required ones must stay. Good extras: `reactnative`, `ai`, `opensource`, `mobile`.

Prefilled editor URL: the "Submission Template" link on the challenge page (`https://dev.to/new?prefill=...`).

## Writing guidance (writing quality is weighted most)
- Hook in first 3 lines: a real outdoor moment.
- One idea per paragraph, ≤ 4 lines each. Headings + images every ~250 words.
- Concrete numbers (latency, model size, offline proof, battery).
- Short code snippets only where they teach something.
- Honest about limitations and what you'd do next.
- Liquid embeds: `{% embed URL %}` for GitHub, YouTube, etc.

## Pre-publish checklist
- [ ] Title is specific and catchy (not "My submission")
- [ ] Both required tags present; ≤ 4 tags total
- [ ] All template sections present in order
- [ ] Demo video/link works in incognito
- [ ] GitHub repo is public, has README, license, model attribution
- [ ] "Why open matters" has at least 2 concrete, measured points
- [ ] Field-test section is real (photos), not invented
- [ ] Prize categories listed match actual integrations
- [ ] Cover image set (1000×420)
- [ ] Spell/grammar pass
- [ ] Published before 2026-10-11 23:59 PDT

## Publishing
Claude may open the prefilled editor and paste the draft with `published: false`. **The user reviews and clicks Publish themselves**, or explicitly confirms in chat before Claude clicks it.
