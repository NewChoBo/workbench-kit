import type { MessageBridge, WorkbenchHostRuntime } from '@workbench-kit/vscode-host';
import {
  createHostRuntime,
  createWindowMessageTransport,
  type HostTransport,
} from '@workbench-kit/vscode-host';
import {
  type CommandDefinition,
  type CommandConflictPolicy,
  type CommandDefinitionConflict,
  type CommandContributionInput,
  createCommandRegistry,
  assertNoCommandDefinitionConflicts,
  findCommandDefinitionConflicts,
  type CommandRegistry,
  mergeCommandContributions,
} from '@workbench-kit/core';
import type {
  ChatStreamEvent,
  ChatTransport,
  SaveResult,
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

export interface WorkbenchExtensionRuntimeFromContributionsOptions<TContext = void> extends Omit<
  WorkbenchExtensionRuntimeOptions<TContext>,
  'commandRegistry'
> {
  commandContributions?: CommandContributionInput<TContext>[];
  commandConflictPolicy?: CommandConflictPolicy;
  onCommandConflict?: (conflicts: readonly CommandDefinitionConflict<TContext>[]) => void;
}

export interface WorkbenchExtensionRuntimeFromContributionsAutoOptions<
  TContext = void,
> extends Omit<
  WorkbenchExtensionRuntimeFromContributionsOptions<TContext>,
  'commandConflictPolicy'
> {
  commandConflictPolicy?: 'auto';
}

export interface CommandContributionConflictPolicy {
  shouldUseHardFail: boolean;
  conflictPolicy: CommandConflictPolicy;
}

export interface CommandContributionPreflightResult<TContext = void> {
  commands: readonly CommandDefinition<TContext>[];
  commandRegistry: CommandRegistry<TContext>;
  commandConflicts: readonly CommandDefinitionConflict<TContext>[];
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

async function callOptionalAsync(call: (() => void | Promise<void>) | undefined) {
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
      return patchService.applyPatch(patch).then((result) =>
        callOptionalAsync(() =>
          options.onChatPatch ? options.onChatPatch(patch, result) : undefined,
        ).then(() => {
          if (options.onPatchResult) {
            return callOptionalAsync(() => options.onPatchResult?.(patch, result, 'chat'));
          }
        }),
      );
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

export function createWorkbenchExtensionRuntimeFromContributions<TContext = void>(
  options: WorkbenchExtensionRuntimeFromContributionsOptions<TContext>,
): WorkbenchExtensionRuntime {
  const {
    commandContributions = [],
    commandConflictPolicy = 'last-write-wins',
    ...runtimeOptions
  } = options;
  const preflight = preflightCommandContributionConflict<TContext>(commandContributions);
  const conflicts = preflight.commandConflicts;

  if (conflicts.length > 0) {
    runtimeOptions.onCommandConflict?.(conflicts);
    if (commandConflictPolicy === 'hard-fail') {
      assertNoCommandDefinitionConflicts(preflight.commands);
    }
  }

  return createWorkbenchExtensionRuntime<TContext>({
    ...runtimeOptions,
    commandRegistry: preflight.commandRegistry,
  });
}

export function createWorkbenchExtensionRuntimeFromContributionsAuto<TContext = void>(
  options: WorkbenchExtensionRuntimeFromContributionsAutoOptions<TContext>,
): WorkbenchExtensionRuntime {
  const { commandContributions = [], ...runtimeOptions } = options;
  const { conflictPolicy } = resolveCommandContributionConflictPolicy(commandContributions);

  return createWorkbenchExtensionRuntimeFromContributions<TContext>({
    ...runtimeOptions,
    commandContributions,
    commandConflictPolicy: conflictPolicy,
  });
}

export function preflightCommandContributionConflict<TContext = void>(
  commandContributions: CommandContributionInput<TContext>[],
): CommandContributionPreflightResult<TContext> {
  const mergedContributions = mergeCommandContributions<TContext>(...commandContributions);
  const commandConflicts = findCommandDefinitionConflicts<TContext>(mergedContributions.commands);
  const commandRegistry = createCommandRegistry<TContext>(mergedContributions.commands);

  return { commandRegistry, commandConflicts, commands: mergedContributions.commands };
}

export function resolveCommandContributionConflictPolicy<TContext = void>(
  commandContributions: CommandContributionInput<TContext>[],
): CommandContributionConflictPolicy {
  const commandConflicts =
    preflightCommandContributionConflict<TContext>(commandContributions).commandConflicts;
  const shouldUseHardFail = commandConflicts.length === 0;

  return {
    shouldUseHardFail,
    conflictPolicy: shouldUseHardFail ? 'hard-fail' : 'last-write-wins',
  };
}
