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
  readonly views: ExtensionViewRegistry;
  readonly commands: ExtensionCommandRegistry;
  getCapability<T>(id: string): T | undefined;
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

Runtime view providers are registered in `activate()` via `context.views.registerViewProvider(...)`. `workbench-react` maps `ViewProvider` results to React nodes when possible; the SDK stays UI-framework neutral (`unknown` / callback registration).

## Menu Contributions

```ts
interface MenuContribution {
  menu: string; // e.g. CommandPalette, ViewTitle, StatusBarAccount
  command: string;
  group?: string;
  order?: number;
  when?: string;
}
```

Menu locations are enumerated in SDK constants (to be added).

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
  ExtensionContext.commands.registerCommand
  ExtensionContext.views.registerViewProvider
```

## Related Documents

- [Extension System](./extension-system.md)
- [Capability Model](./capability-model.md)
- [Workbench Core](./workbench-core.md)
