# @workbench-kit/json-widget

Framework-neutral primitives for JSON-based widget layout composition.

## Scope (Phase 1)

- `parseWidgetJson` / `formatWidgetJson` — safe JSON parsing with structured errors
- `WidgetRegistry` — type-indexed registry implementing `WidgetRegistryContract` from `@workbench-kit/contracts`
- Re-exports of registry contract types for consumers that compose JSON layouts without a UI framework

React renderers, editors, and domain-specific widget shapes stay in product repos for now.

## Storybook

From the monorepo root:

```bash
pnpm storybook
```

Open **JsonWidget/Playground** for parse/format, custom registry binding, and invalid JSON handling demos. See `docs/workbench/json-widget-mvp.md` for validation commands.

## Reference implementation

See `@tilepaper/json-widget-tree` in the TilePaper monorepo for a full widget type system, layout math, and built-in widget definitions wired to this boundary.

## Usage

```ts
import {
  createWidgetRegistry,
  parseWidgetJson,
  type WidgetDefinition,
  type WidgetTypeShape,
} from '@workbench-kit/json-widget';

interface TextWidget extends WidgetTypeShape {
  type: 'text';
  text: string;
}

const registry = createWidgetRegistry<string, TextWidget>([
  { type: 'text', build: 'render-text', displayName: 'Text' },
]);

const { value, parseError } = parseWidgetJson<TextWidget>('{"type":"text","text":"Hi"}');
if (parseError) throw new Error(parseError);

registry.get(value!.type); // 'render-text'
```
