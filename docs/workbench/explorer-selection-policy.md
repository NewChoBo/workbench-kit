# Explorer selection policy notes

**Status:** Analysis / kit convention  
**Related:** [#8](https://github.com/NewChoBo/workbench-kit/issues/8) ·
`applyWorkspaceExplorerFolderFocus` · `WorkspaceExplorer` folder-click

## Kit model (source of truth)

Workbench Kit splits explorer chrome state:

| Field         | Role                                                            |
| ------------- | --------------------------------------------------------------- |
| `paths`       | **File** multi-select list used by delete/move keyboard actions |
| `focusedPath` | Keyboard/focus target; folders use this with `paths: []`        |
| `anchorPath`  | Range-select anchor for files                                   |

Folder click already does `{ focusedPath, paths: [] }`. File activate fills
`paths`. Hosts that treat `paths` as “whatever is highlighted” will mis-handle
folders.

## Safe kit-aligned rule

After **create-folder** / **rename-folder** without a host `mapRenameSelection`:

- focus the folder (`focusedPath`)
- keep `paths` empty

Same shape as folder-click. Do **not** put folder paths into `paths`.

File create/rename may continue to use `applyWorkspaceExplorerMutationResult`
(file path → `paths`).

## VS Code comparison (why some cases stay host-owned)

VS Code explorer distinguishes **focus** vs **selection**, and commands often
act on focus unless multi-select is respected and focus is inside the
selection (see explorer `getContext` / historical multi-select issues).

That is richer than kit’s current `paths` + `focusedPath` pair. Implications:

1. **Do not** copy VS Code’s full focus/selection matrix into the kit in one
   jump — hosts with custom multi-select should keep `mapRenameSelection` /
   delete handlers.
2. **Do** keep kit’s simpler invariant consistent: folders are focus-only in
   the default controller path.
3. Ambiguous leftovers (document, do not guess in the default controller):
   - `moveEntries` results that mix files and folders
   - Whether creating a file should clear a prior folder `focusedPath`
   - Expanded-path remap after folder rename (still host/virtual-port concern)

## Inline-edit commit gating

Enter then blur can double-fire commit. Preferred pattern:

1. UI: once-per-draft commit flag (reset on new draft id or draft `error`)
2. Controller: in-flight flag; open on validation/async failure; clear draft
   (and open gate) on success; public `setInlineEdit` must open the gate so
   host clears/replacements cannot stick the controller shut
