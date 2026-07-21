# Public Reference Policy

Workbench Kit is a public open-source library. Tracked documentation, agent
guides, and Cursor rules must not name or link to commercial, proprietary, or
internal sibling projects.

## Allowed

- Open-source references (for example VS Code, Theia, Monaco, ComfyUI as a
  design metaphor)
- Generic terms: consumer app, integrating host, reference implementation,
  product shell, private monorepo
- This repository name (`NewChoBo/workbench-kit`) and published `@workbench-kit/*`
  packages

## Forbidden in public docs

- Internal or sibling repository names and clone paths
- Proprietary product codenames and customer-specific identifiers
- Paths into private monorepos (`../other-repo/docs/...`)
- Commit-message or workflow contrasts that name a specific consumer repo

When migration notes need a source, describe the **capability** (widget-tree
editor, launchpad preview bridge, content-hub navigation) without naming the
host product.

## Agent and contributor defaults

- Write commit messages in English (see [language-policy.md](./language-policy.md)).
- Keep Storybook and README examples product-neutral.
- If a doc still names a forbidden project, treat that as cleanup debt — replace
  with neutral language in the same edit when you touch the file.
