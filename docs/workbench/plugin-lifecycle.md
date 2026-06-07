# Plugin Lifecycle Design (Stage 6: Plugin Integration)

This document defines the next objective for plugin support in the workbench platform:
introduce a structured install lifecycle while keeping the initial integration surface
minimal (`command`, `view`, `settings`) and preserving the existing command registry.

## Current Position

- Current migration state already supports command contribution + menu projection through
  `@workbench-kit/core` and workbench host-level command binding.
- The next step is to formalize plugin identity, installation state, and controlled updates
  without breaking the current public-neutral architecture.
- M1 baseline contracts were added in `@workbench-kit/contracts` (`PluginDescriptor`, `PluginSource`,
  `PluginLifecycleState`, `InstalledPlugin`, `PluginLifecycleResult`) and covered by
  `packages/contracts` tests.
- M2 baseline host service exists as `InMemoryPluginLifecycleService` in
  `@workbench-kit/vscode-host`, with tests for install, duplicate install, enable/disable,
  uninstall, update, and missing-plugin failures.

## Goals and Non-Goals

### In scope (baseline)

- Model plugin packages and installation intent.
- Track install/enable/disable state safely in host state.
- Merge plugin contributions into the existing command registry with deterministic conflict policy.
- Support rollback-friendly disable/uninstall operations.
- Provide testable boundaries without committing to transport protocol details.

### Out of scope (initial baseline)

- Full VS Code-style trust chain with signatures and marketplace authorization.
- Automatic auto-update scheduling.
- Dependency resolution across plugins in versioned DAGs.
- Binary/native host extension integration.

## Proposed Data Model (Contract Layer Candidate)

This section is a design target for a future `@workbench-kit/contracts` extension.

### Plugin identity and metadata

```text
PluginDescriptor
 - pluginId: string // stable package ID (e.g., `publisher.plugin-name`)
 - version: string // semver
 - displayName: string
 - publisher: string
 - description?: string
 - homepageUrl?: string
 - repositoryUrl?: string
```

### Installation input

```text
PluginSource
 - kind: 'local' | 'url' | 'manifest-url'
 - ref: string // path/url/reference name
```

### Lifecycle state

```text
PluginLifecycleState = 'installing' | 'installed' | 'updating' | 'failed' | 'disabled' | 'uninstalled'
PluginTrustState = 'unknown' | 'trusted' | 'untrusted'
PluginEnablementState = 'enabled' | 'disabled'
```

### Plugin record (host state)

```text
InstalledPlugin
 - pluginId: string
 - version: string
 - state: PluginLifecycleState
 - trust: PluginTrustState
  - enabled: PluginEnablementState
 - error?: string
 - installedAt?: string
 - updatedAt?: string
 - contributions: PluginContributions
```

### Plugin contributions (aligned with current workbench model)

```text
PluginContributions
 - commandContributions?: CommandContribution
 - menuEntries?: CommandMenuEntry[]
 - viewContributions?: ViewContribution
 - settingsSections?: SettingsSection
 - surfaces?: string[]
```

`commandContributions` should be consumed as a single surface-filtered source and merged
through the existing workbench command registry.

## Baseline Policy (2026-06-05)

| Topic                    | Baseline Decision                                                                                                                                                                                                                                                                                                                                                                                                                   | Evidence                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Duplicate `pluginId`     | `install` returns `invalid-state` unless `force: true`; replacement/update is host-controlled.                                                                                                                                                                                                                                                                                                                                      | `packages/vscode-host/src/plugins.test.ts` duplicate install coverage                            |
| Default trust            | Installed plugins start as `trust: 'unknown'`; trust escalation remains host policy, not component state.                                                                                                                                                                                                                                                                                                                           | `packages/vscode-host/src/plugins.ts` install path                                               |
| Default enablement       | Successful install starts as `enabled: 'enabled'` and `state: 'installed'`.                                                                                                                                                                                                                                                                                                                                                         | `InMemoryPluginLifecycleService.install()` tests                                                 |
| Failed plugin enablement | A plugin in `failed` state cannot be re-enabled through `enable(pluginId, true)`.                                                                                                                                                                                                                                                                                                                                                   | `packages/vscode-host/src/plugins.test.ts` failed-state coverage                                 |
| Command ID conflicts     | The current command registry resolves duplicate IDs with source-order overlay, effectively last-write-wins.                                                                                                                                                                                                                                                                                                                         | `packages/core/src/commands.test.ts` command collision coverage                                  |
| Hard-fail migration      | Hard-fail conflict mode is available via `createCommandRegistryFromContributions(..., { conflictPolicy: 'hard-fail' })` and becomes active when startup preflight confirms `findCommandDefinitionConflicts` is empty. `@workbench-kit/vscode-extension` also exports `preflightCommandContributionConflict(...)` and `resolveCommandContributionConflictPolicy(...)` for explicit preflight extraction and startup policy decision. | `packages/core/src/commands.test.ts` + `packages/vscode-extension/src/index.ts` preflight helper |
| Contribution scope       | Initial plugin contribution scope is command, menu, view, and settings metadata only.                                                                                                                                                                                                                                                                                                                                               | `PluginContributions` contract and this document's baseline/non-goals                            |
| Runtime transport        | Plugin install/update transport remains injected by host adapters.                                                                                                                                                                                                                                                                                                                                                                  | `PluginLifecycleService` contract has no storage or network dependency                           |

## Install, Enable, Update, And Rollback Flow Policy

| Flow       | Host-owned steps                                                                                          | Contract result                                                              | Rollback or recovery rule                                                        |
| ---------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Install    | Resolve `PluginSource`, parse manifest, validate descriptor, then call `install(source, { descriptor })`. | `plugin:success` with `state: 'installed'` or `plugin:failure`.              | Duplicate IDs fail unless `force: true`; failed installs remain host-renderable. |
| Disable    | Call `enable(pluginId, false)` before hiding contributions from command/menu/view/settings surfaces.      | `plugin:success` with `state: 'disabled'` and `enabled: 'disabled'`.         | Disabled plugins can be re-enabled if they are not in `failed` state.            |
| Enable     | Call `enable(pluginId, true)` after trust and host policy checks pass.                                    | `plugin:success` with `state: 'installed'` and `enabled: 'enabled'`.         | Failed plugins cannot be enabled until the host resolves or reinstalls them.     |
| Update     | Resolve replacement source/manifest, keep the current record available, then call `update(pluginId)`.     | `plugin:success` with refreshed source/version metadata or `plugin:failure`. | Failed updates should keep the last successful version active.                   |
| Uninstall  | Disable or remove contributed surfaces, then call `uninstall(pluginId)`.                                  | `plugin:success` with `state: 'uninstalled'` or `not-found` failure.         | Missing plugins return `not-found`; hosts should make uninstall idempotent.      |
| Hard reset | Host clears local plugin state and reinstalls from a validated source.                                    | Fresh `install` result.                                                      | Use only for corrupted host state or explicit user reset.                        |

Host adapters own persistence, transport, trust, confirmation dialogs, and
rollback storage. Workbench Kit contracts only describe the result envelope and
state transitions.

## Stage 6 Milestones

### M1: Contract Foundation (no runtime transport)

- Add `Plugin*` types to contracts package (types only, no storage assumptions).
- Add adapter/service-facing result model:
  - `PluginInstallResult`
  - `PluginLifecycleResult`
  - `PluginError`
- Add unit tests for shape and state transitions (success, duplicate install, missing plugin id,
  install+disable constraints).

### M2: Runtime Host API

- Add optional host service interface:
  - `install(source) -> PluginLifecycleResult`
  - `uninstall(pluginId) -> PluginLifecycleResult`
  - `enable(pluginId, enabled) -> PluginLifecycleResult`
  - `update(pluginId, source?) -> PluginLifecycleResult`
- Keep implementation host-driven: transport and storage are injected through adapters.
- Current status (2026-06-03): baseline `InMemoryPluginLifecycleService` has state-transition
  unit tests in `@workbench-kit/vscode-host` covering install/enable/update/uninstall success and
  duplicate/error paths.

### M3: Integration Safety

- Merge plugin contributions through a single command registry flow.
- Preserve conflict rule with explicit metadata:
  - default: last-write-wins for same `commandId`,
  - optional hard-error overlay by milestone using `createCommandRegistryFromContributions(..., { conflictPolicy: 'hard-fail' })`.
- In `@workbench-kit/vscode-extension`, build runtime from command contributions via
  `createWorkbenchExtensionRuntimeFromContributions(...)` for boot-time conflict-policy control.
- For explicit startup validation, use `preflightCommandContributionConflict(...)` (or `resolveCommandContributionConflictPolicy(...)`)
  to gather `commandConflicts`, decide policy, and feed policy decision before final runtime construction.
- Ensure contribution errors do not crash host menus/listeners (pattern already used in chat/service
  hardening).
- Hard-fail startup policy: host integrations should call hard-fail mode only after
  pre-validating command sources (via `findCommandDefinitionConflicts`) and only when the result set is empty;
  otherwise keep last-write-wins behavior and escalate preflight conflict report.

### M4: Storybook Surface Coverage (follow-up)

- Add a minimal plugin-management scenario with install/enable/disable state transitions.
- Add baseline interaction tags and required checks once stable.

## Failure Modes and Recovery

- `install` with duplicate plugin ID:
  - return structured error if `force` is false; define upgrade path via `update`.
- contribution conflict:
  - return warning + resolved/blocked state based on policy.
- partial install failure:
  - keep artifact/record in `failed` state with `error` for host UI rendering.
- failed update:
  - keep existing version active unless explicitly replaced.

## Acceptance Criteria (Baseline)

- Plugin installation/enable/disable state is represented by explicit enums.
- No transport/storage coupling in contract types.
- A plugin contributes through existing command/menu abstractions only, no direct component mutation.
- Deterministic conflict behavior documented and testable.

## Open Decisions to Confirm

- `pluginId` identity format (publisher-qualified vs reverse DNS style).
- Whether `update` should require semantic version checks in service layer or host layer.
- Whether recommendations are metadata-only initially or become an actionable lifecycle signal.

## Decisions Reflected

- Minimum trust model for the initial baseline is `unknown` by default. Trust
  escalation remains host policy, not component state.
