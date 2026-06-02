import type {
  RuntimeChatMessage,
  RuntimeStatus,
  RuntimeWorkspacePatch,
  WorkbenchRuntimeEvent,
  WorkbenchRuntimeListener,
} from './types';

export interface MockRuntimeResponsePlan {
  chunks: string[];
  intervalMs?: number;
  label?: string;
  workspacePatches?: RuntimeWorkspacePatch[];
}

export interface SendRuntimeMessageOptions {
  response?: false | MockRuntimeResponsePlan;
}

export interface MockWorkbenchRuntimeOptions {
  idPrefix?: string;
  initialMessages?: RuntimeChatMessage[];
  initialStatus?: RuntimeStatus;
  now?: () => string;
  response?:
    | false
    | MockRuntimeResponsePlan
    | ((message: RuntimeChatMessage) => MockRuntimeResponsePlan);
}

export interface MockWorkbenchRuntime {
  cancel: () => void;
  dispose: () => void;
  emitWorkspacePatch: (patch: RuntimeWorkspacePatch) => void;
  getMessages: () => RuntimeChatMessage[];
  getStatus: () => RuntimeStatus;
  sendMessage: (
    content: string,
    options?: SendRuntimeMessageOptions,
  ) => RuntimeChatMessage | undefined;
  streamAssistantResponse: (plan: MockRuntimeResponsePlan) => RuntimeChatMessage;
  subscribe: (listener: WorkbenchRuntimeListener) => () => void;
}

function cloneMessage(message: RuntimeChatMessage): RuntimeChatMessage {
  return { ...message };
}

function cloneMessages(messages: RuntimeChatMessage[]) {
  return messages.map(cloneMessage);
}

function defaultNow() {
  return new Date().toISOString();
}

export function createMockWorkbenchRuntime({
  idPrefix = 'runtime-message',
  initialMessages = [],
  initialStatus = 'idle',
  now = defaultNow,
  response = {
    chunks: ['Mock runtime received the message.'],
    intervalMs: 80,
  },
}: MockWorkbenchRuntimeOptions = {}): MockWorkbenchRuntime {
  let counter = initialMessages.length;
  let status = initialStatus;
  let messages = cloneMessages(initialMessages);
  const listeners = new Set<WorkbenchRuntimeListener>();
  const activeTimers = new Set<ReturnType<typeof globalThis.setTimeout>>();

  const nextId = () => {
    counter += 1;
    return `${idPrefix}-${counter}`;
  };

  const emit = (event: WorkbenchRuntimeEvent) => {
    listeners.forEach((listener) => listener(event));
  };

  const setStatus = (nextStatus: RuntimeStatus) => {
    if (status === nextStatus) return;

    const previousStatus = status;
    status = nextStatus;
    emit({ previousStatus, status, type: 'status' });
  };

  const clearTimers = () => {
    activeTimers.forEach((timer) => globalThis.clearTimeout(timer));
    activeTimers.clear();
  };

  const pushMessage = (message: RuntimeChatMessage) => {
    messages = [...messages, message];
    emit({ message: cloneMessage(message), type: 'message' });
    return message;
  };

  const appendMessageDelta = (messageId: string, delta: string) => {
    let updatedMessage: RuntimeChatMessage | undefined;
    messages = messages.map((message) => {
      if (message.id !== messageId) return message;

      updatedMessage = {
        ...message,
        content: `${message.content}${delta}`,
      };
      return updatedMessage;
    });

    if (updatedMessage) {
      emit({ delta, message: cloneMessage(updatedMessage), type: 'message-delta' });
    }
  };

  const emitWorkspacePatch = (patch: RuntimeWorkspacePatch) => {
    emit({ patch, type: 'workspace-patch' });
  };

  const finishStreaming = (workspacePatches: RuntimeWorkspacePatch[]) => {
    workspacePatches.forEach(emitWorkspacePatch);
    setStatus('idle');
    activeTimers.clear();
  };

  const streamAssistantResponse = ({
    chunks,
    intervalMs = 80,
    label,
    workspacePatches = [],
  }: MockRuntimeResponsePlan) => {
    clearTimers();
    setStatus('running');

    const assistantMessage = pushMessage({
      content: '',
      createdAt: now(),
      id: nextId(),
      label,
      source: 'assistant',
    });

    if (chunks.length === 0) {
      finishStreaming(workspacePatches);
      return assistantMessage;
    }

    chunks.forEach((chunk, index) => {
      const timer = globalThis.setTimeout(
        () => {
          activeTimers.delete(timer);
          if (status !== 'running') return;

          appendMessageDelta(assistantMessage.id, chunk);

          if (index === chunks.length - 1) {
            finishStreaming(workspacePatches);
          }
        },
        Math.max(0, intervalMs) * (index + 1),
      );
      activeTimers.add(timer);
    });

    return assistantMessage;
  };

  const sendMessage = (content: string, options: SendRuntimeMessageOptions = {}) => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return undefined;

    clearTimers();

    const userMessage = pushMessage({
      content: trimmedContent,
      createdAt: now(),
      id: nextId(),
      source: 'user',
    });
    setStatus('running');

    const responsePlan = options.response ?? response;
    if (responsePlan === false) {
      return userMessage;
    }

    streamAssistantResponse(
      typeof responsePlan === 'function' ? responsePlan(userMessage) : responsePlan,
    );
    return userMessage;
  };

  return {
    cancel: () => {
      if (status !== 'running') return;

      clearTimers();
      setStatus('cancelled');
    },
    dispose: () => {
      clearTimers();
      listeners.clear();
    },
    emitWorkspacePatch,
    getMessages: () => cloneMessages(messages),
    getStatus: () => status,
    sendMessage,
    streamAssistantResponse,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
