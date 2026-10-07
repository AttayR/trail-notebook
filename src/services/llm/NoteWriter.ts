import type { ChatMessage } from '../../core/types';

export type WriterState = 'idle' | 'loading' | 'ready' | 'error';

export interface WriteResult {
  text: string;
  tokens: number;
  ttftMs: number | null;
  totalMs: number;
  tokPerSec: number | null;
  aborted: boolean;
}

export interface NoteWriter {
  readonly modelId: string;
  getState(): WriterState;
  getError(): string | null;
  subscribe(listener: (s: WriterState) => void): () => void;
  load(): Promise<void>;
  write(messages: ChatMessage[], onToken: (accumulated: string) => void, signal?: AbortSignal): Promise<WriteResult>;
  release(): Promise<void>;
}
