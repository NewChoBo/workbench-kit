# Storybook E2E replacement coverage

Storybook interaction tests (`play` functions) are the kit's primary guard for component-level UI flows. They run through `@storybook/test-runner` against the static Storybook build and do **not** require the workbench-sample dev server on `:5173`.

## E2E replacement criteria

A story qualifies as **E2E-replacement level** when it:

1. **Renders** the real package component (or the same shell composition path a host app uses), with fixture data instead of private runtime services.
2. **Simulates user interaction** via `@storybook/test` (`userEvent`, `fireEvent`, keyboard) — not only mount assertions.
3. **Asserts observable outcomes** in the DOM and/or harness state (ARIA roles, labels, `data-*` attributes, status regions, disabled buttons).
4. **Runs in CI** when tagged `storybook-play-required` (see scripts below).
5. **Does not depend** on `workbench-sample` `:5173`, real workspace directories, network backends, or OIDC.

Stories tagged only `storybook-play-baseline` are broader smoke coverage; promote them to `storybook-play-required` after they are stable across repeated runs.

## Scripts and CI lane

| Script | Scope |
| ------ | ----- |
| `pnpm test:storybook-play` | Stories tagged `storybook-play-baseline` |
| `pnpm test:storybook-play:required` | Stories tagged `storybook-play-required` |
| `pnpm validate:ui` | `build:storybook` + `test:storybook-play:required` |
| `pnpm validate` | `validate:fast` + `validate:ui` |

Runner: `scripts/test-storybook-play.mjs` — starts Storybook on port `6010` when not already running, then invokes `test-storybook` with `--includeTags`.

**Required story count:** 19 before this slice → **23** after (+4: schema panel validation, chat command proposal, extension diagnostics, editor pane toggles).

## Stories with `play` functions (by area)

### Required gate (`storybook-play-required`)

| Story | Flow covered |
| ----- | ------------ |
| `React/Workbench/Settings/Appearance` · Scheme & Presets | Color scheme + light/dark preset `data-theme*` attributes |
| `React/Workbench/Settings/Workbench Settings Modal` · Navigation scroll, Select listbox fit | Settings modal navigation and select popover |
| `React/Workbench/Chat/ChatPanel` · Cancel, Message list overflow, Error transport | Runtime cancel, scroll overflow, transport failure |
| `React/Workbench/Chat/ChatPanel` · Command proposal allow/deny | AI command proposal card actions |
| `React/Workbench/Workspace/WorkspaceEditorPanel` · Tab coordination, Delete recovery | Tab close/all, delete open file |
| `React/Workbench/Workspace/WorkspaceExplorer` · (2 stories) | Explorer tree interactions |
| `React/Workbench/Workspace/WorkspaceSearchPanel` · (3 stories) | Search panel flows |
| `React/Workbench/Settings/Schema Form` | Schema-driven settings form |
| `React/Workbench/Settings/Panel Primitives` · Schema color/enum/validation | Structured data schema panel controls |
| `React/Workbench/Management/Extension Sidebar` · Diagnostics | Missing-extension alert + diagnostics badges |
| `React/Workbench` · Integrated shell | Workbench composition smoke (`WorkbenchStandaloneShell`) |
| `React/Workbench/Confirmation Flow` | Confirm dialog flow |
| `React/Workbench/Workbench Document Renderer` | Document render path |
| `JDW/WidgetTree/Workbench`, `JDW/WidgetTree/Lab` | Widget tree lab flows |
| `Shell React/Editor` · Pane toggles | Code / Form / Preview toolbar toggles |

### Baseline only (representative)

Shell verification matrices, command palette scenarios, structured data form (sectioned), auth sign-in, layout primitives, shell provider sidebars (`Shell React/Shell` play stories are baseline), devtools inspectors, timeline, library catalog, and other component stories with `storybook-play-baseline`.

## Critical flow matrix

| Flow | Storybook | Gap / notes |
| ---- | --------- | ----------- |
| Appearance scheme + presets | Required | Extension theme contribution still needs shell-level story |
| Editor Code / Form / Preview toggles | Required (shell story) | Full editor-area DnD / Monaco still E2E-only |
| Permission role demo | Partial (unit tests on `permission-context-keys`) | Sample shell integration stories planned (baseline) |
| Extensions view + diagnostics | Required (sidebar story) | Install/reload lifecycle needs full shell |
| Command inspector | Devtools baseline story | Dedicated inspector editor tab story optional |
| AI chat command proposals | Required | Full `chat-view` mock runtime path in shell optional |
| Schema form / panel validation | Required (form + panel) | Host JSON config round-trip still sample E2E |
| Tab bar fixed toolbar | Shell CSS / unit tests | No isolated Storybook play yet |
| Explorer + deleted tab missing state | Required (editor delete flow) | Virtual workspace only |

## True E2E-only flows (remain on Playwright / workbench-sample)

Keep browser E2E for paths Storybook cannot faithfully replace:

- Local directory workspace open, file watcher, and on-disk persistence
- Extension bundle load + workbench reload after install/enable
- Monaco editor typing, diagnostics, and large-file performance
- Cross-view DnD (editor tabs ↔ explorer, split resize persistence)
- Auth/session against a real backend
- Multi-window or deep link routing in the host app

## GitHub Pages deployment

GitHub Pages exposes **one site per repository environment** (`github-pages`). You cannot publish two independent root sites from the same repo, but a **single artifact** can serve multiple apps on different paths:

| Path | App |
| ---- | --- |
| `/` (or `/{repo}/` for project Pages) | `workbench-sample` static build |
| `/storybook/` (under the same base) | Storybook static build |

### How it works

1. `pages.yml` builds `workbench-sample` with `WORKBENCH_SAMPLE_BASE_PATH` (existing).
2. The same workflow builds Storybook with `STORYBOOK_BASE_PATH=${base_path}/storybook/` (see `.storybook/main.ts` `viteFinal` → `config.base`).
3. `storybook-static/` is copied into `examples/workbench-sample/dist/storybook/` before `upload-pages-artifact`.
4. Release/tag pushes deploy the combined artifact; `workflow_dispatch` builds only (no deploy unless tagged).

Local preview of subpath Storybook:

```powershell
$env:STORYBOOK_BASE_PATH = '/storybook/'
pnpm build:storybook
pnpm exec serve storybook-static
```

### Alternatives not used

- **Separate workflow** (`storybook-pages.yml` on `workflow_dispatch`) — redundant when a subfolder deploy is sufficient.
- **Storybook-only Pages** — would replace the sample at `/`; avoided to keep the public demo intact.

## Story layout conventions

- Keep story definitions in `*.stories.tsx` only — avoid per-component `Foo.stories.css` files.
- Wrap panels in shared hosts from `packages/react/src/workbench/story/`: `WorkbenchStoryHost` (theme shell), `StorySidebarFrame` (sidebar width/height presets), `StoryEventLog` (harness status footer).
- Prefer these components over inline `style` or ad-hoc `className` layout in stories; product components should not gain story-only `style` props.

## Adding a new required play test

1. Add or extend a `*.stories.tsx` file under `packages/react/src` or `packages/shell-react/src`.
2. Use `import { expect, userEvent, within } from 'storybook/test'`.
3. Mirror patterns in `AppearanceSettings.stories.tsx`: harness state region, ARIA-first queries, `tags: ['storybook-play-baseline', 'storybook-play-required']`.
4. Run `pnpm build:storybook && pnpm test:storybook-play:required`.
5. Update this document's tables when promoting flows.
