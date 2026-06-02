# Storybook Direction

Storybook owns component-level documentation and state matrices. Keep the sample
app for integrated composition smoke checks, and use Storybook to show primitive
and layout components in small isolated states.

## Current Shape

- Keep a root `.storybook` directory.
- Use `@storybook/react-vite`.
- Collect stories from `packages/react/src/**/*.stories.tsx` and
  `stories/**/*.stories.tsx`.
- Keep `examples/react-sample` as the integrated sample app.

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
  "storybook": "storybook dev --port 6010 --host 127.0.0.1 --no-open",
  "build:storybook": "storybook build"
}
```

`pnpm validate` includes `build:storybook` so Storybook drift is caught with the
rest of the package gate.

## Interaction Tests

Interaction tests are not part of the baseline yet. Add them first to components
where accessibility or state regressions are most likely.

- `ConfirmDialog`: open state, accessible name, confirm/cancel
- `Checkbox`: checked state
- `Select`: value changes
- `ContextMenu`: open state, menu item selection, close behavior
