# Storybook-only helpers

Files in this directory are used by Storybook stories and interaction tests only.
They are excluded from `@workbench-kit/react` npm publishes (`package.json#files`).

- `StorySidebarFrame`, `StoryWorkbenchShellFrame` — story layout shells
- `chatStory` — chat play-test helpers and fixtures
- `shellStory` — shell layout play-test helpers (primary sidebar collapse)
- `activityBarStoryCases` — activity bar story descriptors

Do not import from production package entry points or host apps.

## Primary sidebar collapse (shell best practice)

When hiding the primary sidebar, keep `SplitView` mounted and drive visibility
through `primarySidebar.isVisible` on `WorkbenchShell` (or
`layoutService.setSideBarVisible` in `@workbench-kit/shell-react`). Do **not**
unmount the primary column or remove `SplitView` — that breaks resize state and
can leave the editor/secondary area at zero width.

`WorkbenchShell` applies `ui-workbench-split-view--primary-collapsed` while the
primary node stays in the tree; CSS hides the primary column and expands
`.ui-workbench-split-view__secondary` to the full split width.

Story coverage:

- `React/Workbench/Shell → Sidebar toggle` — isolated shell demo
- `Workbench Sample/Dev App → Sidebar toggle` — full host integration

Use `expectCollapsedPrimarySidebarShowsFullWidthSecondary` from `shellStory.ts`
in play functions to guard the collapse layout regression.
