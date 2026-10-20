# Structured path indexed-access contract

Status: `DONE / LOCAL_SOURCE_ACCEPTED`; independently admitted before source work on 2026-10-10.
Base: `cf483132dcc4b930644e7575a928dfe67b417e61`, in an isolated non-main topic.
Root owns this packet, N2, validation and integration; Sol is the sole source/test writer after
admission. The prior linked checkout stays frozen. No public API, dependency, release or UI change.

## Reproduction and ownership

With TypeScript 5.9.3, the existing workspace typecheck passes. The same package with stronger
indexed-access checking fails at `packages/workspace/src/data/structured-path.ts:102`:

```text
pnpm exec tsc -p packages/workspace/tsconfig.json --noEmit --noUncheckedIndexedAccess
error TS2345: Argument of type 'string | number | undefined' is not assignable
to parameter of type 'string | number'.
```

`WorkbenchStructuredDataPath` is a readonly array of string/number segments. A length check does
not narrow the destructured first element under `noUncheckedIndexedAccess`. This is a generic
workspace-owned source compatibility issue. The same source blob `061f5934a47c0c4fc6a59dee59c3849ca71056ce`
exists at the base and earlier `ffdc4c3cd1fefff96677b73111fb5044a182d963`.

## Bounded repair

Allow source changes only in `packages/workspace/src/data/structured-path.ts` and its existing
`structured-path.test.ts`. After the existing empty-path branch and destructuring, explicitly
return the current `data` when `segment === undefined`, before cloning or calculating a key.

- Keep empty-path replacement semantics and every public signature/export unchanged.
- Keep numeric zero and empty-string object keys valid; do not use a truthiness guard.
- Preserve ordinary/nested object and array updates, immutable input, own-property/prototype
  protections, and invalid array-index rejection.
- An absent head in a malformed sparse/undefined runtime path returns the current input instead
  of accidentally writing an `undefined` key or cloning an array. This is a defensive boundary
  outside the declared element type. Do not promise whole-operation identity for a malformed
  segment encountered after an already traversed valid prefix.
- No non-null assertion, type cast, suppression, helper-input widening, compiler relaxation,
  new store, public export, package pin or unrelated cleanup.

## Execution and acceptance

1. Sol adds focused cases to the existing test file for empty-path replacement, zero/empty-string
   valid keys, immutable nested update and malformed absent-head behavior, then returns the lease.
2. Root runs that file to establish a real failing boundary assertion before the guard, alongside
   the reproduced strict indexed-access diagnostic. Existing assertions remain.
3. After that result, Sol adds only the explicit guard and returns the source lease.
4. Root runs the focused file, workspace ordinary and `--noUncheckedIndexedAccess` typechecks,
   touched-file lint/format and commit-safety. Independent acceptance checks the actual candidate.
5. A consuming test graph must resolve this exact candidate and retain its existing strictness.
   JSX syntax support for an existing TSX graph is a consumer configuration responsibility, not
   a workspace source workaround. Consumer pins/lock and prior checkouts stay preserved.

A local candidate pass does not establish published-package, release or native-host acceptance.
Public documentation and commit text remain neutral. No browser observation is needed because
this bounded repair changes no UI interaction or valid-path behavior.

## Acceptance receipt

The test-first candidate added three cases while preserving all five existing cases. The focused
file was 7/8: an absent root head produced `{ value: 'old', undefined: 'new' }` rather than the
original object. This was a real assertion failure. The stronger typecheck also exposed two
new test-only accesses through an `unknown` result; those assertions were repaired using the public
getter without casts or loss of identity/immutability checks. The original source diagnostic remained.

The final source adds only `if (segment === undefined) return data;` after destructuring. Root ran:

- `pnpm exec vitest run packages/workspace/src/data/structured-path.test.ts`: 8/8, no skips.
- `pnpm --filter @workbench-kit/workspace typecheck`: PASS.
- `pnpm exec tsc -p packages/workspace/tsconfig.json --noEmit --noUncheckedIndexedAccess`: PASS.
- Touched source/test ESLint and four changed files' Prettier: PASS.
- `pnpm check:commit-safety`: public-reference and credential checks PASS.

Independent exact-source/test review accepted the candidate with no blockers. Final raw SHA-256:
source `48694dcd101aeba16f30b57ab69e4c3bf9a951d7bd05de2925eb198fa50d9b2e`;
test `16d79ec08db83a5766533e6268007b6b01a27fd1447250b3e831b59a30e3b1fd`.

An isolated consuming full-test typecheck also passed with existing strictness and file inputs,
JSX support for its existing TSX graph, and only the workspace package source mapped to this
candidate. Compiler resolution included 17 candidate workspace source files and no prior workspace
files. Its original checkout link was unchanged during this diagnostic. This is source-consumer
evidence, not a registry or packaged-consumer result. No UI runtime, native host, release or push
was performed; earlier checkouts and dependency manifests/lockfiles were preserved.
