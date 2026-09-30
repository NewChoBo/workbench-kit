# Compact catalog toolbar

`CatalogBrowsePane` accepts an optional `compactToolbar` boolean for bounded,
short catalog panes. It defaults to `false`; existing grid-based toolbar markup
and layout remain unchanged when the option is omitted.

The compact toolbar:

- wraps controls instead of shrinking the search field to zero;
- gives search a 140px flex basis and a 120px minimum width;
- groups view mode, trailing controls, and optional refresh into one action row;
- keeps facets and optional sort ahead of those actions;
- uses 4px vertical and 8px horizontal filter-bar padding.

Hosts still own facet labels, domain values, and filter state. In a short embedded
pane, pass a compact `Select` through `facetStrip` rather than a wide set of
always-visible facet chips. Use a stable `PanelHeader` above the catalog and keep
long explanatory content on demand through the existing modal primitives.

This option changes presentation only. Search callbacks, sort values, selection,
grid/list rendering, refresh/loading behavior, and infinite-scroll ownership stay
the same. No state is persisted by this option.

The available result height depends on the host's pane size, controls, and tokens.
Measure the consuming pane at its actual widths and fonts; wrapping is not a
promise that an arbitrary collection of controls fits every viewport.
