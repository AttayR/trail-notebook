import { NOTE_PREFILL, toGemmaPrompt } from '../llm/gemmaFormat';

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
