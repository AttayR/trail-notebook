// Deterministic fallback note + nudge, used when Gemma is unavailable, fails or times out.
import { describeDetections } from './prompt';
import { formatClock, partOfDay, season } from '../context/time';
import type { Detection, ObservationContext, ParsedNote } from '../types';

const NUDGES = [
  'Stand still for one minute and count how many different calls you can hear.',
  'Walk to the nearest tree line and listen for an answer to the first call.',
  'Look up at the highest branches and wires for a perched silhouette.',
  'Find a patch of water or mud and check its edges for movement.',
  'Turn slowly in a full circle and note which direction the loudest sound comes from.',
  'Watch low shrubs at eye level for a quick flick of a tail.',
];

function pickNudge(date: Date): string {
  return NUDGES[(date.getHours() * 60 + date.getMinutes()) % NUDGES.length];
}

function opening(ctx: ObservationContext): string {
  const where = ctx.spotName?.trim() ? ` at ${ctx.spotName.trim()}` : '';
  return `${formatClock(ctx.date)}, ${partOfDay(ctx.date)} in ${season(ctx.date, ctx.lat)}${where}.`;
}

export function templateListenNote(detections: Detection[], ctx: ObservationContext): ParsedNote {
  const heard = describeDetections(detections);
  const body = heard ? `Heard ${heard}.` : 'Nothing clear was heard this time.';
  return { note: `${opening(ctx)} ${body}`, next: pickNudge(ctx.date) };
}

export function templateManualNote(text: string, ctx: ObservationContext): ParsedNote {
  const t = text.replace(/\s+/g, ' ').trim();
  const body = t ? `Noticed: ${t.replace(/[.!?]*$/, '')}.` : 'A quiet moment outside.';
  return { note: `${opening(ctx)} ${body}`, next: pickNudge(ctx.date) };
}
