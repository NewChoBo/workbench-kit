# Extension Dependencies

Extension manifests describe npm-style dependencies, extension-to-extension relationships, capability contracts, permissions, and engine requirements. Resolution runs at workspace load / build time, not on every keystroke.

## Manifest Fields

### npm-style fields (extension `package.json`)

| Field                  | Purpose                                               |
| ---------------------- | ----------------------------------------------------- |
| `dependencies`         | Runtime npm packages required by the extension bundle |
| `peerDependencies`     | Packages the host must provide (e.g. `react`)         |
| `optionalDependencies` | Soft npm deps; absence does not fail install          |
| `devDependencies`      | Build/test only; not shipped in extension artifact    |

Extension bundles should minimize runtime `dependencies`; prefer SDK and host-provided services.

### Extension graph fields (`workbench.extension.json`)

| Field                           | Purpose                                               |
| ------------------------------- | ----------------------------------------------------- |
| `extensionDependencies`         | Hard deps on other extension IDs; must activate first |
| `extensionOptionalDependencies` | Soft extension deps; features degrade if missing      |
| `extensionPack`                 | Bundle of extension IDs installed/enabled together    |

### Capabilities

| Field                   | Purpose                                                  |
| ----------------------- | -------------------------------------------------------- |
| `capabilities.requires` | Capability IDs the host or other extensions must provide |
| `capabilities.provides` | Capability IDs this extension implements for dependents  |

Capabilities enable loose coupling (e.g. `filesystem-provider`, `auth-provider`) without direct package imports.

### Permissions

`permissions` lists sensitive APIs the extension may call (filesystem, network, secrets, account read). The host enforces permissions before invoking privileged SDK methods.

### Engines

| Field                  | Purpose                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `engines.workbench`    | Semver range of supported workbench host version           |
| `engines.extensionApi` | Semver range of `@workbench-kit/workbench-extension-sdk` API |

Mismatch fails manifest validation with a clear error.

## Resolution Algorithm (planned)

1. **Collect** all enabled extension manifests from built-ins, workspace config, and lockfile.
2. **Validate semver** for `engines.*` and dependency version ranges.
3. **Build directed graph** from `extensionDependencies`, `extensionPack`, and `capabilities.requires` → `provides` edges.
4. **Detect cycles**; fail with cycle path in error message.
5. **Topological sort** for activation order; optional deps skipped if absent.
6. **Apply lockfile** (`extensions.lock.json`) to pin exact versions and content hashes.

## Semver Validation

- Use semver ranges compatible with the npm semver subset.
- Pre-release extension versions (`1.0.0-beta.1`) require explicit range allowance.
- Workspace built-ins may use `0.0.0` with `workspace:` protocol internally.

## Lockfile Purpose

`.workbench/extensions.lock.json` records:

- Resolved extension IDs and exact versions
- Optional integrity hashes of bundled artifacts
- Resolution timestamp and solver version

Reproducible team workspaces depend on committing the lockfile; local-only extensions remain out of lockfile or in ignored local config.

## Failure Modes

| Condition                             | Behavior                         |
| ------------------------------------- | -------------------------------- |
| Missing hard extension dependency     | Fail load with diagnostic        |
| Missing optional extension dependency | Warn; disable dependent features |
| Engine mismatch                       | Fail load; suggest upgrade       |
| Cycle in graph                        | Fail load with cycle report      |
| Permission denied at runtime          | Command/view disabled; log once  |

## Related Documents

- [Extension System](./extension-system.md)
- [Workbench Config](./workbench-config.md)
- [Security Boundary](./security-boundary.md)
