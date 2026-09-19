# Distributed capability integration — wave 2

Status: `MERGED_LOCALLY / SOURCE_REVIEW_PASS / COMBINED_VALIDATION_PASS`.
Date: 2026-09-19. Branch: `codex/stabilization-units-20260919`.
Admission base: `2fc04a10b8d6f5567056e5dbfaa620b68877ad68`.
The [implementation packet](./implementation-wave-2.md) closed both units before
the independent branches were created. Shared execution/control semantics remain v1.

## Reviewed parts and sequential merges

| Unit                             | Part commit                                | Local merge                                |
| -------------------------------- | ------------------------------------------ | ------------------------------------------ |
| ST-004A bounded JSON operation   | `95b825f715d4b40db310a7b8829fee0540483d98` | `bf08f603b75f0dd25ccdc88b62c17af7865f0285` |
| ST-005B native text-input binder | `51934d70bdbc90f5c3d904fe23e0109a504a802e` | `dc5eb88c3bf0cf5365d29811493916436ae55bfc` |

Parts installed and validated in independent worktrees. The integration owner
verified exact common ancestry and changed-path allowlists, reviewed source/tests,
reran each focused suite and commit-safety, then merged without conflicts.
Producer-distinct cross-reviews passed for both exact part commits and the
integrator's export/required-registry/packed-consumer additions.

- [JSON part receipt](./parts/json-parse-receipt.md): 14 cases. Native parsing once,
  strict primitive-string and UTF-16 length admission, unchanged result/error,
  native numeric/key semantics, common cancellation/budget/location behavior.
- [Input part receipt](./parts/native-input-receipt.md): 10 cases. Native value/edit
  separation, synthetic composition and reentrancy, selection/form properties,
  duplicate ownership, explicit dispose/rebind, independent controls and Node import.

## Public capabilities and ownership

`@workbench-kit/field-remap/json-data-operations` exports
`createJsonParseDataOperation` and `JsonParseDataOperationOptions`. Configure a
positive safe-integer `maxInputCharacters`, register the definition with the
common runner, and invoke `{ id: 'json:parse', version: 1 }`. Wrong types and
oversize inputs are `invalid-input`; malformed syntax is `execution-failed` with
the original SyntaxError. The limit measures original UTF-16 units, not CPU time,
nesting depth or allocation. Native rounding, negative zero, exponent overflow and
last duplicate keys are intentional; this is not lossless/schema validation.

`@workbench-kit/platform/native-text-input` exports `bindNativeTextInput`,
`NativeTextInputBinding` and `NativeTextInputEdit`. The host supplies an existing
text input, receives edits, and calls `dispose()` on unmount. `setValue()` does not
synthesize edits; same-value calls do not write or disturb selection. A differing
update during composition returns false without queuing. Native form state,
attributes, CSS, focus policy and document commit/save remain host responsibilities.

The integrator alone adds these focused exports and registers **11 units / 95
required cases**. No root-barrel growth, dependency, version, common runtime,
existing React control or document-schema change is included. JSON avoids a second
parse or output clone; the binder avoids redundant value writes and owns no DOM
observer. These implementation properties do not claim measured interaction speed.

## Combined verification

`pnpm validate:fast` passed against both merges and the integration changes:
**488 files / 2,932 tests**, followed by the fresh required-unit gate (**11 units,
95 required cases**). Typechecks, lint/format, public exports,
workspace/dependency boundaries, schemas and Storybook tag checks passed. Only
documentation updates followed this complete run; their formatting and commit
safety were checked again before commit.

The packed-consumer gate built and packed all 19 packages at the unchanged
repository cohort, extracted tarballs outside the workspace, and checked public imports
with strict/exact-optional TypeScript. JSON executed headlessly through the real
runner, including size rejection and native syntax cause. Native input imported
without DOM globals and then executed in JSDOM, verifying edit/value, selection,
reset and dispose/rebind. Module graphs exclude React/ReactDOM/Monaco and CSS for
these focused capabilities. Existing initial gzip remained **253,011 / 253,064
bytes**; no budget was raised. This is fresh local pack evidence, not npm release.
Clarification after the wave 4 audit: third-party dependencies are linked from the
repository installation; this gate does not perform a clean package-manager install.

The source HTML fixture at `scripts/fixtures/native-text-input` ran in a real
in-app browser using:

```powershell
pnpm exec vite scripts/fixtures/native-text-input --host 127.0.0.1 --port 5189 --strictPort
```

Observed results: label click focused the input; typing `hello` produced five
native edits; assigning `remote` added no edit; same-value assignment retained the
same node, focus and selection 1–3; FormData held the live value; native reset
restored `default` without edits; duplicate binding was rejected. After dispose,
typing changed native form data but produced zero callbacks. Rebinding and typing
`x` produced one callback. The fixture reports reset on the next animation frame
so browser default reset completes before its observational read. Its strict
TypeScript check also passed. The temporary server and browser tab were closed.

This source/Vite browser fixture is separate from the packed JSDOM consumer.
Neither proves no-build HTML delivery, four-framework conformance or operating-system
IME behavior. Full Storybook play/release validation was not run in this wave.
Develop integration, npm publication and consumer adoption remain separate gates.

## Next bounded parts

1. **Processing:** close one UTF-8 decoding packet (input bytes, malformed-sequence
   and BOM policy, output and limits) before implementation; keep filtering and
   Recipe execution separate. Reuse the common runner and required-case process.
2. **Controls:** close browser artifact delivery and framework mount/update/unmount
   contracts, then verify the same artifact in HTML/React/Vue/Svelte. Keep real
   Korean IME, Checkbox, PropertyRow and shared styling as explicit acceptance units.
3. **Consumer preparation:** continue product-owned UI/UX, draft/commit and
   selection-lifetime plans without importing unreleased capabilities. Adopt only
   after approved publication and consumer-specific flow/persistence verification.

These are design queues, not automatic implementation admission. Future parts
branch from a recorded integrated common commit; shared exports and required-case
registration remain integrator-owned.
