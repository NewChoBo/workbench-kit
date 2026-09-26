# Modal viewport repair

Status: `LOCALLY_INTEGRATED / SOURCE_REVIEW_PASS / COMBINED_VALIDATION_PASS`.
Originally admitted as `READY_FOR_IMPLEMENTATION`, 2026-09-19.
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

## Local integration evidence

The independent Modal part is `f8210714760c409d1b1f1bda09e7418c4cdf6625`;
exact-candidate review passed and the integrator repeated its 27 Modal tests.
Only that five-file commit was cherry-picked as `6143dd86` after the main branch
received a separate documentation-only admission. Its
[part receipt](./parts/modal-viewport-receipt.md) records 11 failing regressions
before repair. Integration adds one-axis-zero observations to the existing cases
and registers those 11 required cases as `SP06.modal-viewport`.

The sample's sixth Storybook play, ViewportResize, reproduced the actual defect
before the fix: a 1122px dialog exceeded a 430px host. With the repair, all six
backend plays pass in Chromium. The new play resizes the real sample overlay
host, verifies the same dialog and search input/value, keeps footer Close inside
the host, retains the smaller size on expansion and closes through the real UI.

The separate WB-ST-017 change adds `overflow-wrap: anywhere` only to management
card details. Before this change, an unbroken account ID expanded the details
past the card body; the actual narrow screen now wraps the full value. Applying
the rule to the entire body was visually rejected because it also wrapped the
Active badge. The final rule leaves the header and badge policy untouched.
The play compares all 24 complete IDs before/after resizing and checks each
card for horizontal overflow. This CSS/play candidate received independent review.

Manual in-app-browser checks used a fresh page at 1280x720, then shrank the
open Settings dialog to 430x900: frame right=430, Close right=413, 24 cards with
zero overflowing cards, unchanged search value and focus. Maximize filled the
729px overlay height; Restore retained the fitted 430px width and search value.
Close removed the dialog. The temporary viewport override was reset afterward.
A final fresh tab after the package builds displayed the same actual Settings
screen with no warning/error console entries; earlier development HMR logs are
not used as final-page runtime evidence.

The packed consumer's initial gzip total is **253,019 / 253,064 bytes**, passing
the unchanged limit (the preceding source measured 253,011 bytes). It still has
one initial JavaScript chunk; no budget, dependency or export was added for these
repairs. This measured eight-byte increase is not a performance improvement claim.

Combined `pnpm validate:fast`: **PASS, 495 files / 3,020 tests** and **18 registered
units / 191 cases**, including static checks, external packed consumers and the
story-tag check across 24 files. The six actual
Chromium plays passed separately; the full release Storybook lane was not run.
The first combined attempt stopped at formatting of the changed management CSS;
after formatting, the complete fast gate passed. The containing commit records
the final integration, registry and browser evidence.
The final sample production build also passes and excludes dev-only fixture
markers from emitted JavaScript; its large-chunk advisory remains recorded in
the sample receipt.

Source, browser and release evidence remain separate; this receipt makes no
remote integration, publication, cross-browser or Electron claim.
