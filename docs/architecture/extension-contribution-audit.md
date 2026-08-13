# Extension Contribution Point Audit

- **Status:** Current implementation audit
- **Parent tracker:** [#228](https://github.com/NewChoBo/workbench-kit/issues/228)
- **Scope:** `workbench.extension.json`, `@workbench-kit/workbench-extension-sdk`, and the
  registries consumed by `@workbench-kit/workbench-core` / `@workbench-kit/shell-react`

Workbench Kit is not a VS Code Extension API compatibility layer. This audit uses the
same broad authoring categories as a short IDE-oriented checklist, but compares
capabilities rather than manifest spelling or API count. The comparison helps authors
choose a stable Kit contribution point and makes intentionally deferred runtime classes
explicit.

The baseline distinction remains:

- **Manifest contributions** are static metadata that registries and management views can
  inspect before activation.
- **Activation registrations** supply executable command handlers and opaque view/editor
  providers through `ExtensionContext`.
- A manifest is never authority to bypass host permissions, capability requirements, or
  extension integrity policy.

The checklist is informed by VS Code's distinction between manifest contribution points,
activation, and runtime API, but does not claim API compatibility. See the official
[Contribution Points](https://code.visualstudio.com/api/references/contribution-points),
[Extension Anatomy](https://code.visualstudio.com/api/get-started/extension-anatomy), and
[Common Capabilities](https://code.visualstudio.com/api/extension-capabilities/common-capabilities)
references for that broader ecosystem vocabulary.

## Capability Matrix

| IDE-oriented authoring capability                                                             | Kit surface                                                                                           | Status    | Current boundary / follow-up                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Commands and activation                                                                       | `contributes.commands`, `activationEvents`, `context.commands.registerCommand()`                      | Supported | Commands are declarative first; handlers register during activation. Supported activation events are `onCommand:`, `onView:`, and `onStartup`.                                                                                                    |
| Command palette, context, title, and view menus                                               | `contributes.menus`, `WorkbenchMenuLocation`                                                          | Partial   | The registry resolves command placements and exports common locations; custom host locations remain strings. Nested submenus, welcome content, and arbitrary workbench DOM integration are not manifest contracts.                                |
| Keybindings                                                                                   | `contributes.keybindings`, `KeybindingRegistry`                                                       | Supported | Extension keybindings merge with `when` clauses. User override management for registry-only hosts is separately tracked by [#253](https://github.com/NewChoBo/workbench-kit/issues/253).                                                          |
| View containers, activity bar, sidebar, auxiliary bar, and bottom panel                       | `contributes.viewContainers`, `views`, `activities`, `panels`, `context.views.registerViewProvider()` | Supported | `panels` normalizes to a panel container plus a view. Panel and status-bar contribution foundations landed through [#127](https://github.com/NewChoBo/workbench-kit/issues/127) and [#128](https://github.com/NewChoBo/workbench-kit/issues/128). |
| Status-bar items                                                                              | `contributes.statusBar`                                                                               | Supported | Shell projection owns layout; items may invoke a contributed command.                                                                                                                                                                             |
| Settings / configuration defaults                                                             | `contributes.configuration`, `ConfigurationRegistry`                                                  | Supported | The manifest provides typed defaults and scope metadata; hosts own persistence and product settings presentation.                                                                                                                                 |
| Editors and document form/preview views                                                       | `contributes.editors`, `documentViews`, `context.editorDocumentViews.registerProvider()`              | Partial   | Declarative document matching plus activated providers are supported. General language services, webviews, notebooks, and VS Code custom-editor compatibility are intentionally outside the current contract.                                     |
| Themes and localizations                                                                      | `contributes.themes`, `localizations`, `ThemeRegistry`, `LocalizationRegistry`                        | Partial   | Metadata and registry merge exist. The soft-apply versus reload-required lifecycle is tracked by [#232](https://github.com/NewChoBo/workbench-kit/issues/232).                                                                                    |
| Capabilities, dependencies, and permissions                                                   | `capabilities`, extension dependency fields, `permissions`                                            | Supported | These are lifecycle/policy metadata rather than UI contribution points. They are validated before activation and do not grant host authority by themselves.                                                                                       |
| Extensions browse, review, enable, and manage                                                 | Management model and shell extension surfaces                                                         | Partial   | The generic Extensions view remains [#229](https://github.com/NewChoBo/workbench-kit/issues/229).                                                                                                                                                 |
| Packaged installation and sharing                                                             | Install-plan and catalog foundations                                                                  | Deferred  | Non-bundled package installation is [#230](https://github.com/NewChoBo/workbench-kit/issues/230); share, sideload, and export follow in [#231](https://github.com/NewChoBo/workbench-kit/issues/231).                                             |
| Languages, grammars, snippets, debuggers, tasks, terminals, notebooks, and arbitrary webviews | None                                                                                                  | Deferred  | These require runtime-specific hosts and are explicitly outside the current extension-system scope. They must not be introduced as metadata-only aliases without a generic host/runtime contract.                                                 |

## Audit Outcome

No untracked high-value generic contribution gap was found in this audit:

- The current manifest covers the reusable workbench surfaces that already have matching
  registries and activation contracts.
- The active extension-lifecycle gaps have bounded owners: management (#229), packaged
  distribution (#230), sharing (#231), reload semantics (#232), and registry-only
  keybinding management (#253).
- The broader IDE contribution families in the last matrix row need dedicated runtime
  hosts, not a speculative addition to the manifest. They remain deferred until a
  concrete consumer-independent scenario defines the host boundary and acceptance tests.

Authors should use the contribution types in
[`@workbench-kit/workbench-extension-sdk`](../../packages/workbench-extension-sdk/src/contributions.ts)
and the registration flow in [Extension Development](../guides/extension-development.md).
For normalization, conflict, and lifecycle details, see
[Contribution Contracts](./contribution-contracts.md) and
[Extension System](./extension-system.md).
