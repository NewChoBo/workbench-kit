# Getting Started

Minimal path for an integrating host that wants Workbench Kit UI surfaces without
forking shell markup.

English only. Product-neutral language — see
[Public Reference Policy](../conventions/public-reference-policy.md).

## Prerequisites

- Node.js matching the repository `engines` range
- **pnpm** for this monorepo; consumer apps may use their own package manager when
  installing published packages
- React 19 peer for `@workbench-kit/react`

## 1. Install published packages

Workbench Kit publishes with the **`prototype`** dist tag. CI does not move `latest`.

```powershell
pnpm add @workbench-kit/react@prototype @workbench-kit/tokens@prototype @workbench-kit/platform@prototype
```

Install only what you need. Common sets:

| Goal                         | Packages                                                                 |
| ---------------------------- | ------------------------------------------------------------------------ |
| Shell + primitives           | `@workbench-kit/react`, `@workbench-kit/tokens`                          |
| Commands / context keys      | `@workbench-kit/platform`                                                |
| Shared DTOs / OpenAPI types  | `@workbench-kit/contracts`                                               |
| Workspace path helpers       | `@workbench-kit/workspace`                                               |
| JDW documents                | `@workbench-kit/jdw`, optional `@workbench-kit/react/jdw`                |

Confirm the tag:

```powershell
npm view @workbench-kit/react@prototype version
```

## 2. Import kit CSS once

At the app entry (or Storybook preview), load styles before mounting UI:

```ts
import '@workbench-kit/tokens/styles.css';
import '@workbench-kit/react/styles.css';
import '@workbench-kit/react/primitives.css';
```

Hosts may alias kit CSS variables to their own theme tokens after these imports.

## 3. Minimal shell sketch

Use official **subpath exports** only. Do not import from `packages/react/src/...`.

```tsx
import { WorkbenchShell } from '@workbench-kit/react/workbench/shell';

export function AppShell() {
  return (
    <div className="ui-workbench-host-root" style={{ height: '100vh' }}>
      <WorkbenchShell
        activityBar={{
          items: [{ id: 'explorer', icon: <i className="codicon codicon-files" />, label: 'Explorer' }],
        }}
        rootClassName="ide-root"
        secondaryArea={<main className="workbench-editor-area">Editor region</main>}
        statusSections={[]}
      />
    </div>
  );
}
```

Pass host-owned React nodes for sidebars, editors, and overlays. Keep routing, IPC,
and product state outside the kit.

For a fuller contract (props, when-to-use, related surfaces), see
[Consumer Capabilities](../workbench/consumer-capabilities.md).

## 4. Explore visually

| Surface        | Command / URL                                      | Purpose                                      |
| -------------- | -------------------------------------------------- | -------------------------------------------- |
| Sample host    | `pnpm dev` → `http://127.0.0.1:65173/`             | Full shell + extensions (clone this repo)    |
| Storybook      | `pnpm dev:storybook` → `http://127.0.0.1:61009/`   | Curated interaction stories                  |
| Deployed sample| GitHub Pages (release tags)                        | Public smoke of the sample host              |

Sample auth (in-memory): `tester` / `tester`.

## Next steps

| Doc                                                         | When you need…                                      |
| ----------------------------------------------------------- | --------------------------------------------------- |
| [Component map](./component-map.md)                         | Which export + Storybook title covers a surface     |
| [Sample screens](./sample-screens.md)                       | Example screen recipes (login, shell, chat, …)      |
| [Use Case Scenarios](./use-cases.md)                        | Install variants, extensions, command lifecycle     |
| [API Reference](./api-reference.md)                         | Package `exports` and OpenAPI indexes               |
| [Extension Development](./extension-development.md)         | Manifests and activation                            |
| [`@workbench-kit/react` README](../../packages/react/README.md) | npm-facing package entry                        |

## Rules of thumb

1. Import through package `exports` maps only ([Public API Governance](../conventions/public-api-governance.md)).
2. Prefer kit chrome over host forks for shell, title bar, explorer, and chat.
3. Storybook stays a **curated** regression set — not a full component gallery
   ([Storybook conventions](../conventions/storybook.md)).
4. Keep public docs free of private host or product names.
