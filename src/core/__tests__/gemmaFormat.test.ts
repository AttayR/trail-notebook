import { listenPrefill, NOTE_PREFILL, toGemmaPrompt } from '../llm/gemmaFormat';
import { parseNote } from '../llm/parse';

describe('toGemmaPrompt', () => {
  it('wraps a single user message and prefills the model turn', () => {
    expect(toGemmaPrompt([{ role: 'user', content: 'Hi' }])).toBe(
      '<start_of_turn>user\nHi<end_of_turn>\n<start_of_turn>model\nNOTE:',
    );
  });
  it('folds system text into the first user turn and maps assistant to model', () => {
    const p = toGemmaPrompt(
      [
        { role: 'system', content: 'S' },
        { role: 'user', content: 'U1' },
        { role: 'assistant', content: 'A1' },
        { role: 'user', content: 'U2' },
      ],
      '',
    );
    expect(p).toBe(
      '<start_of_turn>user\nS\n\nU1<end_of_turn>\n<start_of_turn>model\nA1<end_of_turn>\n<start_of_turn>user\nU2<end_of_turn>\n<start_of_turn>model\n',
    );
    expect(NOTE_PREFILL).toBe('NOTE:');
  });
});

describe('listenPrefill', () => {
  it('adds the top species after NOTE:', () => {
    expect(listenPrefill('Black-capped Chickadee')).toBe('NOTE: Black-capped Chickadee');
    expect(listenPrefill(undefined)).toBe('NOTE:');
  });
  it('a species-prefilled reply parses with the name kept', () => {
    expect(parseNote(`${listenPrefill('Dark-eyed Junco')} trills from low cover.\nNEXT: Wait and listen.`)).toEqual({
      note: 'Dark-eyed Junco trills from low cover.',
      next: 'Wait and listen.',
    });
  });
});
