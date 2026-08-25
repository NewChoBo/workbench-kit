# Workbench Kit Northstar Roadmap

This document is the compact outcome-oriented roadmap projection for Workbench Kit. Detailed architecture, packet acceptance, source-review evidence, and implementation status remain owned by the focused Northstar documents and GitHub Issues.

## Current checkpoint

- **Reviewed repository baseline:** `develop@80fab0af8fed297bf9c0afa4805f44e9903109c8`. The latest source-bearing integration is `cfd64106a5212d787f5f5ef1e2231b81cb41524a`; later integrations through the reviewed baseline are documentation-only and do not change package source or API.
- The extension-runtime decomposition chain (`WB-NS-001A`, `WB-NS-001B1`, `WB-NS-001B2`) is `DONE`. The compatible `ExtensionRegistry` facade delegates focused runtime roles, and shell consumers use focused services without public aggregate-registry reach-through.
- The manual authoring foundations (`WB-NS-070A` through `070D`) and graph type/property-input foundation (`WB-NS-071A`) are `DONE`: typed values, layout strategies, component descriptors, one `UiDocument` command/history path, and graph-node metadata now have explicit owners.
- The design-system foundation and compatibility chain (`WB-NS-072A` through `072F`) is `DONE`: pack/theme resolution, typed token/resource roles, migration planning, Canvas/Inspector provenance, and legacy theme compatibility delegate to one integrated path.
- Effective keybinding management and the provider-free command host (`WB-NS-080A`, `WB-NS-080B`) are `DONE`. `WB-NS-071B` is the only active Northstar source packet at `READY_FOR_IMPLEMENTATION`; `WB-NS-071C` remains downstream design work.
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

- **Implement the reviewed `WB-NS-071B` requirement flow without reopening completed foundations.** Add the focused inert requirement/reconciliation contract over the existing component and node catalogs, then validate and review one exact source candidate. `WB-NS-071C` remains downstream ecosystem work.
- **Maintain one durable roadmap projection.** Keep this file synchronized only when repository truth materially changes the horizon, dependency order, or effect gate. Detailed Issue/packet state stays with its canonical owner.
- **Finish independently owned high-value work without collapsing ownership.** Correctness, accessibility, Field Remap, JDW, extension-management, and repository-lifecycle work continue through their focused Issues and producer/reviewer lanes.

## NEXT

- **Graph/document and schema convergence** — close the remaining `WB-NS-010` and `WB-NS-030` decisions by reusing the integrated UI-authoring, node-descriptor, JDW, SchemaForm, and Field Remap contracts rather than introducing parallel document or scalar-schema families.
- **Component/node development flow** — after `WB-NS-071B` source integration, prove one requirement-to-descriptor-to-preview path with explicit provenance and human-controlled acceptance before opening the `WB-NS-071C` external ecosystem boundary.
- **Extension ecosystem integration** — mature catalog/install, compatibility, trust, permission, and lifecycle decisions through `WB-NS-040` while keeping declarative design-system inputs separate from executable extension authority.
- **Projection and workflow architecture** — compose the completed manual authoring and design-system foundations into reusable GUI-builder projections before extracting a broader workflow runtime.
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
