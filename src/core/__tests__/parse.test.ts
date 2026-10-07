import { finalizeNote, parseNote } from '../llm/parse';
import { templateListenNote, templateManualNote } from '../llm/template';

const fallback = { note: 'fallback note', next: 'fallback next' };

describe('parseNote', () => {
  it('parses well-formed output', () => {
    expect(parseNote('NOTE: A myna called from the wall.\nNEXT: Listen for a reply near the hedge.')).toEqual({
      note: 'A myna called from the wall.',
      next: 'Listen for a reply near the hedge.',
    });
  });
  it('is case-insensitive and strips markdown and stop tokens', () => {
    expect(parseNote('**note:** Quiet path.\n**Next:** Look up.<end_of_turn>')).toEqual({
      note: 'Quiet path.',
      next: 'Look up.',
    });
  });
  it('joins a multi-line NOTE', () => {
    expect(parseNote('NOTE: Line one.\nLine two.\nNEXT: Go.')?.note).toBe('Line one. Line two.');
  });
  it('handles missing NEXT', () => {
    expect(parseNote('NOTE: Just a note.')).toEqual({ note: 'Just a note.', next: '' });
  });
  it('ignores chatter before NOTE', () => {
    expect(parseNote("Sure! Here is your entry:\nNOTE: Crows overhead.\nNEXT: Watch the tallest tree.")).toEqual({
      note: 'Crows overhead.',
      next: 'Watch the tallest tree.',
    });
  });
  it('falls back to first sentences when there are no labels', () => {
    expect(parseNote('A sparrow hopped by. It was bold. Then it left. More text.')?.note).toBe(
      'A sparrow hopped by. It was bold.',
    );
  });
  it('returns null for empty or only stop tokens', () => {
    expect(parseNote('')).toBeNull();
    expect(parseNote('  <end_of_turn> ')).toBeNull();
  });
});

describe('finalizeNote', () => {
  it('uses gemma output when parseable', () => {
    const r = finalizeNote('NOTE: n.\nNEXT: x.', fallback);
    expect(r).toMatchObject({ note: 'n.', next: 'x.', source: 'gemma' });
  });
  it('fills a missing NEXT from the fallback and keeps source gemma', () => {
    expect(finalizeNote('NOTE: n.', fallback)).toMatchObject({ next: 'fallback next', source: 'gemma' });
  });
  it('switches to template on empty output', () => {
    expect(finalizeNote('', fallback)).toMatchObject({ note: 'fallback note', source: 'template', raw: '' });
  });
});

describe('templates', () => {
  const ctx = { date: new Date(2026, 9, 8, 7, 42), spotName: 'Riverside path' };
  it('listen template names species with words', () => {
    const t = templateListenNote(
      [{ labelIndex: 0, scientific: 'x', common: 'Common Myna', confidence: 0.6, rank: 1 }],
      ctx,
    );
    expect(t.note).toBe('07:42, early morning in autumn at Riverside path. Heard Common Myna (likely).');
    expect(t.next.length).toBeGreaterThan(10);
  });
  it('listen template handles no detections', () => {
    expect(templateListenNote([], ctx).note).toContain('Nothing clear');
  });
  it('manual template quotes the observation and is deterministic', () => {
    const a = templateManualNote('three crows chasing a hawk!', ctx);
    expect(a.note).toContain('Noticed: three crows chasing a hawk.');
    expect(templateManualNote('x', ctx).next).toBe(a.next);
  });
});
