import type { ContextMenuItem } from '../../overlay/ContextMenu';
import type {
  WorkbenchChatConversation,
  WorkbenchChatConversationLabels,
} from './chatConversation';

export function buildChatHistoryRowMenuItems(
  conversation: WorkbenchChatConversation,
  labels: WorkbenchChatConversationLabels,
  canDeleteAny: boolean,
  onRename: () => void,
  onDelete: () => void,
): ContextMenuItem[] {
  return [
    {
      icon: 'codicon-edit',
      label: labels.rename,
      onSelect: onRename,
    },
    { type: 'separator', id: `delete-separator-${conversation.id}` },
    {
      danger: true,
      disabled: !canDeleteAny,
      icon: 'codicon-trash',
      label: labels.delete,
      onSelect: onDelete,
    },
  ];
}
