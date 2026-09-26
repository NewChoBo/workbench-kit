# Modal — viewport shrink repair

Status: `LOCAL_VALIDATED / SOURCE_REVIEW_REQUIRED / INTEGRATION_PENDING`.
Admission branch point: `b50024675e1de26a8a58eaaf57083b27babe485b`.
Part branch: `codex/part-modal-viewport-20260919`.
Scope: [modal viewport repair](../modal-viewport-repair.md).

## Repair boundary

The frame's existing position clamp is followed by its existing size clamp when
the viewport changes or maximized bounds are restored. This path uses zero size
floors so viewport expansion retains the smaller dimensions. It runs in a layout
effect and ends active drag/resize gestures before their captured start bounds
can restore an oversized frame. Position-only dragging keeps its existing helper.

Initial sizing and manual resizing retain their preferred/minimum calculations,
but viewport height takes precedence over a minimum that cannot fit. Nonpositive
viewport measurements preserve bounds, including an initially hidden container.
The frame uses `box-sizing: border-box`, so its one-pixel borders are included in
the assigned size.

Production changes are limited to `useModalWindowFrame.ts`, `modalSize.ts` and
`modal.css` under `packages/react/src/modal`. The part adds adjacent
`Modal.viewport.test.tsx` and this receipt. No public API, dependency, budget,
sample data, unrelated dialog, or drag-position formula changes.

## Regression cases

Suite: `Modal viewport ownership`.

1. `fits initial viewport dimensions below the preferred and minimum size`
2. `fits initial contained dimensions below the preferred and minimum size`
3. `shrinks the viewport frame from 1120 to 430 without replacing focused form state`
4. `fits a shrinking contained host and retains the smaller size after expansion`
5. `fits restored maximized bounds to the current contained host`
6. `fits a default-maximized frame when it first restores into a small viewport`
7. `ignores zero-size viewport observations and recovers on a positive size`
8. `ignores zero-size contained observations and recovers on a positive size`
9. `recovers preferred dimensions when a contained host initially measures zero`
10. `ends a captured drag on viewport shrink and allows later position-only dragging`
11. `ends a captured resize on host shrink and permits later manual resizing`

With the fixture's stylesheet loading corrected, all 11 new cases failed against
the unchanged source before repair. Failures included retaining 1120px after a
430px resize, retaining a 200px height in 140px space, and retaining zero width
after an initially hidden host became visible. After repair, the new cases and
existing Modal, drag-position and sizing regressions passed: 4 files / 27 tests.
The existing manual resize case at x=500 with width=400 still yields width=300
inside an 800px viewport.

## Validation

The part reused its independent pnpm installation. The admission introduces no
lockfile or package-manifest changes relative to that installed baseline.

| Command                                                                                                                                                                                                                                               | Result                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `pnpm exec vitest run packages/react/src/modal`                                                                                                                                                                                                       | PASS; 4 files / 27 tests |
| `pnpm --filter @workbench-kit/react typecheck`                                                                                                                                                                                                        | PASS                     |
| `pnpm exec eslint packages/react/src/modal/useModalWindowFrame.ts packages/react/src/modal/modalSize.ts packages/react/src/modal/Modal.viewport.test.tsx`                                                                                             | PASS                     |
| `pnpm exec prettier packages/react/src/modal/useModalWindowFrame.ts packages/react/src/modal/modalSize.ts packages/react/src/modal/Modal.viewport.test.tsx packages/react/src/modal/modal.css docs/northstar/parts/modal-viewport-receipt.md --check` | PASS                     |
| `pnpm check:workspace-isolation`                                                                                                                                                                                                                      | PASS                     |
| `pnpm check:commit-safety`                                                                                                                                                                                                                            | PASS                     |
| `git diff --cached --check`                                                                                                                                                                                                                           | PASS                     |

The containing commit is the part's review candidate. The integrator records its
exact SHA, independent review and integrated validation results separately.

## Limits

Tests render the real React Modal and verify its inline bounds, loaded CSS
box-sizing, DOM/form identity, input value, selection and focus. JSDOM does not
perform visual layout: window/client dimensions and ResizeObserver delivery are
controlled, and pointer events are synthetic. Actual border-box geometry, Close
access and long-label presentation require the integrator's real browser and
Storybook checks. Full fast and the unchanged packed gzip budget remain
integration gates; this part does not claim them, performance qualification,
Electron/cross-browser qualification, publication or consumer adoption.
