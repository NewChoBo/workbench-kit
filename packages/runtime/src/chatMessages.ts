import type { RuntimeChatMessage, WorkbenchRuntimeEvent } from './types';

export function upsertRuntimeChatMessage(
  messages: readonly RuntimeChatMessage[],
  message: RuntimeChatMessage,
): RuntimeChatMessage[] {
  const messageIndex = messages.findIndex((current) => current.id === message.id);
  if (messageIndex === -1) {
    return [...messages, message];
  }

  if (messages[messageIndex] === message) {
    return [...messages];
  }

  return messages.map((current, index) => (index === messageIndex ? message : current));
}

export function reduceRuntimeChatMessages(
  messages: readonly RuntimeChatMessage[],
  event: WorkbenchRuntimeEvent,
): RuntimeChatMessage[] {
  if (event.type !== 'message' && event.type !== 'message-delta') {
    return [...messages];
  }

  return upsertRuntimeChatMessage(messages, event.message);
}

export function deriveRuntimeChatMessages(
  events: readonly WorkbenchRuntimeEvent[],
  initialMessages: readonly RuntimeChatMessage[] = [],
): RuntimeChatMessage[] {
  return events.reduce<RuntimeChatMessage[]>(
    (messages, event) => reduceRuntimeChatMessages(messages, event),
    [...initialMessages],
  );
}
