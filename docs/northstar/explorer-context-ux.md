# Explorer context actions

WB-ST-020: `READY_FOR_IMPLEMENTATION`, baseline `6b01c825`, 2026-09-19.
Follow-on to [context editing UX](./context-editing-ux.md).

Outcome: `LOCALLY_INTEGRATED / SOURCE_REVIEW_PASS / COMBINED_VALIDATION_PASS`.
See the [combined verification receipt](./explorer-context-verification.md).

## Closed behavior contract

An Explorer context request targets its invoking file/folder without opening a
file, expanding a folder or starting a mutation. For a selected file, retain the
multi-file selection and anchor while making the invoked file the focused path.
For an unselected file, select only that file. Folder requests retain existing
folder semantics (focused folder, empty file selection).

Add an optional `onRequestItemContextMenu` callback with a request containing
`node`, existing action `meta`, `invoker: HTMLButtonElement`, `x` and `y`.
Pointer, visible More and Shift+F10/ContextMenu use this same request. Keyboard
and More use the real invoking rectangle; no synthetic MouseEvent is fabricated.
The new callback takes precedence when both callbacks are supplied; the existing
`onItemContextMenu(event, node, meta)` remains the pointer-only fallback. Without
the new callback, do not add an inert More button or consume new keyboard keys.

Compose the built-in More button with existing `renderItemActions` in the
SideBarListItem sibling action slot. Do not nest buttons or route More keys into
another row's actions. Keep existing pointer selection, F2/Delete, drag, folder
navigation and custom action rendering compatible. Native inline-rename context
events must bypass the list background callback using the existing native-menu
policy. Context opening must not accidentally submit or cancel an active draft.

Source audit also found keyboard navigation updates state without moving DOM
focus. Include real row refs/focus movement for Arrow/Home/End and horizontal
navigation: after Escape -> B -> ArrowDown, Delete/F2 must address the newly
focused row. This is the same target-ownership repair, not a new selection model.

The built-in shell Explorer adopts the normalized request and existing menu item
builder/command bridge. Store the connected invoker for Escape restoration;
activation leaves focus with inline Rename/Create or the opened editor. Discard
menus on workspace service/snapshot replacement and entry into an inline edit so
stale paths cannot survive a changed workspace. Do not create another command,
selection, permission, persistence or history owner. Existing host command policy
and failure handling remain authoritative.

## Ownership and verification

The component part owns `WorkspaceExplorer.tsx`, its adjacent behavior tests,
the type re-export in `workbench/workspace/index.ts` and a part receipt. Existing
shared action-slot styling should suffice; only a demonstrated layout defect
admits focused CSS. The integrator owns `shell-react/src/explorer/view.tsx`,
its integration tests, real sample/Storybook scenarios, registry and this receipt.
Use separate worktrees and review the exact part before local integration.

Regression-first tests must cover selected A+B/focused A -> request B, unselected
and folder targets, callback compatibility/precedence, More/keyboard parity and
geometry, Escape return, no implicit open/toggle/mutation, native rename input,
rename cancel/error retry, stale workspace targets and existing custom actions.
Exercise the actual built-in Explorer against deterministic virtual workspace
data, including multiple files, folders and long names; preserve the real menu
builder, controller and commands. No disk or network success is fabricated.

Run focused React/shell tests, browser plays, typechecks, lint/format, public
exports, verification registry and full fast validation. Initial packed budget
remains 253,192 bytes; any change requires a separate measured review. No release
or consumer adoption is implied. Editor-wide Undo/Cancel and durable save failure
UX remain subsequent packets with their own contracts.
