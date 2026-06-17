# @workbench-kit/jdw

Framework-neutral primitives for JSON-based widget layout composition.

## Scope (Phase 1)

- `parseJsonWidgetData` / `formatJsonWidgetData` — JDW v7 parse/format with structured errors
- `WidgetRegistry` — type-indexed registry implementing `WidgetRegistryContract` from `@workbench-kit/contracts`
- Widget asset packages — `manifest.json` + `content.json` (+ optional `schema.json`)
- Re-exports of registry contract types for consumers that compose JSON layouts without a UI framework

React renderers, editors, and domain-specific widget shapes stay in product repos for now.

## Storybook

From the monorepo root:

```bash
pnpm storybook
```

Open **JDW/Fixtures** and **JDW/Preview** under `@workbench-kit/react/jdw` for render and parse-error demos. See `docs/workbench/json-widget-mvp.md` for validation commands.

## Reference implementation

See `@tilepaper/json-widget-tree` in the TilePaper monorepo for a full widget type system, layout math, and built-in widget definitions wired to this boundary.

## Usage

```ts
import {
  createWidgetRegistry,
  parseJsonWidgetData,
  type WidgetDefinition,
  type WidgetTypeShape,
} from '@workbench-kit/jdw';

interface TextWidget extends WidgetTypeShape {
  type: 'text';
  text: string;
}

const registry = createWidgetRegistry<string, TextWidget>([
  { type: 'text', build: 'render-text', displayName: 'Text' },
]);

const { value, parseError } = parseJsonWidgetData('{"type":"text","args":{"text":"Hi"}}');
if (parseError) throw new Error(parseError);

registry.get(value!.type); // 'render-text'
```
