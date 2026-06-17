import {
  createCommandRegistryFromContributions,
  type CommandConflictPolicy,
  type CommandContributionInput,
} from '@workbench-kit/platform';
import type {
  ChatStreamEvent,
  ChatTransport,
  WorkspaceFileRepository,
  WorkspacePatchApplyResult,
  WorkspacePatchEvent,
} from '@workbench-kit/contracts';
import {
  WorkbenchChatService,
  WorkspacePatchService,
  WorkspaceSaveService,
  type WorkbenchChatServiceOptions,
  type WorkspacePatchServiceOptions,
  type WorkspaceSaveServiceOptions,
} from '@workbench-kit/services';

export interface DemoRuntimeServicesOptions<TContext = void> {
  readonly commandContributions?: CommandContributionInput<TContext>[] | undefined;
  readonly commandConflictPolicy?: CommandConflictPolicy | undefined;
  readonly repository: WorkspaceFileRepository;
  readonly requestId?: (() => string) | undefined;
  readonly now?: (() => string) | undefined;
  readonly chatTransport?: ChatTransport | undefined;
  readonly chatEventListener?: ((event: ChatStreamEvent) => void) | undefined;
  readonly onChatPatch?:
    | ((patch: WorkspacePatchEvent, result: WorkspacePatchApplyResult) => void | Promise<void>)
    | undefined;
  readonly createChatService?:
    | ((options: WorkbenchChatServiceOptions) => WorkbenchChatService)
    | undefined;
  readonly createPatchService?:
    | ((options: WorkspacePatchServiceOptions) => WorkspacePatchService)
    | undefined;
  readonly createSaveService?:
    | ((options: WorkspaceSaveServiceOptions) => WorkspaceSaveService)
    | undefined;
}

export interface DemoRuntimeServices {
  readonly dispose: () => void;
  readonly services: {
    readonly chatService: WorkbenchChatService;
    readonly patchService: WorkspacePatchService;
    readonly saveService: WorkspaceSaveService;
  };
}

function asNoopTransport(): ChatTransport {
  return {
    cancel() {},
    sendMessage: async () => undefined,
    subscribe: () => () => undefined,
  };
}

async function callOptionalAsync(call: (() => void | Promise<void>) | undefined) {
  if (!call) return;

  try {
    await call();
  } catch {
    // Demo services must keep the Storybook runtime stable when hooks fail.
  }
}

export function createDemoRuntimeServices<TContext = void>({
  commandContributions = [],
  commandConflictPolicy = 'last-write-wins',
  repository,
  requestId,
  now,
  chatTransport,
  chatEventListener,
  onChatPatch,
  createChatService,
  createPatchService,
  createSaveService,
}: DemoRuntimeServicesOptions<TContext>): DemoRuntimeServices {
  createCommandRegistryFromContributions(commandContributions, {
    conflictPolicy: commandConflictPolicy,
  });

  const patchService =
    createPatchService?.({ now, repository, requestId }) ??
    new WorkspacePatchService({ now, repository, requestId });
  const saveService =
    createSaveService?.({ now, repository, requestId }) ??
    new WorkspaceSaveService({ now, repository, requestId });
  const chatService = (createChatService ?? ((options) => new WorkbenchChatService(options)))({
    transport: chatTransport ?? asNoopTransport(),
    onPatch: (patch) =>
      patchService
        .applyPatch(patch)
        .then((result) => callOptionalAsync(() => onChatPatch?.(patch, result)).then(() => result)),
  });
  const unsubscribe = chatEventListener ? chatService.subscribe(chatEventListener) : undefined;

  return {
    dispose: () => {
      unsubscribe?.();
    },
    services: {
      chatService,
      patchService,
      saveService,
    },
  };
}
