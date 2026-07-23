# Sample Host Test Architecture

Direction for using `examples/workbench-sample` as the **system under test (SUT)**
for UI regression, instead of growing a second full-shell harness or a
package-wide Storybook gallery.

Status: **Must landed; Should partially landed.** Seed helpers and named scenarios
live under `examples/workbench-sample/src/storybook/` (`fixtures/`, `scenarios/`,
`play/`). `main.tsx` and `WorkbenchSample.stories.tsx` share host assembly via
`createSampleHost`. Physical `app/` / `stories/` moves remain **Later**.

Priority below is the implementation contract: do **Must** before expanding
Storybook or adding Playwright. **Later** / **Won't** exist so the target tree
is not mistaken for an all-at-once rewrite.

Related:

- [Storybook E2E Coverage](./storybook-e2e-coverage.md) — required/baseline gates
- [Storybook conventions](../conventions/storybook.md) — Storybook direction
- [Sample README](../../examples/workbench-sample/README.md) — how to run the host
- [Sample Host Backend API](./sample-host-backend-api.md) — dummy auth contract

## Goals

1. **One host path.** `pnpm dev` and Storybook integration stories exercise the
   same sample composition via `createSampleHost` → `App` shell, not a
   story-only shell copy.
2. **Scenarios as data.** Login, tester workbench, permission scope, field-remap
   demos, and similar flows are **named scenarios** (seed + options), not forked
   JSX trees.
3. **Fixtures over duplication.** Workspace docs, permission roles, installed
   extension catalogs, and storage keys live under shared fixtures that both
   `main.tsx` and stories import.
4. **Layered verification.** Sample-centric Storybook play is the primary UI
   gate. True browser E2E (Playwright) stays reserved for flows Storybook cannot
   faithfully cover (see [True E2E-only Flows](./storybook-e2e-coverage.md#true-e2e-only-flows)).

## Non-goals

- Reintroducing package-wide Storybook galleries for every `@workbench-kit/*`
  export.
- Replacing unit/Vitest coverage for pure helpers (platform Node ports,
  `field-remap` convert logic, etc.).
- Building a second “test-only” sample app that diverges from `pnpm dev`.

## Current shape (as of this doc)

| Piece                                                | Role today                                                     |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| `examples/workbench-sample/src/createSampleHost.tsx` | Shared factory for `main` + Storybook (`devtools` option)      |
| `examples/workbench-sample/src/App.tsx`              | Shell composition (bootstrap, auth, provider, extensions)      |
| `examples/workbench-sample/src/main.tsx`             | Vite entry; renders `createSampleHost()`                       |
| `WorkbenchSample.stories.tsx`                        | Thin CSF; applies named scenarios; required + sample play tags |
| `src/storybook/fixtures/sampleHostStorage.ts`        | Storage reset / installed-extension seed                       |
| `src/storybook/scenarios/`                           | Named seeds (login, tester, permission, install state, …)      |
| `src/storybook/play/sampleHostAssertions.ts`         | Shared wait / activity / tab helpers for plays                 |
| Curated package stories in `.storybook/main.ts`      | Component-tier contracts not owned by the sample journey       |

Integration stories call `createSampleHost` after scenario seeds (same path as
`pnpm dev`). Optional physical `app/` / `stories/` moves remain **Later**.

## Target layout

Proposed under `examples/workbench-sample/src/` (names indicative):

```text
app/
  SampleApp.tsx           # shell composition only
  createSampleHost.ts     # providers, storage ports, extension wiring
scenarios/                # shared by main, Storybook, optional Playwright
  login.ts
  testerWorkbench.ts
  basicPermission.ts
  fieldRemap.ts
fixtures/                 # deterministic seeds (docs, roles, catalogs, keys)
stories/                  # thin Storybook entries that apply a scenario
main.tsx                  # default scenario → createSampleHost → SampleApp
```

### Responsibilities

| Layer        | Owns                                                          | Must not own                                       |
| ------------ | ------------------------------------------------------------- | -------------------------------------------------- |
| `fixtures/`  | Static/deterministic seed data and storage key helpers        | React trees, Playwright selectors                  |
| `scenarios/` | How to apply fixtures (storage seed, host options, labels)    | Duplicate full apps                                |
| `app/`       | Workbench provider/shell wiring                               | Storybook `play` functions                         |
| `stories/`   | `Meta`/`play` that select a scenario and assert ARIA outcomes | Parallel host bootstrap                            |
| `main.tsx`   | Dev entry using the default scenario                          | Test-only branches that diverge from Storybook SUT |

## How Storybook fits

1. Prefer **sample integration stories** for host wiring (activity bar, login,
   journey, permission projection, sidebar collapse).
2. Keep **component stories** only for public surfaces whose contract is too
   low-level for the sample (controls, overlay chrome, widget-tree lab, etc.).
3. Tag release blockers `storybook-play-required`; use `storybook-play-baseline`
   for valuable but non-blocking plays.
4. Do not require the same assertion in both a component story and a sample
   journey unless the tiers prove different contracts (panel API vs host wiring).

Deepening Storybook without sample scenario extraction tends to grow orphan
plays and duplicate shells. **Extract scenarios first**, then grow required plays
against those scenarios.

## How Playwright (or other browser E2E) fits

Optional and thin. Drive the **running sample** (`pnpm dev` / preview URL), not a
third harness.

Use browser E2E only when Storybook cannot satisfy the
[E2E replacement criteria](../conventions/storybook.md#e2e-replacement-criteria),
for example:

- On-disk workspace / file watcher
- Extension reload after install
- Monaco deep editing and large-file behavior
- Cross-view DnD persistence
- Real backend auth

Do not mirror the full required Storybook matrix in Playwright.

## Import rule for JSX

- **Do** import sample modules (`App`, future `SampleApp`, scenario helpers)
  from Storybook and tests.
- **Do not** maintain story-only copies of the workbench shell “for easier
  testing.”
- Story-only helpers that are not part of the sample host belong under
  `packages/react/src/workbench/story/` and must not be imported by production
  hosts or public package exports.

## Priority (Must / Should / Later / Won't)

Rationale: integration stories already import `App`. The high-ROI gap is
**shared scenario/fixture extraction**, not a deeper parallel harness. Full
directory moves and browser E2E matrices cost more than they return at kit
scale.

### Must (do first)

1. ~~Extract storage reset/seed helpers from `WorkbenchSample.stories.tsx` into
   shared modules~~ — landed under `src/storybook/fixtures/`.
2. ~~Wrap those seeds as named **scenarios** and point existing required plays at
   them **without changing assertions**~~ — landed under `src/storybook/scenarios/`.
3. Keep `pnpm test:storybook-play:required` (and `pnpm test:storybook-play:sample`)
   green after every extraction step.

### Should (next)

1. ~~Split host wiring from `App.tsx` into a thin `createSampleHost` (or
   equivalent) + presentational shell so `main` and Storybook apply the same
   assembly~~ — landed as `createSampleHost.tsx` (+ `App` shell); physical
   `app/` move remains Later.
2. Add new sample coverage as **new scenarios + plays**, not new full-shell
   stories or package galleries.
3. Prefer scenario growth over deepening component-tier required tags.
4. Move shared play assertions further into scenario-owned helpers only when
   assertion text stabilizes across multiple stories.

### Later (optional cleanup)

1. Physical move into `app/` / `scenarios/` / `fixtures/` / `stories/` once
   behavior is stable (docs/links/`main.ts` churn only).
2. One Playwright (or similar) slice for a single
   [True E2E-only](./storybook-e2e-coverage.md#true-e2e-only-flows) gap, driven
   against `pnpm dev`, never as a clone of the required Storybook matrix.

### Won't (for now)

- Package-wide Storybook galleries or “cover every kit export in play”.
- A second test-only sample app that diverges from `pnpm dev`.
- Duplicating `storybook-play-required` in Playwright.
- Runtime loading of raw `.tsx` as strings; keep normal module imports.

## Migration steps (implementation later)

Align with **Must → Should → Later**:

1. **Must:** Extract seed helpers; no story behavior change.
2. **Must:** Introduce scenario wrappers; rewire existing
   `WorkbenchSample` plays.
3. ~~**Should:** Split `App.tsx` into host factory + shell; keep `main` and
   stories on the same path~~ — landed (`createSampleHost`).
4. **Later:** Move files into the target tree only after imports/play tags stay
   stable.
5. **Later:** Add at most one True E2E browser slice if a real gap appears.

Each step should keep `pnpm test:storybook-play:required` green.

## Decision summary

| Question                           | Answer                                                               |
| ---------------------------------- | -------------------------------------------------------------------- |
| Sample vs separate test app?       | **One sample**; scenarios assemble it for dev and tests              |
| Import sample JSX in Storybook?    | **Yes** — already the integration pattern; deepen via scenarios      |
| Storybook depth vs real e2e?       | **Sample Storybook primary**; Playwright only for True E2E gaps      |
| Split sample for test convenience? | **Yes** — fixtures/scenarios/app layers, not a second product sample |
| Implement target tree immediately? | **No** — Must/Should first; directory move is Later                  |
| Deep Storybook or full Playwright? | **Won't for now** — low ROI vs scenario extraction                   |
