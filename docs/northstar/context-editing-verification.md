# Context editing integration evidence

Status: `LOCALLY_INTEGRATED / SOURCE_REVIEW_PASS / COMBINED_VALIDATION_PASS`.
Contract: [context actions and editing UX](./context-editing-ux.md).
Baseline: `b24abeed4a081238a2124b5cd64deff6396fd9c3`.
Local branch: `codex/stabilization-units-20260919`.

## Source review and corrections

The native context/menu part `e717b13e` was independently reviewed and locally
integrated as `30950961`. Native controls, inherited editable regions, explicit
opt-ins and editor roots share one existing policy. Tab dismisses after focus
leaves; it does not cancel traversal or steal the destination's focus.

The Widget Tree part `f3732de4` was integrated as `44580c29`. Independent review
found two sequential-use defects: a previous Inspector activation could steal
focus from the next target's menu, and keys on another row's More button could
mutate the old selection. Both were reproduced before repair. Successor
`9e246cc6` was reviewed and integrated as `7dcb2c66`; test-only `dcbdba7f` became
`ce912c10` so Ctrl+S propagation is checked beyond the React root.

Menus reuse the real Lab selection, activation and patch handlers. They do not
introduce another document, save or undo owner. Root/read-only restrictions and
stale value/path/mode/permission invalidation remain explicit. Expanded reference
children cannot silently retarget an authored ancestor.

The real Monaco play then exposed a separate cursor ownership defect: clearing
Beta's Content selected Gamma and subsequent typing changed Gamma. WB-ST-019B
was admitted at `2064d117`. Its source gate belongs to WidgetSourceEditor;
explicit problem navigation retains its user-driven focus/selection ordering.
The producer-distinct review accepted `c4474715`, integrated as `890bcd08`.
Its six focused regressions include external synchronization, actual DOM focus,
latest source/callback ownership, problem navigation and listener disposal.

## Reproducible browser fixtures

Two registered Storybook files carry `storybook-play-required` and the focused
`storybook-play-context-editing` tag. They use real ContextMenu,
WidgetTreeWorkbench, Inspector and Monaco with a deterministic three-node JDW
document, a long multilingual label, read-only state and a controlled host
baseline. There is no fake patch engine or mock success API.

- `TargetedPropertyEditing`: pointer/More/Shift+F10 equivalence, no edit on open
  or Escape, Inspector focus, only Beta changed, existing host Save/Discard,
  followed by another target's menu without focus theft.
- `ArrangementAndReadOnly`: one move/remove dispatch, root and sibling limits,
  read-only inspection and blocked typing.
- `CanvasTargetAndNativeInput`: authored preview target, keyboard entry, native
  input context event passthrough and Escape return.
- `KeyboardExitAndEditFocus`: both Tab directions, action-owned input focus,
  Escape restoration and exactly one close per action.

Run against a current Storybook server:

```sh
pnpm exec test-storybook --url http://127.0.0.1:61228 --includeTags storybook-play-context-editing --maxWorkers 1 --testTimeout=90000
```

The initial unchanged source failed all four plays for missing actions/Tab
dismissal. After context integration, three passed while the real Monaco property
flow reproduced WB-ST-019B. After that repair, **all four Chromium plays pass**,
including target-only multi-character typing and Save/Discard with Monaco mounted.
The input's native `readonly` attribute is verified;
disabled mutation menu items are checked separately.

The in-app browser also verified native Tab/Shift+Tab traversal and the actual
sample Form's pointer menu, Inspector editing, target-only live preview and
unsaved tab marker. Packed builds regenerate development artifacts; final screen
evidence requires a fresh reload after that gate, not an HMR intermediate state.
In the final standalone editor, native code Ctrl+End/Ctrl+Home changes authored
selection while retaining `Editor content` focus and leaving the change counter
at 28. More on the long-label node focuses Edit properties and clamps its menu
to x=1146..1276 in the observed 1280px viewport. Source, preview and Inspector
agree on the saved Edited Beta and unchanged Alpha/Gamma values.
After all builds, the actual sample Form was reloaded and checked again: right-click
to Inspector, changed preview/outline, dirty tab, Ctrl+S clearing that marker while
retaining Content focus. The test text was restored and saved. The visible More
menu also stays within the sample's narrower natural viewport.

## Remaining integration gate and boundaries

The fresh packed gate passes after the source cursor repair: one static chunk,
JS 479,387 bytes / 142,454 gzip, CSS 342,764 / 49,730 gzip, one static asset
125,828 / 60,985 gzip, total initial **253,169 / 253,192 gzip**. All unchanged
static closure/CSS assertions are reached. The measured allowance has a separate
review in the contract document. `pnpm validate:fast` passes: **498 files / 3,058
tests**, all static gates and **21 registered units / 229 named required cases**.
These are local candidate results; the registry remains a partial inventory.

Save/Discard in the fixture proves the existing controlled host callback and
baseline behavior. It is not disk, network, Electron or release evidence.
Native context-event passthrough is verified; OS menu rendering is not claimed.
Explorer selection parity, durable save failure/retry and reversible multi-step
Inspector sessions remain separately admitted follow-ups. No publish or consumer
adoption follows from local integration.
