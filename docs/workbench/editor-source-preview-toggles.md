# Editor source / preview pane toggles

## UX model

Workbench text editors use **Model B** visibility toggles instead of a tri-state `Source | Split | Preview` control.

| Control | Role |
| ------- | ---- |
| **Source** | Toggle source pane visibility (default: on) |
| **Preview** | Toggle preview pane visibility when a preview provider matches (default: off) |
| **Code (JSON)** / **Form** | Source *kind* selectors for JSON documents with a form provider |

Invariant: at least one of Source or Preview must stay visible when preview is available.

## Layout

| Source | Preview | Result |
| ------ | ------- | ------ |
| on | off | Source only (code editor or form) |
| on | on | `SplitView` with source primary, preview secondary |
| off | on | Preview only |

## State

Per-tab session state in `TextEditorSurface` (`editor-host-surface.tsx`):

```ts
{
  sourceVisible: boolean;   // default true
  previewVisible: boolean;  // default false
  sourceKind: 'code' | 'form';
}
```

`defaultViewModeForResource` maps legacy `EditorViewMode` values:

- `code` → source on, preview off
- `form` → source on (form kind), preview off
- `preview` → source off, preview on

## Related concepts

- **Preview tab** (`EditorTabState.preview`) — explorer single-click ephemeral tab semantics; unrelated to pane visibility.
- **Missing resource editor** — unchanged; no pane toolbar when the resource is missing.
