import type { ChatMessage } from './types';

const chatMessageTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

export type ChatMessageTimestampInput = number | Date | string;

export function normalizeChatMessageTimestamp(
  value: ChatMessageTimestampInput | undefined,
): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

export function resolveChatMessageTimestamp(
  message: Pick<ChatMessage, 'createdAt' | 'timestamp'>,
): ChatMessageTimestampInput | undefined {
  if (message.timestamp !== undefined) {
    return message.timestamp;
  }

  if (message.createdAt !== undefined) {
    return message.createdAt;
  }

  return undefined;
}

export function formatChatMessageTime(value: ChatMessageTimestampInput): string {
  const date = normalizeChatMessageTimestamp(value);
  if (!date) {
    return '';
  }

  return chatMessageTimeFormatter.format(date);
}

export function getChatMessageTimeMinuteKey(value: ChatMessageTimestampInput | undefined): string {
  if (value === undefined) {
    return '';
  }

  return formatChatMessageTime(value);
}

export function toChatMessageTimeDateTime(value: ChatMessageTimestampInput): string {
  const date = normalizeChatMessageTimestamp(value);
  return date?.toISOString() ?? '';
}

export interface ChatMessageTimeProps {
  className?: string;
  timestamp: ChatMessageTimestampInput;
}

export function ChatMessageTime({ className, timestamp }: ChatMessageTimeProps) {
  const label = formatChatMessageTime(timestamp);
  if (!label) {
    return null;
  }

  return (
    <time className={className} dateTime={toChatMessageTimeDateTime(timestamp)}>
      {label}
    </time>
  );
}
