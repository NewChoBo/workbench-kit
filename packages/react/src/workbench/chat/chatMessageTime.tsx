import type { ChatMessage } from './types';

const chatMessageTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

const chatMessageDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
});

const chatMessageDateWithYearFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const MILLISECONDS_PER_DAY = 86_400_000;

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

export function getChatMessageCalendarDayKey(
  value: ChatMessageTimestampInput | undefined,
): string {
  const date = normalizeChatMessageTimestamp(value);
  if (!date) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfLocalCalendarDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatChatMessageDateLabel(
  value: ChatMessageTimestampInput,
  now: Date = new Date(),
): string {
  const date = normalizeChatMessageTimestamp(value);
  if (!date) {
    return '';
  }

  const messageDay = startOfLocalCalendarDay(date);
  const today = startOfLocalCalendarDay(now);
  const dayOffset = Math.round((today.getTime() - messageDay.getTime()) / MILLISECONDS_PER_DAY);

  if (dayOffset === 0) {
    return 'Today';
  }

  if (dayOffset === 1) {
    return 'Yesterday';
  }

  if (date.getFullYear() === now.getFullYear()) {
    return chatMessageDateFormatter.format(date);
  }

  return chatMessageDateWithYearFormatter.format(date);
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
