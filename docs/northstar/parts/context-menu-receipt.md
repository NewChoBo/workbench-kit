# Native context menus and Tab dismissal

Status: `LOCAL_VALIDATED / SOURCE_REVIEW_REQUIRED / INTEGRATION_PENDING`.
Admission branch point: `2bfed344ce4c1e76a09720062f9347a948322574`.
Part branch: `codex/part-context-menu-20260919`.
Scope: [WB-ST-018](../context-editing-ux.md).

## Repair boundary

The shell handler and optional global native-menu guard now use the same existing
`shouldAllowNativeBrowserContextMenu` helper in
`packages/react/src/workbench/commands/workbenchContextMenu.ts`. Input, textarea,
select, the existing Monaco/CodeMirror areas and an ancestor marked
`data-native-context-menu="true"` retain native menus. The opt-in requires the
literal value `true`; a missing value or `false` does not opt in.

Text-node targets resolve through their parent element. Editable inheritance
uses the closest recognized `contenteditable` value: empty, `true` and
`plaintext-only` allow native menus; `false` stops inheritance. Values are case
insensitive, and missing or invalid values inherit. Native controls, existing
editor roots and explicit opt-ins take precedence over an editable boundary.
Ordinary chrome retains the existing custom-menu policy. No public export or
dependency changes are introduced.

ContextMenu records Tab intent without canceling the key event or closing during
keydown. A subsequent blur outside the menu dismisses it without restoring the
invoker. Internal focus movement remains open. Other keys, Escape restoration
and activation clear pending Tab intent, preserving their existing focus and
close behavior. This is a Tab dismissal repair, not a new global focus service
or a change to all programmatic focus transitions.

Production changes are limited to the helper, `commands/keyboard.ts` and
`overlay/ContextMenu.tsx`. Adjacent tests and this receipt complete the part.
Widget Tree, Explorer target-selection policy, stories and verification registry
are owned by their separate packets or the integrator.

## Regression cases

Suite `workbench native context menu policy`:

1. `preserves native input textarea and select menus`
2. `recognizes true empty and plaintext-only editing including descendant text targets`
3. `inherits editing through missing and invalid contenteditable values`
4. `respects false boundaries and nested editable overrides`
5. `preserves the existing Monaco and CodeMirror editor areas`
6. `honors explicit native opt-ins within noneditable content`
7. `rejects ordinary chrome and non-node event targets`
8. `applies the shared native policy through the shell event handler`
9. `shares the native policy in the global guard and removes its listener on unmount`

New cases in suite `ContextMenu keyboard model`:

1. `dismisses after Tab moves focus outside without swallowing navigation`
2. `dismisses after Shift+Tab moves focus outside without swallowing navigation`
3. `keeps internal focus navigation open and preserves focus chosen by an action`

Before production changes, the unchanged admission source failed eight cases:
six native-policy cases and both Tab directions. Nine existing or compatibility
cases passed. After repair, the focused lane passes 3 files / 20 tests, including
the existing arrows/Home/End/Enter, Escape focus restoration, detached-target,
activation and static-render regressions.

## Validation

The part uses its own `pnpm install --frozen-lockfile` installation. No external
node_modules links or package-manifest changes were introduced.

| Command                                                                                                                                                                                                                                                                                                                                                           | Result                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `pnpm exec vitest run packages/react/src/workbench/commands/workbenchContextMenu.test.tsx packages/react/src/overlay/ContextMenu.keyboard.test.tsx packages/react/src/overlay/ContextMenu.test.tsx`                                                                                                                                                               | PASS; 3 files / 20 tests |
| `pnpm --filter @workbench-kit/react typecheck`                                                                                                                                                                                                                                                                                                                    | PASS                     |
| `pnpm --filter @workbench-kit/react typecheck:exact-optional`                                                                                                                                                                                                                                                                                                     | PASS                     |
| `pnpm exec eslint packages/react/src/workbench/commands/workbenchContextMenu.ts packages/react/src/workbench/commands/workbenchContextMenu.test.tsx packages/react/src/workbench/commands/keyboard.ts packages/react/src/overlay/ContextMenu.tsx packages/react/src/overlay/ContextMenu.keyboard.test.tsx`                                                        | PASS                     |
| `pnpm exec prettier packages/react/src/workbench/commands/workbenchContextMenu.ts packages/react/src/workbench/commands/workbenchContextMenu.test.tsx packages/react/src/workbench/commands/keyboard.ts packages/react/src/overlay/ContextMenu.tsx packages/react/src/overlay/ContextMenu.keyboard.test.tsx docs/northstar/parts/context-menu-receipt.md --check` | PASS                     |
| `pnpm check:workspace-isolation`                                                                                                                                                                                                                                                                                                                                  | PASS                     |
| `pnpm check:commit-safety`                                                                                                                                                                                                                                                                                                                                        | PASS                     |
| `git diff --cached --check`                                                                                                                                                                                                                                                                                                                                       | PASS                     |

The containing commit is the review candidate; the integrator records its exact
SHA, independent review, browser evidence and combined validation separately.

## Limits

Tests render real React handlers and ContextMenu and dispatch cancelable DOM
events. The global guard is mounted under StrictMode and verified after unmount.
JSDOM does not implement Tab's native traversal: the test first proves keydown
remains uncanceled and the menu stays mounted, then moves focus to a real next or
previous control and verifies dismissal with that focus retained. This does not
claim browser traversal or an operating-system native menu was displayed.

Actual browser/Storybook keyboard checks, combined fast validation and unchanged
packed-size limits remain integration gates. This part does not claim those
gates, broad ARIA conformance, cross-browser qualification, publication or
consumer adoption.
