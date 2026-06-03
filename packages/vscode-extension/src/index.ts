import type { MessageBridge, WorkbenchHostRuntime } from '@newchobo-ui/vscode-host';
import {
  createHostRuntime,
  createWindowMessageTransport,
  type HostTransport,
} from '@newchobo-ui/vscode-host';
import type { CommandRegistry } from '@newchobo-ui/core';
import type {
  ChatStreamEvent,
  ChatTransport,
  SaveResult,
  WorkspaceFileRepository,
  WorkspacePatchApplyResult,
  WorkspacePatchEvent,
} from '@newchobo-ui/contracts';
import {
  WorkbenchChatService,
  WorkspacePatchService,
  WorkspaceSaveService,
  type WorkbenchChatServiceOptions,
  type WorkspacePatchServiceOptions,
  type WorkspaceSaveServiceOptions,
} from '@newchobo-ui/services';

export interface WorkbenchExtensionRuntimeOptions<TContext = void> {
  transport?: HostTransport;
  commandRegistry: CommandRegistry<TContext>;
  contextFactory?: () => TContext;
  repository: WorkspaceFileRepository;
  requestId?: () => string;
  now?: () => string;
  chatTransport?: ChatTransport;
  chatEventListener?: (event: ChatStreamEvent) => void;
  onChatPatch?: (
    patch: WorkspacePatchEvent,
    result: WorkspacePatchApplyResult,
  ) => void | Promise<void>;
  onPatchResult?: (
    patch: WorkspacePatchEvent,
    result: WorkspacePatchApplyResult,
    source: 'chat' | 'command',
  ) => void | Promise<void>;
  onSaveResult?: (result: SaveResult) => void | Promise<void>;
  createChatService?: (options: WorkbenchChatServiceOptions) => WorkbenchChatService;
  createPatchService?: (options: WorkspacePatchServiceOptions) => WorkspacePatchService;
  createSaveService?: (options: WorkspaceSaveServiceOptions) => WorkspaceSaveService;
}

export interface WorkbenchExtensionRuntime {
  dispose: () => void;
  messageBridge: MessageBridge;
  runtime: WorkbenchHostRuntime;
  services: {
    chatService: WorkbenchChatService;
    patchService: WorkspacePatchService;
    saveService: WorkspaceSaveService;
  };
}

type HostPatchService = Pick<WorkspacePatchService, 'applyPatch'>;
type HostSaveService = Pick<WorkspaceSaveService, 'commit'>;

function asNoopTransport(): ChatTransport {
  return {
    cancel() {},
    sendMessage: async () => undefined,
    subscribe: () => () => undefined,
  };
}

async function callOptionalAsync(
  call: (() => void | Promise<void>) | undefined,
) {
  if (!call) return;
  try {
    await call();
  } catch {
    // keep host runtime stable even when hook throws
  }
}

export function createWorkbenchExtensionRuntime<TContext = void>(
  options: WorkbenchExtensionRuntimeOptions<TContext>,
): WorkbenchExtensionRuntime {
  const transport = options.transport ?? createWindowMessageTransport();
  const patchService =
    options.createPatchService?.({
      now: options.now,
      repository: options.repository,
      requestId: options.requestId,
    }) ??
    new WorkspacePatchService({
      now: options.now,
      repository: options.repository,
      requestId: options.requestId,
    });
  const saveService =
    options.createSaveService?.({
      now: options.now,
      repository: options.repository,
      requestId: options.requestId,
    }) ??
    new WorkspaceSaveService({
      now: options.now,
      repository: options.repository,
      requestId: options.requestId,
    });

  const hostPatchService: HostPatchService = {
    applyPatch: async (patch) => {
      const result = await patchService.applyPatch(patch);
      if (options.onPatchResult) {
        try {
          await options.onPatchResult(patch, result, 'command');
        } catch {
          // keep host runtime stable even when result hooks fail
        }
      }
      return result;
    },
  };

  const hostSaveService: HostSaveService = {
    commit: async (input) => {
      const result = await saveService.commit(input);
      if (options.onSaveResult) {
        try {
          await options.onSaveResult(result);
        } catch {
          // keep host runtime stable even when result hooks fail
        }
      }
      return result;
    },
  };

  const chatService = (
    options.createChatService ?? ((serviceOptions) => new WorkbenchChatService(serviceOptions))
  )({
    transport: options.chatTransport ?? asNoopTransport(),
    onPatch: (patch) => {
      return patchService.applyPatch(patch).then((result) => {
        const callbackResult = Promise.resolve(
          options.onChatPatch ? options.onChatPatch(patch, result) : undefined,
        );

        return callbackResult.then(() => {
          if (options.onPatchResult) {
            return callOptionalAsync(() => options.onPatchResult?.(patch, result, 'chat'));
          }
          return Promise.resolve();
        });
      });
    },
  });

  if (options.chatEventListener) {
    chatService.subscribe(options.chatEventListener);
  }

  const runtime = createHostRuntime<TContext>({
    transport,
    chatService,
    patchService: hostPatchService,
    saveService: hostSaveService,
    commandRegistry: options.commandRegistry,
    contextFactory: options.contextFactory,
  });

  return {
    dispose: () => runtime.dispose(),
    messageBridge: runtime.getMessageBridge(),
    runtime,
    services: {
      chatService,
      patchService,
      saveService,
    },
  };
}
