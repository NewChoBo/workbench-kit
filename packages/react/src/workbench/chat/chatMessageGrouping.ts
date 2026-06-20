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
