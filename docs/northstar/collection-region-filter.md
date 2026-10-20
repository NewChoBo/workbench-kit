# Scoped collection filtering — WB-JDW-COLLECTION-FILTER-001

Status: `DONE / LOCAL_SOURCE_ACCEPTED`. Independent API and consumer-boundary reviewers admitted
packet SHA256 `f6047a7579b38189b2255dcefdccbbd7f932aaf153fd092af49d54f5654afe4e`
on 2026-10-10. Base `61786ccf5e6ee598474b40c6ea01f38ef8472a92`, isolated topic
`codex/collection-region-filter-20261010`. One source/test writer; lead owns this packet and N2.

## Current gap and bounded result

`projectUiCollectionInstances` projects already supplied scalar records into repeated composition
instances. It has stable identities, complete input admission and paging, but no source-neutral
control-to-target filter contract. Existing controlled Select and custom widget registry can render
consumer-authored controls; generic filtering must not be independently copied into every host.

Add four pure functions and their readonly public types at `@workbench-kit/jdw/ui-authoring/v3`.
Keep the current projector unchanged. Integrating hosts own authored control components, source
adapters, labels/options, storage, subscriptions and one per-view selection map. No React hook,
global state, query language, event bus, command/history engine, layout API or new package is added.

## Public contract

The implementation may choose precise type names for inputs/results, but must export their complete
usable types with these four functions. Invalid input returns discriminated diagnostics and no rows;
no partial accepted prefix or implicit default-to-All is permitted.

```ts
parseUiCollectionRegionFilterConfig(value: unknown): ParseResult
admitUiCollectionRegionFilter(input: AdmissionInput): AdmissionResult
reconcileUiCollectionRegionSelection(input: ReconcileInput): SelectionResult
filterUiCollectionRegionRecords(input: FilterInput): FilterResult
```

Static configuration:

```ts
{
  schemaVersion: 1,
  controlId,
  target: { containerNodeId, inputId: string, bindingId },
  sourceNamespace: readonly [sourceId, connectionId: string | null, outputId],
  expectedSchemaRevision,
  fieldId,
  operator: 'equals' | 'includes',
  valueProviderId,
  defaultSelection: { kind: 'all' } | { kind: 'value', value: string | number | boolean }
}
```

The host derives controlId from its authored node ID instead of storing it redundantly. The static
parser checks only exact bounded data grammar/version/types; it cannot consult mutable catalogs,
current options or runtime instance availability. Accessors, cycles, nonplain objects, sparse arrays,
nonfinite numbers, malformed text and unexpected keys are invalid before property consumption.

Admission receives the parsed configuration, canonical `UiDocumentV3`, expected control component
reference, component catalog, actual binding descriptor, source schema, filter-field/provider descriptors and scope.
The neutral binding descriptor identifies binding ID, source namespace and schema; it is not a host
persistence object. Check that the actual control exists with the expected component, the distinct
target is a valid empty same-document consumer whose component descriptor declares that bounded
input ID with `direction: 'input'` and `value.type: 'collection'`, with the actual authored input
bound to exactly bindingId,
and namespace/schema/provider/field/operator/default type agree. Input identifiers are generic strings;
a host may narrow its own authored config to its supported input IDs. Reuse existing authored-node and
collection endpoint contracts. Missing/rebound targets fail closed; labels never establish identity.

Filter fields are a separate sidecar descriptor: scalar string/number/boolean or string-array.
They do not expand mapped repeat fields. Equals uses strict scalar equality; includes uses exact
string-array membership, never substring matching. Provider options pair stable string tokens with
typed scalar values. Tokens must not conflate `1`, `'1'`, or `true`; duplicate tokens/ambiguous values
are rejected. The source adapter supplies labels separately from filter authority.

## Scope and transitions

Scope identity combines owner mount/reopen lease, document, target/binding/source/schema, control ID
and canonical configuration generation. It does not include ordinary document revision, geometry,
page or successful source snapshot generation. A changed scope retires previous state and restores
the authored default; an old event cannot alter the replacement. Hosts must derive configuration
generation from the actual configuration, not unrelated document edits.

Reconciliation accepts an admission, previous transient state, optional complete successful snapshot
with generation and options, and an optional event. Events carry exact scope and successful snapshot
generation, with choice All, a known option token, or explicit Reset. Unknown tokens and retired
generations reject the event without changing the admitted current state. Reset uses the authored
default, while All removes only this control's transient predicate.

- A new valid scope resolves its authored default. Missing default values produce visible missing
  state and zero matches; an invalid type/config blocks admission. Neither silently becomes All.
- A complete successful same-scope refresh preserves the selected typed value, stamps the new
  generation and marks it offered or missing. A missing value retains its identity and yields zero
  rows until explicit Reset or another offered value is chosen.
- Loading, failed or partial refresh preserves the value while blocking events and withdrawing rows.
  It does not become a successful snapshot. A later successful refresh reconciles the retained value.
- A missing selected value must remain visible in controlled UI. Hosts can add a disabled synthetic
  option; the existing Select otherwise falls back visually to its first offered option.
- Two independent owners/targets never share state. Controls on the same target are ANDed.

Filtering receives admissions/selections and separately stamped scalar-record, filter-row and option
envelopes from the same complete source capture. Check generation equality, pairwise record ID/order/
length and complete descriptor/value validity before any predicate. Validate every row, including
off-page or filtered-out rows, so filtering cannot hide malformed records from the downstream
projector. Reject duplicate record IDs, unpaired rows, unavailable fields and mixed captures.

The supplied records have already passed the source's saved baseline policy/query. Filter only that
set; All never loads additional records or broadens source authority. Return original scalar record
objects in original order, filtered count and diagnostics for the existing projector's pagination.
Missing/blocked selection yields no authoritative rows even if an older sidecar contains its value.
No record/template identity, sparse override, canonical document or source recipe is mutated.
Before projecting, the host subsets same-capture per-record resources/presentations to the returned
record IDs while preserving their opaque keys and generation; the existing projector rejects orphan
resources. Keep dormant canonical overrides. Consumer acceptance includes one filtered-out artwork
resource and one retained resource. This adapter mapping does not add a fifth public function.

Bounds: 32 authored controls sharing the admitted control component ID per document (across component
versions), and 32 admitted controls per target capture. Hosts that use multiple control component IDs
must enforce their overall document limit; Kit does not infer control semantics from unrelated
components. Other bounds: 1,024 options/control, 10,000 records, 64 KiB/config, 8 MiB combined
scalar records/filter rows/options per target, 16 KiB/string and 256 UTF-8 bytes/ID or token. Reject
overflow; never truncate. Bounds are enforced before traversal/materialization can become unbounded.
Hosts without controls continue using the existing projector unchanged.

## Allowed files and verification

Source/test allowset:

- new `packages/json-widget/src/ui-authoring/collection-region-filter.ts`;
- new `packages/json-widget/src/ui-authoring/collection-region-filter.test.ts`;
- `packages/json-widget/src/ui-authoring/v3.ts`;
- `packages/json-widget/src/ui-authoring/collection-repeat.public-entry.test.ts`.

Lead-owned docs: this packet and `docs/northstar/implementation-plan.md`. Stop for admission before
changing any other source file, package metadata, schema, dependency or validation policy.

Use two neutral fixtures with different source namespaces/descriptors: a tagged catalog with scalar
group and string-array category, and a manually declared scalar collection using a different input
ID. Minimum assertions:

1. Static parser works independently of options; malformed/unknown version, prototype/accessor,
   cycle, sparse/nonfinite, invalid identity and boundedness rejection.
2. Actual document/control/empty target/input binding admission; wrong binding, schema, field,
   provider, operator and default type fail without a substitute target.
3. Strict scalar/membership semantics, multiple-control AND, All baseline restriction and Reset.
4. Scope replacement, independent owners, retained stale callback, old snapshot event, failed
   refresh/recovery, selected/default value missing and zero matches without implicit broadening.
5. Full paired-capture validation including invalid filtered-out/off-page rows, mixed generations,
   duplicate identity, unknown option tokens, byte/record/option/control caps and original order.
6. Filtered count before existing pagination, retained record identity, no mutation of inputs, and
   public-entry imports of all four functions/types. Existing repeat tests remain unchanged.

Run focused new/public-entry/existing repeat tests, affected json-widget types, changed-file lint/
format, public exports and public-reference/secret checks. Build affected dependencies and json-widget
for declarations/public artifact verification. The repository's public export/packaging lane remains
required for export integration; record its actual outcome and do not substitute a source import for
packed consumption. Do not run a release/tag/publish operation. Broaden repeated checks only after a
relevant new change or failure. The consumer subsequently validates actual same-capture adapters and
page reset without a new source read, then storage/UI behavior in its separate reviewed scope.

Source review and passing local tests are not registry release, consumer runtime or browser UX
acceptance. Existing linked checkout is frozen until the coordinating lead explicitly transfers the
consumer to a separately validated candidate; manifests retain exact published pins throughout.

## Local acceptance — 2026-10-10

The four allowed source/test files are implemented on the base above. Two independent reviewers
accepted the exact candidate after corrections for owner separation, valid option capture sizes,
actual binding permission, component-family limits across versions and pre-materialization bounds.
Focused new/public-entry/existing-repeat tests passed 55/55. Affected typecheck and builds, changed-file
ESLint/Prettier, public exports, commit safety and diff checks passed.
`pnpm check:packed-consumer --with-platform-cjs-leaves` passed for all 19 packed packages, including
external TypeScript, runtime, bundle and CJS leaf consumption. No commit, publish or browser claim.

SHA256 under `packages/json-widget/src/ui-authoring/`:

| File                                     | SHA256                                                             |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `collection-region-filter.ts`            | `f20d632e1c90c774a2b8edb0b1a43cb402ab4478c2379a907f595e66659266f5` |
| `collection-region-filter.test.ts`       | `3c7339b5648a2ceee84e35ff9607f531ea7abfa5aa8f9e8882eb6fc51657b0df` |
| `v3.ts`                                  | `d684f84c057b7eeab441ebda0a79ba427d46a97916adbf3ac70a22f93c5070ea` |
| `collection-repeat.public-entry.test.ts` | `f7b6634715cd7060755a89f17e402f45865a3c36e022306a790924360acb8fdc` |
