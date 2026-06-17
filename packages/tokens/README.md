# Workbench Kit Tokens

Framework-neutral CSS variables and base theme values for Workbench Kit surfaces.

## Usage

Import the stylesheet once in your app shell or Storybook preview:

```ts
import '@workbench-kit/tokens/styles.css';
```

React package styles assume these variables are available through `packages/react/src/styles.css`.

## Checklist

When adding or changing tokens:

- Keep names generic (`--color-bg`, `--color-text`, spacing, radii) — no product-specific labels.
- Update `packages/react/src/styles.css` only when a React surface needs a new alias.
- Verify dark and light backgrounds in Storybook primitives and workbench stories.
- Avoid breaking renames without a prototype release note; consumers import the CSS file directly.

## Package boundary

Tokens stay framework-neutral. React-specific chrome belongs in `@workbench-kit/react`, not here.
