# `@workbench-kit/react`

React primitives and workbench chrome for integrating hosts (browser, desktop
shells, and other React hosts).

Published on npm with the **`prototype`** dist tag.

## Install

```powershell
pnpm add @workbench-kit/react@prototype @workbench-kit/tokens@prototype
```

Peer: React 19.

## Styles

Import one bundle at the app entry. A host that renders the broad Workbench feature
set should use the core bundle, which excludes only the optional Auth and Chat
surfaces:

```ts
import '@workbench-kit/react/styles/core.css';
```

Use `@workbench-kit/react/styles.css` when the host also renders Auth or Chat.
Component-only consumers can instead combine token styles with
`@workbench-kit/react/primitives.css`.

Focused entries avoid loading unrelated feature hubs:

| Entry                                        | Owns                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `@workbench-kit/react/styles/foundation.css` | Theme tokens, Codicons, and shared scrollbars                                              |
| `@workbench-kit/react/styles/overlay.css`    | Context-menu overlay rules and compact context-menu density; import after `foundation.css` |
| `@workbench-kit/react/styles/core.css`       | Broad Workbench feature set except Auth and Chat                                           |
| `@workbench-kit/react/styles.css`            | Full compatibility bundle                                                                  |

For a non-shell surface that only uses co-located component styles and overlays:

```ts
import '@workbench-kit/react/styles/foundation.css';
import '@workbench-kit/react/styles/overlay.css';
```

Use `core.css` for Workbench shell routes: shell composition commonly reaches Layout,
Settings, Views, Workspace, and modal styles that a narrower name would not safely imply.
When routes emit separate async CSS chunks, inspect the production manifest because
bundlers can repeat a shared CSS import across chunks.

The packed-consumer gate measures production `core.css` and focused overlay paths from
packed tarballs. It checks required/forbidden selectors, the focused-to-core ratio,
referenced static assets, and gzip budgets. Budget changes require an explicit initial-load
review.

## Quick start

```tsx
import { WorkbenchShell } from '@workbench-kit/react/workbench/shell';

export function AppShell() {
  return (
    <div className="ui-workbench-host-root" style={{ height: '100vh' }}>
      <WorkbenchShell
        activityBar={{
          items: [
            { id: 'explorer', icon: <i className="codicon codicon-files" />, label: 'Explorer' },
          ],
        }}
        rootClassName="ide-root"
        secondaryArea={<main>Editor region</main>}
        statusSections={[]}
      />
    </div>
  );
}
```

Full walkthrough: [Getting Started](../../docs/guides/getting-started.md).

## Common subpaths

| Subpath                                      | Purpose                              |
| -------------------------------------------- | ------------------------------------ |
| `@workbench-kit/react/primitives`            | App icons, controls, library layouts |
| `@workbench-kit/react/workbench/shell`       | Workbench shell / activity bar       |
| `@workbench-kit/react/workbench/workspace`   | Explorer, workspace editor panel     |
| `@workbench-kit/react/workbench/chat`        | Chat panel and message surfaces      |
| `@workbench-kit/react/overlay`               | Context menus, anchored overlays     |
| `@workbench-kit/react/modal`                 | Low-level modal frame                |
| `@workbench-kit/react/jdw`                   | JDW preview bridges                  |
| `@workbench-kit/react/styles/foundation.css` | Theme/icon/scrollbar foundation      |
| `@workbench-kit/react/styles/overlay.css`    | Focused context-menu overlay CSS     |
| `@workbench-kit/react/styles/core.css`       | Core host CSS without Auth and Chat  |
| `@workbench-kit/react/styles.css`            | Full CSS including Auth and Chat     |

Import **only** through `exports`. Do not deep-import `src/` paths.

## Host-owned app icon

`AppIcon` standardizes icon sizing and image fitting without embedding a product
mark. Supply either an image or custom content; the host remains responsible for
the artwork.

```tsx
import { AppIcon } from '@workbench-kit/react/primitives';

const appIcon = <AppIcon alt="Example app" src="/app-icon.svg" />;
```

## Quick Open providers

`WorkbenchQuickOpen` is a file/provider overlay distinct from the command palette.
Hosts (or `@workbench-kit/shell-react` `WorkbenchCommandHost`) pass pluggable
providers; the default workspace-files provider wraps
`searchWorkspaceFiles` from `@workbench-kit/workspace`.

```ts
import {
  WorkbenchQuickOpen,
  createWorkspaceFilesQuickOpenProvider,
  type QuickOpenProvider,
} from '@workbench-kit/react/workbench';

const providers: QuickOpenProvider[] = [
  createWorkspaceFilesQuickOpenProvider({
    files: workspaceFiles,
    recentPaths: ['src/App.tsx'],
  }),
];
```

Contract:

- `provider.search(query, { signal })` returns items (sync or `Promise`); the context is
  optional so simple and existing single-provider implementations can keep a one-argument function
- Without `providerId`, providers search concurrently and contribute results as they settle;
  final grouping is deterministic by declared provider order, then provider item order
- A rejected or slow provider does not block results from other providers; query/provider changes
  abort the prior signal and late results are ignored
- `onProviderError` can observe an isolated provider failure without failing the whole search
- Every result shows its provider label, and selection reports the matching `providerId`
- Provider IDs are unique; item IDs only need to be stable within their provider
- Set `providerId` to restrict the overlay to one provider
- Empty query → all files, with optional `recentPaths` elevated first
- Enter selects the active item; Escape closes (modal focus trap)
- Shell default: Ctrl/Cmd+P opens Quick Open; Ctrl/Cmd+Shift+P opens the command palette

## Learn more

| Doc                                                                    | Purpose                       |
| ---------------------------------------------------------------------- | ----------------------------- |
| [Getting Started](../../docs/guides/getting-started.md)                | Install + minimal shell       |
| [Component Map](../../docs/guides/component-map.md)                    | Surface → Storybook / sample  |
| [Sample Screens](../../docs/guides/sample-screens.md)                  | Example screen recipes        |
| [Consumer Capabilities](../../docs/workbench/consumer-capabilities.md) | Props / when-to-use contracts |
| [API Reference](../../docs/guides/api-reference.md)                    | Package export index          |

## Local verification (this monorepo)

```powershell
pnpm install
pnpm build:workbench-extensions
pnpm dev
pnpm dev:storybook
```

Storybook stays a curated set of interaction stories — not a full package gallery.
Demo and story modules under this package are for development; published consumers
rely on the `exports` map and CSS entry points above.
Storybook and the sample host intentionally keep `styles.css` so they exercise the
full compatibility graph; focused production consumers are covered by the packed gate.
