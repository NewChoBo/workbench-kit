# Editor pane toggles (Code / Form / Preview)

## UX model

Workbench text editors expose independent pane visibility toggles in the tab-strip toolbar.

| Control     | Role                                                                    |
| ----------- | ----------------------------------------------------------------------- |
| **Code**    | Toggle Monaco/text source pane (default: on)                            |
| **Form**    | Toggle structured form pane when a form provider matches (default: off) |
| **Preview** | Toggle preview pane when a preview provider matches (default: off)      |

Invariant: at least one pane must stay visible.

## File types

| Resource                                      | Code | Form   | Preview                        |
| --------------------------------------------- | ---- | ------ | ------------------------------ |
| Plain source (`.ts`, `.tsx`)                  | yes  | hidden | hidden                         |
| JSON config (`.json`)                         | yes  | yes    | hidden                         |
| JDW widget (`*.jdw.json`, `example.jdw.json`) | yes  | yes    | yes (JdwPreview)               |
| Markdown (`.md`)                              | yes  | hidden | yes (WorkbenchMarkdownPreview) |
| JDW schema (`*.jdw.schema.json`)              | yes  | yes    | hidden                         |

Form and Preview controls render only when the matching document view provider is resolved.

## Layout

Visible panes compose left-to-right with nested `SplitView` in stable order: **Code → Form → Preview**.

| Code | Form | Preview | Result                            |
| ---- | ---- | ------- | --------------------------------- |
| on   | off  | off     | Code editor only                  |
| on   | on   | off     | Code + Form split                 |
| on   | off  | on      | Code + Preview split              |
| off  | on   | on      | Form + Preview split              |
| on   | on   | on      | Nested splits for all three panes |

## State

Per-tab session state in `TextEditorSurface` (`editor-host-surface.tsx`):

```ts
{
  code: boolean; // default true
  form: boolean; // default false
  preview: boolean; // default false
}
```

`defaultViewModeForResource` maps initial `EditorViewMode` values:

- `code` → code on, form off, preview off
- `form` → code off, form on, preview off
- `preview` → code off, form off, preview on

## Related concepts

- **Preview tab** (`EditorTabState.preview`) — explorer single-click ephemeral tab semantics; unrelated to pane visibility.
- **Missing resource editor** — unchanged; no pane toolbar when the resource is missing.
