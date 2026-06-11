# Plugin Lifecycle Policy

This document records the current plugin-ready direction for Workbench Kit. It
does not introduce runtime marketplace loading or VS Code wrapper behavior.
Plugin installation remains a host-owned concern; Workbench Kit supplies
contracts, manifest shape, contribution registries, and deterministic merge
rules.

## Current Position

- `@workbench-kit/contracts` defines product-neutral plugin descriptor, source,
  contribution, trust, enablement, and lifecycle result types.
- `@workbench-kit/workbench-extension-sdk` defines the runtime extension context
  and contribution-facing APIs used by built-in and sample extensions.
- `@workbench-kit/workbench-core` owns extension registration, activation, and
  contribution merge into platform registries.
- Hosts own install/update transport, persistence, trust escalation, and user
  confirmation flows.

## Baseline Lifecycle

| Step     | Host responsibility                                            | Workbench Kit responsibility                                                           |
| -------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Resolve  | Read a local, URL, or packaged manifest source.                | Keep source represented as metadata only.                                              |
| Validate | Parse JSON and reject invalid descriptor/contribution fields.  | Provide schema/contracts for descriptor and contribution shape.                        |
| Register | Choose enabled extensions from `.workbench/extensions.json`.   | Load bundled extension descriptions through `workbench-core`.                          |
| Activate | Trigger activation from startup, command, or view events.      | Provide `ExtensionContext`, disposables, command registration, and view provider APIs. |
| Disable  | Remove or hide contributed surfaces according to host policy.  | Dispose extension-owned subscriptions and registry contributions.                      |
| Update   | Resolve a replacement artifact and preserve rollback metadata. | Keep contribution merging deterministic for the replacement description.               |

## Policy

- Plugin IDs must be stable and publisher-qualified.
- Installation starts with `trust: 'unknown'` unless the host has an explicit
  policy.
- Manifest metadata cannot grant storage, network, filesystem, or account access
  by itself.
- Contributions are metadata-first: commands, menus, views, settings, activities,
  and keybindings are merged through registries, not direct component mutation.
- Command conflicts use the configured platform conflict policy. Hosts may run
  `findCommandDefinitionConflicts` before choosing a hard-fail startup policy.
- Runtime JavaScript downloads and third-party marketplace execution are out of
  scope until security, integrity, and permission prompts are designed.

## Required Validation

Before enabling a new plugin source, a host should verify:

1. Descriptor identity: `pluginId`, `version`, `displayName`, and `publisher`.
2. Contribution arrays: command IDs, menu command IDs, view IDs, and setting keys.
3. Dependency graph: no missing required extension dependencies.
4. Trust and permission prompts: represented in host state, not hidden in kit UI.
5. Command conflicts: explicit policy decision before activation.
6. Deactivation path: extension disposables are released when disabled.

## Follow-Up Backlog

- Host-owned plugin catalog UI.
- Integrity metadata for packaged extension artifacts.
- Permission prompts for account, workspace, network, and storage capabilities.
- Storybook plugin-management scenario once host lifecycle APIs are stable.

## Related Documents

- [Plugin Manifest Guide](./plugin-manifest-guide.md)
- [Extension System](../architecture/extension-system.md)
- [Contribution Contracts](../architecture/contribution-contracts.md)
- [Security Boundary](../architecture/security-boundary.md)
