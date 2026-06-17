import { useEffect, useRef } from 'react';
import { SideBarScrollSpacer } from '../../layout/SideBarViewFrame';
import { ChatMessageItem } from './ChatMessageItem';
import type { ChatMessage } from './types';

export interface ChatMessageListProps {
  assistantLabel?: string;
  emptyLabel?: string;
  isStreaming?: boolean;
  messages: ChatMessage[];
}

export function ChatMessageList({
  assistantLabel,
  emptyLabel = 'How can I help?',
  isStreaming = false,
  messages,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [isStreaming, messages.length]);

  if (messages.length === 0) {
    return (
      <div className="message-empty">
        <i className="codicon codicon-sparkle" />
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
          message={message}
        />
      ))}
      <SideBarScrollSpacer ref={bottomRef} />
    </div>
  );
}
