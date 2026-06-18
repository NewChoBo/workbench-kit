import { IconButton } from '../../primitives/IconButton';
import type {
  WorkbenchChatConversation,
  WorkbenchChatConversationLabels,
} from './chatConversation';

export interface ChatHistoryMenuRowProps {
  conversation: WorkbenchChatConversation;
  isActive: boolean;
  labels: WorkbenchChatConversationLabels;
  canDeleteAny: boolean;
  onActivate: () => void;
  onDelete: () => void;
  onOpenRowMenu: (anchor: { x: number; y: number }) => void;
}

export function ChatHistoryMenuRow({
  conversation,
  isActive,
  labels,
  canDeleteAny,
  onActivate,
  onDelete,
  onOpenRowMenu,
}: ChatHistoryMenuRowProps) {
  return (
    <div
      className="chat-history-menu__row"
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpenRowMenu({ x: event.clientX, y: event.clientY });
      }}
    >
      <button
        className="ui-context-menu__item chat-history-menu__select"
        role="menuitem"
        title={
          typeof conversation.metaSummary === 'string'
            ? conversation.metaSummary
            : conversation.title
        }
        type="button"
        onClick={onActivate}
      >
        <span className="ui-context-menu__icon">
          <i
            aria-hidden="true"
            className={`codicon ${isActive ? 'codicon-check' : 'codicon-comment-discussion'}`}
          />
        </span>
        <span className="ui-context-menu__label chat-history-menu__label">
          <span className="chat-history-menu__title">{conversation.title}</span>
          {conversation.metaSummary ? (
            <span className="chat-history-menu__meta">{conversation.metaSummary}</span>
          ) : null}
        </span>
      </button>

      <IconButton
        className="chat-history-menu__delete"
        compact
        disabled={!canDeleteAny}
        icon="codicon-trash"
        label={canDeleteAny ? labels.deleteChat(conversation.title) : labels.cannotDeleteLast}
        variant="danger"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
      />
    </div>
  );
}
