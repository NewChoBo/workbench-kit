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

**Required story count:** 19 before this slice → **23** after component stories (+4: schema panel validation, chat command proposal, extension diagnostics, editor pane toggles) → **28** after sample shell integration (+5: authenticated layout, settings appearance, permission owner/viewer, extensions view). README editor toggles remain baseline-only.

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
| `React/Workbench/Shell` · Integrated Shell (full flow) | Adapter demo shell smoke via `IntegratedShellDemo` / `WorkbenchStandaloneShell` |
| `React/Workbench/Confirmation Flow` | Confirm dialog flow |
| `React/Workbench/Workbench Document Renderer` | Document render path |
| `JDW/WidgetTree/Workbench`, `JDW/WidgetTree/Lab` | Widget tree lab flows |
| `Shell React/Editor` · Pane toggles | Code / Form / Preview toolbar toggles |
| `React/Workbench/Integration/Sample Shell` · Authenticated workbench | Virtual workspace bootstrap, explorer, editor tab, status bar |
| `React/Workbench/Integration/Sample Shell` · Settings appearance | Settings modal → Appearance scheme/preset comboboxes |
| `React/Workbench/Integration/Sample Shell` · Permission owner | Owner activity bar (Search, Commands, Extensions) |
| `React/Workbench/Integration/Sample Shell` · Permission viewer | Viewer activity bar (Explorer only) |
| `React/Workbench/Integration/Sample Shell` · Extensions view | Extensions activity → Installed catalog |

### Baseline only (representative)

Shell verification matrices, command palette scenarios, structured data form (sectioned), auth sign-in, layout primitives, shell provider sidebars (`Shell React/Shell` play stories are baseline), devtools inspectors, timeline, library catalog, and other component stories with `storybook-play-baseline`.

**Primary `:5173` E2E replacement:** `React/Workbench/Integration/Sample Shell` in `WorkbenchSampleShell.stories.tsx` mirrors `workbench-sample` without the Vite dev server.

**Removed (redundant):** `React/Workbench/Shell/Standalone` — untagged orphan play duplicated Integrated/Sample shell checks; canvas shell remains at `React/Workbench/Shell/CanvasShell`.

**Sample shell integration (baseline optional):** `React/Workbench/Integration/Sample Shell` · README editor toggles — Code/Preview toolbar on README tab. Harness: `WorkbenchSampleStoryShell.tsx`; seed: `sample-workspace.seed.ts`; play helpers: `sample-shell-play.ts`. Five other sample shell stories are in the required gate above.

## Critical flow matrix

| Flow | Storybook | Gap / notes |
| ---- | --------- | ----------- |
| Appearance scheme + presets | Required (settings + sample shell) | — |
| Editor Code / Form / Preview toggles | Required (shell story); baseline (sample README toggles) | Full editor-area DnD / Monaco still E2E-only |
| Permission role demo | Required (sample shell owner vs viewer) | Profile/settings override UI still sample E2E |
| Extensions view + diagnostics | Required (sidebar + sample shell) | Install/reload lifecycle needs full shell |
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

Stories follow a thin file structure: **meta** (title, shared `parameters`) → **harness** (local or imported) → **story variants** with minimal `render` bodies and `play` assertions.

### Harness layers

| Layer | Component / module | Use when |
| ----- | ------------------ | -------- |
| Theme root | `WorkbenchStoryHost` | Full-shell or provider stories need document theme sync |
| Panel shell | `StoryWorkbenchShellFrame` | Settings, sidebar, or editor-island stories (`variant`: `settings` \| `sidebar` \| `editor`) |
| Sidebar layout | `StorySidebarFrame` | Chat, workspace explorer, search panel width/height presets |
| Status footer | `StoryEventLog` | Harness event/status log for play assertions |
| Integration host | `WorkbenchSampleStoryShell` + `sample-workspace.seed.ts` | Sample-app mirror without `:5173` |
| Runtime chat | `ChatRuntimeHarness` | Mock runtime + transport wiring for `ChatPanel` plays |
| Play helpers | `sample-shell-play.ts` | Sample shell ready gates, activity bar queries, settings modal |

- Keep story definitions in `*.stories.tsx` only — avoid per-component `Foo.stories.css` files.
- Prefer harness components over inline `style` or ad-hoc `className` layout; product components should not gain story-only `style` props.
- Override integration scenarios via harness **props** (`permissionRole`, `workspaceInit`) or seed helpers (`sampleWorkspaceWithOpenPaths`, `sampleWorkspaceWithoutOpenTabs`) — not copy-pasted fixture blobs per story.

### Fixture data: when inline arrays are OK

| Pattern | Use for | Example in repo |
| ------- | ------- | --------------- |
| **`args` + component** | Single component, few props | Most primitive stories |
| **`render` + small harness** | Stateful wrapper around one surface | `AppearanceSettings.stories.tsx` (`AppearanceSettingsHarness`) |
| **Per-story inline objects** | Scenario-specific mock plans (2–5 fields) | `ChatPanel.stories.tsx` (`response`, `workspacePatches`) |
| **Shared runtime harness** | Mock runtime + chat transport wiring | `ChatRuntimeHarness.tsx` |
| **Shared harness module** | Full host composition (providers, virtual workspace, permissions) | `WorkbenchSampleStoryShell.tsx`, `sample-workspace.seed.ts` |
| **Play helpers** | Repeated ready gates and canvas queries | `sample-shell-play.ts` |
| **Imported JSON** | Large or host-owned config trees | `examples/workbench-sample/src/bootstrap.ts` (`.workbench/*.json`) |

**Default (component / panel stories):** do **not** build large inline fixture arrays in `*.stories.tsx`. Import the real component, use `args` or a thin `render` harness, and keep scenario data next to the story (small objects only).

**Exception (integration shell stories):** a trimmed virtual workspace seed and extension/layout config **may** live in a dedicated harness file when the story mirrors `workbench-sample` without `:5173`. Keep wiring (providers, gates) in the harness; override per story via props (`permissionRole`, `workspaceInit.openPaths`) — see `WorkbenchSampleShell.stories.tsx`. Avoid duplicating the full `bootstrap.ts` tree (schemas, `.workbench/` mirror) unless a play test needs it.

**Not the norm:** monolithic fixture blobs inside every story file, or copy-pasting `bootstrap.ts` into stories — extract to harness + exports, or share JSON when the fixture grows past ~100 lines or must stay in sync with the sample app.

## Adding a new required play test

1. Add or extend a `*.stories.tsx` file under `packages/react/src` or `packages/shell-react/src`.
2. Use `import { expect, userEvent, within } from 'storybook/test'`.
3. Mirror patterns in `AppearanceSettings.stories.tsx`: harness state region, ARIA-first queries, `tags: ['storybook-play-baseline', 'storybook-play-required']`.
4. Run `pnpm build:storybook && pnpm test:storybook-play:required`.
5. Update this document's tables when promoting flows.
