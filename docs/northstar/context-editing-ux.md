# Context actions and editing UX

Admission: `READY_FOR_IMPLEMENTATION`, 2026-09-19, source `b24abeed`.
Scope: two independent compatibility packets, not a new command framework.

## Shared interaction contract

An item's context menu acts on that item. Opening it selects/focuses that target
without applying an edit. Pointer right-click, a visible More actions button and
Shift+F10/ContextMenu must expose the same supported actions. Keyboard placement
uses the invoking element's rectangle, never a synthetic pointer origin. A menu
does not imply a mutation or an enabled operation that its owner cannot perform.
Keep actions local and short: inspect/edit, supported arrangement, then removal.
Do not add fake Duplicate, Copy/Paste, save or network actions.

Text inputs, textareas, selects, editable content and explicit native-menu
opt-ins retain their native menu. Custom contenteditable values and descendant
text nodes use the same rule in the shell and optional global guard. Explicit
contenteditable=false boundaries remain meaningful. Non-editing chrome keeps
the existing custom-menu policy.

Menu focus follows the [WAI-ARIA menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/):
arrows navigate; Escape dismisses and restores the connected invoker; Tab and
Shift+Tab leave the menu and dismiss without restoring focus over the new target.
Activation must not steal focus from an opened editor. Existing disabled-item
navigation policy is retained by these packets; this is not blanket APG conformance.

Editing uses the existing property editor, source and canonical host callback.
Do not invent another draft/history store inside a menu. Document-level Save,
Discard, failure/retry and Undo belong to the host's established editing session.
The shell form currently calls setContent/markDirty and promotes preview tabs;
it does not persist on context-menu open or claim an Apply completed.

## WB-ST-018 — native text context and menu dismissal

Own `workbench/commands/workbenchContextMenu.ts`, the optional native guard in
`workbench/commands/keyboard.ts`, ContextMenu's focus/dismiss behavior and adjacent
tests. Share one native-target decision; cover input/select/textarea, true/empty/
plaintext-only/inherited editable content, false boundaries, ordinary chrome,
explicit opt-ins and listener cleanup. Cover Tab in both directions without
activation or forced focus return, internal navigation, Escape and action focus.
Avoid a broad new event service, public export or global Tab handler.

## WB-ST-019 — Widget Tree context-to-properties

Actual sample reproduction: in JDW Lab / Widget Tree Form, right-clicking a text
outline row opens no menu and leaves the root selected. The existing outline
already supports Enter/double-click activation, Alt+Up/Down movement and Delete;
the Inspector and canvas use the same controlled document and selection.

Own WidgetTreeLab, WidgetTreeView, WidgetTreeCanvasPreview and private adjacent
helpers/tests, plus focused widget-tree CSS. Add optional context-action request
callbacks on View/Canvas without changing existing controlled callers. One Lab
owner resolves actions against the target and calls its existing activation,
move and remove handlers. Right-click and keyboard entry work on both surfaces;
a compact, accessible More actions entry provides a visible alternative in the
outline. Edit properties focuses the target's Inspector, Inspect properties is
available when read-only. Move actions use the existing movement resolver;
removal stays unavailable for root/read-only/invalid targets.

Capture document identity/value with the target. Close/invalidate a menu on
document replacement, parse failure, mode change or changed write permission,
before a former array path could refer to another node. Nested canvas events
resolve the nearest authored widget path, never an ancestor or expanded reference
child without an authored target. Opening/dismissing a menu does not change the
document. Native input menus and actual interactive preview content stay usable.
Opening a menu must not initiate a drag or resize.

This packet improves editing entry and existing actions; it does not add duplicate
semantics, multi-selection, a new persistence session, transactional Inspector
drafts, or migrate the compatibility Widget Tree to the V3 authoring document.

## WB-ST-019B — code and property selection ownership

Admission: `READY_FOR_IMPLEMENTATION`, source `7dcb2c66`, discovered by the
integration browser play. In the actual WidgetTreeWorkbench with Monaco visible,
editing Beta's Content to empty triggers automatic source cursor movement; the
Inspector switches to Gamma and subsequent typing changes Gamma. The sample's
Form without a visible source editor does not reproduce this path.

Own WidgetSourceEditor cursor-to-selection forwarding and adjacent focused tests.
Only user-owned code cursor navigation may change the authored selection.
Controlled source synchronization and reveal operations must not retarget an
ongoing Inspector edit. Keep the public callback shape, Monaco integration and
existing canonical patch/selection owner; do not add a second selection store.
Verify the failing real Monaco story with multiple characters, preserved target
and focus, Save/Discard, and a positive user code-navigation case. Add focused
regressions for listener lifecycle and latest source/callback where applicable.
Independent review, fast validation and packed budgets remain required.

## Verification and remaining work

Write behavior regressions before implementation. Use the real React components
and deterministic JDW documents for two different nodes, nested containers,
root/first/last children, read-only, malformed and externally replaced documents.
Verify no mutation on open/Escape, correct target, Inspector focus and actual
property change, matching More/keyboard actions, stale-target rejection, native
text menus and single existing patch dispatch. Browser/Storybook must operate the
real editor with long labels and inspect menu clamping and keyboard focus.

Parts use separate branches/worktrees. The integrator owns sample/story evidence,
registry, this receipt and plan; part commits receive independent review before
local integration. Run focused tests, typecheck, lint/format, full fast and
commit-safety. Keep existing packed budgets; any necessary budget change requires
separate measured review and is not pre-admitted here. No release is implied.

Follow-on packets: Explorer selection/context parity; host-visible Save/Discard
and failure/retry evidence for Form; reversible multi-step Inspector sessions;
domain-specific Mapping/Recipe/Graph menus. These require their own ownership and
admission. Hosts consume released generic mechanics and provide their own product
actions, permission and persistence policy.
