import type { ChatStreamEvent } from '@newchobo-ui/contracts';

export type HostRuntimeMessageType =
  | 'workbench/command'
  | 'workbench/command-result'
  | 'workbench/chat/event'
  | 'workbench/chat/send'
  | 'workbench/chat/cancel'
  | 'workbench/patch/apply'
  | 'workbench/patch/result'
  | 'workbench/save/commit'
  | 'workbench/save/result';

export interface HostMessageEnvelope<
  TType extends HostRuntimeMessageType = HostRuntimeMessageType,
  TPayload = unknown,
> {
  payload?: TPayload;
  requestId?: string;
  source?: string;
  type: TType;
}

export type HostCommandMessage = HostMessageEnvelope<
  'workbench/command',
  { commandId: string; context?: Record<string, unknown> }
>;

export type HostCommandResultMessage = HostMessageEnvelope<
  'workbench/command-result',
  { commandId: string; executed: boolean }
>;

export interface HostCommandFailure {
  commandId: string;
  code: 'not-found' | 'disabled';
  message: string;
}

export interface HostTransport {
  postMessage: (message: HostMessageEnvelope) => void;
  subscribe: (listener: (message: HostMessageEnvelope) => void) => () => void;
}

export interface MessageBridgeOptions {
  filter?: (message: HostMessageEnvelope) => boolean;
  transport: HostTransport;
}

export interface MessageBridge {
  dispose: () => void;
  post: (message: HostMessageEnvelope) => void;
  sendCommandResult: (commandId: string, executed: boolean, requestId?: string) => void;
  sendChatEvent: (event: ChatStreamEvent, requestId?: string) => void;
  sendPatchResult: (result: unknown, requestId?: string) => void;
  sendSaveResult: (result: unknown, requestId?: string) => void;
  subscribe: (listener: (message: HostMessageEnvelope) => void) => () => void;
}

export function createMessageBridge({ transport, filter }: MessageBridgeOptions): MessageBridge {
  const listeners = new Set<(message: HostMessageEnvelope) => void>();
  const unsubscribe = transport.subscribe((message) => {
    if (filter && !filter(message)) return;
    listeners.forEach((listener) => listener(message));
  });

  return {
    dispose() {
      listeners.clear();
      unsubscribe();
    },
    post: (message) => transport.postMessage(message),
    sendCommandResult(commandId, executed, requestId) {
      transport.postMessage({
        type: 'workbench/command-result',
        payload: { commandId, executed },
        requestId,
      });
    },
    sendChatEvent(event, requestId) {
      transport.postMessage({
        type: 'workbench/chat/event',
        payload: event,
        requestId,
      });
    },
    sendPatchResult(result, requestId) {
      transport.postMessage({
        type: 'workbench/patch/result',
        payload: result,
        requestId,
      });
    },
    sendSaveResult(result, requestId) {
      transport.postMessage({
        type: 'workbench/save/result',
        payload: result,
        requestId,
      });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

type MessageEventListener = (event: Event) => void;
type MessagePostTarget = { postMessage: (message: unknown, targetOrigin?: string) => void };
type MessagePostTargetLike = MessagePostTarget | Window;

function isMessagePostTarget(value: unknown): value is MessagePostTargetLike {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { postMessage?: unknown }).postMessage === 'function'
  );
}

export interface HostMessageEventTarget {
  addEventListener: (type: 'message', listener: MessageEventListener) => void;
  parent?: Window | null;
  removeEventListener: (type: 'message', listener: MessageEventListener) => void;
}

export interface PostMessageTransportOptions {
  eventTarget?: HostMessageEventTarget | null;
  messageTarget?: MessagePostTarget;
}

export function createWindowMessageTransport(
  options: PostMessageTransportOptions = {},
): HostTransport {
  const eventTarget = options.eventTarget ?? (typeof window === 'undefined' ? undefined : window);
  const messageTarget: MessagePostTargetLike | undefined =
    options.messageTarget ??
    (eventTarget && isMessagePostTarget(eventTarget) ? eventTarget : undefined);

  const resolvedParent =
    messageTarget ||
    (eventTarget &&
      isMessagePostTarget((eventTarget as HostMessageEventTarget | Window).parent) &&
      (eventTarget as HostMessageEventTarget).parent);
  const postTarget = isMessagePostTarget(resolvedParent)
    ? (resolvedParent as MessagePostTarget)
    : undefined;
  const listeners = new Set<(message: HostMessageEnvelope) => void>();

  if (!eventTarget) {
    return {
      postMessage: () => undefined,
      subscribe: () => () => undefined,
    };
  }

  const eventListener: MessageEventListener = (event) => {
    if (!(event instanceof MessageEvent)) return;

    const message = event.data as HostMessageEnvelope;
    if (!isHostMessageEnvelope(message)) return;
    listeners.forEach((listener) => listener(message));
  };

  eventTarget.addEventListener('message', eventListener);

  return {
    postMessage: (message) => {
      if (!postTarget) return;
      postTarget.postMessage(message, '*');
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (!listeners.size) {
          eventTarget.removeEventListener('message', eventListener);
        }
      };
    },
  };
}

export function createHostTransport(): HostTransport {
  return createWindowMessageTransport();
}

export function isHostMessageEnvelope(message: unknown): message is HostMessageEnvelope {
  return (
    Boolean(message) &&
    typeof message === 'object' &&
    typeof (message as HostMessageEnvelope).type === 'string'
  );
}

export function isHostMessageOfType<TType extends HostRuntimeMessageType>(
  message: HostMessageEnvelope,
  type: TType,
): message is HostMessageEnvelope<TType> {
  return message.type === type;
}
