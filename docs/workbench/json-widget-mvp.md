# JSON Widget MVP

Status: **MVP complete** for framework-neutral parse/registry primitives.

## Scope

| Track | MVP deliverable | Status |
| --- | --- | --- |
| `@workbench-kit/json-widget` | dist build, unit tests, Storybook playground | Done |
| `@tilepaper/json-widget-tree` | delegates parse/registry to workbench-kit; keeps TilePaper widget types + layout locally | Done |
| `@workbench-kit/contracts` | provider action → launchpad mapping integration test | Done |

## Package surface

- `parseWidgetJson` / `formatWidgetJson` — safe JSON parsing with structured errors
- `WidgetRegistry` / `createWidgetRegistry` — type-indexed registry implementing `WidgetRegistryContract`
- Contract type re-exports from `@workbench-kit/contracts`

React renderers, editors, and domain-specific widget shapes remain in product repos.

## Storybook

From `newchobo-ui-package`:

```bash
pnpm storybook
```

Stories live under **JsonWidget/Playground**:

- **ParseAndRender** — edit JSON, format output, mock registry build handler
- **InvalidJsonHandling** — syntax, empty, and non-object root errors

Build verification:

```bash
pnpm build:storybook
```

## Tests

```bash
pnpm --filter @workbench-kit/json-widget test
pnpm test
pnpm check:launch-boundary
```

TilePaper parity:

```bash
pnpm --filter @tilepaper/json-widget-tree test
```

## Phase 3+ (not in MVP)

- Move built-in widget definitions and layout calculators into shared packages where product-neutral
- React renderer bridge in `@workbench-kit/react` or a dedicated binding package
- json-widget-editor chrome extraction to workbench-kit
- End-to-end Storybook play tests for json-widget stories
