# @workbench-kit/jdw

Framework-neutral primitives for JSON-based widget layout composition.

## Scope (Phase 1)

- `parseJsonWidgetData` / `formatJsonWidgetData` — JDW v7 parse/format with structured errors
- `WidgetRegistry` — type-indexed registry implementing `WidgetRegistryContract` from `@workbench-kit/contracts`
- Widget asset packages — `manifest.json` + `content.json` (+ optional `schema.json`)
- Re-exports of registry contract types for consumers that compose JSON layouts without a UI framework

React renderers, editors, and domain-specific widget shapes stay in product repos for now.

## Authoring source of truth

For renderable `*.jdw.json` resources, `WidgetDocument` is the canonical
authoring model: its source is parsed to a `GenericWidget`, and user edits commit
as `WidgetPatch` operations before formatting back to JDW JSON. Code, tree,
form, inspector, and canvas views must share that document path instead of
maintaining parallel editable hierarchies.

Screen Spec is a template/scaffold input that compiles one way into a JDW widget
document. It is not a second authoring source of truth, and compiled JDW edits
are not synchronized back to it. `title` and `description` belong to host
resource metadata; `frameWidth` and `layout` constraints belong to preview
metadata. Only the Screen Spec `root` becomes JDW runtime widget JSON.

See
[`docs/workbench/jdw-file-type-standard.md`](../../docs/workbench/jdw-file-type-standard.md)
for the canonical file and editor policy.

## Storybook

From the monorepo root:

```bash
pnpm storybook
```

Open **JDW/Fixtures** and **JDW/Preview** under `@workbench-kit/react/jdw` for render and parse-error demos. See `docs/workbench/json-widget-mvp.md` for validation commands.

## Extending in consumer apps

Host applications can layer domain-specific widget types, layout math, and built-in
widget definitions on top of this boundary. Keep product-specific shapes and
renderers in the consumer repository.

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
