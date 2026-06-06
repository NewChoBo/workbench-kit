# Host Adapter Samples

This document shows how consumer applications should connect Workbench Kit UI,
services, and host runtimes without moving persistence, network, dialog, or
business workflow ownership into `@workbench-kit/react`.

## Adapter Responsibilities

| Layer                        | Owns                                                                 | Does not own                                              |
| ---------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------- |
| `@workbench-kit/react`       | Workbench shell, primitives, command descriptors, UI state callbacks | Filesystem, network calls, product routing, persistence   |
| `@workbench-kit/services`    | Save/chat/patch orchestration over explicit contracts                | UI rendering, host dialogs, storage transport selection   |
| `@workbench-kit/adapters`    | Story/test repository and runtime adapters                           | Consumer persistence policy or production network clients |
| Host application             | Persistence, dialogs, authorization, telemetry, runtime transport    | Workbench primitive layout or generic service invariants  |
| `@workbench-kit/vscode-host` | Message bridge and VS Code-style host runtime binding                | React rendering or consumer-specific command side effects |

Host adapters should translate external effects into Workbench Kit contracts.
They should not make React components call host APIs directly.

## Standalone Web Host

Use `WorkbenchStandaloneBootstrap` as the UI-facing assembly contract. The host
owns data loading, persistence, dialogs, and service construction.

```ts
import { createWorkspaceFileRepository } from '@workbench-kit/adapters';
import {
  WorkspacePatchService,
  WorkspaceSaveService,
  WorkbenchChatService,
} from '@workbench-kit/services';
import type { CommandRegistry } from '@workbench-kit/core';
import type {
  WorkbenchShellCommandContext,
  WorkbenchStandaloneBootstrap,
} from '@workbench-kit/react/workbench';

export function createStandaloneBootstrap({
  commandRegistry,
}: {
  commandRegistry: CommandRegistry<WorkbenchShellCommandContext>;
}): WorkbenchStandaloneBootstrap {
  const repository = createWorkspaceFileRepository({
    files: [],
    createFile: (file) => {
      void file;
    },
    deleteFile: (path) => {
      void path;
    },
    saveFile: (path, file) => {
      void path;
      void file;
    },
  });

  const saveService = new WorkspaceSaveService({ repository });
  const patchService = new WorkspacePatchService({ repository });
  const chatService = new WorkbenchChatService({
    transport: {
      cancel: () => undefined,
      sendMessage: async () => undefined,
      subscribe: () => () => undefined,
    },
  });

  return {
    contract: {
      activities: [{ id: 'workspace', label: 'Workspace' }],
      commandRegistry,
      statusSections: [],
    },
    initialFiles: [],
    workspace: {
      openFile: async () => undefined,
      saveFile: (path, content) => saveService.commit({ content, path }),
      deleteFiles: async () => undefined,
    },
    chat: {
      onCancelChat: () => chatService.cancel(),
      onChatSubmit: (message, context) => chatService.sendMessage(message, context),
    },
    patch: {
      onPatchApply: (patch) => patchService.applyPatch(patch),
    },
    save: {},
    status: {},
  };
}
```

Production standalone hosts should replace the in-memory repository callbacks
with their own storage, permission, confirmation, and telemetry adapters.

## VS Code-Style Host

Use `@workbench-kit/vscode-host` when commands and service events need to cross a
message bridge. The runtime owns listener cleanup and isolates bridge delivery
from individual handler failures.

```ts
import { createHostRuntime, createWindowMessageTransport } from '@workbench-kit/vscode-host';
import { WorkspacePatchService, WorkspaceSaveService } from '@workbench-kit/services';

export function createVsCodeStyleRuntime({
  patchService,
  saveService,
}: {
  patchService: WorkspacePatchService;
  saveService: WorkspaceSaveService;
}) {
  const runtime = createHostRuntime({
    patchService,
    saveService,
    transport: createWindowMessageTransport(window),
  });

  return () => runtime.dispose();
}
```

The extension or host wrapper decides which transport to use. The React layer
should only receive callbacks or a bootstrap object, never direct VS Code globals.

## Future App Host

A future desktop, webview, or server-backed app host should provide a thin
adapter with the same shape:

```ts
interface AppHostAdapter {
  confirm: (request: { message: string; title: string }) => Promise<boolean>;
  loadFiles: () => Promise<readonly unknown[]>;
  saveFile: (path: string, content: string) => Promise<unknown>;
  sendChatMessage: (message: string, context?: Record<string, unknown>) => Promise<void>;
  subscribe: (listener: (event: unknown) => void) => () => void;
}
```

Map the app host adapter into Workbench Kit contracts at the composition edge:

- repository methods for file reads, writes, deletes, and conflicts
- chat transport methods for send, cancel, and subscribe
- patch service callbacks for workspace mutations
- shell callbacks for confirmation, status, and error reporting

Keep product commands, route names, storage keys, and backend DTOs on the host
side of the adapter.

## Validation

Host adapter changes should run the narrow lanes that cover the touched surface:

```powershell
pnpm --filter @workbench-kit/react typecheck
pnpm --filter @workbench-kit/services typecheck
pnpm --filter @workbench-kit/vscode-host test
```

If bridge behavior, shell assembly, or Storybook fixtures change, also run:

```powershell
pnpm test:storybook-play:required
```
