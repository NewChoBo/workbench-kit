# Storybook E2E Coverage

Storybook validates both isolated workbench components and the sample app behind
`pnpm dev` (`examples/workbench-sample`). Component stories prove panel contracts;
integration stories prove host wiring. Guard against excess — duplicate full shells,
orphan plays, and unbounded required growth — using the balance rules below.

## Current Story Source

Storybook discovers stories from the paths configured in `.storybook/main.ts`.
Today that is:

```text
examples/workbench-sample/src/**/*.stories.@(ts|tsx)
packages/react/src/primitives/Controls.stories.@(ts|tsx)
packages/react/src/primitives/EditorChrome.stories.@(ts|tsx)
packages/react/src/modal/OverlayDialogs.stories.@(ts|tsx)
packages/react/src/workbench/chat/ChatComponents.stories.@(ts|tsx)
packages/react/src/workbench/workspace/WorkspaceSearchPanel.stories.@(ts|tsx)
```

The canonical integration story file is:

```text
examples/workbench-sample/src/WorkbenchSample.stories.tsx
```

That file renders `examples/workbench-sample/src/App.tsx` directly and imports the
sample host CSS, so integration stories follow the dev sample bootstrap instead of a
separate story-only workbench harness.

Component stories live beside their package modules only when they are explicitly
listed in `.storybook/main.ts`. Do not use broad package globs and do not add a
second integration harness such as `WorkbenchStandaloneShell` story copies or
removed `StandaloneShell` fixtures.

## Story scope balance

Use tiers to decide what belongs in Storybook and whether it blocks release.

| Tier            | What                                                                                                       | Gate                                                                                | Examples                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Component       | Single component or panel; args plus one or two play flows                                                 | `storybook-play-baseline`, or `storybook-play-required` when user-facing and stable | `Controls`, `EditorTabs`, `ChatPanel`, `WorkspaceSearchPanel` |
| Integration     | Full sample shell; one scenario per concern                                                                | `storybook-play-required` sparingly (~5)                                            | `Workbench Sample/Dev App` login, journey, permission scope   |
| Visual / manual | Docs, layout matrix, no play or smoke-only                                                                 | Never required                                                                      | Shell verification matrix, layout primitives                  |
| Avoid           | Duplicate full-shell stories, orphan plays, per-story CSS on product components, 100+ line inline fixtures | Remove or demote                                                                    | Removed `StandaloneShell`; duplicate sample-shell copies      |

### Rules to prevent excess

- **One integration path per concern.** Do not require the same assertion in both a
  component story and a sample integration story unless the tiers prove different
  contracts (panel API vs host wiring).
- **Component framing.** Prefer one small local harness per story. Use
  `StorySidebarFrame` / `StoryWorkbenchShellFrame` only when the component needs
  workbench panel framing. Pick the frame by production placement: sidebar panel,
  editor/main area, settings/form surface, or overlay trigger surface. Do not
  attach inline `style` to product components in stories.
- **Required tag discipline.** Tag `storybook-play-required` only for flows that
  block release. Keep the current curated gate small, roughly sample integration
  plus five component stories, unless a broader matrix has an explicit owner.
- **Orphan plays.** Every `play` function must carry `storybook-play-baseline` or
  `storybook-play-required`. Delete the play or add a tag.
- **New component default.** Ship one default story (args / static render). Add at
  most one additional play-required flow when the component sits on a critical
  user-facing path and unit tests cannot cover the visible behavior.

See also `docs/conventions/storybook.md` for promotion criteria and scripts.

## Required Play Gate

`pnpm test:storybook-play:required` runs stories tagged `storybook-play-required`.

### Integration tier (sample app)

| Story                                               | Flow covered                                                                                                                                                     |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Workbench Sample/Dev App` - Login gate             | Unauthenticated sample login screen and dummy credentials copy                                                                                                   |
| `Workbench Sample/Dev App` - Login submit flow      | Dummy backend sign-in failure, error display, successful tester sign-in, and shell handoff                                                                       |
| `Workbench Sample/Dev App` - Tester workbench       | Authenticated administrator workbench shell, explorer, status bar, and activity bar                                                                              |
| `Workbench Sample/Dev App` - Tester dev app journey | Dev-app integration path: startup editor state, search result open, command palette, chat, AI chat composer, settings, profile permission override, and sign-out |
| `Workbench Sample/Dev App` - Basic permission scope | Basic account permission projection; only Explorer and Profile remain visible                                                                                    |

### Component tier (package harness)

The current required component set is intentionally small:

| Story                                                          | Container                            | Flow covered                                                                          |
| -------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| `React/Primitives/Controls` - Form controls                    | Settings/form surface                | Controlled text, number, checkbox, select, textarea, button, and icon-button behavior |
| `React/Primitives/Editor Chrome` - Tabs and mode controls      | Editor/main area                     | Editor tab selection, mode segmented control, close action, and new-tab action        |
| `React/Overlay/Dialog Actions` - Confirmation and context menu | Main-area trigger with fixed overlay | Confirm dialog cancel/confirm plus context-menu disabled and select behavior          |
| `React/Workbench/Chat Components` - Runtime controls           | Sidebar chat panel                   | Chat command proposal allow flow plus composer submit/reset                           |
| `React/Workbench/Workspace Search` - Search panel flow         | Sidebar search panel                 | Empty, result, Enter activation, clear, no-result, and refresh behavior               |

Add a required story only when it proves a stable, user-visible flow and can fail
with an actionable product-level case name. Promote from `storybook-play-baseline`
after repeated green runs.

### Duplicate concern audit (post-harness refactor)

After the shared harness refactor and `StandaloneShell` removal, watch these overlaps
when both component and integration tiers are present:

| Concern                   | Component / panel                     | Integration                                          | Verdict                                                                                                        |
| ------------------------- | ------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Settings appearance       | `AppearanceSettings`                  | Journey settings + any sample-shell settings story   | **Review** — keep component for schema/combobox contract; integration proves modal open from activity bar only |
| Extensions list           | `ExtensionManagementSidebar`          | Sample extensions view or journey                    | **Review** — avoid duplicate install/list assertions; pick one required path                                   |
| Permission projection     | Profile / role controls (component)   | `Basic permission scope`, journey profile override   | **Justified split** — sign-in role vs runtime override vs activity-bar projection                              |
| Search                    | `WorkspaceSearchPanel` (panel flows)  | Journey search open                                  | **Justified split** — panel API vs activity wiring                                                             |
| Chat / AI                 | `ChatPanel` runtime flows             | Journey chat + AI composer                           | **Justified split** — transport/runtime vs sidebar navigation                                                  |
| Authenticated shell smoke | `Integrated Shell` or workbench smoke | `Tester workbench` / sample authenticated story      | **Avoid duplicate** — one required authenticated shell smoke across tiers                                      |
| Full-shell harness        | —                                     | Second sample-shell file mirroring `WorkbenchSample` | **Remove** — max one integration file per host (`App.tsx`)                                                     |

No new excess was introduced by the harness refactor itself. The main risk is
re-adding parallel full-shell stories or requiring the same UI assertion at both
component and integration tiers without a tier-specific reason.

## Scripts

| Script                              | Scope                                              |
| ----------------------------------- | -------------------------------------------------- |
| `pnpm storybook`                    | Local Storybook dev server on `127.0.0.1:6010`     |
| `pnpm storybook:components`         | Local Storybook opened on the first component case |
| `pnpm storybook:sample`             | Local Storybook opened on the sample journey case  |
| `pnpm build:storybook`              | Static Storybook build                             |
| `pnpm test:storybook-play:required` | Required play stories only                         |
| `pnpm validate:ui`                  | `build:storybook` + `test:storybook-play:required` |
| `pnpm validate:full`                | Static/unit gates plus Storybook UI validation     |

`scripts/test-storybook-play.mjs` starts Storybook on port `6010` when needed, then
invokes `test-storybook` with `--includeTags=storybook-play-required`.

## Scope Rules

- Treat `workbench-sample` as the source of truth when an integration scenario is
  ambiguous.
- Keep component stories focused on one panel; keep integration stories focused on
  one host workflow. Follow **Story scope balance** above before adding stories.
- Do not reintroduce broad package-level story matrices without a matching
  maintenance plan and required verification path.
- Prefer real sample storage/session setup over duplicate story-only fixtures.
- Keep story definitions in `*.stories.tsx`; keep reusable runtime behavior in
  package modules, shared story harness code, or the sample host.
- Use ARIA-first play assertions that prove visible behavior, not implementation
  details.

## True E2E-only Flows

Keep browser E2E or manual sample-host checks for paths Storybook does not faithfully
cover:

- Local directory workspace open, file watcher, and on-disk persistence
- Extension bundle load plus workbench reload after install or enablement changes
- Monaco editor typing, diagnostics, and large-file performance
- Cross-view drag and drop, editor tab drag, and split resize persistence
- Auth/session against a real backend
- Multi-window or deep-link host routing

## GitHub Pages Deployment

GitHub Pages can still serve Storybook under the sample artifact:

| Path              | App                             |
| ----------------- | ------------------------------- |
| `/` or `/{repo}/` | `workbench-sample` static build |
| `/storybook/`     | Storybook static build          |

`pages.yml` should build `workbench-sample`, build Storybook with
`STORYBOOK_BASE_PATH=${base_path}/storybook/`, copy `storybook-static/` into
`examples/workbench-sample/dist/storybook/`, and upload one combined Pages artifact.
