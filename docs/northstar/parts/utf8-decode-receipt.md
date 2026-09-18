# ST-004B — strict bounded UTF-8 decoding receipt

Status: `LOCAL_VALIDATED / SOURCE_REVIEW_REQUIRED`.
Admission base: `c7c8a082f1c066fb8318ada5e416472302d41844`.
Part branch: `codex/part-utf8-processing-20260919`.

## Implementation

The domain leaf `domain/operations/utf8Operations.ts` reads the intrinsic typed-array
brand, buffer, offset and byte length without consulting user-shadowed properties.
It accepts genuine Uint8Array views across realms, including subclasses and native
Buffer views. The ordinary ArrayBuffer byte-length getter rejects shared storage;
the optional resizable getter rejects resizable storage. A zero-length native view
distinguishes attached empty storage from detached buffers.

Admission bounds visible bytes, independently of the backing allocation. Execution
rechecks the same storage and limit rules, then creates an ordinary view over the
exact range without copying bytes. A fresh native TextDecoder performs one fatal,
nonstreaming UTF-8 decode. No input view or decoder is retained between calls.

The registry adapter exports `createUtf8DecodeDataOperation` and
`Utf8DecodeDataOperationOptions`, snapshots both required options and freezes the
definition/ref. `maxInputBytes` is a positive safe integer. `bom` is explicitly
`strip` or `preserve`; no default is inferred. The exact ref is
`bytes:utf8-decode` version 1. Output admission accepts primitive strings only.

BOM and malformed-input behavior follow the
[Encoding Standard](https://encoding.spec.whatwg.org/#interface-textdecoder).
Strip removes only the first leading BOM; preserve retains it. Native TypeError
causes remain unchanged through the common runtime. The adapter introduces no
replacement decoding, normalization, listener, scheduler or execution budget.

Only the two source leaves, `registry/utf8DataOperations.test.ts` and this receipt
change in the part. Public export metadata, common runtime, required registry,
packed harness and dependencies are integrator-owned and unchanged here.

## Required cases

Suite prefix: `strict bounded UTF8 operation`.

1. `rejects missing options invalid limits and missing or invalid BOM policy`
2. `snapshots both options and freezes the exact versioned definition`
3. `decodes handwritten ASCII Hangul emoji NUL and empty byte sequences`
4. `bounds actual view bytes and ignores bytes outside a subarray`
5. `admits cross realm subclass and native Buffer views without a Node production dependency`
6. `uses intrinsic view metadata without reading shadowed properties`
7. `rejects other brands proxies spoofed tags and coercion without decoding`
8. `rejects shared resizable and detached storage including empty detached views`
9. `guards direct execution type storage and byte limits before decoding`
10. `preserves original fatal errors for truncated overlong surrogate and out of range bytes`
11. `applies explicit BOM policies without stripping internal or repeated markers`
12. `uses one fresh fatal nonstreaming decoder per admitted call and only admits string output`
13. `leaves input bytes unchanged and completed strings independent of later mutations`
14. `does not decode before aborted calls and preserves cancellation after synchronous decoding`
15. `composes real UTF8 and JSON operations with shared budgets and child error locations`
16. `isolates concurrent cancellation and independently configured byte and BOM policies`

Tests use handwritten byte sequences and expected strings, the native decoder,
the real common runner and the real JSON operation. Decoder spies call through;
no execution or output is mocked. Cross-realm and Buffer fixtures dynamically
import actual Node builtins with narrow test-local types. This avoids adding Node
ambient types or a Node production dependency to the package.

## Validation

All commands below passed in the isolated part checkout:

```powershell
pnpm install --frozen-lockfile
pnpm exec vitest run packages/field-remap/src/registry/utf8DataOperations.test.ts
pnpm --filter @workbench-kit/field-remap typecheck
pnpm exec eslint packages/field-remap/src/domain/operations/utf8Operations.ts packages/field-remap/src/registry/utf8DataOperations.ts packages/field-remap/src/registry/utf8DataOperations.test.ts
pnpm exec prettier packages/field-remap/src/domain/operations/utf8Operations.ts packages/field-remap/src/registry/utf8DataOperations.ts packages/field-remap/src/registry/utf8DataOperations.test.ts docs/northstar/parts/utf8-decode-receipt.md --check
pnpm check:workspace-isolation
pnpm check:commit-safety
git diff --cached --check
```

Focused result: **1 file / 16 tests** on Node 24.18.0 and pnpm 11.5.1. The storage
fixture actually exercises native resizable and shared buffers and transfers both
nonempty and empty buffers; these cases were not skipped. Dependencies and build
prerequisites are local to the part checkout.

## Limits and handoff

The byte limit is not a duration, allocation or output-size budget. Decoding is
synchronous; the common runner observes cancellation before/after execution but
does not preempt a running native decode. Ordinary bytes remain mutable by their
owner. No registration-time snapshot, byte clone or concurrent shared-memory
support is promised. Returned strings are independent of later byte mutations.

This is source conformance evidence using relative adapter/runtime imports. The
integrator must add the focused public export and exact required cases, review the
part commit, execute packed public type/runtime consumption and run the combined
fast gate. No common API, root barrel, existing decoder or Mapping document changes
are required. This receipt does not claim develop integration, release, npm
availability or downstream adoption.
