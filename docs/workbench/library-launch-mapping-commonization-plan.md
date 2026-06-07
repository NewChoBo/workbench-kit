# Library Launch Mapping Commonization Plan (Phase 1)

## Goal

- Consolidate UI-agnostic library launch-mapping rules in `@workbench-kit/contracts`.
- Start phase-1 migration so `custom_launcher` and `tile_paper` share the same contract types.

## Current Status (2026-06-06)

- `@workbench-kit/contracts` now exposes shared library target resolution and mapping APIs:
  - target normalization and type inference
  - launch execution payload generation
  - subtitle composition from deduplicated fragments
  - tile-binding payload helpers
- Contract behavior is locked by `packages/contracts/src/library-launchpad-mapping.test.ts`.
- `custom_launcher` core execution paths delegate launch-target resolution and working-directory
  calculation to `#workbench-kit/library-launchpad-mapping`, removing `shared/launch-target`
  dependence.
- `tile_paper` provider-library action label/icon/launch payload conversion is aligned through
  `@tilepaper/workbench-kit`.

## Rollout Order

### 1. custom_launcher

- Replace `shared/launchpads/launchpad-library-mapping.ts` with a thin re-export
- Call `#workbench-kit/library-launchpad-mapping` directly from launch execution paths instead of
  `#shared/launch-target`
- Lock contract equivalence in `tests/unit/launchpad/authoring/launchpad-library-mapping.test.ts`

### 2. tile_paper

- Commonize `providerAction*` helpers in `apps/web-editor/src/provider-library/provider-library-model.ts`
- Review JSON renderer contract alignment

## Shared Validation

- Preserve mapping / subtitle / `workingDirectory` equivalence for existing input samples
- Lock regression coverage for `launchType` / `workingDirectory` across exe, url, folder, and file
- Add icon / label / payload equivalence tests in consumers

## Completed Work

### custom_launcher

- `library-item-action-service.ts` and `launchpad-execution-gateway.ts` now use
  `workbench-kit/library-launchpad-mapping`.
- `tests/unit/launchpad/authoring/launchpad-library-mapping.test.ts` compares
  `#shared/launchpads/launchpad-library-mapping` with `#workbench-kit/library-launchpad-mapping`.

### tile_paper

- `provider-library-model.ts` routes `providerActionIcon` and `providerActionTypeLabel` through
  workbench-kit helpers instead of local implementations.
- `provider-library-model.test.ts` adds shared-result equivalence and args-copy policy checks.

## Acceptance Criteria

- New shared API exports are stable and referenced by at least one consumer module
- `custom_launcher` core paths build without duplicate launch logic
- `tile_paper` adapters consume the shared contract without regression

## Next Steps

### Phase 1 Status (2026-06-06)

- ✅ Done: `custom_launcher` and `tile_paper` runtime/adapter paths are aligned to
  `@workbench-kit/contracts` for launch mapping and JSON widget event kinds.
- ✅ Done: `custom_launcher` and `tile_paper` parity checks cover `launchType`,
  `target`, `workingDirectory`, `arguments`, `subtitle`, and `canLaunch` equivalence.

### Phase 2 Plan (Data/Policy Package Hardening)

This phase is the next work item before promoting additional downstream migrations:

1. Add/verify a repository-level boundary rule that prohibits direct launch-policy logic
   in consumer runtime paths (`#shared/launch-target`, local infer/trim helpers),
   allowing only compatibility shims and adapter layers.
2. Revisit `json-widget-tree-react` contract boundary and split parsing/normalization
   helpers into a non-UI package (`@workbench-kit/contracts` or `@workbench-kit/adapters`)
   if runtime behavior starts to diverge across consumers.
3. Define a one-page "data package vs UI package" policy for consumer onboarding:
   - `@workbench-kit/contracts`: all type + policy decisions
   - app-specific packages (`custom_launcher`, `tile_paper`): rendering, orchestration, host I/O
4. Add a minimal reusable smoke checklist in each downstream repo:
   - map a fixed sample set through shared APIs
   - verify launch payloads and widget event kinds without legacy aliases

Acceptance to close Phase 2:

- No new launch policy logic is introduced in consumer runtime paths.
- Remaining launch-policy usage in consumers is adapter-only or shim-only.
- New/updated consumers can implement equivalent behavior with only
  `@workbench-kit/contracts` (plus local UI modules).

## Data Package Separation (UI vs Policy)

Recommended direction:

- Keep shared policy in `@workbench-kit/contracts`.
- Keep launcher rendering, provider models, and command binding in each app or adapter package.
- Keep `@workbench-kit/react` limited to rendering and composition hooks; centralize data
  normalization, launch inference, and binding shape in `@workbench-kit/contracts`.

Rationale:

- Launch-target normalization, `launchType` inference, and `workingDirectory` derivation must be
  fixed outside UI so `custom_launcher` and `tile_paper` stay equivalent.
- Contract types let consumers focus on UI choices instead of rewriting launch policy.
- Additional data normalization, such as JSON widget renderer payload shaping, belongs in
  `@workbench-kit/contracts` or `@workbench-kit/adapters`.

Proposed follow-up:

1. After launchpad regression tests land in `contracts`, add consumer guidance to each adapter path.
2. For `tile_paper` JSON widget renderer paths, define parsing/validation rules first, then expose
   only regression baselines through `@workbench-kit/contracts`.
3. Once policy is fixed, enforce complete removal of local `shared` launch helpers in the next
   consumer-migration milestone.
4. Move execution checklists to
   [library-launch-migration-runbook.md](./library-launch-migration-runbook.md) for downstream PRs.

## Boundary Checklist (Before/After)

### Contract layer

- `resolveLaunchpadLibraryItemMapping`, `createLaunchpadLibraryItemTileBinding`, and
  `normalizeLaunchTarget` must resolve to a single import path in consumers.
- `WidgetRenderer*` types should remain minimal event/shape contracts, not renderer policy.
- `WidgetRenderer` event ingress should accept raw payloads, then normalize through
  `normalizeWidgetRendererEvent` before domain handling.

### Consumer patterns

- Do not duplicate `launchTarget` trim logic outside contract call sites.
- Do not reinterpret `sourcePath`, `arguments`, or `workingDirectory` from UI state changes.

### Migration conditions

- `custom_launcher`: no launch-resolution helpers remain in `shared/*`
- `tile_paper`: library action label/icon/payload generation goes through shared contract or adapter
  helpers

### Regression coverage

- Split regression checks across launch type (`url` / `app` / `file` / `folder`), working directory,
  blank-target handling, subtitle composition, and binding payload shape.
