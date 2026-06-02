import type { ReactNode } from 'react';

export type ChatMessageSource = 'assistant' | 'user';

export interface ChatMessage {
  content: string;
  id: string;
  label?: ReactNode;
  source: ChatMessageSource;
}
