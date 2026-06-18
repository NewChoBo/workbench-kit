import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { ContextMenu, type ContextMenuItem } from '../../overlay/ContextMenu';
import { IconButton } from '../../primitives/IconButton';
import { ChatHistoryMenu } from './ChatHistoryMenu';
import type {
  WorkbenchChatConversation,
  WorkbenchChatConversationLabels,
} from './chatConversation';
import { defaultWorkbenchChatConversationLabels } from './chatConversation';

export interface ChatConversationBarProps {
  activeConversationId: string;
  conversations: readonly WorkbenchChatConversation[];
  labels?: Partial<WorkbenchChatConversationLabels> | undefined;
  moreMenuItems?: readonly ContextMenuItem[] | undefined;
  onActivate: (conversationId: string) => void;
  onCreate: () => void;
  onDelete: (conversationId: string) => void;
  onRename: (conversationId: string, title: string) => void;
  /** Optional slot for a second pill next to the active conversation control. */
  secondaryPill?: ReactNode | undefined;
}

export function ChatConversationBar({
  activeConversationId,
  conversations,
  labels: labelOverrides,
  moreMenuItems,
  onActivate,
  onCreate,
  onDelete,
  onRename,
  secondaryPill,
}: ChatConversationBarProps) {
  const labels = { ...defaultWorkbenchChatConversationLabels, ...labelOverrides };
  const pillRef = useRef<HTMLButtonElement>(null);
  const metaTooltipId = useId();
  const [menu, setMenu] = useState<{ kind: 'history' | 'more'; x: number; y: number } | null>(null);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId,
  );
  const activeTitle = activeConversation?.title ?? labels.newChat;

  const openMenu = useCallback((kind: 'history' | 'more', anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    setMenu({
      kind,
      x: rect.left,
      y: rect.bottom + 4,
    });
  }, []);

  const closeMenu = useCallback(() => {
    setMenu(null);
  }, []);

  return (
    <>
      <div className="chat-conversation-bar">
        <div className="chat-conversation-bar__pill-wrap">
          <button
            ref={pillRef}
            aria-describedby={activeConversation?.metaTooltip ? metaTooltipId : undefined}
            aria-expanded={menu?.kind === 'history'}
            aria-haspopup="menu"
            aria-label={labels.historyTitle(activeTitle)}
            className="chat-conversation-bar__pill"
            type="button"
            onClick={() => {
              if (pillRef.current) openMenu('history', pillRef.current);
            }}
          >
            <span className="chat-conversation-bar__pill-label">{activeTitle}</span>
            <i aria-hidden="true" className="codicon codicon-chevron-down" />
          </button>

          {activeConversation?.metaTooltip ? (
            <div className="chat-conversation-bar__meta-wrap" id={metaTooltipId} role="tooltip">
              <div className="chat-conversation-bar__meta">{activeConversation.metaTooltip}</div>
            </div>
          ) : null}
        </div>

        {secondaryPill}

        <IconButton
          className="chat-conversation-bar__icon-btn"
          compact
          icon="codicon-add"
          label={labels.newChatAction}
          onClick={() => onCreate()}
        />

        {moreMenuItems?.length ? (
          <IconButton
            className="chat-conversation-bar__icon-btn"
            compact
            icon="codicon-ellipsis"
            label={labels.moreActions}
            onClick={(event) => openMenu('more', event.currentTarget)}
          />
        ) : null}
      </div>

      {menu?.kind === 'history' ? (
        <ChatHistoryMenu
          activeConversationId={activeConversationId}
          conversations={conversations}
          labels={labels}
          x={menu.x}
          y={menu.y}
          onActivate={onActivate}
          onClose={closeMenu}
          onCreate={onCreate}
          onDelete={onDelete}
          onRename={onRename}
        />
      ) : null}

      {menu?.kind === 'more' && moreMenuItems?.length ? (
        <ContextMenu
          ariaLabel={labels.moreActions}
          className="chat-conversation-bar__menu"
          items={[...moreMenuItems]}
          x={menu.x}
          y={menu.y}
          onClose={closeMenu}
        />
      ) : null}
    </>
  );
}
