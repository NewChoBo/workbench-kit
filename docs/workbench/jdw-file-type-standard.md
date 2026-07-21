# JDW File Type Standard

Status: active draft, 2026-06-16

This standard separates renderable JDW widget documents from JSON Schema documents so editor providers can resolve Code, Form, and Preview surfaces by path and MIME type.

## Canonical Extensions

| Kind                | Extension           | MIME                                            | Default editor behavior        |
| ------------------- | ------------------- | ----------------------------------------------- | ------------------------------ |
| JDW widget document | `*.jdw.json`        | `application/vnd.workbench-kit.jdw+json`        | Code + Form + JDW Preview      |
| JDW schema document | `*.jdw.schema.json` | `application/vnd.workbench-kit.jdw-schema+json` | Code + Form, no widget preview |
| Generic JSON        | `*.json`            | `application/json` or `application/schema+json` | Code + Form when JSON-like     |

## Directory Convention

```text
jdw/
  home.jdw.json
schemas/
  widget-document.v1.jdw.schema.json
  jdw-node.jdw.schema.json
```

New workbench samples and generated JDW documents should use `jdw/` for renderable widget documents and `schemas/` for schema documents.

## Schema References

Renderable `*.jdw.json` documents should pin their schema with the schema-specific extension:

```json
{
  "$schema": "../schemas/widget-document.v1.jdw.schema.json",
  "type": "column",
  "args": {}
}
```

Canonical package exports:

| Export                                                                | Purpose                         |
| --------------------------------------------------------------------- | ------------------------------- |
| `@workbench-kit/jdw/schemas/widget-document.v1.jdw.schema.json`       | Root JDW widget document schema |
| `@workbench-kit/jdw/schemas/jdw-node.jdw.schema.json`                 | Recursive JDW v7 node schema    |
| `@workbench-kit/jdw/schemas/widget-asset-manifest.v1.jdw.schema.json` | Widget asset manifest schema    |

Schema exports use the `*.jdw.schema.json` names only. New examples, generated files, and editor routing must use the canonical JDW schema paths.

## Canonical Authoring Model

A renderable `*.jdw.json` resource is the canonical source of truth for widget
authoring:

- `WidgetDocument.source` is the persisted JDW JSON resource.
- `WidgetDocument.root` is its parsed `GenericWidget` authoring projection.
- `WidgetPatch` is the edit protocol for changing that projection and writing
  the result back as JDW JSON.

Code, tree, form, inspector, and canvas views may share one `WidgetDocument`
session, but they must commit through the same `GenericWidget` and `WidgetPatch`
path. An editor surface must expose only one editable widget hierarchy or source
at a time. It must not keep Screen Spec and compiled JDW as independently
editable, bidirectionally synchronized documents.

Screen Spec is a template or scaffold input with a one-way compile boundary:

```text
Screen Spec template/scaffold -> compile -> JDW widget document -> author
```

After compilation, the JDW widget document is the authoring source of truth.
Edits to compiled JDW are not synchronized back into Screen Spec. Recompiling a
stale Screen Spec over an edited JDW resource risks replacing user changes, so a
host must treat compilation as explicit document creation or replacement rather
than a parallel live-edit mode.

Screen Spec metadata is outside runtime widget JSON:

- `title` and `description` are host resource metadata.
- `frameWidth` and `layout` constraints are preview metadata.
- only `root` compiles to the JDW runtime widget tree.

`WidgetTreeLab` is the active design/code UI for new JDW sample and product
entries. Screen Spec templates may seed that surface through
`compileScreenSpecToJson`, and their built-in blocks are available through
`createScreenSpecPaletteAssetCatalog`. `ScreenSpecWorkbench` and
`ScreenSpecEditor` remain compatibility-only deprecated APIs; their
`ScreenNodePath` to `WidgetPath` synchronization must stay inside that
compatibility editor.

## Removed Compatibility Paths

The previous `*.widget.json` document route and legacy `@workbench-kit/jdw/schemas/*.json` schema names have been removed. Use `*.jdw.json` for widget documents and `*.jdw.schema.json` for schemas.
