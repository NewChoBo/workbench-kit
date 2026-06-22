# Schema form field widgets (spike)

Workbench Kit maps `WorkbenchStructuredDataSchemaDocument` field definitions to form widgets in `WorkbenchStructuredDataSchemaPanel` / `WorkbenchStructuredDataSchemaFieldInput`.

## Schema keys

| Key                                      | Widget                               | Notes                                              |
| ---------------------------------------- | ------------------------------------ | -------------------------------------------------- |
| `format: "color"`                        | Color picker (`WorkbenchColorInput`) | Standard JSON Schema format hint                   |
| `x-workbench-color: true`                | Color picker                         | Workbench extension for consumers without `format` |
| `ui.control: "color"`                    | Color picker                         | Explicit control override                          |
| `enum`                                   | `<select>` or segmented control      | ≤4 values → segmented control; more → `<select>`   |
| `enumNames`                              | Labeled enum options                 | Parallel labels for `enum` values                  |
| `ui.enumLabels`                          | Labeled enum options                 | `string[]` or `Record<value, label>`               |
| `selectable: true` + `ui.options`        | `<select>`                           | `{ value, label?, disabled? }[]`                   |
| `oneOf` with `const` + `title`           | `<select>`                           | JSON Schema style discriminated options            |
| `ui.control: "radio"` / `"select"`       | Force segmented / select             | Overrides auto enum sizing                         |
| `type: "string"` (default)               | Text input                           | Existing behavior                                  |
| `type: "number"` / `"integer"`           | Number input                         | Honors `min`/`max`/`minimum`/`maximum`             |
| `type: "boolean"`                        | Checkbox                             | Existing behavior                                  |
| `type: "array"` + `items.type: "string"` | Text array                           | Existing behavior                                  |

## Validation (targeted rules)

Built-in panel validation runs on change and blur. External `fieldErrors` prop still merges in and uses danger styling.

| Key                       | Rule                        | UI                                           |
| ------------------------- | --------------------------- | -------------------------------------------- |
| `pattern`                 | Regex test on string values | Warning text, `aria-invalid`, warning border |
| `minimum` / `min`         | Number lower bound          | Warning text                                 |
| `maximum` / `max`         | Number upper bound          | Warning text                                 |
| `minLength` / `maxLength` | String length               | Warning text                                 |

Helpers: `validateWorkbenchStructuredDataSchemaFieldValue`, `buildWorkbenchStructuredDataSchemaSelectOptions`.

## Example field definitions

```json
{
  "accentColor": {
    "title": "Accent color",
    "type": "string",
    "format": "color",
    "default": "#3366ff"
  },
  "status": {
    "title": "Status",
    "type": "string",
    "enum": ["draft", "published"],
    "enumNames": ["Draft", "Published"]
  },
  "alignment": {
    "title": "Alignment",
    "type": "string",
    "oneOf": [
      { "const": "start", "title": "Start" },
      { "const": "center", "title": "Center" },
      { "const": "end", "title": "End" }
    ]
  },
  "code": {
    "title": "Code",
    "type": "string",
    "pattern": "^[A-Z]{3}$"
  }
}
```

## Surfaces

- `JsonConfigWorkbench` form pane
- `StructuredArtifactEditor` preview/form pane
- `WorkbenchStructuredDataSchemaPanelEmbed` / `Frame`

Generic JSON form in `shell-react` (`JsonObjectFormView`) is separate and not schema-driven.

## Testing with `example.jdw.json`

1. `pnpm --filter workbench-sample dev`
2. Open `example.jdw.json` in the sample workbench.
3. Switch to **Form** (or use split view) when a schema document is wired for the resource.
4. For schema panel behavior in isolation, use Storybook: `React/Workbench/Settings/Panel Primitives` → `StructuredDataSchemaPanel`.

To exercise new widgets locally, extend the resource schema `properties` with the keys above and reload the form pane.
