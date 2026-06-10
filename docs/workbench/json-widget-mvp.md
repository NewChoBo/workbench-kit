# JSON Widget MVP

Status: **MVP complete** for framework-neutral parse/registry primitives.

## Scope

| Track                         | MVP deliverable                                                                          | Status |
| ----------------------------- | ---------------------------------------------------------------------------------------- | ------ |
| `@workbench-kit/jdw`  | dist build, unit tests, JDW validation + Storybook fixtures                             | Done   |
| `@tilepaper/json-widget-tree` | delegates parse/registry to workbench-kit; keeps TilePaper widget types + layout locally | Done   |
| `@workbench-kit/contracts`    | provider action → launchpad mapping integration test                                     | Done   |

## Package surface

- `parseJsonWidgetData` / `formatJsonWidgetData` — JDW v7 parse/format with structured errors
- `WidgetRegistry` / `createWidgetRegistry` — type-indexed registry implementing `WidgetRegistryContract`
- Contract type re-exports from `@workbench-kit/contracts`

React renderers, editors, and domain-specific widget shapes remain in product repos.

## Storybook

From `newchobo-ui-package`:

```bash
pnpm storybook
```

Stories live under **JDW/Fixtures**, **JDW/Preview**, and **JDW/WidgetTree/Lab**.

Build verification:

```bash
pnpm build:storybook
```

Storybook play tests (baseline-tagged stories, including JsonWidget/Playground):

```bash
pnpm test:storybook-play
```

Required play gate (subset tagged `storybook-play-required`; json-widget stories are baseline-only):

```bash
pnpm test:storybook-play:required
pnpm validate:full
```

## Tests

```bash
pnpm --filter @workbench-kit/jdw test
pnpm test
pnpm check:launch-boundary
```

TilePaper parity:

```bash
pnpm --filter @tilepaper/json-widget-tree test
```

## Phase 3+ (not in MVP)

- **Foundation plan (active):** [widget-layout-schema-plan.md](./widget-layout-schema-plan.md) — JDW v7 wire format,
  React `@workbench-kit/react/jdw` renderer, asset `content` (plugin_components shape), layout engine before editor expansion.
- Move built-in widget definitions and layout calculators into shared packages where product-neutral
- React renderer bridge in `@workbench-kit/react/jdw` (`JdwPreview`) — **Done (Phase 3)**
- json-widget-editor chrome extraction to workbench-kit
- Promote json-widget play stories to `storybook-play-required` if CI gate expansion is approved

## Phase 3 (2026-06-07)

### `@workbench-kit/react/jdw`

- `JdwPreview` — parse widget JSON via `@workbench-kit/jdw`, optional registry mock render
- Storybook: **JDW/Preview** (`RegisteredWidget`, `ParseError`) with baseline play tests
- Unit tests: `packages/react/src/jdw/JdwPreview.test.tsx`

### `custom_launcher` launchpad bridge

- `packages/launchpad-source/src/launchpad-source-widget-bridge.ts`
  - `parseLaunchpadWidgetPreviewJson` / `validateLaunchpadWidgetPreviewJson`
  - `evaluateLaunchpadSourcePreviewStub` — launchpad source validation + optional embedded `payload.widget` preview scan
- Unit tests: `tests/unit/launchpad/source/launchpad-source-widget-bridge.test.ts`
