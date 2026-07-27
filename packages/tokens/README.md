# Workbench Kit Tokens

Framework-neutral CSS variables and base theme values for Workbench Kit surfaces.

## Usage

Import the stylesheet once in your app shell or Storybook preview:

```ts
import '@workbench-kit/tokens/styles.css';
```

`styles.css` includes the `ui-file-icon` surface backed by `--file-icon-*` theme variables.

Optional direct import:

```ts
import '@workbench-kit/tokens/file-icons.css';
```

React package styles assume these variables are available through `packages/react/src/styles.css`.

## Editor colors JSON → CSS variables

Map a documented subset of VS Code-compatible theme `colors` keys to kit variables
(pure helper; does not touch the DOM):

```ts
import { cssVariablesFromEditorColors } from '@workbench-kit/tokens';

const vars = cssVariablesFromEditorColors({
  'editor.background': '#1e1e1e',
  'sideBar.background': '#252526',
  'button.background': '#0e639c',
});
// → { '--color-bg': '#1e1e1e', '--color-primary-side-bar-bg': '#252526', ... }
```

Unknown keys are ignored (optional `onUnknownKey`). Invalid color strings are skipped.
See `EDITOR_COLOR_TO_KIT_TOKEN` and [theme-pack-architecture.md](../../docs/workbench/theme-pack-architecture.md).

## Checklist

When adding or changing tokens:

- Keep names generic (`--color-bg`, `--color-text`, `--file-icon-json`, spacing, radii) — no product-specific labels.
- Add new file kinds in `packages/react/src/icons/file-icon.ts` (`FILE_ICON_KINDS`) and matching `--file-icon-*` variables plus rules in `src/file-icons.css`.
- Update `packages/react/src/styles.css` only when a React surface needs a new alias.
- Verify dark and light backgrounds in Storybook primitives and workbench stories.
- Avoid breaking renames without a prototype release note; consumers import the CSS file directly.

## Package boundary

Tokens stay framework-neutral. React-specific chrome belongs in `@workbench-kit/react`, not here.
