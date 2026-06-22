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

## Removed Compatibility Paths

The previous `*.widget.json` document route and legacy `@workbench-kit/jdw/schemas/*.json` schema names have been removed. Use `*.jdw.json` for widget documents and `*.jdw.schema.json` for schemas.
