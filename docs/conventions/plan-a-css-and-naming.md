# Plan A CSS, Naming, and Icons

Conventions for `@workbench-kit/react` layout/primitives CSS organization,
identifier spelling, and icon rendering.

Related:

- [Layout & CSS Improvement Plan](../workbench/layout-css-improvement-plan-2026-06-20.md)
- [Public API Governance](./public-api-governance.md)
- Validation: `node scripts/validate-plan-a-css.mjs` from the repository root

---

## Plan A CSS

### Structure

| Layer           | Rule                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------- |
| Feature hub     | `styles.css` imports feature hubs (`layout/layout.css`, `primitives/primitives.css`, …)   |
| Feature partial | `{feature}/index.css` groups area styles (`layout/sidebar/index.css`)                     |
| Component leaf  | `{bem-block}.css` co-located with owning TSX                                              |
| TSX             | `import './{bem-block}.css'` for HMR and explicit ownership                               |
| Hub duplicate   | Leaf also listed in feature `primitives.css` / `layout/**/index.css` for CSS-only bundles |

### File naming

- Directories: **kebab-case**, feature-oriented (`layout/sidebar/`, `primitives/tabbed-panels/`)
- CSS files: **kebab-case**, match the primary BEM block or area (`sidebar-view.css`, `panel-chrome.css`)
- Do not use legacy `{component}-shell.css` suffixes for new files

### BEM

- Block prefix: `ui-` (rename to `ui-workbench-*` / `ide-*` is a separate breaking epic)
- Prefer one word in file names; BEM blocks may keep historical spelling until a rename epic

---

## Sidebar naming (canonical direction)

Align with workbench APIs (`primarySidebar`, `SidebarActionIconBar`) and the
`layout/sidebar/` feature folder.

| Layer           | Canonical                        | Notes                                                  |
| --------------- | -------------------------------- | ------------------------------------------------------ |
| Feature folder  | `layout/sidebar/`                |                                                        |
| CSS hub files   | `sidebar-{area}.css`             | e.g. `sidebar-view.css`, `sidebar-chrome.css`          |
| BEM (canonical) | `ui-sidebar-*`                   | view frame, list, tab strip, CSS variables             |
| BEM (legacy)    | `ui-side-bar-*`                  | removed in 2026-07; use `ui-sidebar-*`                 |
| CSS variables   | `--ui-sidebar-*`                 | e.g. `--ui-sidebar-inline-padding`                     |
| React exports   | `Sidebar*` / `SideBarView*`      | public component names frozen until an API rename epic |
| Import barrels  | `layout/sidebar`, `layout/panel` | no `layout/*.tsx` re-export stubs                      |

**Phase 1 (done):** file/hub names use `sidebar-*`, nested `layout/sidebar/` + `layout/panel/` barrels.  
**Phase 2 (done):** BEM `ui-sidebar-*`, host `workbench-primary-sidebar`, dock-sections scroll policy.

---

## Icons

### Goals

1. **Default:** VS Code codicons (`@vscode/codicons`) for workbench chrome parity.
2. **Host override:** consumers may map string icon ids to another icon set without forking kit components.
3. **Explicit escape hatch:** render arbitrary `ReactNode` icons where needed.

### Public API

| Symbol                  | Import                               | Role                                                        |
| ----------------------- | ------------------------------------ | ----------------------------------------------------------- |
| `WorkbenchIcon`         | `@workbench-kit/react/icons` or root | Render icon input (string → codicon by default)             |
| `WorkbenchIconProvider` | same                                 | Optional `resolveStringIcon` for host icon sets             |
| `Codicon`               | `@workbench-kit/react/primitives`    | Low-level codicon `<i>`; prefer `WorkbenchIcon` in new code |

### Input shapes

```ts
// Shorthand — codicon name
icon="search"

// Explicit codicon
icon={{ kind: 'codicon', name: 'files' }}

// Custom node (another icon library, SVG, etc.)
icon={{ kind: 'node', node: <MyIcon name="star" /> }}

// Pre-built element
icon={<img alt="" src="..." />}
```

### Host override example

```tsx
import { WorkbenchIconProvider } from '@workbench-kit/react/icons';
import { MyIcon } from 'my-icon-set';

<WorkbenchIconProvider
  resolveStringIcon={(id, { className, label }) => (
    <MyIcon aria-label={label} className={className} name={id} />
  )}
>
  <WorkbenchShell ... />
</WorkbenchIconProvider>
```

Unresolved string ids still fall back to codicon rendering.

### Migration

- Do **not** mass-replace raw `<i className={cxCodicon(...)}>` in one pass.
- New or touched components: use `WorkbenchIcon`.
- String `icon` props on primitives (`Button`, `IconButton`, …) remain codicon shorthand until those components adopt `WorkbenchIconInput`.

---

## Verification

```powershell
node scripts/validate-plan-a-css.mjs
pnpm --filter @workbench-kit/react run typecheck
pnpm --filter @workbench-kit/react exec vitest run src/icons src/layout
# After CSS graph changes affecting consumers, rebuild the integrating host app.
```
