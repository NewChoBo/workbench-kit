import { useCallback, useEffect, useRef, useState } from 'react';
import { ContextMenu } from '../../overlay/ContextMenu';
import { useClampedFixedOverlayPosition } from '../../overlay/useClampedFixedOverlayPosition';
import { useFixedOverlayDismiss } from '../../overlay/useFixedOverlayDismiss';
import { Button } from '../../primitives/Button';
import { ChatHistoryMenuRow } from './ChatHistoryMenuRow';
import { ChatRenameDialog } from './ChatRenameDialog';
import type {
  WorkbenchChatConversation,
  WorkbenchChatConversationLabels,
} from './chatConversation';
import { defaultWorkbenchChatConversationLabels } from './chatConversation';
import { buildChatHistoryRowMenuItems } from './chatHistoryRowMenuItems';

export interface ChatHistoryMenuProps {
  activeConversationId: string;
  conversations: readonly WorkbenchChatConversation[];
  labels?: Partial<WorkbenchChatConversationLabels> | undefined;
  x: number;
  y: number;
  onActivate: (conversationId: string) => void;
  onClose: () => void;
  onCreate: () => void;
  onDelete: (conversationId: string) => void;
  onRename: (conversationId: string, title: string) => void;
}

export function ChatHistoryMenu({
  activeConversationId,
  conversations,
  labels: labelOverrides,
  x,
  y,
  onActivate,
  onClose,
  onCreate,
  onDelete,
  onRename,
}: ChatHistoryMenuProps) {
  const labels = { ...defaultWorkbenchChatConversationLabels, ...labelOverrides };
  const ref = useRef<HTMLDivElement>(null);
  const position = useClampedFixedOverlayPosition(ref, { x, y }, conversations.length);
  const [rowMenu, setRowMenu] = useState<{
    conversation: WorkbenchChatConversation;
    x: number;
    y: number;
  } | null>(null);
  const [renameTarget, setRenameTarget] = useState<WorkbenchChatConversation | null>(null);
  const canDeleteAny = conversations.length > 1;

  const handleDeleteConversation = useCallback(
    (conversationId: string) => {
      if (!canDeleteAny) return;
      onDelete(conversationId);
      setRowMenu(null);
      onClose();
    },
    [canDeleteAny, onClose, onDelete],
  );

  const handleEscape = useCallback(() => {
    if (renameTarget) {
      setRenameTarget(null);
      return true;
    }

    if (rowMenu) {
      setRowMenu(null);
      return true;
    }

    return false;
  }, [renameTarget, rowMenu]);

  useFixedOverlayDismiss({
    containerRef: ref,
    ignoreOutsidePointer: Boolean(rowMenu || renameTarget),
    onClose,
    onEscape: handleEscape,
  });

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('.chat-history-menu__select')?.focus();
  }, []);

  return (
    <>
      <div
        ref={ref}
        aria-label={labels.ariaHistoryMenu}
        className="ui-context-menu chat-history-menu"
        role="menu"
        style={{ left: position.x, top: position.y, position: 'fixed' }}
      >
        <Button
          className="ui-context-menu__item"
          role="menuitem"
          onClick={() => {
            onCreate();
            onClose();
          }}
        >
          <span className="ui-context-menu__icon">
            <i aria-hidden="true" className="codicon codicon-add" />
          </span>
          <span className="ui-context-menu__label">{labels.newChat}</span>
        </Button>

        <div className="ui-context-menu__separator" role="separator" />

        {conversations.map((conversation) => (
          <ChatHistoryMenuRow
            key={conversation.id}
            canDeleteAny={canDeleteAny}
            conversation={conversation}
            isActive={conversation.id === activeConversationId}
            labels={labels}
            onActivate={() => {
              onActivate(conversation.id);
              onClose();
            }}
            onDelete={() => handleDeleteConversation(conversation.id)}
            onOpenRowMenu={(anchor) =>
              setRowMenu({
                conversation,
                x: anchor.x,
                y: anchor.y,
              })
            }
          />
        ))}
      </div>

      {rowMenu ? (
        <ContextMenu
          ariaLabel={`${labels.rename}: ${rowMenu.conversation.title}`}
          className="chat-history-menu__row-menu"
          items={buildChatHistoryRowMenuItems(
            rowMenu.conversation,
            labels,
            canDeleteAny,
            () => {
              setRowMenu(null);
              setRenameTarget(rowMenu.conversation);
            },
            () => handleDeleteConversation(rowMenu.conversation.id),
          )}
          x={rowMenu.x}
          y={rowMenu.y}
          onClose={() => setRowMenu(null)}
        />
      ) : null}

      {renameTarget ? (
        <ChatRenameDialog
          key={renameTarget.id}
          conversation={renameTarget}
          labels={labels}
          onCancel={() => setRenameTarget(null)}
          onRename={(title) => {
            onRename(renameTarget.id, title);
            setRenameTarget(null);
            onClose();
          }}
        />
      ) : null}
    </>
  );
}
