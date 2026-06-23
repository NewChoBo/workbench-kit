import {
  getChatMessageCalendarDayKey,
  getChatMessageTimeMinuteKey,
  resolveChatMessageTimestamp,
} from './chatMessageTime';
import type { ChatMessage } from './types';

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

function getPreviousTimestampedDayKey(
  messages: readonly ChatMessage[],
  index: number,
): string {
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
