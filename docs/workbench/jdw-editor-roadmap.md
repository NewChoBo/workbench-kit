# JDW Editor Roadmap

Last updated: 2026-06-10

Operational plan for separating the JDW engine from React editor chrome, unifying
naming under the `jdw` prefix, and aligning editor UI with workbench-kit primitives
(validated against dev-agent artifact patterns).

Related:

- [application-complete.md](./application-complete.md)
- [strengths-inheritance.md](./strengths-inheritance.md)
- [standalone-host.md](./standalone-host.md)
- dev-agent reference: `vue3-chatbot/dev-agent/frontend`

## Goals

1. **Engine vs editor boundary** — framework-neutral JDW core stays publishable without React.
2. **Naming** — `jdw` prefix for wire format, screen spec, React render, and editor packages.
3. **Workbench UI** — outline, inspector, preview/source modes use kit primitives (`WorkbenchPropertyPanel`, `WorkbenchTree` / widget-tree outline, `SegmentedControl`, `WorkbenchArtifactShell` patterns).
4. **Consumer shell** — editors slot into `WorkspaceEditorPanel` / `WorkbenchStandaloneShell` like dev-agent `VirtualFileEditor`.

## Package map (target)

| Package | Role | Depends on |
| ------- | ---- | ---------- |
| `@workbench-kit/json-widget` | JDW engine: parse, layout, screen-spec compile/tree, assets | `contracts` |
| `@workbench-kit/jdw-editor` | Screen spec editor UI, pipeline hooks | `json-widget`, `react` |
| `@workbench-kit/react` (`jdw-react` subpath, interim) | Css render backend, `JsonWidgetPreview`, builtins | `json-widget` |
| `@workbench-kit/react` (workbench) | Shell, widget-tree lab, re-exports | `jdw-editor`, … |

Interim re-exports (backward compat until Phase 4 consumer swap):

- `@workbench-kit/react/json-dynamic-widget` → `jdw-editor` + render
- `@workbench-kit/react/json-widget` → preview pane

## Phased delivery

### Phase 1 — Workbench UI on ScreenSpecEditor ✅ (this milestone)

- `ScreenSpecEditor` → `ResizablePanels`, `WorkbenchPropertySection`, widget-tree outline classes
- `ScreenNodeInspector` → `WorkbenchPropertyPanel` / property rows
- `jdw-screen-spec-editor` layout CSS in `styles.css`
- Verify: unit tests + Storybook `ScreenSpecEditor` + `SampleScreens/Explorer` play

### Phase 2 — Explorer artifact shell alignment

- `JdwSampleScreenExplorer` → `SegmentedControl` source modes, `Select` sample picker, `WorkbenchParseError`
- Reduce inline styles; shared `jdw-sample-explorer` CSS
- Verify: Explorer play + static markup test

### Phase 3 — `@workbench-kit/jdw-editor` package

- New package; move `screen-spec/` from `react`
- `react` re-export shim; update Storybook stories path
- `pnpm-workspace`, root `typecheck`, optional publish order entry
- Verify: full `pnpm test` + storybook play baseline

### Phase 4 — `jdw-react` subpath (deferred)

- Extract `json-dynamic-widget` + `json-widget` preview into dedicated export or package
- `renderJsonWidget`, `cssRenderBackend`, `JsonWidgetPreview`

### Phase 5 — Workspace slot integration (deferred)

- `JdwScreenArtifactEditor` for `WorkspaceEditorPanel` mime/kind registry
- dev-agent-style `VirtualFileEditor` routing for `screen-spec` / `jdw` artifacts

## UI reference matrix

| Concern | Kit source | dev-agent | JDW target |
| ------- | ---------- | --------- | ---------- |
| Shell layout | `WorkbenchStandaloneShell` | `DevAgentWorkbenchShell` | Storybook + future product hosts |
| Source modes | `WorkbenchArtifactModeControls` | `AtbSpecEditor` | Explorer header |
| Outline | widget-tree outline CSS | `ExplorerPanel` | `ScreenSpecEditor` outline |
| Inspector | `WorkbenchPropertyPanel` | `WorkbenchStructuredDataSchemaPanel*` | `ScreenNodeInspector` |
| Preview | `JsonWidgetPreview` | ATB tables | Explorer right pane |
| Errors | `WorkbenchParseError` | inline alerts | compile/parse banner |

## Verification loop (each phase)

```bash
pnpm build:workspace
pnpm test
pnpm --filter @workbench-kit/react typecheck
pnpm test:storybook-play -- --grep "Explorer|ScreenSpecEditor"
```

Commit after each green phase. Do not batch unverified phases.

## Non-goals (this track)

- Renaming `@workbench-kit/json-widget` npm package (docs use “JDW engine” alias only)
- Widget-tree / widget-asset editor extraction
- dev-agent wiring (product repo)
