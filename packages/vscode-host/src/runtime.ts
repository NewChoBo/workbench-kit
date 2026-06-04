import type { CommandRegistry } from '@workbench-kit/core';
import type { SaveResult, WorkspacePatchApplyResult } from '@workbench-kit/contracts';
import {
  type WorkbenchChatService,
  type WorkspacePatchService,
  type WorkspaceSaveService,
} from '@workbench-kit/services';
import {
  type HostMessageEnvelope,
  type HostRuntimeMessageType,
  createMessageBridge,
  isHostMessageEnvelope,
  isHostMessageOfType,
  type MessageBridge,
} from './bridge';
import { resolveHostCommandFromBridgeMessage } from './commands';
import type { HostCommandMessage, HostTransport } from './bridge';
type HostChatService = Pick<
  WorkbenchChatService,
  'cancel' | 'dispose' | 'sendMessage' | 'subscribe'
>;
type HostPatchService = {
  applyPatch: (...args: Parameters<WorkspacePatchService['applyPatch']>) => Promise<unknown>;
};
type HostSaveService = {
  commit: (...args: Parameters<WorkspaceSaveService['commit']>) => Promise<unknown>;
};

const CHAT_SEND = 'workbench/chat/send';
const CHAT_CANCEL = 'workbench/chat/cancel';
const PATCH_APPLY = 'workbench/patch/apply';
const SAVE_COMMIT = 'workbench/save/commit';
const COMMAND = 'workbench/command';

export type MessageType = HostRuntimeMessageType;
export type MessageWithPayload<T extends MessageType, P> = HostMessageEnvelope<T, P>;

interface ChatSendPayload {
  content?: string;
  context?: Record<string, unknown>;
}

interface RuntimeCommandPayload {
  context?: Record<string, unknown>;
}

export interface WorkbenchHostRuntimeOptions<TContext = void> {
  chatService?: HostChatService;
  commandRegistry?: CommandRegistry<TContext>;
  contextFactory?: () => TContext;
  patchService?: HostPatchService;
  saveService?: HostSaveService;
  transport: HostTransport;
}

export interface WorkbenchHostRuntime {
  dispose: () => void;
  getChatService?: () => HostChatService | undefined;
  getMessageBridge: () => MessageBridge;
  getPatchService?: () => HostPatchService | undefined;
  getSaveService?: () => HostSaveService | undefined;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function createHostRuntime<TContext>(
  options: WorkbenchHostRuntimeOptions<TContext>,
): WorkbenchHostRuntime {
  const { chatService, commandRegistry, contextFactory, patchService, saveService, transport } =
    options;

  const messageBridge = createMessageBridge({ transport });
  const subscriptions = new Set<() => void>();
  const chatUnsubscribe = createChatEventBridge({ chatService, messageBridge });
  subscriptions.add(chatUnsubscribe);

  const handleChatSend = async (payload: unknown) => {
    if (!chatService) return;

    const { content, context } = normalizeChatPayload(payload);
    if (!content) return;

    await chatService.sendMessage(content, context);
  };

  const handlePatchApply = async (payload: unknown, requestId?: string) => {
    if (!patchService) return;

    const patchPayload = normalizePatchPayload(payload);
    if (!patchPayload) return;

    const result = await patchService.applyPatch(patchPayload);
    messageBridge.sendPatchResult(result as WorkspacePatchApplyResult, requestId);
  };

  const handleSaveCommit = async (payload: unknown, requestId?: string) => {
    if (!saveService) return;

    const commitPayload = normalizeSavePayload(payload);
    if (!commitPayload) return;

    const result = await saveService.commit(commitPayload);
    messageBridge.sendSaveResult(result as SaveResult, requestId);
  };

  const mergeContext = (commandContext?: RuntimeCommandPayload): TContext => {
    if (!contextFactory) {
      return undefined as TContext;
    }

    const baseContext = contextFactory();
    if (!isRecord(baseContext) || !isRecord(commandContext?.context)) {
      return baseContext;
    }

    return {
      ...baseContext,
      ...commandContext.context,
    } as TContext;
  };

  const handleCommand = (message: HostCommandMessage) => {
    if (!commandRegistry || !contextFactory) {
      messageBridge.sendCommandResult(message.payload?.commandId ?? '', false, message.requestId);
      return;
    }

    resolveHostCommandFromBridgeMessage({
      commandRegistry,
      getContext: () => mergeContext(message.payload),
      message,
      resultListener: (result) =>
        messageBridge.sendCommandResult(
          result.payload?.commandId ?? '',
          result.payload?.executed ?? false,
          result.requestId,
        ),
    });
  };

  const messageSubscription = messageBridge.subscribe((message) => {
    if (!isHostMessageEnvelope(message)) return;

    if (isHostMessageOfType(message, CHAT_SEND)) {
      const { payload } = message as MessageWithPayload<'workbench/chat/send', unknown>;
      void handleChatSend(payload);
      return;
    }

    if (isHostMessageOfType(message, CHAT_CANCEL)) {
      chatService?.cancel();
      return;
    }

    if (isHostMessageOfType(message, PATCH_APPLY)) {
      const { payload, requestId } = message as MessageWithPayload<
        'workbench/patch/apply',
        unknown
      >;
      void handlePatchApply(payload, requestId);
      return;
    }

    if (isHostMessageOfType(message, SAVE_COMMIT)) {
      const { payload, requestId } = message as MessageWithPayload<
        'workbench/save/commit',
        unknown
      >;
      void handleSaveCommit(payload, requestId);
      return;
    }

    if (isHostMessageOfType(message, COMMAND)) {
      handleCommand(message as HostCommandMessage);
      return;
    }
  });

  subscriptions.add(messageSubscription);

  return {
    dispose: () => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
      subscriptions.clear();
      chatService?.dispose();
    },
    getChatService: () => chatService,
    getMessageBridge: () => messageBridge,
    getPatchService: () => patchService,
    getSaveService: () => saveService,
  };
}

function createChatEventBridge({
  chatService,
  messageBridge,
}: {
  chatService?: HostChatService;
  messageBridge: MessageBridge;
}) {
  if (!chatService) {
    return () => undefined;
  }

  return chatService.subscribe((event) => messageBridge.sendChatEvent(event));
}

function normalizeChatPayload(payload: unknown): ChatSendPayload {
  if (typeof payload === 'string') {
    return { content: payload.trim() };
  }

  if (!isRecord(payload)) {
    return {};
  }

  const content = typeof payload.content === 'string' ? payload.content.trim() : undefined;
  const context = isRecord(payload.context) ? payload.context : undefined;

  return { content, context };
}

function normalizePatchPayload(
  payload: unknown,
): Parameters<WorkspacePatchService['applyPatch']>[0] | undefined {
  if (!isRecord(payload)) return;

  const path = typeof payload.path === 'string' ? payload.path : undefined;
  const type =
    payload.type === 'write-file' || payload.type === 'delete-file' ? payload.type : undefined;
  if (!path || !type) return;

  if (type === 'delete-file') {
    return { path, type };
  }

  if (typeof payload.content !== 'string') return;

  return {
    path,
    content: payload.content,
    type,
  };
}

function normalizeSavePayload(
  payload: unknown,
): Parameters<WorkspaceSaveService['commit']>[0] | undefined {
  if (!isRecord(payload)) return;

  const path = typeof payload.path === 'string' ? payload.path : undefined;
  if (!path) return;
  const content = typeof payload.content === 'string' ? payload.content : undefined;
  if (content === undefined) return;

  return {
    content,
    path,
  };
}
