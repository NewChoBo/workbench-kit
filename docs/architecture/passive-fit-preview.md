# Passive fit previews

`WorkbenchFitPreview` is a display adapter exported from `@workbench-kit/react`
and `@workbench-kit/react/layout`. Supply finite positive `contentWidth` and
`contentHeight`, children, and a sized host. Optional `label` exposes one image
summary; without it the preview is decorative. Supply `fallback` for content
that cannot be represented by the browser.

The wrapper owns centered uniform fit, a token-based inset, clipping, resize
measurement, and inert descendants. It never enlarges content, installs input
handlers, takes focus, scrolls, animates, or modifies logical content. The host
owns selection and actions. The consumer owns document parsing and the meaning
of the supplied extent, including origin and clipping policy. An overview is
not a claim about any separately assigned viewport or readable thumbnail text.

The stage remains mounted and hidden until both ResizeObserver content boxes
are positive and the untransformed stage agrees with its requested dimensions
within CSS layout rounding tolerance. These measurements do not depend on the
transform, avoiding a resize/fit feedback loop. A hidden host is pending.
Nonfinite sizes, browser-clamped huge dimensions and scale underflow produce
`data-fit-state="unrenderable"` and the inert fallback. The initial state is
`pending`; successful measurement produces `ready`. No arbitrary authored-size
limit is imposed. Environments without ResizeObserver remain pending.

Fit arithmetic reuses `computePreviewViewportFitScale` with padding and minimum
scale both zero. The optional fourth argument controls the minimum and must be
finite in [0, 1]. The default remains 0.05; existing three-argument calculations,
including their invalid-input behavior, and interactive viewport zoom defaults
are unchanged.
