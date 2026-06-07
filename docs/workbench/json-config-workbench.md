# JSON Config Workbench

Status: **MVP** — kit primitive for JSON-based settings and configuration screens.

## Purpose

`JsonConfigWorkbench` composes existing workbench-kit pieces into a reusable **JSON config editor** pattern:

| Region          | Component                                                   | Role                                       |
| --------------- | ----------------------------------------------------------- | ------------------------------------------ |
| Shell           | `Panel` + `WorkbenchArtifactModeControls`                   | Code / preview / split layout              |
| Left (code)     | `WorkspaceEditor`                                           | Monaco JSON editing                        |
| Right (preview) | `WorkbenchStructuredDataSchemaPanel` or `JsonWidgetPreview` | Schema-driven form or widget live preview  |
| Toolbar         | Save / Discard (optional)                                   | Controlled dirty state via `baselineValue` |

Consumers (tile_paper, custom_launcher) can adopt this without migrating full `json-widget-editor` chrome yet.

## Package surface

```ts
import {
  JsonConfigWorkbench,
  resolveJsonConfigPreviewKind,
} from '@workbench-kit/react/json-config';
```

### Props (high level)

- `value` / `onChange` — controlled JSON document string
- `baselineValue` — compare for dirty indicator; pair with `onSave` / `onDiscard`
- `schema` — optional `WorkbenchStructuredDataSchemaDocument` for form preview
- `previewKind` — `'auto' | 'schema' | 'widget' | 'none'` (default `'auto'`)
- `widgetRegistry` — optional registry for widget JSON preview
- `defaultMode` / `mode` — `'code' | 'preview' | 'split'` (default `'split'`)

### Preview resolution (`auto`)

1. If `schema` is provided → structured form preview
2. Else if JSON parses as an object with a string `type` field → widget preview
3. Else → empty preview state

## Storybook

From `newchobo-ui-package`:

```bash
pnpm storybook
```

Stories under **JsonConfig/Workbench**:

- **SchemaSettings** — app settings schema + split editor
- **WidgetPreview** — widget JSON with registry render
- **AutoPreview** — auto-detected widget document
- **Interaction** — baseline play test (form edit, dirty, discard)

Play gate:

```bash
pnpm test:storybook-play
```

## Tests

```bash
pnpm --filter @workbench-kit/react test
pnpm typecheck
```

## Related work

| Area                                                   | Status                                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `@workbench-kit/json-widget` parse/registry            | Done                                                                   |
| `@workbench-kit/react/json-widget` `JsonWidgetPreview` | Done                                                                   |
| `StructuredArtifactEditor` (workspace file + drafts)   | Done — use when editing workspace files with `WorkspaceDraftsProvider` |
| `JsonConfigWorkbench` (controlled JSON config)         | **This MVP**                                                           |
| tile_paper `json-widget-editor` migration              | Deferred — keep local until consumers adopt kit primitive              |

## Consumer adoption sketch

```tsx
const [value, setValue] = useState(initialJson);
const [baseline, setBaseline] = useState(initialJson);

<JsonConfigWorkbench
  title="Launchpad settings"
  path="dashboard.launchpad.json"
  value={value}
  baselineValue={baseline}
  onChange={setValue}
  onSave={() => persist(value).then(() => setBaseline(value))}
  onDiscard={() => setValue(baseline)}
  previewKind="auto"
  widgetRegistry={myRegistry}
  schema={launchpadSettingsSchema}
/>;
```

For workspace-integrated editors that already use `WorkspaceDraftsProvider`, prefer `StructuredArtifactEditor` directly.
