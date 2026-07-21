# JSON Config Workbench

Status: **MVP** — kit primitive for JSON-based settings and configuration screens.

## Purpose

`JsonConfigWorkbench` composes existing workbench-kit pieces into a reusable **JSON config editor** pattern:

| Region          | Component                            | Role                                       |
| --------------- | ------------------------------------ | ------------------------------------------ |
| Shell           | `Panel` + JSON config mode controls  | Code(JSON) / form / preview layout         |
| Left (code)     | `WorkspaceEditor`                    | Monaco JSON editing                        |
| Left (form)     | `WorkbenchStructuredDataSchemaPanel` | Schema-driven form editing                 |
| Right (preview) | `JdwPreview` or empty preview state  | Read-only live preview                     |
| Toolbar         | Save / Discard (optional)            | Controlled dirty state via `baselineValue` |

Host applications can adopt this without migrating full `json-widget-editor` chrome yet.

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
- `previewKind` — `'auto' | 'schema' | 'widget' | 'none'` (default `'auto'`; `schema` enables the form surface, not a read-only preview)
- `widgetRegistry` — optional registry for widget JSON preview
- `defaultMode` / `mode` — `'code' | 'form' | 'preview'`

### Preview resolution (`auto`)

1. If JSON parses as an object with a string `type` field → widget preview
2. Else → empty preview state

Schema-driven editing is handled by **Form** mode on the left editor pane. Code
and Form modes keep a right preview pane beside the active editor surface; Preview
mode focuses the read-only preview only.

## Storybook

From the monorepo root:

```bash
pnpm storybook
```

Stories under **JDW/Config/Workbench**:

- **SchemaSettings** — schema settings in Code(JSON) + preview layout
- **SchemaFormEditing** — baseline play test for form edit, dirty state, discard
- **WidgetPreview** — widget JSON with registry render and mode-switch baseline play
- **AutoPreview** — auto-detected widget document in focused preview mode

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

| Area                                                 | Status                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| `@workbench-kit/jdw` parse/registry                  | Done                                                                   |
| `@workbench-kit/react/jdw` `JdwPreview`              | Done                                                                   |
| `StructuredArtifactEditor` (workspace file + drafts) | Done — use when editing workspace files with `WorkspaceDraftsProvider` |
| `JsonConfigWorkbench` (controlled JSON config)       | **This MVP**                                                           |
| Reference `json-widget-editor` migration             | Deferred — keep local until consumers adopt kit primitive              |

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
