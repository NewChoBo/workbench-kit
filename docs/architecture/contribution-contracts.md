# Contribution Contracts

Stable shapes for extension manifests and `@workbench-kit/workbench-extension-sdk` types. Versioned via `schemaVersion` (manifest) and `engines.extensionApi` (semver).

## Manifest Versioning

| Field                  | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `schemaVersion`        | Integer manifest schema bump (breaking manifest shape) |
| `engines.extensionApi` | Semver range for SDK API                               |
| `engines.workbench`    | Semver range for host                                  |

Breaking SDK changes require major `extensionApi` bump and migration notes.

## Extension Context (activation)

```ts
interface ExtensionContext {
  readonly extensionId: string;
  readonly extensionPath: string;
  readonly subscriptions: DisposableStore;
  readonly capabilities: ExtensionCapabilityRegistry;
  readonly viewHostFactories: ExtensionViewHostFactoryRegistry;
  readonly editorHostFactories: ExtensionEditorHostFactoryRegistry;
  readonly editorDocumentViews: ExtensionEditorDocumentViewRegistry;
  readonly views: ExtensionViewRegistry;
  readonly commands: ExtensionCommandRegistry;
  getCapability<T>(id: string): T | undefined;
}

interface ExtensionViewHostFactoryRegistry {
  registerFactory(factory: ViewHostFactory): Disposable;
}

interface ExtensionEditorHostFactoryRegistry {
  registerFactory(factory: EditorHostFactory): Disposable;
}

interface ExtensionEditorDocumentViewRegistry {
  registerProvider(provider: EditorDocumentViewProvider): Disposable;
}

interface ExtensionCapabilityRegistry {
  registerProvider<T>(provider: ExtensionCapabilityProvider<T>): Disposable;
}

interface ExtensionCapabilityProvider<T = unknown> {
  readonly id: string;
  get(): T;
  dispose?: () => void;
}

interface ExtensionCommandRegistry {
  registerCommand(commandId: string, handler: CommandServiceHandler): Disposable;
}

interface ExtensionViewRegistry {
  registerViewProvider(provider: ViewProvider): Disposable;
}

type ActivateFunction = (context: ExtensionContext) => void | Promise<void> | Disposable;
type DeactivateFunction = () => void | Promise<void>;
```

Extensions register disposables on `subscriptions`; host disposes on deactivate.

## Command Contributions

**Manifest (`contributes.commands`)**

```json
{
  "command": "workbench-kit.samples.hello",
  "title": "Hello",
  "category": "Samples",
  "icon": "symbol-event",
  "enablement": "workbenchState == workspace"
}
```

**SDK type**

```ts
interface CommandContribution {
  command: string;
  title: string;
  category?: string;
  icon?: string;
  enablement?: string;
}
```

Runtime handler is registered in `activate()` via SDK `registerCommand`, not in JSON.

## Keybinding Contributions

```ts
interface KeybindingContribution {
  command: string;
  key: string;
  when?: string;
  args?: unknown[];
}
```

Merged into `KeybindingRegistry` on extension activation.

## View Contributions

```ts
interface ViewContainerContribution {
  id: string;
  title: string;
  icon?: string;
}

interface ViewContribution {
  id: string;
  name: string;
  containerId: string;
  when?: string;
}

interface ViewProvider {
  readonly viewId: string;
  resolveViewHost(): ViewHost;
}

interface ViewHost {
  render(): unknown; // React.ReactNode in React host; opaque in SDK
  dispose(): void;
}
```

Runtime view providers are registered in `activate()` via `context.views.registerViewProvider(...)`. `shell-react` maps `ViewProvider` results to React nodes when possible; the SDK stays UI-framework neutral (`unknown` / callback registration).

## Document View Contributions

`contributes.documentViews` describes form/preview modes for text editor
documents. Manifest metadata is visible in extension management and feature
inspection, while the runtime renderer is registered during activation.

```ts
interface EditorDocumentViewContribution {
  id: string;
  kind: 'form' | 'preview';
  label: string;
  priority?: number;
  mimeTypes?: readonly string[];
  filenamePatterns?: readonly string[];
  when?: string;
}

interface EditorDocumentViewProvider extends EditorDocumentViewContribution {
  matches?(document: EditorDocumentContext): boolean;
  render(context: EditorDocumentViewRenderContext): unknown;
}
```

Runtime providers are registered with
`context.editorDocumentViews.registerProvider(...)`. `shell-react` converts the
opaque render result to a React node when possible and also supports
manifest-style `mimeTypes` / `filenamePatterns` matching when `matches` is not
provided.

## Menu Contributions

```ts
interface MenuContribution {
  menu: WorkbenchMenuLocation;
  command: string;
  group?: string;
  order?: number;
  when?: string;
}
```

Common locations are exported as SDK constants:
`WORKBENCH_MENU_COMMAND_PALETTE`, `WORKBENCH_MENU_VIEW_TITLE`,
`WORKBENCH_MENU_EDITOR_TITLE`, `WORKBENCH_MENU_EDITOR_CONTEXT`,
`WORKBENCH_MENU_EDITOR_TAB_CONTEXT`, and `WORKBENCH_MENU_EXPLORER_CONTEXT`.
Custom host locations remain valid strings for host-specific surfaces.

For a single menu location, the core registry keeps first-seen group order, sorts
within each group by numeric `order`, and preserves registration order when
group/order are equal. This mirrors IDE-style contribution ordering while
remaining stable for extensions that load in a deterministic order.

Manifest authors may use array form with `menu` on each contribution, or object
form keyed by menu location. Object form entries inherit the menu location from
the key; array form entries must declare `menu` explicitly.

## Configuration Contributions

```ts
interface ConfigurationContribution {
  properties: Record<
    string,
    {
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      default?: unknown;
      description?: string;
      scope?: 'application' | 'workspace' | 'window';
    }
  >;
}
```

Secrets must use `scope` metadata that forbids `.workbench` inline values (see [Workbench Config](./workbench-config.md)).

## Activity Contributions

Links activity bar icon to view container:

```ts
interface ActivityContribution {
  id: string;
  viewContainerId: string;
  icon: string;
  title: string;
  when?: string;
}
```

## Contribution Merge Rules

| Point         | Conflict policy                                                                       |
| ------------- | ------------------------------------------------------------------------------------- |
| Commands      | Same ID: later activation wins unless `hard-fail` host policy                         |
| Keybindings   | Multiple per key allowed; resolve by `when` specificity                               |
| Views         | Same view ID: hard-fail                                                               |
| Configuration | Deep merge; property keys must not collide across extensions without namespace prefix |

Recommended command ID prefix: `<publisher>.<extension>.<name>`.

## SDK Export Surface (target)

```text
@workbench-kit/workbench-extension-sdk
  manifest types
  contribution types
  ExtensionFeatureSpec read-model types
  ExtensionContext.commands.registerCommand
  ExtensionContext.views.registerViewProvider
  ExtensionContext.editorDocumentViews.registerProvider
```

## Feature Spec Read Model

`ExtensionFeatureSpec` is the normalized, UI-facing shape for a manifest. It
keeps `commands`, `settings`, `views`, `viewContainers`, `menus`, `keybindings`,
`documentViews`, `activities`, `capabilities`, `permissions`, and dependency
fields in flat collections so command palette, chat slash commands, extension
management, document view selection, and settings form adapters can read the
same metadata.

The model is not an execution API. Commands still execute through the platform
`CommandRegistry` / `ExtensionRegistry.executeCommand()` path, and providers are
still registered during activation.

## Related Documents

- [Extension System](./extension-system.md)
- [Capability Model](./capability-model.md)
- [Workbench Core](./workbench-core.md)
