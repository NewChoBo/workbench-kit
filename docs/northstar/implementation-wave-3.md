# Implementation wave 3 — strict UTF-8 and four input hosts

Admission: `READY_FOR_IMPLEMENTATION`. Starting source `936308e7`; both parts
branch from the commit admitting this packet and pinned fixture tools. Common v1
and the native binder's behavioral API remain unchanged. This wave implements two
bounded capabilities, not a general codec library or complete Universal UI.

## ST-004B — strict bounded UTF-8 decoding

Owner SP02. Public focused entry `@workbench-kit/field-remap/utf8-data-operations`:
`createUtf8DecodeDataOperation(options: Utf8DecodeDataOperationOptions)` returns
a frozen definition with frozen ref `{ id: 'bytes:utf8-decode', version: 1 }`.
Required readonly options: `maxInputBytes: number` (positive safe integer) and
`bom: 'strip' | 'preserve'`. Missing/non-object options throw TypeError, invalid
limit throws RangeError, invalid/missing BOM policy throws TypeError. Snapshot both.

- Admit genuine Uint8Array views including cross-realm values, subclasses and
  Node Buffer views, without importing Node. Reject other typed arrays, DataView,
  raw buffers, arrays, proxies and objects spoofing tags. Use intrinsic typed-array
  tag/buffer/offset/length getters rather than user-shadowable properties.
- Backing buffer must be an ordinary, fixed-length, non-detached ArrayBuffer.
  Intrinsic ArrayBuffer byteLength checks reject shared storage; resizable getter
  rejects resizable buffers where supported; constructing a zero-length native
  view at the actual offset detects detachment, including zero-length views.
  Rejection is invalid-input through the common runner and never decodes.
- Bound actual view bytes, not the whole backing allocation. Zero bytes are valid.
  Direct executor calls repeat admission/type/limit checks before decoding. Create
  an ordinary Uint8Array view over the same visible range without byte copying.
- One new native TextDecoder per invocation, label UTF-8, fatal true and streaming
  false. `bom: strip` uses ignoreBOM false; preserve uses true. Strip only the first
  leading BOM; preserve internal/repeated BOM characters according to the native
  decoder. No normalization, fallback encoding, replacement mode or shared decoder.
- Output is a primitive string, including empty/NUL. Native malformed-sequence
  TypeError remains the original execution-failed cause. No byte mutation or
  retained view. A returned string is independent of subsequent input mutation.
- Execution is synchronous and cooperative: no mid-decode preemption, streaming,
  CPU/allocation limit, snapshot at registration or cross-thread shared memory.
  Common runner owns pre/late cancellation, budgets, locations and concurrency.

Semantics follow the [Encoding Standard](https://encoding.spec.whatwg.org/#interface-textdecoder),
including its explicit fatal and BOM settings. No existing general UTF-8 data
operation was found; unrelated secret-storage decoding stays unchanged.

Part owns four files: `packages/field-remap/src/domain/operations/utf8Operations.ts`,
`packages/field-remap/src/registry/utf8DataOperations.ts`, its `.test.ts`, and
`docs/northstar/parts/utf8-decode-receipt.md`. Integrator owns export metadata,
required registry and packed execution. No common runtime or dependency change.

Acceptance: invalid/snapshotted options, ASCII/Hangul/emoji/NUL/empty, exact view
boundaries and subarrays, malformed truncated/overlong/surrogate/out-of-range
bytes, both BOM policies and per-call reset, cross-realm/subclass/native Buffer
brands, shadowed properties, spoof/proxy/shared/resizable/detached rejection,
direct execution guard, unchanged input, original cause, single decode, pre/late
abort, independent concurrent runs, nested budgets/locations and real UTF-8→JSON.

## ST-005C — one browser artifact in HTML/React/Vue/Svelte

Owner SP06. Keep `bindNativeTextInput` and its types/behavior unchanged. Evolve the
existing focused export to types from the same source and import/default from
`dist/browser/native-text-input.js`: browser-targeted ES2022 ESM, no imports/CSS or
framework dependencies. A separate tsup browser config runs after existing CJS
build; separate output directory and sequential execution prevent cleaning races.
Watch input discovery includes this config. No Node CJS variant or root export.

This is a release-candidate export-target change, not an npm version bump. All
consumers must use the freshly packed artifact; source fixture success alone is
insufficient. Verify packed bytes, named export and strict public type resolution.

Part owns `scripts/fixtures/native-input-hosts/**`,
`scripts/lib/native-input-hosts.mjs`, and `docs/northstar/parts/input-hosts-receipt.md`.
Integrator owns build/exports, tool pins/lockfile, packed-harness invocation and
central receipts. Fixtures use React 19.2.7, Vue 3.5.43 and Svelte 5.57.0; the last
two are root development tools only. Compile Svelte using its own compiler without
a new Vite plugin. No publishable package acquires framework dependencies.

- All hosts import the same external `/vendor/native-text-input.js`, copied without
  transformation from the packed platform export. Check equal hashes and prevent
  inlining/source fallback. Host framework bundles may differ; core bytes may not.
- HTML uses native markup and an ordinary module script without compiling its
  adapter. Framework hosts create native inputs, bind after mount, route explicit
  value changes through setValue, and dispose during actual framework unmount.
  They do not also control `.value` through framework value-binding directives.
- React exercises StrictMode effect cleanup/re-setup; Vue uses mounted/unmounted
  hooks and watched updates; Svelte uses synchronous onMount cleanup and updates.
  If a composing update is refused, host retains its local request and chooses
  when to retry explicitly; core does not queue or authorize commits.
- Run a common assertion matrix against real framework runtimes: native edit and
  programmatic update distinction, same-node/selection/focus preservation on
  rerender, form/reset/label behavior, synthetic composition, independent controls,
  actual unmount cleanup (detached old input emits no callback) and repeated remount
  without duplicates. Include positive assertions and explicit failure reporting.
- Execute the matrix during the packed gate using JSDOM; also serve the generated
  static artifact in a real browser, inspect its matrix results, and perform real
  typing/label/reset/remount interactions. Preserve source fixtures and reproduction
  instructions, not generated bundles. Real OS IME remains a separate acceptance.

The helper may retain generated output only under a checked repository `tmp/`
path for browser verification. Temporary deletion must resolve inside its named
fixture root. No external uploads, remote services, product policy or framework
adapter publication are included. Four-host text-input acceptance does not complete
portable styling, Checkbox, PropertyRow, document authoring or product adoption.

## Integration

Independent worktrees/installs and exclusive paths; producer-distinct review of
exact parts; focused reruns and safety before sequential merges. Integrator adds
focused export/packed checks and exact required UTF-8 cases, then runs full fast
with existing bundle budgets. Public docs remain consumer-neutral. Develop,
release-tip validation, npm publication and downstream adoption remain separate.
