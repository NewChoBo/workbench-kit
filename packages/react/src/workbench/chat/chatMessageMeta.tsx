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

export function getChatMessageCalendarDayKey(value: ChatMessageTimestampInput | undefined): string {
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

export function getPeerChatSenderKey(
  message: ChatMessage,
  options: {
    assistantLabel?: string | undefined;
    userLabel?: string | undefined;
  } = {},
): string {
  if (message.source === 'user') {
    return `user:${message.label ?? options.userLabel ?? 'user'}`;
  }

  return `assistant:${message.label ?? options.assistantLabel ?? 'assistant'}`;
}

export function shouldShowPeerChatSenderLabel(
  messages: readonly ChatMessage[],
  index: number,
  options: {
    assistantLabel?: string | undefined;
    userLabel?: string | undefined;
  } = {},
): boolean {
  const message = messages[index];
  if (!message) {
    return false;
  }

  if (index === 0) {
    return true;
  }

  const previousMessage = messages[index - 1];
  if (!previousMessage) {
    return true;
  }

  return getPeerChatSenderKey(message, options) !== getPeerChatSenderKey(previousMessage, options);
}

export function shouldShowChatMessageTimestamp(
  messages: readonly ChatMessage[],
  index: number,
): boolean {
  const message = messages[index];
  if (!message) {
    return false;
  }

  const timeKey = getChatMessageTimeMinuteKey(resolveChatMessageTimestamp(message));
  if (!timeKey) {
    return false;
  }

  const nextMessage = messages[index + 1];
  if (!nextMessage) {
    return true;
  }

  const nextTimeKey = getChatMessageTimeMinuteKey(resolveChatMessageTimestamp(nextMessage));
  if (!nextTimeKey) {
    return true;
  }

  return timeKey !== nextTimeKey;
}

function getPreviousTimestampedDayKey(messages: readonly ChatMessage[], index: number): string {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const dayKey = getChatMessageCalendarDayKey(resolveChatMessageTimestamp(messages[cursor]));
    if (dayKey) {
      return dayKey;
    }
  }

  return '';
}

export function shouldShowChatMessageDateDivider(
  messages: readonly ChatMessage[],
  index: number,
): boolean {
  const message = messages[index];
  if (!message) {
    return false;
  }

  const currentDayKey = getChatMessageCalendarDayKey(resolveChatMessageTimestamp(message));
  if (!currentDayKey) {
    return false;
  }

  const previousDayKey = getPreviousTimestampedDayKey(messages, index);
  if (!previousDayKey) {
    return true;
  }

  return currentDayKey !== previousDayKey;
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

export interface ChatMessageDateDividerProps {
  timestamp: ChatMessageTimestampInput;
}

export function ChatMessageDateDivider({ timestamp }: ChatMessageDateDividerProps) {
  const label = formatChatMessageDateLabel(timestamp);
  if (!label) {
    return null;
  }

  return (
    <div aria-label={label} className="message-date-divider" role="separator">
      <time className="message-date-divider__label" dateTime={toChatMessageTimeDateTime(timestamp)}>
        {label}
      </time>
    </div>
  );
}
