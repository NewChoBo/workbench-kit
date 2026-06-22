# Command Core Alignment Plan — 2026-06-20

## Goal

Route workbench-visible actions through one command execution path:

```text
UI / menu / keybinding / command palette
  -> executeCommand(commandId, args)
  -> onCommand:<id> activation
  -> registry handler lookup
  -> service mutation or side effect
```

Examples: sidebar visibility, activity selection, explorer open/create/rename/delete,
search result open, settings open, user commands, and future plugin commands.

## Reference Models

### VS Code

- Official command API treats commands as the shared trigger for keybindings,
  UI actions, extension APIs, and internal logic:
  <https://code.visualstudio.com/api/extension-guides/command>
- `vscode.commands.executeCommand` executes command ids with args and optional
  return values.
- `registerCommand` binds an id to a handler; `contributes.commands` supplies
  user-facing metadata and command-palette visibility.
- Internal workbench actions use `Action2/registerAction2` to bind command,
  menu, and keybinding metadata together:
  <https://github.com/microsoft/vscode/blob/main/src/vs/platform/actions/common/actions.ts>
- Extension-host command execution activates `onCommand:<id>` before delegating
  to the command service:
  <https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/browser/mainThreadCommands.ts>

### Theia

- `CommandRegistry` is also the `CommandService`; modules contribute through
  `CommandContribution.registerCommands`.
- A command can have multiple handlers, and execution chooses the active handler.
- The service exposes will/did execute events, which are useful for activation,
  telemetry, devtools, and command audit trails.
- Source: <https://github.com/eclipse-theia/theia/blob/master/packages/core/src/common/command.ts>

### External host reference model

Observed patterns in production consumer hosts:

- Centralized command definitions carry id, title, icon, shortcut, and danger metadata.
- Context menu builders project command metadata into menu items.
- Shell bridge hooks map `workbench.view.*` and sidebar commands to layout actions.
  Activity re-selection hides the primary sidebar.
- Workspace command hooks map explorer context menu actions to virtual workspace
  operations.
- Domain command registries can attach rich descriptors: category, keywords,
  output policy, side-effect level, and disabled reasons.

What to keep:

- Metadata-first command definitions.
- Context menus and command lists should be projections of command metadata.
- Command execution should leave an auditable result path where possible.
- Activity commands should preserve the VS Code-like re-click/toggle behavior.

What not to copy directly:

- Per-feature hooks should not remain the final command service. This repo
  already has `@workbench-kit/platform` registries and `workbench-core`
  activation, so command execution should converge there instead.
- Static TypeScript command lists are useful for built-ins, but future plugin
  commands must come from manifests and runtime registrations.

> **Appendix (illustrative only):** File-specific paths from an external host are
> listed in [Appendix A](#appendix-a-external-host-file-paths-illustrative) for
> migration context. Do not treat them as kit APIs or required structure.

## Current Code Truth

Already aligned:

- `@workbench-kit/platform` owns `CommandRegistry`, command contribution helpers,
  context-key when-clause evaluation, and keybinding models.
- `workbench-core` `ExtensionRegistry.executeCommand` activates
  `onCommand:<id>` extensions before invoking registered handlers.
- Built-in Explorer/Search UI calls provider `executeCommand` for workspace
  operations such as `workspace.open`.
- Explorer context menu construction is already metadata-driven through command
  definitions and menu entries.

Gap before this slice:

- `WorkbenchCommandHost` kept shell commands in a local React registry and ran
  palette shell commands through that local registry before falling back to
  provider `executeCommand`.
- Commands/keybinding management had to synthesize shell commands separately,
  because shell handlers were not in the shared provider registry.

## Target Structure

```text
workbench-core
  ExtensionRegistry
    commands: CommandRegistry
    keybindings: KeybindingRegistry
    menus: MenuRegistry
    executeCommand(id, args...)

shell-react
  WorkbenchProvider
    exposes executeCommand only
  WorkbenchCommandHost
    registers shell command handlers into ExtensionRegistry.commands
    builds palette from shell metadata + contributed commands
  Builtin views
    dispatch executeCommand(id, payload)

@workbench-kit/react
  presentational command palette, menu, sidebar, explorer widgets
  no durable command ownership
```

Command examples:

| Gesture                      | Command                                                         |
| ---------------------------- | --------------------------------------------------------------- |
| Activity bar Explorer click  | `workbench.showActivity.explorer`                               |
| Primary sidebar toggle       | `workbench.togglePrimarySidebar`                                |
| Explorer file activate       | `workspace.open`                                                |
| Explorer context menu rename | `workspace.rename`                                              |
| Search result activate       | `workspace.open`                                                |
| Settings open                | `workbench-kit.builtin.settings.open` or shell settings command |

## Applied Slice

- Added shell command runtime registration in `shell-react` so shell command
  handlers are attached to the shared provider command registry.
- Palette command execution now uses provider `executeCommand` after host-level
  overrides, instead of running shell commands through a local registry first.
- Existing command metadata is preserved when a shell handler attaches to an
  already-contributed command id.
- Command/keybinding management skips duplicate shell command entries after
  runtime registration and keeps shell commands under the Workbench Shell source.
- Added a provider integration test proving `workbench.togglePrimarySidebar`
  executes through the provider registry and mutates layout state.
- Added a reusable chat command surface hook that parses `/command.id` input,
  accepts one JSON payload argument when present, reuses the shared command
  descriptors/suggest UI, and dispatches through provider `executeCommand`.
- Built-in Chat and AI Chat can now execute workbench commands from slash input
  without owning a separate command service.

## Future Goal: Command Console Sidebar

The current Commands sidebar is a registry browser: filter commands, inspect
basic metadata, run available entries, and show the last run state. A later
scope can evolve it into a JConsole-like command/data console, but this is a
new capability and should stay out of the current command-routing slice.

Target shape:

- **Command inspector:** show source extension, command id, label, category,
  handler availability, keybindings, menu surfaces, enablement/when metadata,
  and side-effect metadata when descriptors support it.
- **Invocation console:** run the selected command with a structured JSON
  argument editor, copy/replay the invocation, and show normalized result,
  error, duration, and timestamp.
- **Registry/data views:** expose read-only snapshots for command registry,
  keybinding registry, menu registry, context keys, layout state, and registered
  capabilities where the host explicitly exposes them.
- **Audit trail:** list recent command executions using future
  `onWillExecuteCommand` / `onDidExecuteCommand` events rather than ad hoc UI
  state.
- **Guardrails:** do not add arbitrary JavaScript evaluation; mutating commands
  require explicit run/confirmation; private service internals remain hidden
  unless published through a capability or diagnostic adapter.

Prerequisites:

- Shared command descriptor assembly for palette, management, keybinding views,
  chat suggestions, and the console sidebar.
- Product-neutral command result normalization.
- Optional command argument schema metadata so the JSON argument editor can move
  beyond a raw textarea without hard-coded command-specific forms.

## Remaining Work

1. Move durable shell command definitions out of `@workbench-kit/react` into a
   headless package or built-in workbench extension contribution.
2. Add `onWillExecuteCommand` / `onDidExecuteCommand` events to the core command
   path, following Theia's useful audit hooks.
3. Route shortcut bridge shell execution through provider `executeCommand`; keep
   the local registry only for shortcut matching if needed.
4. Add command alias support for VS Code-like ids if compatibility becomes
   desirable, for example `workbench.action.toggleSidebarVisibility`.
5. Extend command descriptors with rich execution metadata only where it is
   product-neutral: side-effect level, output target, disabled reason, and
   keywords.
6. Promote command descriptor assembly into a single shared source for palette,
   management, keybinding views, and chat suggestions.
7. Design the Commands sidebar console mode as a separate capability: command
   inspector, JSON invocation editor, registry/data snapshots, and execution
   audit trail.
8. Keep Explorer/Search/Editor UI adapters thin: they should build payloads and
   dispatch commands, not own durable mutations.

## Acceptance Gates

- Shell commands appear in the shared provider command registry with handlers.
- Command palette, command management, activity bar, Explorer, and Search can
  invoke the same command ids.
- No duplicate shell/runtime command entries appear in management screens.
- `@workbench-kit/shell-react` tests cover provider command execution.
- Package typecheck passes for touched packages.

## Appendix A: External host file paths (illustrative)

> **Disclaimer:** Paths below come from one external consumer host and are
> documented only as a migration reference. They are not part of Workbench Kit
> public APIs.

| Concern                 | Illustrative path (external host)             |
| ----------------------- | --------------------------------------------- |
| Command definitions     | `features/commands/commandDefinitions.ts`     |
| Context menu helper     | `commandMenuItem(...)`                        |
| Shell bridge hooks      | `useWorkbenchCommands`                        |
| Workspace commands      | `useWorkspaceCommands`                        |
| Domain command registry | `features/agent/registry/devAgentCommands.ts` |
