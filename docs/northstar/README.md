# Workbench Kit Northstar

This directory defines the **TARGET DESIGN** for Workbench Kit.

Existing `docs/architecture`, `docs/workbench`, source code, tests, pull requests, and published package shapes are evidence, compatibility constraints, and migration inputs. They are not automatically the target architecture.

## Documents

- [`target-architecture.md`](./target-architecture.md) — target capabilities, package/module/class/API structure, state/data flows, runtime boundaries, extensibility, persistence, testing and performance model
- [`implementation-plan.md`](./implementation-plan.md) — CURRENT → TARGET gaps, dependency order, tool-neutral `READY_FOR_IMPLEMENTATION` packets, and implementation source-review results
- [`host-capability-boundary.md`](./host-capability-boundary.md) — confirmed focused host/renderer capability boundary and the evidence gate for future generic capability APIs
- [`extension-composition-boundary.md`](./extension-composition-boundary.md) — confirmed host-composition vs runtime-extension plane separation, compatibility-facade migration, and isolation discovery decision
- [`ui-authoring-and-generative-composition.md`](./ui-authoring-and-generative-composition.md) — atomic UI composition, typed property/value nodes, manual-first visual authoring, optional generative UI, AI-assisted component/node development, and external node ecosystem interoperability
- [`layout-and-style-authoring.md`](./layout-and-style-authoring.md) — user-selectable layout strategies, typed CSS-compatible style values, design tokens/resources, responsive variants, Inspector/direct-manipulation parity, and optional AI parity
- [`design-system-packs.md`](./design-system-packs.md) — installable/versioned DesignSystemPack, runtime Theme/ThemeScope resolution, semantic versus pack-specific component identity, explicit pack migration transactions, trust and compatibility migration

## Current vs Target

Every design iteration distinguishes:

- **CURRENT SOURCE FACT** — verified behavior or structure in source/tests/packages
- **TARGET DESIGN** — the desired architecture independent of accidental current structure
- **GAP** — the changes required to move CURRENT toward TARGET
- **DISCOVERY CANDIDATE** — a new technology, capability, interaction or UX opportunity that must pass fit/risk evaluation before becoming target
- **IMPLEMENTATION PACKET** — a sufficiently decided unit that an implementation agent can execute with limited architectural discretion

Current limitations are not target constraints unless compatibility, migration cost, public contract stability, or a deliberate product/platform decision requires preserving them.

## Recursive design loop

```text
Platform goals
  → TARGET architecture
  → current source review
  → CURRENT → TARGET gap analysis
  → bounded discovery / fit evaluation
  → target capabilities/modules/classes/APIs/flows refinement
  → implementation packet decomposition
  → READY_FOR_IMPLEMENTATION
  → separate implementation agent
  → actual source/tests/PR review
  → target/packet refinement
  ↺
```

The target includes both manual and AI-assisted authoring. AI must operate through the same canonical documents, typed schemas, commands, validation, preview, and extension boundaries used by non-AI authoring; it is not a separate source of truth or a required runtime dependency.

For visual design, the manual path is primary: users explicitly choose supported layout structures and valid layout/style values through Canvas/Hierarchy/Inspector surfaces. AI may express the same operations as reviewable typed proposals, but must not be the only authoring path.

Design-system authoring follows the same rule. Theme changes are presentation resolution over the canonical document, while DesignSystemPack changes that require component substitution are explicit compatibility/migration transactions rather than silent layout mutation.

## Tool neutrality

`READY_FOR_IMPLEMENTATION` does not name or require a specific coding agent. The execution environment may be selected at implementation time.

Northstar architecture and handoff contracts must remain executor-neutral.

## Public boundary

Workbench Kit is public-facing. Northstar documents remain consumer-neutral and must not contain private consumer names, private issue references, credentials, or private product evidence.
