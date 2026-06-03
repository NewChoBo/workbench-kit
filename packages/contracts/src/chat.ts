import type { WorkspacePatchEvent } from './patch';
import type { ServiceListener } from './result';

export type ChatMessageSource = 'assistant' | 'user';
export type ChatSessionStatus = 'cancelled' | 'error' | 'idle' | 'running';

export interface ChatMessage {
  content: string;
  createdAt?: string;
  id: string;
  label?: string;
  source: ChatMessageSource;
}

export interface ChatStreamMessagePayload {
  message: ChatMessage;
}

export interface ChatStreamMessageDeltaPayload {
  delta: string;
  message: ChatMessage;
}

export interface ChatStreamStatusPayload {
  previousStatus?: ChatSessionStatus;
  status: ChatSessionStatus;
}

export type ChatStreamEvent =
  | ({ type: 'message' } & ChatStreamMessagePayload)
  | ({ type: 'message-delta' } & ChatStreamMessageDeltaPayload)
  | ({ type: 'status' } & ChatStreamStatusPayload)
  | { type: 'workspace-patch'; patch: WorkspacePatchEvent };

export type ChatTransportListener = ServiceListener<ChatStreamEvent>;

export interface ChatSendOptions {
  context?: Record<string, unknown>;
  label?: string;
  now?: () => string;
}

export interface ChatTransport {
  cancel(): void;
  sendMessage(message: string, options?: ChatSendOptions): Promise<ChatMessage | undefined>;
  subscribe(listener: ChatTransportListener): () => void;
}

export type ChatEventServiceListener = ServiceListener<ChatStreamEvent>;

export interface ChatEventDispatcher {
  dispatch(event: ChatStreamEvent): void;
}

export interface ChatServiceSnapshot {
  status: ChatSessionStatus;
}

export abstract class AbstractChatTransport implements ChatTransport {
  public abstract cancel(): void;
  public abstract sendMessage(
    message: string,
    options?: ChatSendOptions,
  ): Promise<ChatMessage | undefined>;
  public abstract subscribe(listener: ChatTransportListener): () => void;
}

export function isChatStatusEvent(
  event: ChatStreamEvent,
): event is { type: 'status' } & ChatStreamStatusPayload {
  return event.type === 'status';
}

export function isMessageEvent(
  event: ChatStreamEvent,
): event is { type: 'message' } & ChatStreamMessagePayload {
  return event.type === 'message';
}

export function isDeltaEvent(
  event: ChatStreamEvent,
): event is { type: 'message-delta' } & ChatStreamMessageDeltaPayload {
  return event.type === 'message-delta';
}
