import type { ReactNode } from 'react';

import type { WorkbenchCommandExecutionPolicy } from '../commands/command-model';

export type ChatMessageSource = 'assistant' | 'user';

/** `assistant` = markdown AI replies; `peer` = direct messages with bubbles on both sides. */
export type ChatMessageLayout = 'assistant' | 'peer';

export type ChatMessageTone = 'default' | 'error' | 'warning';

export type ChatMessageContentMode = 'plain' | 'markdown';

export type ChatCommandProposalStatus =
  'pending' | 'running' | 'allowed' | 'denied' | 'blocked' | 'executed' | 'failed';

export interface ChatCommandProposal {
  args?: readonly unknown[];
  commandId: string;
  description?: string;
  id: string;
  label?: string;
  policy: WorkbenchCommandExecutionPolicy;
  status: ChatCommandProposalStatus;
}

export type ChatMessageTimestamp = number | Date | string;

export interface ChatMessage {
  commandProposals?: readonly ChatCommandProposal[];
  content: string;
  /**
   * How `content` is rendered. Defaults to markdown for assistant-layout
   * assistant messages; otherwise plain text.
   */
  contentMode?: ChatMessageContentMode;
  createdAt?: string;
  id: string;
  label?: ReactNode;
  source: ChatMessageSource;
  /** Preferred timestamp for display; falls back to `createdAt` when omitted. */
  timestamp?: ChatMessageTimestamp;
  /** Optional visual tone for host-driven status / error messages. */
  tone?: ChatMessageTone;
}
