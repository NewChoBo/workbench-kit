# Remote capability integration — 2026-10-20

Status: **ACCEPTED_FOR_LOCAL_DEVELOP**.

This integration retains completed optional capabilities on the current
development base. It does not change package versions or the separately frozen
release candidate, and does not claim publication or host adoption.

## Inputs and disposition

Base: `276fdbc7871b96ca8e42c9d2170fcfe7f01f250d`.

| Remote candidate                             | Exact head                                 | Disposition                                                                                  |
| -------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `codex/json-panel-loading`                   | `06b80938aab5a06c2f6b335bf75be603b6b49666` | Integrate the strict optional JSON leaf and scoped story assertions                          |
| `feature/codex/portable-property-row`        | `615230f74284a5c232904f1a4bcd027c5b7661f4` | Integrate native label/help/error association and its portable-layout parent                 |
| `feature/codex/portable-layout`              | `b49d0d4551eff2717e6aca243ef2aef70a940e50` | Included by the preceding branch; do not replay twice                                        |
| `chore/codex/kj1-source-checkpoint-e6a81bcf` | `ff5a58a1afa841e6ad40571093d4769683b6d2c8` | Already represented by current primitives; retain newer lifecycle and packed-consumer checks |
| `fix/codex/hook-test-discovery`              | `fef5a0f7a71087057ea3fd770a66dab87ba15f45` | Superseded by the separate Node test lane in `scripts/test-verified.mjs`                     |
| `docs/codex/release-state`                   | `20106153a64c5e75920e7b618b35ec17e24ff359` | Historical release evidence; do not replace current readiness with it                        |

An independent current-source review admitted the exact four incoming commits,
their 38-path union, and the existing behavior contracts. No prior Northstar
packet state was changed. Existing work in other checkouts, their links and their
runtime artifacts remain separately owned.

## Preserved behavior

- The original four JSON primitive descriptors, registry and host dispatch remain
  intact. PanelLoading is an opt-in leaf using the existing React component.
- Core owns the six existing layout transitions. The shell helper aliases the
  same function; it does not create a second state or command owner.
- Current frame-presentation exports and optional-field compatibility remain.
  Focus mode still uses the existing transient snapshot and restore semantics.
- Native PropertyRow is optional composition around host-owned native controls.
  It does not imply a framework-neutral assembled shell or a new host dependency.

## Integration repairs

The two incoming portable consumer scripts failed on Windows with
`spawnSync corepack ENOENT`. They now use the existing command runner. The layout
checker then exposed a Windows separator mismatch between Vite module IDs and
the temporary consumer root. Both checkers normalize these paths and require a
directory separator after the root, preserving the isolated packed-graph checks
while also rejecting adjacent directories with a matching name prefix.

Retained layout browser bundles now live under
`tmp/portable-layout-hosts/dist/run-*`, matching the existing generated-output
lint exclusion. No lint rule was relaxed.

The existing pnpm guard test helper also removes inherited case variants of
`npm_execpath` before constructing each child environment. Two regression cases
cover upper/mixed-case parent keys. The production installation guard is unchanged.

No product assertion, verification unit, framework-exclusion check or required
packed-entry check was removed.

## Validation and acceptance

Current-candidate source review by two reviewers distinct from the producer
found no blockers. Bounded checker and test-harness repairs received separate
independent review.

| Check                                                      | Result                                                                                                         |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Frozen install                                             | PASS; isolated dependencies                                                                                    |
| Focused primitive, layout and native-control tests         | 12 files, 375 tests passed                                                                                     |
| Affected package and Sample typechecks                     | Five packages passed                                                                                           |
| `pnpm validate:fast`                                       | PASS; 554 Vitest files, 4,316 passed, three skipped; five Node hook tests passed; 30 registered units verified |
| `pnpm validate:packaging`                                  | PASS; fresh public packages, external consumers and CJS leaves                                                 |
| Portable layout packed consumer                            | Four hosts, nine scenarios each; strict/exact-optional types and neutral graph passed                          |
| Native PropertyRow packed consumer                         | Four hosts, 12 scenarios each; types, runtime, CSS and graph passed                                            |
| pnpm guard test, ordinary and polluted parent environments | Six passed and one POSIX-only skip in each run                                                                 |
| Scoped Chromium Storybook plays                            | CapabilityBoundaries and LifecycleBoundaries passed                                                            |

Real Chromium checks used the isolated Sample at `http://127.0.0.1:63340/`.
Toolbar click and Enter toggled the primary sidebar; panel and secondary sidebar
were shown; command-palette focus mode hid the regions and Ctrl+Shift+F11 restored
them. The four HTML/React/Vue/Svelte fixture routes at ports 63341 and 63342 also
passed native pointer/keyboard activation, focus retention, snapshot restoration,
label association, text/checkbox entry, error-description updates, reset and
unmount/remount checks as applicable.

The JSON capability story at
`http://127.0.0.1:63343/iframe.html?id=jdw-kit-primitives--capability-boundaries&viewMode=story`
retained its loading label, action gating and context/media behavior. Both scoped
plays passed with a 60-second runner timeout after the first cold run exceeded
15 seconds. The successful retry took 2.3 seconds overall.

An initial packaging run overlapped a static-check workspace build and observed
missing declaration outputs. A fresh standalone packaging run passed; build
writers must remain sequential. Earlier failed checks are not counted as passes.
Historical hosted evidence for PR #432 is not validation of this combined source.

The accepted merge preserves the two remote heads as parents and is intended
for fast-forward into the clean local `develop` checkout. Its commit and final
ref verification are recorded in the local integration receipt. Remote `develop`
was last verified at the base above.

Release, tags, publication, standalone push, remote branch deletion, registry
adoption and primary-checkout updates remain separate actions.
