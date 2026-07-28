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

Import once at app entry:

```ts
import '@workbench-kit/tokens/styles.css';
import '@workbench-kit/react/styles.css';
import '@workbench-kit/react/primitives.css';
```

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

| Subpath                                    | Purpose                                 |
| ------------------------------------------ | --------------------------------------- |
| `@workbench-kit/react/primitives`          | Buttons, editor chrome, library layouts |
| `@workbench-kit/react/workbench/shell`     | Workbench shell / activity bar          |
| `@workbench-kit/react/workbench/workspace` | Explorer, workspace editor panel        |
| `@workbench-kit/react/workbench/chat`      | Chat panel and message surfaces         |
| `@workbench-kit/react/overlay`             | Context menus, anchored overlays        |
| `@workbench-kit/react/modal`               | Low-level modal frame                   |
| `@workbench-kit/react/jdw`                 | JDW preview bridges                     |
| `@workbench-kit/react/styles.css`          | Shell chrome CSS                        |

Import **only** through `exports`. Do not deep-import `src/` paths.

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

- `provider.search(query)` returns items (sync or `Promise`)
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
