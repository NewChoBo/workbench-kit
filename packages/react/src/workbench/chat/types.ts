import type { ReactNode } from 'react';

export type ChatMessageSource = 'assistant' | 'user';

/** `assistant` = markdown AI replies; `peer` = direct messages with bubbles on both sides. */
export type ChatMessageLayout = 'assistant' | 'peer';

export interface ChatMessage {
  content: string;
  createdAt?: string;
  id: string;
  label?: ReactNode;
  source: ChatMessageSource;
}
