# Standalone And Extension Boundary

This document defines when work belongs to the current standalone launch lane
and when it should move to the deferred VS Code extension wrapper lane.

## Current Lane: Standalone Launch

Standalone launch work uses the existing public packages:

- `@workbench-kit/react` for shell/UI surfaces and React state callbacks
- `@workbench-kit/services` for save, chat, patch, library, and plugin orchestration
- `@workbench-kit/adapters` for story/test repository and runtime adapters
- `@workbench-kit/vscode-host` for host-style message bridge and runtime binding

Standalone work may change these surfaces when the goal is to make application
assembly explicit, browser-safe, and host-callback driven.

### Standalone Acceptance

| Requirement            | Evidence                                                                        |
| ---------------------- | ------------------------------------------------------------------------------- |
| Public shell contract  | `WorkbenchStandaloneBootstrap`, `WorkbenchStandaloneShell`, host callback types |
| Host side effects      | Save/delete/chat/patch flow through callbacks, services, or adapters            |
| Story behavior parity  | Baseline Storybook play tests remain green                                      |
| Runtime safety         | `vscode-host` bridge/runtime tests cover listener cleanup and error isolation   |
| Service flow contract  | Save/chat/patch service flow tests cover patch-to-save behavior                 |
| Documentation boundary | Host adapter and public API governance docs describe consumer boundaries        |

## Deferred Lane: Extension Wrapper

Extension wrapper work belongs to the next milestone unless the standalone
acceptance criteria above are already satisfied for the touched path.

Extension wrapper work includes:

- `@workbench-kit/vscode-extension` public bootstrap API changes
- extension packaging or activation lifecycle changes
- VS Code contribution wiring beyond host-runtime test adapters
- extension-specific storage, trust, command registration, or webview setup
- migration examples that require extension globals

### Extension Re-entry Criteria

Move extension wrapper work back into scope only when:

1. Standalone baseline Storybook play tests pass.
2. `@workbench-kit/react`, `@workbench-kit/services`, and `@workbench-kit/vscode-host` validation lanes pass.
3. Host adapter responsibilities are documented for standalone and VS Code-style hosts.
4. Any new extension API has a matching standalone contract or a documented reason it is extension-only.
5. The work is isolated on an extension wrapper branch or milestone.

## Boundary Rules

| If the change touches...               | Current-cycle action                                                  |
| -------------------------------------- | --------------------------------------------------------------------- |
| React shell layout or generic UI state | Keep in standalone lane.                                              |
| Save/chat/patch orchestration          | Keep in services/adapters; validate standalone flow first.            |
| Message bridge cleanup or errors       | Keep in `vscode-host`; validate with host runtime tests.              |
| Extension bootstrap exports            | Defer unless the standalone contract is already stable.               |
| Extension-specific packaging           | Defer to extension wrapper milestone.                                 |
| Plugin lifecycle contracts             | Document and test in contracts/host; UI integration remains separate. |

## Validation Gates

Standalone lane:

```powershell
pnpm --filter @workbench-kit/react typecheck
pnpm --filter @workbench-kit/services typecheck
pnpm --filter @workbench-kit/vscode-host test
pnpm test:storybook-play:required
```

Extension wrapper lane:

```powershell
pnpm --filter @workbench-kit/vscode-extension typecheck
pnpm --filter @workbench-kit/vscode-extension test
pnpm typecheck:all
```

The extension lane should not replace the standalone lane. It should layer on
top of the same shell, service, adapter, and host contracts after those contracts
are stable enough to consume.
