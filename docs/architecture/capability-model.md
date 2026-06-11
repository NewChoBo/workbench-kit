# Capability Model

Extensions and the workbench host communicate through **contribution points** (declarative) and **capabilities** (runtime provider contracts). Capabilities avoid hard dependencies between extensions.

## Concepts

| Term              | Definition                                                       |
| ----------------- | ---------------------------------------------------------------- |
| **Capability ID** | Stable string such as `workbench.filesystem` or `workbench.auth` |
| **Provider**      | Implementation registered at runtime by host or extension        |
| **requires**      | Extension manifest declares needed capabilities                  |
| **provides**      | Extension manifest declares implemented capabilities             |

Manifest fields are defined in [Extension Dependencies](./extension-dependencies.md).

## Standard Capability IDs (initial set)

| ID                        | Provider interface (planned) | Default provider           |
| ------------------------- | ---------------------------- | -------------------------- |
| `workbench.commands`      | _(built into platform)_      | Host                       |
| `workbench.contextKeys`   | _(built into platform)_      | Host                       |
| `workbench.filesystem`    | `FileSystemProvider`         | Host / `builtin.workspace` |
| `workbench.secrets`       | `SecretStorageService`       | Host                       |
| `workbench.auth`          | `AuthProvider`               | `builtin.accounts`         |
| `workbench.editor`        | `EditorResolver`             | Host + optional `monaco`   |
| `workbench.configuration` | `ConfigurationService`       | Host + `workbench-config`  |
| `workbench.views`         | `ViewHost`                   | `workbench-react`          |

New capability IDs require an architecture doc update and SDK type export.

## CapabilityRegistry (planned in `workbench-core`)

```text
registerCapability(id, provider) → Disposable
getCapability<T>(id): T | undefined
hasCapability(id): boolean
```

Resolution order:

1. Host-built-in providers
2. Activated extensions with matching `capabilities.provides`
3. Optional extension dependencies that export shared providers

## Permission Link

Sensitive capabilities require manifest `permissions`:

| Capability             | Typical permission                    |
| ---------------------- | ------------------------------------- |
| `workbench.secrets`    | `secrets.read`, `secrets.write`       |
| `workbench.auth`       | `account.read`                        |
| `workbench.filesystem` | `filesystem.read`, `filesystem.write` |
| Network (future)       | `network`                             |

Host denies provider access when permission is missing.

## Extension-to-Extension Coupling

Prefer:

```json
"capabilities": {
  "requires": ["workbench.filesystem"]
}
```

Avoid:

- Extension A importing extension B package directly
- Extension A importing `workbench-react` internals

## Bulk Migration Impact

| Current code              | Capability target                            |
| ------------------------- | -------------------------------------------- |
| `adapters` workspace/repo | `workbench.filesystem` provider registration |
| `react/workbench/auth`    | `workbench.auth` via `builtin.accounts`      |
| Monaco usage in stories   | `workbench.editor` resolver                  |

## Related Documents

- [Extension Dependencies](./extension-dependencies.md)
- [Account Auth](./account-auth.md)
- [Contribution Contracts](./contribution-contracts.md)
