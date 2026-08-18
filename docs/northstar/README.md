# Workbench Kit Northstar

This directory defines the **TARGET DESIGN** for Workbench Kit.

Existing `docs/architecture`, `docs/workbench`, source code, tests, pull requests, and published package shapes are evidence, compatibility constraints, and migration inputs. They are not automatically the target architecture.

## Documents

- [`target-architecture.md`](./target-architecture.md) — target capabilities, package/module/class/API structure, state/data flows, runtime boundaries, extensibility, persistence, testing and performance model
- [`implementation-plan.md`](./implementation-plan.md) — CURRENT → TARGET gaps, dependency order, tool-neutral `READY_FOR_IMPLEMENTATION` packets, and implementation source-review results
- [`host-capability-boundary.md`](./host-capability-boundary.md) — confirmed focused host/renderer capability boundary and the evidence gate for future generic capability APIs

## Current vs Target

Every design iteration distinguishes:

- **CURRENT SOURCE FACT** — verified behavior or structure in source/tests/packages
- **TARGET DESIGN** — the desired architecture independent of accidental current structure
- **GAP** — the changes required to move CURRENT toward TARGET
- **IMPLEMENTATION PACKET** — a sufficiently decided unit that an implementation agent can execute with limited architectural discretion

Current limitations are not target constraints unless compatibility, migration cost, public contract stability, or a deliberate product/platform decision requires preserving them.

## Recursive design loop

```text
Platform goals
  → TARGET architecture
  → current source review
  → CURRENT → TARGET gap analysis
  → target capabilities/modules/classes/APIs/flows refinement
  → implementation packet decomposition
  → READY_FOR_IMPLEMENTATION
  → separate implementation agent
  → actual source/tests/PR review
  → target/packet refinement
  ↺
```

## Tool neutrality

`READY_FOR_IMPLEMENTATION` does not name or require a specific coding agent. The execution environment may be selected at implementation time.

Northstar architecture and handoff contracts must remain executor-neutral.

## Public boundary

Workbench Kit is public-facing. Northstar documents remain consumer-neutral and must not contain private consumer names, private issue references, credentials, or private product evidence.
