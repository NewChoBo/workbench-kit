# Storybook Direction

Storybook is the required UI regression gate for the sample app that runs through
`pnpm dev:storybook` or `pnpm dev:all`. Keep the Storybook surface narrow, deterministic, and detailed enough
to replace browser E2E smoke for the flows it explicitly covers.

## Current Shape

- Keep a root `.storybook` directory.
- Use `@storybook/react-vite`.
- Collect stories from `examples/workbench-sample/src/**/*.stories.tsx` plus the
  curated package story files listed in `.storybook/main.ts`.
- Render `examples/workbench-sample/src/App.tsx` directly in integration stories.
- Treat `examples/workbench-sample` as the canonical integration Storybook
  source. Component stories are allowed only for focused public surfaces whose
  state, accessibility, or overlay behavior is not covered by the sample app.
- Component stories must use the smallest story container that matches the
  component's production placement. Sidebar panels use `StorySidebarFrame`;
  editor/main chrome uses `StoryWorkbenchShellFrame` with `variant="editor"`;
  settings and form surfaces use `variant="settings"`; overlays put the trigger
  in the owning surface and assert the fixed overlay through document-scope
  queries.
- Do not reintroduce package-wide component galleries as default coverage.
  Isolated package stories are acceptable only when they are explicitly listed
  in `.storybook/main.ts`, have focused assertions, and prove a contract that is
  too low-level for the sample host.
- Storybook-only helpers (frames, play assertions, fixtures) live under
  `packages/react/src/workbench/story/` and are excluded from npm publishes
  (`package.json#files` → `!src/workbench/story`). Do not import them from
  production hosts or public package exports.

## Screen Size Presets

- Common monitor presets are maintained in
  `.storybook/monitor-viewports.ts`.
- `@storybook/addon-viewport` is enabled in `.storybook/main.ts`.
- `monitor-1366x768` is configured as the default Storybook viewport in
  `.storybook/preview.ts`.
- If you need to add or tune a preset, update the `monitorViewports` object in
  `.storybook/monitor-viewports.ts` and keep names/pixel values stable.
- Storybook canvas grid is enabled by default through `storybookGrid` parameters in
  `.storybook/preview.ts` and uses 16px cells with low-contrast lines.
- To disable grid for a single story, set `parameters: { storybookGrid: { enabled: false } }`.
- Workbench stories were changed to use iframe-relative sizing (`min(calc(100% - Xpx), Y)`) so
  changing Storybook viewport size affects layout more realistically than component-fixed
  pixel sizes.

## Current Stories

The required gate combines five integration stories in `WorkbenchSample.stories.tsx`
(sample app behind `pnpm dev`) with a small curated package tier. Keep the gate
around 10 stable stories unless a broader matrix has an explicit maintenance plan.
See [Story scope balance](../workbench/storybook-e2e-coverage.md#story-scope-balance)
for tier rules and duplicate avoidance.

Integration required set:

1. `Workbench Sample/Dev App` - Login gate
2. `Workbench Sample/Dev App` - Login submit flow
3. `Workbench Sample/Dev App` - Tester workbench
4. `Workbench Sample/Dev App` - Tester dev app journey
5. `Workbench Sample/Dev App` - Basic permission scope

These stories render the sample app directly instead of using synthetic package
fixtures. The long journey story should cover dev-app surfaces that would otherwise
require a separate browser E2E smoke: startup editor state, search result opening,
command palette, chat, AI chat composer, settings, profile permission overrides, and
sign-out. Add new required stories only when they cover a stable sample-host
workflow and can be verified by `test:storybook-play:required`.

First-pass component required set:

1. `React/Primitives/Controls` - Form controls in a settings/form surface
2. `React/Primitives/Editor Chrome` - Tabs and mode controls in the editor/main area
3. `React/Overlay/Dialog Actions` - Confirmation and context menu from a main-area trigger
4. `React/Workbench/Chat Components` - Sample peer chat example, peer interaction, and assistant runtime controls
5. `React/Workbench/Workspace Search` - Search panel flow in a sidebar search panel

## E2E Replacement Criteria

A Storybook flow can replace a browser E2E smoke only when it satisfies all of
these conditions:

1. It renders the sample app path used by `pnpm dev`, not a story-only shell copy.
2. It sets only deterministic sample `sessionStorage` or local storage needed to
   reach the scenario.
3. It drives the UI through `@storybook/test` user interactions such as click,
   typing, keyboard shortcuts, and combobox option selection.
4. It asserts user-visible outcomes through ARIA roles, labels, text, status
   regions, tabs, dialogs, or stable DOM state.
5. It is tagged `storybook-play-required` and passes
   `pnpm test:storybook-play:required` repeatedly.
6. It does not require a real backend, a local filesystem watcher, real network
   services, or private product data.

Flows that need real directory access, file watcher behavior, extension reload,
Monaco deep editing, drag-and-drop persistence, real auth, or host deep links
remain true browser E2E or manual sample-host checks.

## Scripts

Use these root scripts:

```json
{
  "storybook": "pnpm exec storybook dev --port 61009 --host 127.0.0.1 --no-open",
  "storybook:components": "pnpm exec storybook dev --port 61009 --host 127.0.0.1 --no-open --initial-path=/iframe.html?id=react-primitives-controls--form-controls&viewMode=story",
  "storybook:sample": "pnpm exec storybook dev --port 61009 --host 127.0.0.1 --no-open --initial-path=/iframe.html?id=workbench-sample-dev-app--tester-dev-app-journey&viewMode=story",
  "storybook:chat": "pnpm exec storybook dev --port 61009 --host 127.0.0.1 --no-open --initial-path=/iframe.html?id=react-workbench-chat-components--sample-peer-chat-example&viewMode=story",
  "build:storybook": "pnpm exec storybook build",
  "test:storybook-play": "pnpm exec node ./scripts/test-storybook-play.mjs",
  "test:storybook-play:required": "pnpm exec node ./scripts/test-storybook-play.mjs --required",
  "validate:ui": "pnpm build:storybook && pnpm test:storybook-play:required",
  "validate:ui:full": "pnpm build:storybook && pnpm test:storybook-play:required",
  "validate": "pnpm validate:fast && pnpm validate:ui",
  "validate:full": "pnpm validate:fast && pnpm validate:ui:full"
}
```

`pnpm validate` includes `build:storybook` and required Storybook interaction playback
(`test:storybook-play:required`) so Storybook drift and key UI regressions are caught with the
rest of the package gate. `pnpm validate:fast` skips Storybook work for
day-to-day code checks, while `pnpm validate:ui` runs the Storybook build plus required play tests.

`validate:full` matches `validate` today (fast checks + Storybook build + required play tests).

## Interaction Tests

Interaction tests use two tags:

- `storybook-play-baseline`: broader coverage executed by `pnpm test:storybook-play`
- `storybook-play-required`: CI gate executed by `pnpm test:storybook-play:required`
  and `pnpm validate:full`

Promote a baseline story to required only after it is stable across repeated runs.
See [Story scope balance](../workbench/storybook-e2e-coverage.md#story-scope-balance)
before expanding the curated gate beyond the current sample plus component set.

The default `test:storybook-play` runner executes stories tagged with
`storybook-play-baseline`; pass `--required` to run only `storybook-play-required` stories.

Do not add a required story just because a component changed. Add or extend a
required story when the change affects either a stable sample-host workflow or a
focused public component contract that users experience through state,
accessibility, overlay, or keyboard behavior. Cover package-local logic with
typecheck and unit tests first, then use Storybook for the visible behavior.

## Workbench Stories

Workbench stories should validate realistic product-like UI flows while keeping
the reusable behavior in package modules. Integration stories render the sample
host directly, so ambiguous host behavior should be checked against `pnpm dev` or
`pnpm dev:all` before adding or changing a story.

- Integration stories may set up sample `sessionStorage` and local storage only
  to reach a deterministic sample-host state.
- Component stories should use one local harness and a small fixture. Avoid
  full-shell copies, product-specific data, and fixture blobs that belong in unit
  tests or the sample host.
- Component stories should pick a container by placement before adding
  interactions: sidebar panel, editor/main area, settings/form surface, or overlay
  trigger surface. Do not invent a custom mini-workbench container unless a real
  production region cannot be represented by the shared story frames.
- Components, hooks, reducers, and command helpers own reusable behavior.
- Sample-host stories may use sample-owned account, workspace, and permission
  data. They must not encode private runtime details, real server addresses, or
  product-specific command names.
- Do not reintroduce broad component galleries unless they have a stable owner,
  focused assertions, and a path into the required play gate.

## Command Menu Surface Review

Workbench integration stories and host-like component stories should keep command
menu projection scoped to the surface that opened the menu.

- Pass an explicit `WORKBENCH_COMMAND_SURFACE_*` value to
  `resolveCommandMenuItems` when a story or component renders command-backed
  context menus from shared command entries.
- Pass `contextKeys` when menu entries or commands use string `when` clauses (for example
  `workspace.hasSelection`, `workspace.multiSelection` on workspace command presets).
- Treat surface-less `resolveCommandMenuItems` calls as unit-test coverage for
  registry fallback behavior or as intentionally global menus; do not use them
  in host-like Workbench integration paths.
- When adding a new command surface, export a stable surface constant, assign it
  to the relevant menu entries, and cover at least one story or test that proves
  unrelated surface entries do not appear.
- In Storybook review, check Activity Bar, Explorer root/item, Search result,
  Editor tab, Settings, and Status Bar menu paths separately because they can
  share command descriptors while requiring different visible actions.

See [Workbench Notes](../workbench/README.md) for current workbench planning
notes.
