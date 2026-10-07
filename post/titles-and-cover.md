# Titles and cover brief (draft, 2026-10-07)

## Title options

1. **Trail Notebook: a phone that hears the birds and writes your field notes, with no signal**
   Says what it does and the offline angle in one line. Current working title.
2. **I put BirdNET and Gemma on my phone and went for a walk in airplane mode**
   First-person, story-led; matches the field-test bonus. Only use it if the field test really happens in airplane mode.
3. **Nine seconds of birdsong, two lines of notes: an offline field journal in React Native**
   Leads with the 10-second interaction (screen as the shortest part). Change "nine" if the capture length changes.
4. **Hear it, note it, pocket it: on-device bird ID and a Gemma field journal**
   Short and rhythmic; good on social cards.
5. **No signal, no cloud, no problem: building an offline birding notebook with open models**
   Puts "why open matters" in the title. Slightly more generic; weakest of the five.

Recommendation: 1 or 2. Pick 2 only after the airplane-mode walk is logged in docs/field-test.md.

## Cover image brief (1000 x 420 px)

- **Concept:** the screen is the smallest thing in the frame. An outdoor scene with a phone that is clearly secondary to the place.
- **Preferred source:** a real photo from the field test (not stock, not AI-generated), so the cover matches the story. Shot on a path or riverbank at early morning or golden hour, a hand holding the phone low at the lower right, showing the result card (species + NOTE/NEXT). Trees, sky or water fill the other two-thirds.
- **Composition:** wide landscape crop. Keep the key content inside the centre 900 x 360 safe area, because DEV crops covers differently on feed cards and mobile. Phone in the right third; the left third stays quiet for the text overlay.
- **Text overlay (optional, left third):** "Trail Notebook" in a bold sans-serif, and below it in a smaller size: "Bird ID + field notes, fully offline". Avoid more than 8 words. White text with a subtle dark gradient behind it for contrast.
- **Small visual cue:** an airplane-mode icon in the phone's status bar (real, not drawn on) makes the offline point without words.
- **Palette:** natural greens and warm autumn tones; app accent colour from `src/theme.ts` for the title only.
- **Avoid:** robot or brain imagery, glowing "AI" graphics, logos of Google/Gemma/BirdNET (trademark use), emoji, faces of strangers.
- **Fallback if no usable field photo:** a flat illustration of a path with a single bird silhouette on a branch and a small phone outline with two text lines on screen, same layout and palette. Mark it as an illustration, not a field photo.
- **Export:** 1000 x 420 PNG or JPG, under 1 MB. Check legibility at 50% size (feed thumbnail).
