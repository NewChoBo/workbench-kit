# WB-ST-004T — strict text-adapter conformance receipt

Status: `LOCAL_VALIDATED / SOURCE_REVIEW_REQUIRED`. This part starts from common
v1 commit `7ceb9ceb7089086660004c6dc4fa4c7a10c940f9` and implements the admitted
SP02 verification unit. Production behavior, exports and dependencies are unchanged.

## Owned changes

- `packages/field-remap/src/registry/builtinDataOperations.contract.test.ts`
- `docs/northstar/parts/text-adapter-receipt.md`

The suite imports `@workbench-kit/field-remap/data-operations` through its public
focused self-reference and the legacy registry through the package root. It calls
the real shared runner from `packages/runtime/src/dataOperations.ts`, the source
target of the runtime's public focused export. That test-only relative import does
not add a production runtime dependency to field-remap.

## Required case names

Suite prefix: `strict builtin text adapter contract`.

1. `publishes exactly three frozen versioned text definitions`
2. `admits primitive strings and rejects other input and output values`
3. `rejects boxed and hostile coercion inputs without invoking coercion`
4. `preserves handwritten Unicode empty and whitespace results alongside legacy transforms`
5. `keeps strict rejection separate from legacy coercion`
6. `isolates repeated factories and concurrent runner results`

The first case pins exactly trim/upper/lower at definition version 1 and checks
the returned list, definitions and refs are frozen. Predicate admission distinguishes
primitive strings from other JS values. Real runner rejection includes boxed
strings and objects with throwing coercion hooks; those hooks run zero times.

Twelve handwritten string examples check both strict and legacy outputs, including
empty strings, whitespace-only strings, Unicode whitespace, zero-width-space
preservation and case conversion that changes string length. Expectations do not
call the implementation's string methods to derive their answers. Separate cases
preserve legacy coercion and check concurrent consumers built from repeated
factory calls without imposing a fresh-object-identity requirement on the factory.

## Validation

Run from this part's isolated repository root:

```powershell
pnpm install --frozen-lockfile
pnpm exec vitest run packages/field-remap/src/registry/builtinDataOperations.contract.test.ts
pnpm --filter @workbench-kit/field-remap typecheck
pnpm exec eslint packages/field-remap/src/registry/builtinDataOperations.contract.test.ts
pnpm exec prettier packages/field-remap/src/registry/builtinDataOperations.contract.test.ts docs/northstar/parts/text-adapter-receipt.md --check
pnpm check:workspace-isolation
pnpm check:commit-safety
```

All listed commands passed. Focused Vitest result: **1 file / 6 tests**. The frozen
install builds workspace prerequisites inside this checkout, without linking an
external checkout's node_modules.

## Handoff and limits

The integration owner reviews this exact part commit, registers the six full case
names centrally, merges one part at a time and runs the combined fast gate. This
part does not change the required-unit registry or assert that its tests are
registered before integration.

This is Node/headless source conformance evidence. It does not itself install a
packed tarball or establish npm availability; the existing packed-consumer gate
verifies public package-name runtime consumption on the integration candidate.
JSON/codecs, Recipe scheduling, Mapping migration, portable value serialization,
browser/native interaction and performance measurements are outside this part.
No develop integration, release, publication or downstream adoption is claimed.
