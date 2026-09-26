# ST-004A — bounded native JSON parsing receipt

Status: `LOCAL_VALIDATED / SOURCE_REVIEW_REQUIRED`.
Admission base: `2fc04a10b8d6f5567056e5dbfaa620b68877ad68`.
Part branch: `codex/part-json-processing-20260919`.

## Implementation and ownership

The domain leaf `domain/operations/jsonOperations.ts` guards primitive string type
and original UTF-16 input length before calling native JSON.parse once. Its internal
module export is not a public package export. It does not normalize, clone, apply
a reviver, validate a document or traverse the output.

The registry adapter `registry/jsonDataOperations.ts` exports
`createJsonParseDataOperation` and `JsonParseDataOperationOptions`. It rejects
missing/non-object options with TypeError and invalid limits with RangeError,
snapshots the positive safe-integer limit and freezes the definition and exact
`json:parse` version-1 ref. The output predicate admits null, strings, booleans,
non-NaN numbers, arrays and records with Object.prototype or null prototype. This
top-level predicate does not establish recursive or portable JSON validity.

The part changes only these two source files, `registry/jsonDataOperations.test.ts`
and this receipt. The integrator adds the public focused
`@workbench-kit/field-remap/json-data-operations` export and required-unit registry.
No root barrel, production dependency, common runtime, Mapping document or existing
parser is changed by this part.

## Required cases

Suite prefix: `bounded native JSON operation`.

1. `rejects missing options and invalid limits before parsing`
2. `snapshots the limit and freezes the exact versioned definition`
3. `parses scalar null object and zero one many array results`
4. `admits only parser top-level kinds without recursively validating values`
5. `enforces original UTF16 length including emoji and whitespace`
6. `rejects nonstrings boxed and hostile inputs without coercion or parsing`
7. `guards direct execution type and length before its single parse`
8. `preserves native syntax errors as execution causes without normalization`
9. `preserves native rounded numbers negative zero and overflow`
10. `keeps duplicate last keys and proto as an own data property`
11. `parses once and returns the native result without cloning or freezing`
12. `does not parse on preabort and preserves late cancellation after parsing`
13. `inherits nested budgets and child diagnostic locations from the runner`
14. `isolates concurrent results cancellation and separately configured runners`

Fixtures use handwritten expected values and the real common runner. Native
JSON.parse spies call through to the real parser; they establish parse counts,
unchanged result identity and the original thrown SyntaxError identity. No parser
or operation execution is mocked. Rejected types, oversize inputs and pre-abort
never reach parsing. Direct executor calls retain the type/length guard.

## Part validation

All commands below passed in the isolated part checkout:

```powershell
pnpm install --frozen-lockfile
pnpm exec vitest run packages/field-remap/src/registry/jsonDataOperations.test.ts
pnpm --filter @workbench-kit/field-remap typecheck
pnpm exec eslint packages/field-remap/src/domain/operations/jsonOperations.ts packages/field-remap/src/registry/jsonDataOperations.ts packages/field-remap/src/registry/jsonDataOperations.test.ts
pnpm exec prettier packages/field-remap/src/domain/operations/jsonOperations.ts packages/field-remap/src/registry/jsonDataOperations.ts packages/field-remap/src/registry/jsonDataOperations.test.ts docs/northstar/parts/json-parse-receipt.md --check
pnpm check:workspace-isolation
pnpm check:commit-safety
git diff --cached --check
```

Focused result: **1 file / 14 tests**. Dependencies and workspace prerequisites
were installed and built inside this checkout. No external checkout's node_modules
is linked into the part.

## Semantics and evidence limits

Input length means UTF-16 code units, including whitespace and quotes. It is not
a parse-time, nesting-depth or allocation bound. Empty/whitespace inputs pass type
and length admission but fail native parsing. No BOM removal, comments or trailing
comma extension is added.

Native Number behavior intentionally includes unsafe-integer rounding, negative
zero and overflow to Infinity/-Infinity. Duplicate keys keep the last value;
`__proto__` remains an ordinary own data property. Parsed values are returned
unchanged. Lossless numeric processing, later finite-number/schema checks and
serialization policy are separate concerns.

The runner owns cancellation, nested budgets and locations. Synchronous parsing
cannot be interrupted halfway through by this adapter; observed cancellation after
execution is preserved by the common runtime. No new listener or scheduler exists.

This part uses relative source imports for its adapter and real runtime. It does
not claim public package-name or packed-tarball consumption evidence. The integrator
reviews the exact part commit, adds the focused export and exact required cases,
then verifies packed public types/runtime and the combined fast gate. Develop
integration, release, npm availability and downstream adoption remain pending.
