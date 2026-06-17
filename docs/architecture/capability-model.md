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

| ID                        | Provider interface                                       | Default provider           |
| ------------------------- | -------------------------------------------------------- | -------------------------- |
| `workbench.commands`      | _(built into platform)_                                  | Host                       |
| `workbench.contextKeys`   | _(built into platform)_                                  | Host                       |
| `workbench.filesystem`    | `FileSystemProvider` (planned)                           | Host / `builtin.workspace` |
| `workbench.secrets`       | `WorkbenchSecretStorageService`                          | Host                       |
| `workbench.auth`          | `WorkbenchAuthProvider`                                  | Host / `builtin.accounts`  |
| `workbench.editor`        | `EditorResolver` (planned)                               | Host + optional `monaco`   |
| `workbench.configuration` | `ConfigurationService` (planned)                         | Host + `workbench-config`  |
| `workbench.views`         | `ViewHost` from `@workbench-kit/workbench-extension-sdk` | `workbench-react`          |

New capability IDs require an architecture doc update and SDK type export.

Auth and secret capability constants are exported from `@workbench-kit/platform`
as `WORKBENCH_AUTH_CAPABILITY_ID` and `WORKBENCH_SECRETS_CAPABILITY_ID`.

## CapabilityRegistry (`workbench-core`)

```text
register(provider) → Disposable
registerValue(id, value) → Disposable
get<T>(id): T | undefined
has(id): boolean
```

Resolution order:

1. Host-seeded providers (`ExtensionRegistry` `capabilities` option or shared `CapabilityRegistry`)
2. Providers registered during extension `activate()` via `context.capabilities.registerProvider`
3. Extension `capabilities.provides` is manifest metadata only today; runtime registration still uses `registerProvider`

`ExtensionRegistry.capabilityRegistry` is public so hosts can register built-in providers before extension activation.

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
