# Explorer selection policy notes

**Status:** Interim kit convention → **north star: VS Code-compatible focus/selection**  
**Related:** [#8](https://github.com/NewChoBo/workbench-kit/issues/8) ·
`applyWorkspaceExplorerFolderFocus` · `WorkspaceExplorer` folder-click ·
[Consumer Integration Backlog](./consumer-integration-backlog.md)

## Direction

Future explorer work should converge on **VS Code-compatible behavior rules**,
not invent a permanent kit-only selection dialect.

| Horizon | Goal                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------- |
| Now     | Keep the interim `paths` / `focusedPath` model **internally consistent** (no folder-in-`paths`) |
| Next    | Name and document APIs in VS Code terms (focus vs selection, multi-select context)              |
| Later   | Align default controller/command targets with VS Code explorer `getContext`-style rules         |

When a change could go either “kit-simple” or “VS Code-like”, prefer the VS Code-like
rule **if** it can be expressed without Electron/host product details and without
breaking the published selection DTO without a migration note.

## Interim kit model (current source of truth)

Workbench Kit today splits explorer chrome state:

| Field         | Role                                                            |
| ------------- | --------------------------------------------------------------- |
| `paths`       | **File** multi-select list used by delete/move keyboard actions |
| `focusedPath` | Keyboard/focus target; folders use this with `paths: []`        |
| `anchorPath`  | Range-select anchor for files                                   |

Folder click already does `{ focusedPath, paths: [] }`. File activate fills
`paths`. Hosts that treat `paths` as “whatever is highlighted” will mis-handle
folders.

### Safe interim rule

After **create-folder** / **rename-folder** without a host `mapRenameSelection`:

- focus the folder (`focusedPath`)
- keep `paths` empty

Same shape as folder-click. Do **not** put folder paths into `paths`.

File create/rename may continue to use `applyWorkspaceExplorerMutationResult`
(file path → `paths`).

## VS Code alignment target

VS Code explorer distinguishes **focus** vs **selection**. Commands typically
act on:

1. the **multi-selection** when multi-select is respected **and** focus is inside
   that selection, otherwise
2. the **focused** item alone

(See VS Code explorer `getContext` and historical multi-select/focus issues.)

### Target kit semantics (to grow into)

| Concept             | VS Code analogue                    | Intended kit outcome                                          |
| ------------------- | ----------------------------------- | ------------------------------------------------------------- |
| Focus               | Tree focus                          | `focusedPath` (files **and** folders)                         |
| Selection           | Tree selection                      | Ordered selected resources (not file-only forever)            |
| Action context      | `getContext(focus, selection, …)`   | Shared helper: resources an explorer command should act on    |
| Folder in selection | Folders participate in multi-select | Stop requiring “folder ⇒ empty `paths`” as a permanent rule   |
| Host overrides      | Extension / custom handlers         | Keep `mapRenameSelection` / delete ports until defaults match |

### Migration principles

1. **Do not** big-bang replace the DTO in one PR. Prefer additive helpers
   (`resolveExplorerActionPaths(focus, selection, { respectMultiSelection })`)
   and Storybook/unit fixtures that mirror VS Code cases.
2. **Do** make each bugfix a step toward the table above (e.g. folder rename
   focusing without polluting file `paths` was interim consistency; later,
   folders may belong in selection explicitly).
3. **Do not** fork titlebar/window rules here — this doc is explorer tree only.
4. Ambiguous leftovers until the helper exists (host-owned or deferred):
   - `moveEntries` results that mix files and folders
   - Whether creating a file should clear a prior folder focus
   - Expanded-path remap after folder rename
   - Keyboard delete when focus is outside the multi-selection (VS Code nuance)

## Inline-edit commit gating

Enter then blur can double-fire commit. Preferred pattern (independent of VS Code):

1. UI: once-per-draft commit flag (reset on new draft id or draft `error`)
2. Controller: in-flight flag; open on validation/async failure; clear draft
   (and open gate) on success; public `setInlineEdit` must open the gate so
   host clears/replacements cannot stick the controller shut
