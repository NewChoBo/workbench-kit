import { useEffect, useRef } from 'react';
import { SideBarScrollSpacer } from '../../layout/SideBarViewFrame';
import { cx } from '../../utils/cx';
import { ChatMessageItem, type ChatMessageItemProps } from './ChatMessageItem';
import { shouldShowChatMessageTimestamp, shouldShowPeerChatSenderLabel } from './chatMessageGrouping';
import type { ChatMessage, ChatMessageLayout } from './types';

export interface ChatMessageListProps {
  assistantLabel?: string;
  emptyLabel?: string;
  isStreaming?: boolean;
  messageLayout?: ChatMessageLayout;
  messages: ChatMessage[];
  onCommandProposalAllow?: ChatMessageItemProps['onCommandProposalAllow'];
  onCommandProposalDeny?: ChatMessageItemProps['onCommandProposalDeny'];
  userLabel?: string;
}

export function ChatMessageList({
  assistantLabel,
  emptyLabel = 'How can I help?',
  isStreaming = false,
  messageLayout = 'assistant',
  messages,
  onCommandProposalAllow,
  onCommandProposalDeny,
  userLabel,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const emptyIconClass =
    messageLayout === 'peer' ? 'codicon-comment-discussion' : 'codicon-sparkle';
  const resolvedUserLabel = userLabel ?? (messageLayout === 'peer' ? 'Jay' : undefined);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [isStreaming, messages.length]);

  if (messages.length === 0) {
    return (
      <div className="message-empty">
        <i className={cx('codicon', emptyIconClass)} />
        <span>{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message, index) => (
        <ChatMessageItem
          key={message.id}
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
      ))}
      <SideBarScrollSpacer ref={bottomRef} />
    </div>
  );
}
