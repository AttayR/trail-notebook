// Gemma 3 chat format, applied by hand so we can prefill the model turn.
// Prefilling "NOTE:" makes the 1B model start the answer in our format instead of
// echoing the instructions (seen in the first simulator run, see build-log T5).
import type { ChatMessage } from '../types';

export const NOTE_PREFILL = 'NOTE:';

export function toGemmaPrompt(messages: ChatMessage[], prefill = NOTE_PREFILL): string {
  // Gemma has no system role: fold any system text into the first user turn.
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content);
  const turns = messages.filter((m) => m.role !== 'system');
  let out = '';
  turns.forEach((m, i) => {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const content = i === 0 && system.length ? `${system.join('\n')}\n\n${m.content}` : m.content;
    out += `<start_of_turn>${role}\n${content}<end_of_turn>\n`;
  });
  return `${out}<start_of_turn>model\n${prefill}`;
}
