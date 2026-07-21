# Editor view mode (Code / Form / Preview)

## UX model

Workbench text editors expose an **exclusive icon select** in the tab-strip
toolbar (`role="radiogroup"`). Choosing one icon shows that viewport only.

| Control     | Role                                                  |
| ----------- | ----------------------------------------------------- |
| **Code**    | Monaco/text source viewport                           |
| **Form**    | Structured form viewport when a form provider matches |
| **Preview** | Preview viewport when a preview provider matches      |

Unlike independent toggles, icons do **not** combine panes into splits. One
mode is active at a time.

## File types

| Resource                                                   | Code | Form   | Preview                        |
| ---------------------------------------------------------- | ---- | ------ | ------------------------------ |
| Plain source (`.ts`, `.tsx`)                               | yes  | hidden | hidden                         |
| Plain JSON (`.json`)                                       | yes  | hidden | hidden                         |
| JDW widget (`*.jdw.json`, `jdw/showcase/example.jdw.json`) | yes  | yes    | yes (JdwPreview)               |
| Markdown (`.md`)                                           | yes  | hidden | yes (WorkbenchMarkdownPreview) |
| JDW schema (`*.jdw.schema.json`)                           | yes  | hidden | hidden                         |

Form is **not** a blanket JSON feature. Only documents with a matching form
provider (for example JDW widget Form) show the Form icon. Hosts may opt into
the shallow `JSON_FORM_PROVIDER` or register a schema-backed form provider for
specific paths.

Form and Preview icons render only when the matching document view provider is
resolved. The toolbar is hidden when neither Form nor Preview is eligible.

## Layout

Visible pane is always a single viewport (no Code|Form|Preview split
composition from this control).

## State

Per-tab session state in `TextEditorSurface` (`editor-host-surface.tsx`):

```ts
{
  code: boolean; // exclusive with form/preview
  form: boolean;
  preview: boolean;
}
```

`defaultViewModeForResource` can still force an initial mode. When it returns
`undefined`, **Form is the default whenever a form provider matches**; otherwise
Code.

Selection uses `editorViewModeToPaneVisibility` / `paneVisibilityToPrimaryViewMode`.

## Related concepts

- **Preview tab** (`EditorTabState.preview`) — explorer single-click ephemeral tab semantics; unrelated to view-mode icons.
- **Missing resource editor** — unchanged; no mode toolbar when the resource is missing.
- **Legacy** `toggleEditorPaneVisibility` remains for tests/API but is not used by the toolbar.
