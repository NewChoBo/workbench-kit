# Storybook-only helpers

Files in this directory are used by Storybook stories and interaction tests only.
They are excluded from `@workbench-kit/react` npm publishes (`package.json#files`).

- `StorySidebarFrame`, `StoryWorkbenchShellFrame` — story layout shells
- `chatAssertions`, `chatFixtures` — chat play-test helpers and fixtures
- `activityBarStoryCases` — activity bar story descriptors

Do not import from production package entry points or host apps.
