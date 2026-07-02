import { Fragment, type ReactNode } from 'react';
import { SideBarScrollSpacer } from '../../layout/SideBarViewFrame';
import { cx } from '../../utils/cx';
import { ChatMessageItem, type ChatMessageItemProps } from './ChatMessageItem';
import {
  ChatMessageDateDivider,
  resolveChatMessageTimestamp,
  shouldShowChatMessageDateDivider,
  shouldShowChatMessageTimestamp,
  shouldShowPeerChatSenderLabel,
} from './chatMessageMeta';
import type { ChatMessage, ChatMessageLayout } from './types';
import { useChatPrependPagination } from './useChatPrependPagination';

export interface ChatMessageListProps {
  assistantLabel?: string;
  emptyLabel?: string;
  initialVisibleMessageCount?: number;
  isStreaming?: boolean;
  loadOlderLabel?: ReactNode | ((hiddenMessageCount: number) => ReactNode);
  messageLayout?: ChatMessageLayout;
  messages: ChatMessage[];
  onCommandProposalAllow?: ChatMessageItemProps['onCommandProposalAllow'];
  onCommandProposalDeny?: ChatMessageItemProps['onCommandProposalDeny'];
  paginationKey?: string;
  userLabel?: string;
  visibleMessagePageSize?: number;
}

export function ChatMessageList({
  assistantLabel,
  emptyLabel = 'How can I help?',
  initialVisibleMessageCount,
  isStreaming = false,
  loadOlderLabel = 'Show older messages',
  messageLayout = 'assistant',
  messages,
  onCommandProposalAllow,
  onCommandProposalDeny,
  paginationKey = '',
  userLabel,
  visibleMessagePageSize,
}: ChatMessageListProps) {
  const emptyIconClass =
    messageLayout === 'peer' ? 'codicon-comment-discussion' : 'codicon-sparkle';
  const resolvedUserLabel = userLabel ?? (messageLayout === 'peer' ? 'Jay' : undefined);
  const lastMessageId = messages.length > 0 ? (messages[messages.length - 1]?.id ?? '') : '';
  const {
    bottomRef,
    displayedStartIndex,
    hasOlderItems: hasOlderMessages,
    hiddenItemCount: hiddenMessageCount,
    isPaginationEnabled,
    listRef,
    loadOlderItems: loadOlderMessages,
    topSentinelRef,
  } = useChatPrependPagination({
    initialVisibleItemCount: initialVisibleMessageCount,
    isStreaming,
    itemCount: messages.length,
    lastItemId: lastMessageId,
    paginationKey,
    visibleItemPageSize: visibleMessagePageSize,
  });
  const displayedMessages = messages.slice(displayedStartIndex);

  if (messages.length === 0) {
    return (
      <div className={cx('message-empty', 'ui-panel-centered-state')}>
        <i className={cx('codicon', emptyIconClass)} />
        <span>{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div ref={listRef} className="message-list">
      {hasOlderMessages ? (
        <div ref={topSentinelRef} className="message-list__history-loader">
          <button type="button" className="message-list__load-older" onClick={loadOlderMessages}>
            {typeof loadOlderLabel === 'function'
              ? loadOlderLabel(hiddenMessageCount)
              : loadOlderLabel}
            <span className="message-list__load-older-count">({hiddenMessageCount})</span>
          </button>
        </div>
      ) : isPaginationEnabled ? (
        <div ref={topSentinelRef} aria-hidden className="message-list__top-sentinel" />
      ) : null}
      {displayedMessages.map((message, displayedIndex) => {
        const index = displayedStartIndex + displayedIndex;
        const messageTimestamp = resolveChatMessageTimestamp(message);

        return (
          <Fragment key={message.id}>
            {shouldShowChatMessageDateDivider(messages, index) && messageTimestamp ? (
              <ChatMessageDateDivider timestamp={messageTimestamp} />
            ) : null}
            <ChatMessageItem
              assistantLabel={assistantLabel}
              isStreaming={
                isStreaming && index === messages.length - 1 && message.source === 'assistant'
              }
              layout={messageLayout}
              message={message}
              onCommandProposalAllow={onCommandProposalAllow}
              onCommandProposalDeny={onCommandProposalDeny}
              showSenderLabel={
                messageLayout !== 'peer' ||
                shouldShowPeerChatSenderLabel(messages, index, {
                  assistantLabel,
                  userLabel: resolvedUserLabel,
                })
              }
              showTimestamp={shouldShowChatMessageTimestamp(messages, index)}
              userLabel={resolvedUserLabel}
            />
          </Fragment>
        );
      })}
      <SideBarScrollSpacer ref={bottomRef} />
    </div>
  );
}
