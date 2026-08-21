# Workbench Kit Northstar Roadmap

This document is the compact outcome-oriented roadmap projection for Workbench Kit. Detailed architecture, packet acceptance, source-review evidence, and implementation status remain owned by the focused Northstar documents and GitHub Issues.

## Current checkpoint

- **Integration baseline:** `develop@14ebec740a82beb1e6b53c153f967cb0dea68baf`.
- `WB-NS-001A` is integrated through PR #301. The compatible `ExtensionRegistry` facade now delegates focused inventory, contribution-routing, API-construction, and activation-lifecycle responsibilities, including teardown barriers.
- The next extension-runtime slice is not automatically implementation-ready: `WB-NS-001B1` still requires the current shell dependency inventory and focused-service contract before shell reach-through is narrowed.
- Existing correctness, UX, release, and lifecycle Issues retain their own ownership. This roadmap does not replace or duplicate their acceptance criteria.

## Strategic outcomes

1. **Stable composition kernel** — focused typed capabilities, lifecycle/bootstrap, contribution boundaries, and compatibility seams without a global service locator.
2. **Authoring platform** — manual-first Canvas/Hierarchy/Inspector/Palette plus graph/form/schema projections over canonical document models with explicit history and preview ownership.
3. **Design-system ecosystem** — installable/versioned `DesignSystemPack` plus theme/token/component metadata with explicit compatibility and migration semantics.
4. **Extension ecosystem** — bounded manifests, contributions, compatibility, trust/permissions, lifecycle, and safe host-capability access.
5. **Browser/Desktop portability** — native/Electron behavior behind typed ports while browser-safe surfaces remain backendless-testable.
6. **Quality at scale** — accessibility, deterministic scenarios, performance/memory/disposal budgets, diagnostics, and migration contracts.
7. **Public consumability** — focused package/subpath APIs, compatible releases, packed-consumer validation, and documentation sufficient for independent hosts.

## NOW

- **Close the extension-runtime decomposition follow-through.** Reconcile the integrated `WB-NS-001A` result into the Northstar packet ledger, then complete the bounded current-source inventory needed to decide `WB-NS-001B1`. Do not widen the public runtime API merely to remove aggregate shell reach-through.
- **Maintain one durable roadmap projection.** Keep this file synchronized only when repository truth materially changes the horizon, dependency order, or effect gate. Detailed Issue/packet state stays with its canonical owner.
- **Finish independently owned high-value work without collapsing ownership.** Correctness, accessibility, Field Remap, JDW, extension-management, and repository-lifecycle work continue through their focused Issues and producer/reviewer lanes.

## NEXT

- **Typed property/schema foundation** — close the `WB-NS-030` and `WB-NS-070A` reuse boundaries before introducing new public schema families.
- **Canonical transaction/history ownership** — prove reversible history at each domain's actual document/operation boundary before extracting a shared abstraction. `WorkbenchDocument`, JDW, and Field Remap currently provide different ownership evidence.
- **Manual visual-authoring vertical** — prove Palette/Hierarchy/Inspector/Canvas over one canonical document with direct manipulation, backendless preview, and undo/redo.
- **DesignSystemPack vertical** — establish the current reuse/consolidation map, then prove versioned packs, theme/token/component metadata, provenance, and explicit migration transactions without a parallel permanent UI engine.
- **Scenario/performance contract** — use deterministic SMALL/TYPICAL/STRESS fixtures for the same vertical so accessibility, disposal, responsiveness, and memory behavior are architecture constraints rather than release cleanup.

## LATER

- broader extension distribution/sharing after trust, compatibility, lifecycle, and runtime boundaries are proven;
- advanced collaboration or multi-document round-trip after canonical ownership and transaction semantics are stable;
- richer workflow runtime only where it remains a generic platform responsibility;
- advanced generative authoring only after manual parity and canonical transaction semantics are strong.

## RESEARCH

Use bounded external evidence only when it can change a target decision, horizon, or likely bottleneck. Prefer current primary sources, record counterevidence and applicability limits, and classify material findings as `ADOPT | EXPERIMENT | TRACK | REJECT | NO_MATERIAL_DELTA` against an existing Northstar assumption or packet.

## Effect gates

- **Implementation:** only a sufficiently closed `READY_FOR_IMPLEMENTATION` packet enters source production.
- **Integration:** exact repository state and ownership must be revalidated before mutation; producer and independent reviewer authority remain distinct where review is required.
- **Release/consumer use:** merged source is not release evidence. Promotion requires then-current validation, compatibility, package/release, and review evidence.
- **Shared abstraction:** extract only after at least two real domains converge on semantics without adapter leakage or ownership ambiguity.
- **Public boundary:** roadmap and Northstar artifacts remain consumer-neutral and contain no private project/customer evidence.

## Roadmap governance

Use `NOW | NEXT | LATER | RESEARCH | PARKED/REJECTED`. Entries describe outcomes and dependency/effect gates rather than mirroring the Issue backlog. On material change, reconcile each affected outcome as `KEEP | PROMOTE | DEMOTE | PARK | SUPERSEDE`, preserving falsifiers and migration cost where they matter.
