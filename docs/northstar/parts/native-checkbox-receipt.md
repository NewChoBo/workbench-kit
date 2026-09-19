# ST-006A — optional native Checkbox binding

Status: `LOCAL_VALIDATED / SOURCE_REVIEW_REQUIRED / INTEGRATION_PENDING`.
Admission branch point: `7ba2c38ad08ac71089626a7817d00a049ff385fa`.
Part branch: `codex/part-native-checkbox-20260919`.
The admitted scope is [native controls wave 5](../native-controls-wave-5.md).

## Implementation boundary

`packages/platform/src/browser/native-checkbox.ts` implements
`NativeCheckboxEdit`, `NativeCheckboxBinding` and `bindNativeCheckbox` on an
existing native checkbox. Standard HTML remains sufficient without this helper.
The optional binder gives consumers one edit snapshot and explicit lifetime
contract; it does not create markup, a custom element or a second form model.

The `change` listener snapshots checked, indeterminate and submitted value once,
then passes the original event to the consumer. It ignores changes while the
input has another type and resumes when that same input becomes a checkbox again.
Synthetic change is also delivered; an edit is not authorization to save or
commit a document. Callback exceptions retain native EventTarget reporting.

Both setters reject non-boolean arguments before checking binding state. Valid
setters return false after disposal or while the input is not a checkbox;
otherwise they write only their own live property and skip equal-value writes.
They leave defaultChecked, form values, attributes, focus and host markup intact.
Native activation, required validity, disabled/readOnly behavior, reset and
canceled activation retain their browser semantics. Indeterminate has no custom
encoding or reset policy.

Active membership is weak and local to one module instance. Duplicate binding
rejects, explicit disposal removes only the owned listener, and stale disposal
cannot affect a later binding. Detachment alone does not dispose. Consumer
callbacks may update, dispose and rebind synchronously. Module initialization
accesses no DOM globals and imports no framework, Provider, CSS or other module.

Only the source leaf, its adjacent test and this receipt change in the part. The
integrator owns exports, browser build metadata, required-case registration,
packed consumption and direct-use host fixtures. Existing React controls and
package dependencies remain unchanged.

## Required cases

Suite: `native checkbox binding`.

1. `rejects invalid elements callbacks and active duplicate ownership`
2. `accepts a checkbox from another DOM realm`
3. `registers without changing native state markup defaults or focus`
4. `reports one original change after native input without blocking propagation`
5. `snapshots each native field once before a reentrant synthetic change callback`
6. `silently changes only the requested property and skips equal writes`
7. `requires primitive booleans before disposed and unsupported state checks`
8. `keeps checked indeterminate and native form values separate`
9. `preserves native label activation reset and canceled activation rollback`
10. `ignores changes and writes for other types then resumes on the same checkbox`
11. `requires explicit disposal and leaves host state and listeners intact on rebind`
12. `supports synchronous setters disposal and rebind during a callback`
13. `keeps bindings and native properties independent across controls`
14. `leaves callback exceptions to native EventTarget reporting`
15. `imports without DOM globals and fails invalid binding with TypeError`

## Validation

Runtime: Node `v24.18.0`, pnpm `11.5.1`, Vitest `4.1.10`.

| Command                                                                                                                                                                             | Result                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                                                                                                                    | PASS; independent install and prerequisite builds |
| `pnpm exec vitest run packages/platform/src/browser/native-checkbox.test.ts`                                                                                                        | PASS; 1 file / 15 tests                           |
| `pnpm --filter @workbench-kit/platform typecheck`                                                                                                                                   | PASS; browser and Node tsconfigs                  |
| `pnpm exec eslint packages/platform/src/browser/native-checkbox.ts packages/platform/src/browser/native-checkbox.test.ts`                                                           | PASS                                              |
| `pnpm exec prettier packages/platform/src/browser/native-checkbox.ts packages/platform/src/browser/native-checkbox.test.ts docs/northstar/parts/native-checkbox-receipt.md --check` | PASS                                              |
| `pnpm check:workspace-isolation`                                                                                                                                                    | PASS                                              |
| `pnpm check:commit-safety`                                                                                                                                                          | PASS                                              |
| `git diff --cached --check`                                                                                                                                                         | PASS                                              |

The commit containing this receipt is the review candidate. The integrator
records its exact SHA, independent review, merge and combined gates separately.

## Limits

These tests use JSDOM with native `.click()`, label activation, form reset and
explicit event dispatch. They establish neither real pointer/Space interaction
nor browser accessibility or operating-system behavior. The import fixture
removes DOM globals before a fresh source import; packed Node loading and strict
public type closure remain integration checks.

The part does not establish identical packed bytes across HTML, React, Vue and
Svelte, actual framework lifecycle behavior or real-browser input. Those are the
integrator's separate lanes. Styling, PropertyRow, framework wrappers, general
Custom Element registration/SSR, release validation, publication and consumer
adoption are outside this candidate.
