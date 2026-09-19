# Modal viewport repair

Admission: `READY_FOR_IMPLEMENTATION`, 2026-09-19.
Baseline: `14f66f41` on `codex/stabilization-units-20260919`.
Owner: existing React Modal frame; bounded compatibility repair, no new public API.

## Reproduction and contract

The sample backend lab's many-account Settings dialog was opened at 1280x720,
then the browser viewport shrank to 430x900. Its inline width stayed 1120px;
the rendered border box was 1122px and Close was beyond the right edge.
The frame currently clamps only its position on container resize.

For a positive-size overlay viewport, initial opening, viewport shrink and
restore from maximized must fit the frame's border box inside that viewport.
Viewport limits take priority over preferred/minimum dimensions when they cannot
fit. Retain the smaller size on later viewport expansion; no stored size policy
or automatic enlargement is introduced. Ignore transient zero-size observations
rather than permanently collapsing a visible frame. Existing valid dragging and
manual resizing retain their contracts. Preserve the same mounted dialog, form
values and focus when its host changes size. Borders must be included in bounds.

## Scope and verification

Limit implementation to existing Modal position/size/frame helpers and modal CSS,
plus focused tests and a receipt. Keep position-only drag logic intact; do not
change unrelated dialogs, account cards or sample fixture data. No new package,
dependency, token, public export or renderer framework migration.

Reproduce the geometry defect before repair. Test viewport and contained-host
shrink, smaller-than-minimum viewport, restored maximized bounds, transient zero
size and unchanged form/focus ownership using the real React frame. Check the
actual sample Settings screen at desktop and 430px, including Close access and
long labels. Run focused Modal regressions, typecheck, lint/format and full fast
after integration. Existing packed-size budgets stay unchanged; do not loosen a
budget to hide a regression. Independent review precedes local integration.

An implementation part owns Modal source/tests and its part receipt; integration
owns the sample browser check, this receipt, registry and plan. Actual browser
evidence is distinct from JSDOM geometry and from Electron/cross-browser release
qualification.
