# Plugin Lifecycle Design (Stage 6: Plugin Integration)

This document defines the next objective for plugin support in the workbench platform:
introduce a structured install lifecycle while keeping the initial integration surface
minimal (`command`, `view`, `settings`) and preserving the existing command registry.

## Current Position

- Current migration state already supports command contribution + menu projection through
  `@newchobo-ui/core` and workbench host-level command binding.
- The next step is to formalize plugin identity, installation state, and controlled updates
  without breaking the current public-neutral architecture.
- M1 baseline contracts were added in `@newchobo-ui/contracts` (`PluginDescriptor`, `PluginSource`,
  `PluginLifecycleState`, `InstalledPlugin`, `PluginLifecycleResult`) and covered by
  `packages/contracts` tests.

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

This section is a design target for a future `@newchobo-ui/contracts` extension.

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
  unit tests in `@newchobo-ui/vscode-host` covering install/enable/update/uninstall success and
  duplicate/error paths.

### M3: Integration Safety

- Merge plugin contributions through a single command registry flow.
- Preserve conflict rule with explicit metadata:
  - default: last-write-wins for same `commandId`,
  - future: optional hard-error overlay policy by milestone if needed.
- Ensure contribution errors do not crash host menus/listeners (pattern already used in chat/service
  hardening).

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
- Minimum trust model for initial baseline (`unknown` default vs `trusted` default).
- Whether `update` should require semantic version checks in service layer or host layer.
- Whether recommendations are metadata-only initially or become an actionable lifecycle signal.
