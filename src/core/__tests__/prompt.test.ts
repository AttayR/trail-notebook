import { confidenceWord } from '../birdnet/confidence';
import { buildListenPrompt, buildManualPrompt, MANUAL_MAX_CHARS, sanitizeInput } from '../llm/prompt';
import type { Detection } from '../types';

const ctx = { date: new Date(2026, 9, 8, 7, 42), lat: 31.52, spotName: 'Riverside path', alreadyToday: ['Rose-ringed Parakeet'] };
const dets: Detection[] = [
  { labelIndex: 1, scientific: 'Acridotheres tristis', common: 'Common Myna', confidence: 0.91, rank: 1 },
  { labelIndex: 2, scientific: 'Passer domesticus', common: 'House Sparrow', confidence: 0.22, rank: 2 },
  { labelIndex: 3, scientific: 'Corvus splendens', common: 'House Crow', confidence: 0.05, rank: 3 },
];

describe('confidenceWord', () => {
  it('maps boundaries', () => {
    expect(confidenceWord(0.8)).toBe('very likely');
    expect(confidenceWord(0.79)).toBe('likely');
    expect(confidenceWord(0.5)).toBe('likely');
    expect(confidenceWord(0.15)).toBe('possible');
    expect(confidenceWord(0.149)).toBeNull();
  });
});

describe('buildListenPrompt', () => {
  const [msg] = buildListenPrompt(dets, ctx);
  it('is one user message', () => {
    expect(buildListenPrompt(dets, ctx)).toHaveLength(1);
    expect(msg.role).toBe('user');
  });
  it('contains species as words with confidence words', () => {
    expect(msg.content).toContain('Common Myna (very likely); House Sparrow (possible)');
    expect(msg.content).toContain('- Time: 07:42, early morning, autumn');
    expect(msg.content).toContain('- Place: Riverside path');
    expect(msg.content).toContain('- Already logged today: Rose-ringed Parakeet');
  });
  it('drops low-confidence species and has no raw scores', () => {
    expect(msg.content).not.toContain('House Crow');
    expect(msg.content).not.toMatch(/0\.\d/);
  });
  it('ends with the two-line instruction', () => {
    expect(msg.content).toMatch(/NOTE: .*\nNEXT: .*$/);
  });
  it('says nothing clear when empty', () => {
    expect(buildListenPrompt([], { date: ctx.date })[0].content).toContain('nothing clear');
  });
});

describe('buildManualPrompt', () => {
  it('contains the walker text and the do-not-state line', () => {
    const [m] = buildManualPrompt('small brown bird, rising whistle', ctx);
    expect(m.content).toContain('- The walker noticed: "small brown bird, rising whistle"');
    expect(m.content).toContain('Do not state a species identity as fact.');
    expect(m.content).not.toContain('Heard (identified');
  });
  it('truncates input to the max length and neutralises quotes/newlines', () => {
    const long = 'a'.repeat(500);
    const [m] = buildManualPrompt(long, ctx);
    expect(m.content).toContain(`"${'a'.repeat(MANUAL_MAX_CHARS)}"`);
    expect(m.content).not.toContain('a'.repeat(MANUAL_MAX_CHARS + 1));
    expect(sanitizeInput('two\nlines "quoted"')).toBe("two lines 'quoted'");
  });
  it('omits place when no spot name', () => {
    const [m] = buildManualPrompt('crows', { date: ctx.date });
    expect(m.content).not.toContain('- Place:');
  });
});
