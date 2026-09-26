# ST-005B — native text-input binding core

Status: `LOCAL_VALIDATED / SOURCE_REVIEW_REQUIRED / INTEGRATION_PENDING`.
Admission branch point: `2fc04a10b8d6f5567056e5dbfaa620b68877ad68`.
Part branch: `codex/part-native-input-20260919`.
The admitted scope is [implementation wave 2](../implementation-wave-2.md).

## Implementation boundary

`packages/platform/src/browser/native-text-input.ts` implements the admitted
`NativeTextInputEdit`, `NativeTextInputBinding` and `bindNativeTextInput` API.
It binds an existing native text input without importing a framework, provider,
stylesheet or DOM globals at module initialization. Active ownership is local to
one module instance. Duplicate binding throws; disposal permits rebinding.

Input events carry the original event, current string value and composition state.
Composition starts before the callback, including an input event marked composing.
End/blur clears state without adding an edit event. A refused composing write is
never queued. setValue first rejects non-string values, then applies the admitted
disposed/type/same-value/composing/native-assignment order. True permits native
newline normalization and does not promise byte-for-byte equality.

The helper leaves DOM placement, attributes, styles, default value, native forms
and commit/persistence policy to the host. Detaching an element does not dispose
the binding; the host explicitly disposes it on unmount. Disposing one binding
does not remove host listeners or a later binding's ownership.

Only the source leaf, its adjacent test and this receipt change in the part.
The integrator owns public export metadata, required cases, packed consumption
and browser verification. Existing React controls are unchanged.

## Required cases

Suite: `native text input binding`.

1. `rejects invalid inputs callbacks and active duplicate ownership`
2. `reports native input events once without cancellation or synthesized changes`
3. `sets values without events or host attribute and default value changes`
4. `avoids same-value writes while preserving selection node and focus`
5. `tracks composition before reentrant edits and never replays refused updates`
6. `preserves native form reset validity disabled and readOnly properties`
7. `ignores edits and writes while the host uses an unsupported input type`
8. `disposes only owned listeners and permits rebind without stale disposal effects`
9. `isolates control composition and supports disposal during edit callbacks`
10. `imports without DOM globals and reports invalid binding with TypeError`

## Validation

| Command                                                                                                                                                                              | Result                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                                                                                                                     | PASS; independent install and prerequisite builds |
| `pnpm exec vitest run packages/platform/src/browser/native-text-input.test.ts`                                                                                                       | PASS; 1 file / 10 tests                           |
| `pnpm --filter @workbench-kit/platform typecheck`                                                                                                                                    | PASS; browser and Node tsconfigs                  |
| `pnpm exec eslint packages/platform/src/browser/native-text-input.ts packages/platform/src/browser/native-text-input.test.ts`                                                        | PASS                                              |
| `pnpm exec prettier packages/platform/src/browser/native-text-input.ts packages/platform/src/browser/native-text-input.test.ts docs/northstar/parts/native-input-receipt.md --check` | PASS                                              |
| `pnpm check:workspace-isolation`                                                                                                                                                     | PASS                                              |
| `pnpm check:commit-safety`                                                                                                                                                           | PASS                                              |
| `git diff --cached --check`                                                                                                                                                          | PASS                                              |

The part commit containing this receipt is the review candidate. Its exact SHA,
public export verification, merge and combined gates are recorded by the integrator.

## Limits

The tests use JSDOM. The import fixture removes DOM globals before a fresh module
import; packed Node loading is a separate integration check. Composition/blur
events are synthetic and do not establish operating-system IME behavior. Native
HTML browser typing, label focus and selection require the integrator's fixture.
React/Vue/Svelte consumers, portable styles, Checkbox and PropertyRow remain
separate work. This receipt does not claim publication or consumer adoption.
