# Operation invocation performance

## WB-ST-003B historical design and measurement

Historical status (2026-09-30): the `READY_FOR_IMPLEMENTATION` label below is
superseded and does not dispatch new work. The [stabilization roadmap](./stabilization-roadmap.md)
records ST-003B lookup optimization as implemented, and the exact implementation
commit `aedc12e6cd4efa19cf1c1df92ee9296a6b41980b` is an ancestor of the current
documentation base. Retain the original design and
measurement details as historical evidence; do not treat this old admission
label as current readiness.

Original status: `READY_FOR_IMPLEMENTATION`. Owner: runtime invocation. Prerequisite:
WB-ST-003A local candidate `57e1e2e9`. No unresolved design decisions.

Scope: measure repeated successful calls and remove serialized registry lookup
keys if the complete invocation workload improves. Use nested maps keyed by the
exact string id and integer version. Registration remains a frozen snapshot;
duplicate detection, invalid refs, diagnostic snapshots, async timing, validation,
cancellation checks and shared invocation budgets retain their existing semantics.
No public API, dependencies, payload caches, scheduler or consumer changes.

Acceptance: existing required fixtures pass; adversarial ids and multiple versions
cannot alias; measure warmed synchronous, async and nested calls before and after
in alternating order. Report median and p95 batch time, environment and workload.
Timings are diagnostic evidence, not flaky CI thresholds or product UX claims.
Full `validate:fast` and commit safety remain required before committing.

## Local measurement

Baseline: `57e1e2e9`; candidate changes only registry indexing to nested maps.
Windows x64, Node 24.18.0, Intel i7-13700K. Each workload warms 10,000 calls,
then measures 15 batches of 20,000 calls. Baseline and candidate order alternates
between batches in the same process. Output values are checked on every call.

| Workload                    | Baseline median / p95 ms | Candidate median / p95 ms | Median reduction |
| --------------------------- | ------------------------ | ------------------------- | ---------------- |
| Synchronous trim            | 7.140 / 7.312            | 4.945 / 5.178             | 30.7%            |
| Async trim                  | 7.154 / 7.515            | 4.913 / 5.067             | 31.3%            |
| Parent plus two child calls | 20.034 / 20.728          | 13.455 / 13.928           | 32.8%            |

These are batch latencies for cheap operations, not individual-call tail latency
or end-to-end UI improvements. With 15 samples, nearest-rank p95 is the maximum.
Registry construction/transpilation are excluded. Nested maps add one Map per
distinct id, trading fixed registration overhead for fewer per-call allocations.
Heap/GC and large registries were not measured; no memory reduction is claimed.
No cache retains caller values or grows with invocation count.

A second process run confirmed median reductions: single 7.452 → 4.940 ms,
async 7.151 → 5.001 ms, nested 20.595 → 13.739 ms. Nested p95 in that run
was 21.592 → 22.482 ms, so there is no demonstrated tail-latency improvement.

Reproduce from the repository root using PowerShell:

```powershell
New-Item -ItemType Directory -Force tmp | Out-Null
git show 57e1e2e9:packages/runtime/src/dataOperations.ts | Set-Content tmp/dataOperations-baseline.ts
pnpm exec node scripts/benchmark-data-operations.mjs tmp/dataOperations-baseline.ts packages/runtime/src/dataOperations.ts
```

For current-source measurements only:
`pnpm exec node scripts/benchmark-data-operations.mjs`.
The script emits all batch times as JSON. Timings are intentionally excluded from
the required correctness gate; adversarial id/version coverage is registered there.

## Verification receipt

Local candidate: `LOCAL_VALIDATED`, `SOURCE_REVIEW_REQUIRED`. Full
`pnpm validate:fast` passed: 484 files / 2,890 tests; seven registered units with
53 required cases. Packed public imports, headless execution, dependency boundaries
and existing bundle budgets passed. No integration, publication or consumer adoption
is claimed. The benchmark and additional exact-reference fixture accompany the
implementation so future changes can repeat both performance and correctness checks.

## Follow-up measurements

| Unit              | Measurement before optimization                           | Acceptance boundary                                        |
| ----------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| Invocation        | Cheap single, async and nested calls                      | Exact refs, budget, cancellation and diagnostics unchanged |
| Mapping / Recipe  | Representative record counts, path depths and step counts | Same outputs, conflicts and step errors; bounded memory    |
| Graph             | Repeated inputs and partial invalidation                  | Recompute only valid dependencies; no stale values         |
| Input / Inspector | Editing, IME, selection changes and render counts         | Native editing, focus and composition preserved            |
| Renderer / Shell  | Mount, switching, retained subscriptions and bundle size  | Document state and resource cleanup preserved              |

The remaining rows are measurement plans, not admitted implementation packets.
Consumer UI adaptation should record first interaction and editing latency once
the corresponding Kit API is published; no consumer source change is required here.
