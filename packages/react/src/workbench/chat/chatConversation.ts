import type { ReactNode } from 'react';

export interface WorkbenchChatConversation {
  id: string;
  title: string;
  /** Short secondary line shown in history menu rows. */
  metaSummary?: string | undefined;
  /** Tooltip content for the active conversation pill. */
  metaTooltip?: ReactNode | undefined;
}

export interface WorkbenchChatConversationLabels {
  ariaHistoryMenu: string;
  cancel: string;
  cannotDeleteLast: string;
  closeRename: string;
  delete: string;
  deleteChat: (title: string) => string;
  historyTitle: (title: string) => string;
  moreActions: string;
  newChat: string;
  newChatAction: string;
  rename: string;
  renameDialogTitle: string;
  renameEmptyError: string;
  renameFieldLabel: string;
  renameSubmit: string;
}

export const defaultWorkbenchChatConversationLabels: WorkbenchChatConversationLabels = {
  ariaHistoryMenu: 'Chat history',
  cancel: 'Cancel',
  cannotDeleteLast: 'Cannot delete the last chat',
  closeRename: 'Close rename dialog',
  delete: 'Delete',
  deleteChat: (title) => `Delete chat: ${title}`,
  historyTitle: (title) => `Chat history: ${title}`,
  moreActions: 'Chat actions',
  newChat: 'New chat',
  newChatAction: 'New chat',
  rename: 'Rename',
  renameDialogTitle: 'Rename chat',
  renameEmptyError: 'Enter a chat name.',
  renameFieldLabel: 'Chat name',
  renameSubmit: 'Rename',
};
