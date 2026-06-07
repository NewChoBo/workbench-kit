# Unified Work Plan — TilePaper Workbench / Workbench Kit Commonization

Last updated: 2026-06-07

This document is the **engineer-facing execution plan** for converging
`custom_launcher`, `tile_paper`, and `newchobo-ui-package` (`@workbench-kit/*`)
into **TilePaper Workbench** without breaking existing product behavior.

Related docs:

- [reference-implementation-strategy.md](./reference-implementation-strategy.md) — Option C hybrid, Unified Vision, 5-phase summary (`98e23bb` themes)
- [migration-todo.md](./migration-todo.md) — kit migration backlog and verification gates
- [custom_launcher workbench-kit commonization roadmap](../../../custom_launcher/docs/workbench-kit-commonization-roadmap.md)
- [tile_paper workbench-kit extraction plan](../../../tile_paper/docs/developer/planning/workbench-kit-extraction-plan.md)
- [tile_paper Phase 4 pilot](../../../tile_paper/docs/developer/planning/workbench-kit-phase4-pilot.md)
- [library-launch-boundary-gate.md](./library-launch-boundary-gate.md)
- [library-launch-boundary-review-checklist.md](./library-launch-boundary-review-checklist.md)
- [context-key-port-design.md](./context-key-port-design.md)

---

## 1. Goals & Non-Goals

### Goals

| Goal | Success signal |
| ---- | -------------- |
| **Single contracts authority** | Launch, provider-library, and JSON widget event mapping live in `@workbench-kit/contracts`; no runtime reimplementation in downstream apps |
| **Hybrid reference model** | `custom_launcher` leads product shell/runtime/library; `tile_paper` leads `@workbench-kit/react` and JSON widget editor parity |
| **Canonical Electron app** | Evolve `custom_launcher` in place as the primary desktop product; absorb `tile_paper` domain packages as libraries |
| **Port-then-replace JSON widget** | Kit Phases 1–3 complete; consumer swap (Phase 4) only after parity gates pass |
| **Regression-first delivery** | Every phase closes with explicit validation matrix; no delete-without-adapter |

### Non-Goals

| Non-Goal | Rationale |
| -------- | --------- |
| Greenfield Electron app or wholesale ContentHub transplant | High risk; mature shell already in `custom_launcher` |
| Merge `#workbench-ui` into `@workbench-kit/react` wholesale | Parallel stacks; converge on primitives only ([reference-implementation-strategy § What NOT to Merge](./reference-implementation-strategy.md#what-not-to-merge)) |
| Move SQLite, IPC, main-process execution into kit | Kit stays host-neutral; interfaces and contracts only |
| Replace `tile_paper` as json-widget-tree reference before kit parity | tile_paper owns tree math until Phase 4 swap |
| pnpm/npm unification before Phase 5 | Short term: npm canonical app + publish/link tile_paper packages |
| Launchpad DSL → json-widget bulk migration | Separate ADR; short-term coexistence |

---

## 2. Regression Safety Principles

These gates apply to **every** task in this plan. A PR that skips them is not merge-ready.

### 2.1 Parity tests before behavior change

- **Launch mapping:** Per-sample equivalence for `launchType`, `target`, `workingDirectory`, `arguments`, `canLaunch` across `custom_launcher` and `tile_paper` adapters.
- **Provider-library actions:** `provider-library-mapping` output must match local adapter output (`toEqual` / `toMatchObject`).
- **JSON widget:** `workbench-kit-parity.test.ts` in `@tilepaper/json-widget-tree` must stay green against `@workbench-kit/json-widget`.
- **Command registry (future):** One launcher command + one kit menu flow equate visibility/enabled semantics before API convergence.

### 2.2 `check:launch-boundary`

Run from `newchobo-ui-package`:

```powershell
pnpm check:launch-boundary
```

Scans `../custom_launcher` and `../tile_paper` for forbidden legacy launch-policy imports and helper calls. Must pass before and after any launch/contracts change.

**CI / validate wiring (P1-T04):**

| Lane | Command | Includes boundary gate |
| ---- | ------- | ---------------------- |
| Local PR gate | `pnpm validate` | yes (`check:launch-boundary` last step) |
| Full kit gate | `pnpm validate:full` | yes (via `validate`) |
| GitHub CI | `.github/workflows/ci.yml` → `pnpm validate:full` | yes |
| Publish | `.github/workflows/publish.yml` → `pnpm validate` | yes |

### 2.2.1 Downstream pre-merge checklist

Before merging any PR in `custom_launcher` or `tile_paper` that touches launch mapping,
provider-library actions, or widget renderer events:

1. Run `pnpm -C newchobo-ui-package check:launch-boundary` from the monorepo root (or kit checkout).
2. Complete [library-launch-boundary-review-checklist.md](./library-launch-boundary-review-checklist.md) and attach pass log to the PR.
3. Run repo-local gates from [§5 Per-Repo Validation Matrix](#5-per-repo-validation-matrix).
4. If `@workbench-kit/contracts` changed: kit PR merges first, then downstream adapter same day.

Downstream repos do not duplicate the scan script; they consume the kit gate as the single
authority (`scripts/check-launch-boundary.mjs`).

### 2.3 Storybook play (required set)

Kit CI gate:

```powershell
pnpm test:storybook-play:required
```

14 required flows (including `JsonWidget/Playground → InteractiveSmoke`). Do not remove or weaken tags without flake profile (`5 consecutive runs`, ≤1 failure).

### 2.4 E2E gates (downstream)

| Repo | Gate | When |
| ---- | ---- | ---- |
| `custom_launcher` | `npm run test:validate:fast` (unit + storybook vitest) | Every PR touching runtime/renderer |
| `custom_launcher` | Targeted E2E: `test:validate:library`, `test:validate:launchpad`, `test:validate:providers`, `test:validate:mock-content-hub` | Phase 2–4 UI/runtime changes |
| `custom_launcher` | `npm run test:validate:e2e` | Phase close / pre-release only |
| `tile_paper` | `pnpm validate` | Every PR |
| `tile_paper` | `pnpm test:storybook` (Playwright) | Authoring UI changes |

### 2.5 Feature flags & thin adapters

- **Freeze** new `#workbench-ui` features after Phase 2 start; kit pilots behind explicit adapter entrypoints.
- **Thin adapter before delete:** Introduce kit-backed wrapper → parity test → switch call sites → delete local duplicate in a **later** commit.
- **No big-bang rewrites:** One surface, one PR, one rollback path.

### 2.6 One-repo-one-phase commits

- Prefer commits scoped to a single repo per logical change unit.
- Cross-repo contract changes: kit publish/link first, then downstream adapter PR (same day, ordered merge).
- Document rollback: revert downstream adapter before reverting kit export if consumer already swapped.

---

## 3. Current Baseline (What's Done)

Commit themes through 2026-06-07:

### Workbench Kit (`newchobo-ui-package`)

- **Application complete (Phases 1–3):** JSON widget headless + React chrome, `JsonConfigWorkbench`, playground preview, 14 required Storybook play flows — see [application-complete.md](./application-complete.md)
- **JSON widget Phase 3:** editor sync, patches, layout helpers, `JsonWidgetEditor` chrome, InteractiveSmoke stabilized
- **Strengths inheritance:** neutral patterns from both references (zoom toolbar, Ctrl+S, problems panel, config Apply)
- **Unified vision documented:** `fb43640` — TilePaper Workbench, canonical `custom_launcher`, 5-phase roadmap in [reference-implementation-strategy.md](./reference-implementation-strategy.md)
- **Launch boundary script:** `scripts/check-launch-boundary.mjs` scans both downstream repos; wired into `pnpm validate`, CI (`validate:full`), and publish (`validate`)
- **Pre-merge checklist:** [§2.2.1](./unified-work-plan.md#221-downstream-pre-merge-checklist) + [library-launch-boundary-review-checklist.md](./library-launch-boundary-review-checklist.md)
- **Context-key / when-clause:** evaluator ported to `@workbench-kit/core`; registry API convergence scoped in [context-key-port-design.md](./context-key-port-design.md) (P1-T02)
- **Command registry gap analysis (Step 1):** documented; `resolveCommand` parity deferred to P1-T05 / P4-T03

### custom_launcher

- **Contracts centralization:** launchpad mapping, URL normalization, resource URI helpers delegate to `@workbench-kit/contracts`
- **Shim removal:** `@tilepaper/workbench-kit` / local shim package deleted; direct `@workbench-kit/contracts` imports
- **Launch regression tests:** library-item-action, launchpad-execution-gateway, launch-target shim equivalence
- **Launchpad preview bridge:** `launchpad-source-widget-bridge`, `JsonWidgetPreview` React bridge, preview toolbar validation UX

### tile_paper

- **Contracts alignment:** provider-library mapping, widget registry contract, library-json contracts on `@workbench-kit/contracts`
- **Shim removal:** same as custom_launcher; direct contracts imports
- **json-widget-tree parity:** `workbench-kit-parity.test.ts`; parse/registry re-export from `@workbench-kit/json-widget`
- **Phase 4 pilot started:** `JsonConfigWorkbench` via `ProjectConfigEditor`; web-editor project.json persist; Phase 4 pilot doc

### Downstream Migration Bridge (closed)

Per [migration-todo.md § Downstream Migration Bridge](./migration-todo.md#downstream-migration-bridge-done):

- Both apps route launch/provider/widget events through `@workbench-kit/contracts`
- Legacy runtime paths cleaned; boundary gate enforced

---

## 4. Phased Plan (Unified Vision → Actionable Tasks)

Phases align with [reference-implementation-strategy § 5-phase roadmap](./reference-implementation-strategy.md#5-phase-roadmap-summary). Tasks are ordered for **minimal blast radius**.

### Phase 1 — Foundation Lock

**Deliverable:** Kit swap runbook locked; context-key port scoped; contracts parity CI stable.

| ID | Description | Repos | Risk | Validation checklist | Rollback |
| -- | ----------- | ----- | ---- | -------------------- | -------- |
| P1-T01 | Document Phase 4 consumer swap runbook checklist (keeper = custom_launcher, tile_paper = pilot) | kit | L | Doc review; links resolve | Revert doc |
| P1-T02 | Scope context-key + when-clause port from `#workbench-core` → `@workbench-kit/core` (design doc + test plan only) | kit, custom_launcher | M | [context-key-port-design.md](./context-key-port-design.md); no public API break | N/A (docs-only spike) |
| P1-T03 | Add kit-side contracts parity CI job listing required equivalence test paths | kit | L | `pnpm validate:full` green | Revert workflow |
| P1-T04 | Verify `check:launch-boundary` in kit `validate` and document downstream pre-merge step | kit | L | [§2.2.1](./unified-work-plan.md#221-downstream-pre-merge-checklist); script passes on clean tree | Revert script hook |
| P1-T05 | Add command registry parity test plan (1 launcher + 1 kit menu flow) | kit, custom_launcher | M | Test plan in migration-todo; no API change yet | Revert test stubs |

### Phase 2 — UI Stack Convergence

**Deliverable:** ContentHub/authoring pilots on `@workbench-kit/react`; freeze `#workbench-ui` new features.

| ID | Description | Repos | Risk | Validation checklist | Rollback |
| -- | ----------- | ----- | ---- | -------------------- | -------- |
| P2-T01 | **Freeze policy:** announce `#workbench-ui` feature freeze; new authoring UI goes through kit adapter or thin wrapper | custom_launcher | L | [workbench-ui-freeze-policy.md](../../../custom_launcher/docs/workbench-ui-freeze-policy.md); `authoring-surface-adoption.test.ts` still passes | Lift freeze doc |
| P2-T02 | Pilot `JsonWidgetPreview` in launchpad authoring surface (already wired); expand Storybook pilot coverage | custom_launcher, kit | M | `test:validate:launchpad`, launchpad-source bridge unit tests | Revert to stub preview |
| P2-T03 | ContentHub webview pilot: one authoring route uses `@workbench-kit/react` shell primitive behind adapter | custom_launcher | H | `test:validate:mock-content-hub`, `test:e2e:content-hub` | Feature flag off → `#workbench-ui` |
| P2-T04 | JsonConfigWorkbench pilot in custom_launcher settings/schema surface (mirror tile_paper P1) | custom_launcher, kit | M | Unit tests for schema binding; settings E2E subset | Keep local schema form |
| P2-T05 | Document `#workbench-ui` vs `@workbench-kit/react` overlap matrix (shell, panels, preview chrome) | kit, custom_launcher | L | Matrix linked from roadmap | Revert doc |
| P2-T06 | Promote `launchpad-source-widget-bridge` evaluation for kit adapter package (design + thin re-export) | kit, custom_launcher | M | Bridge unit tests green in both repos | Keep bridge in custom_launcher only |

### Phase 3 — Domain Package Merge

**Deliverable:** `custom_launcher` consumes `@tilepaper/*` packages; consolidate duplicate provider implementations.

| ID | Description | Repos | Risk | Validation checklist | Rollback |
| -- | ----------- | ----- | ---- | -------------------- | -------- |
| P3-T01 | Publish/link `@tilepaper/model`, `@tilepaper/json-widget-tree` (read-only consumption) into custom_launcher workspace | tile_paper, custom_launcher | M | Typecheck both repos; no runtime behavior change | Remove workspace link |
| P3-T02 | Provider contract tests: remote catalog DTOs align with `@workbench-kit/contracts` | custom_launcher, tile_paper | M | `test:validate:providers`, provider unit tests | Revert DTO adapter |
| P3-T03 | json-widget parity gate: expand `workbench-kit-parity.test.ts` for new widget types before swap | tile_paper, kit | M | Parity + `pnpm validate` | Revert parity cases |
| P3-T04 | tile_paper Phase 4 P3: Launchpad `JsonEditorPanel` → kit `JsonCodeEditorPane` (code-only mode) | tile_paper, kit | M | web-editor smoke; storybook pilot | Keep local JsonEditorPanel |
| P3-T05 | tile_paper Phase 4 P4: full `JsonWidgetEditor` swap behind feature flag | tile_paper, kit | H | Parity tests + `pnpm test:storybook` | Flag off → local editor |
| P3-T06 | Library action E2E: `test:validate:library` after any provider/library merge | custom_launcher | H | library.actions + library.browse E2E | Revert merge commit |
| P3-T07 | **Decision gate:** library authority (SQLite-only vs file-first vs hybrid) — blocks provider consolidation | all | H | ADR signed | Defer merge |

### Phase 4 — Runtime Unification

**Deliverable:** launcher-core HTTP/WS platform integrated into custom_launcher; web-editor bundle served from ContentHub routes.

| ID | Description | Repos | Risk | Validation checklist | Rollback |
| -- | ----------- | ----- | ---- | -------------------- | -------- |
| P4-T01 | Expose launcher-core headless API as optional subprocess in custom_launcher (read-only file/provider API) | custom_launcher, tile_paper | H | Contract tests; no default-on | Disable subprocess flag |
| P4-T02 | ContentHub route to serve web-editor bundle for authoring (iframe or webview) | custom_launcher | H | content-hub E2E; navigation regression | Remove route |
| P4-T03 | Context-key module landed in `@workbench-kit/core`; custom_launcher adapter uses kit evaluator for string `when` | kit, custom_launcher | M | Command menu parity test; unit tests | Dual registry fallback |
| P4-T04 | Extract library browse orchestration interfaces → `@workbench-kit/services` (no SQLite/IPC) | kit, custom_launcher | M | Interface-only PR; existing tests unchanged | Revert exports |
| P4-T05 | Electron smoke: custom_launcher pack + launchpad + library scenarios | custom_launcher | H | `test:validate:e2e` subset | Revert runtime wiring |

### Phase 5 — Sunset & Single Product

**Deliverable:** Deprecate duplicate apps; retire `#workbench-ui`; unify package-manager policy.

| ID | Description | Repos | Risk | Validation checklist | Rollback |
| -- | ----------- | ----- | ---- | -------------------- | -------- |
| P5-T01 | Sunset `tile_paper/apps/electron` as product (reference-only doc + CI trim) | tile_paper | M | Docs updated; no user-facing break in canonical app | Restore app target |
| P5-T02 | Remove `@tilepaper/json-widget-editor` after Phase 4 parity sign-off | tile_paper | H | Parity + pilot checklist complete | Restore package |
| P5-T03 | Delete `#workbench-ui` after Phase 2–3 adapter coverage complete | custom_launcher | H | `authoring-surface-adoption.test.ts` → kit paths; full E2E | Restore folder from tag |
| P5-T04 | pnpm workspace unification decision and migration plan | all | H | CI green in unified layout | Stay on npm+pnpm split |
| P5-T05 | Unified `test:validate:e2e` as release gate for TilePaper Workbench | custom_launcher | H | Full E2E + pack smoke | N/A (release process) |

---

## 5. Per-Repo Validation Matrix

Run **before and after** each phase-close PR.

### newchobo-ui-package (kit)

| Command | Purpose |
| ------- | ------- |
| `pnpm validate` | typecheck, lint, test, format, storybook build, launch-boundary |
| `pnpm validate:full` | above + `test:storybook-play:required` (14 flows) |
| `pnpm check:launch-boundary` | cross-repo launch policy scan |

### custom_launcher

| Command | Purpose |
| ------- | ------- |
| `npm run test:validate:fast` | lint, typecheck, unit, storybook vitest — **default PR gate** |
| `npm run test:validate:library` | library contract + content-hub + library E2E |
| `npm run test:validate:launchpad` | launchpad display/save smoke + E2E |
| `npm run test:validate:providers` | provider contract + mock + live provider E2E |
| `npm run test:validate:mock-content-hub` | mock bridge + content-hub batch |
| `npm run test:validate:e2e` | full E2E suite — **phase close / release only** |

Also run from kit root when touching launch/contracts:

```powershell
pnpm -C newchobo-ui-package check:launch-boundary
```

### tile_paper

| Command | Purpose |
| ------- | ------- |
| `pnpm validate` | turbo typecheck, lint, format, unit tests |
| `pnpm test:unit --filter @tilepaper/json-widget-tree` | includes `workbench-kit-parity.test.ts` |
| `pnpm test:storybook` | Playwright storybook (authoring UI) |
| `pnpm --filter @tilepaper/web-editor build` | web-editor build smoke |

Kit boundary (when linked):

```powershell
pnpm -C newchobo-ui-package check:launch-boundary
```

---

## 6. Critical Paths — Do Not Break

### custom_launcher

| Path | Guard tests | Notes |
| ---- | ----------- | ----- |
| **Library launch** | `library-item-action-service.test.ts`, `launchpad-execution-gateway.test.ts`, `test:validate:library` | Must use `@workbench-kit/contracts` mapping; no local infer/trim |
| **Launchpad execution** | `test:validate:launchpad`, launchpad E2E | Live binding + snapshot targets |
| **Content-hub navigation** | `test:e2e:content-hub`, `test:validate:mock-content-hub` | View registry, plugin placement |
| **Provider plugins** | `test:validate:providers`, provider contract tests | Remote catalog, action mapping |

### tile_paper

| Path | Guard tests | Notes |
| ---- | ----------- | ----- |
| **json-widget-tree parity** | `packages/json-widget-tree/src/workbench-kit-parity.test.ts` | Official reference until Phase 4 swap |
| **web-editor platform** | `pnpm validate`, web-editor build | launcher-core integration |
| **launcher-core routes** | unit + integration tests in `@tilepaper/launcher-core` | Headless API authority |

### workbench-kit

| Path | Guard tests | Notes |
| ---- | ----------- | ----- |
| **Contracts parity** | unit tests in `@workbench-kit/contracts`, `check:launch-boundary` | Single launch/event authority |
| **Storybook play required** | `pnpm test:storybook-play:required` | 14 flows; includes JsonWidget InteractiveSmoke |
| **Json widget public API** | `pnpm validate:full` | Phase 3 complete baseline |

---

## 7. Open Decisions

| Decision | Options | Recommendation | Blocks | Status |
| -------- | ------- | -------------- | ------ | ------ |
| **Library authority** | SQLite-only / `.tilepaper` file-first / file + cache | File contract + optional SQLite cache | Phase 3 provider/library merge | **BLOCKER** — pending ADR |
| **npm vs pnpm** | npm (custom_launcher) / pnpm (tile_paper + kit) / unified | Short term: npm canonical + publish/link; unification Phase 5 | CI, husky, workspace layout | Deferred to Phase 5 |
| **`#workbench-ui` retirement timeline** | Freeze → adapter swap → delete | Freeze now; delete Phase 5 after adapter coverage | Phase 2 UI convergence | **Freeze active** — [workbench-ui-freeze-policy.md](../../../custom_launcher/docs/workbench-ui-freeze-policy.md) |
| **Launchpad DSL vs json-widget long-term** | Coexist / json-widget primary / DSL-only | Short-term coexist; separate ADR for convergence | Authoring UX | Not blocking near-term |
| **Canonical Electron app** | custom_launcher / tile_paper electron / greenfield | **custom_launcher** (evolve) | Phase 3+ | **Decided** |
| **Context-key port API shape** | Extend `CommandDefinition.when` vs separate evaluator module | Evaluator + `when` in kit; add `resolveCommand` next | Phase 1–2 command convergence | Evaluator done; registry gap in [context-key-port-design.md](./context-key-port-design.md) |
| **launchpad-source-widget-bridge location** | Stay in custom_launcher / move to `@workbench-kit/json-widget` | Evaluate after Phase 2 pilot stability | Phase 2 close | Open |

---

## 8. Suggested Sprint Order (Next 2–4 Weeks)

Maximum **12 tasks** for the next sprint cycle. Complete in order; do not skip validation gates.

| Week | Task ID | Summary | Primary repo |
| ---- | ------- | ------- | ------------ |
| 1 | P1-T04 | Enforce launch-boundary in kit validate + document downstream pre-merge | kit |
| 1 | P1-T02 | Context-key port design spike (no API break) | kit |
| 1 | P2-T01 | Publish `#workbench-ui` freeze policy | custom_launcher |
| 2 | P2-T05 | workbench-ui vs react overlap matrix (doc) | kit |
| 2 | P2-T02 | Harden launchpad JsonWidgetPreview + Storybook pilots | custom_launcher |
| 2 | P3-T03 | Expand json-widget parity tests for pilot widget types | tile_paper |
| 3 | P3-T04 | tile_paper JsonEditorPanel → kit JsonCodeEditorPane pilot | tile_paper |
| 3 | P2-T04 | JsonConfigWorkbench pilot in custom_launcher settings | custom_launcher |
| 3 | P1-T05 | Command registry parity test plan (first test) | kit + custom_launcher |
| 4 | P2-T03 | ContentHub single-route `@workbench-kit/react` pilot (flagged) | custom_launcher |
| 4 | P3-T01 | Link `@tilepaper/json-widget-tree` read-only in custom_launcher | both |
| 4 | — | **Decision review:** library authority ADR (unblocks P3-T07) | all |

### Exit criteria for this sprint window

- [ ] `pnpm validate:full` green (kit)
- [x] `pnpm check:launch-boundary` in kit `validate` + CI + pre-merge checklist documented (P1-T04)
- [ ] `npm run test:validate:fast` green (custom_launcher) on all sprint PRs
- [ ] `pnpm validate` green (tile_paper) on all sprint PRs
- [ ] No regression in library launch, launchpad execution, or json-widget parity tests
- [x] `#workbench-ui` freeze documented — [workbench-ui-freeze-policy.md](../../../custom_launcher/docs/workbench-ui-freeze-policy.md) (P2-T01)
- [x] Context-key port design spike — [context-key-port-design.md](./context-key-port-design.md) (P1-T02)

---

## Appendix — Task ID Quick Reference

```text
Phase 1: P1-T01 … P1-T05  (foundation lock)
Phase 2: P2-T01 … P2-T06  (UI stack convergence)
Phase 3: P3-T01 … P3-T07  (domain package merge)
Phase 4: P4-T01 … P4-T05  (runtime unification)
Phase 5: P5-T01 … P5-T05  (sunset & single product)
```

Risk levels: **L** = doc/low-touch, **M** = adapter/limited surface, **H** = product path or delete.
