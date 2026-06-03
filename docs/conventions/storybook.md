# Storybook Direction

Storybook owns component-level documentation, state matrices, and integrated
composition smoke checks. Keep public UI scenarios in Storybook so the package
has one visual validation surface.

## Current Shape

- Keep a root `.storybook` directory.
- Use `@storybook/react-vite`.
- Collect stories from `packages/react/src/**/*.stories.tsx` and
  `stories/**/*.stories.tsx`.
- Keep integrated workbench scenarios in Storybook rather than a separate app.

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

## Initial Stories

Initial stories are added in this order:

1. `Badge`, `Button`, `IconButton`
2. `TextInput`, `Select`, `Checkbox`, `Field`
3. `Panel`, `SideBarViewFrame`
4. `ActivityBar`, `SplitView`
5. `ConfirmDialog`, `ContextMenu`

Each story should be valid on dark and light backgrounds. Use generic UI copy
instead of private business data.

## Scripts

Use these root scripts:

```json
{
  "storybook": "pnpm exec storybook dev --port 6010 --host 127.0.0.1 --no-open",
  "build:storybook": "pnpm exec storybook build",
  "test:storybook-play": "pnpm exec node ./scripts/test-storybook-play.mjs",
  "validate:full": "pnpm validate && pnpm test:storybook-play:required"
}
```

`pnpm validate` includes `build:storybook` so Storybook drift is caught with the
rest of the package gate.

`validate:full` adds baseline Storybook interaction playback validation via the
required baseline-mode runner. It currently executes stories tagged with
`storybook-play-baseline`; add `--all-stories` to include non-baseline stories
in follow-up runs.

## Interaction Tests

Interaction tests are not part of the baseline yet. Add them first to components
where accessibility or state regressions are most likely.

- `ConfirmDialog`: open state, accessible name, confirm/cancel
- `Checkbox`: checked state
- `Select`: value changes
- `ContextMenu`: open state, menu item selection, close behavior

## Workbench Stories

Workbench stories should validate realistic product-like UI flows while keeping
the reusable behavior in package modules.

- Stories provide public fixture data and scenario-specific initial state.
- Components, hooks, reducers, and command helpers own reusable behavior.
- Integrated stories should compose Explorer, Search, Chat, Editor, Settings,
  ActivityBar, SplitView, and StatusBar through the same public APIs that a host
  app would use.
- Mock runtime adapters may be used for send/cancel/streaming and workspace
  update scenarios when a real service is not required.
- Do not encode private runtime details, storage keys, server addresses, or
  project-specific command names in stories.

See [Workbench Migration Todo](../workbench/migration-todo.md) for the current
workbench migration and Storybook validation plan.
