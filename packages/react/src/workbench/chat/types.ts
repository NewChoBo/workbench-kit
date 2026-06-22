import type { ReactNode } from 'react';

import type { WorkbenchCommandExecutionPolicy } from '../command-model';

export type ChatMessageSource = 'assistant' | 'user';

/** `assistant` = markdown AI replies; `peer` = direct messages with bubbles on both sides. */
export type ChatMessageLayout = 'assistant' | 'peer';

export type ChatCommandProposalStatus =
  | 'pending'
  | 'running'
  | 'allowed'
  | 'denied'
  | 'blocked'
  | 'executed'
  | 'failed';

export interface ChatCommandProposal {
  args?: readonly unknown[] | undefined;
  commandId: string;
  description?: string | undefined;
  id: string;
  label?: string | undefined;
  policy: WorkbenchCommandExecutionPolicy;
  status: ChatCommandProposalStatus;
}

export interface ChatMessage {
  commandProposals?: readonly ChatCommandProposal[] | undefined;
  content: string;
  createdAt?: string;
  id: string;
  label?: ReactNode;
  source: ChatMessageSource;
}
