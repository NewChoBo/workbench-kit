# Storybook Direction

Storybook owns component-level documentation and state matrices. Keep the sample
app for integrated composition smoke checks, and use Storybook to show primitive
and layout components in small isolated states.

## Recommended Shape

- Add a root `.storybook` directory.
- Use `@storybook/react-vite`.
- Collect stories from `packages/react/src/**/*.stories.tsx` and
  `stories/**/*.stories.tsx`.
- Resolve workspace packages to source entries through Vite aliases.
- Keep `examples/react-sample` as the integrated sample app.

## Initial Stories

Add initial stories in this order:

1. `Badge`, `Button`, `IconButton`
2. `TextInput`, `Select`, `Checkbox`, `Field`
3. `Panel`, `SideBarViewFrame`
4. `ActivityBar`, `SplitView`
5. `ConfirmDialog`, `ContextMenu`

Each story should be valid on dark and light backgrounds. Use generic UI copy
instead of private business data.

## Scripts

When Storybook is added, start with these root scripts:

```json
{
  "storybook": "storybook dev --port 6010 --host 127.0.0.1 --no-open",
  "build:storybook": "storybook build"
}
```

Keep `build:storybook` as a separate validation at first. Add it to `validate`
only after the story set is stable.

## Interaction Tests

Do not add interaction tests to every story at once. Start with components where
accessibility or state regressions are most likely.

- `ConfirmDialog`: open state, accessible name, confirm/cancel
- `Checkbox`: checked state
- `Select`: value changes
- `ContextMenu`: open state, menu item selection, close behavior
