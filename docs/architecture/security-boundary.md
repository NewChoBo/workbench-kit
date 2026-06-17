# Security Boundary

Public packages and built-in extensions form a **trust boundary**. This document defines what may appear in the repository, workspace config, and extension artifacts.

## Public Package Boundary

Packages intended for public npm release (`@workbench-kit/tokens`, `@workbench-kit/react`, and future workbench packages) must not contain:

- Product-specific server URLs for internal environments
- Customer names, private identifiers, or operational runbooks
- Credentials, API keys, OAuth client secrets, or sample tokens
- Employee or user personal data

Documentation and samples use neutral placeholders (`example.com`, `your-provider-id`).

## Secret Handling

| Layer        | Rule                                                    |
| ------------ | ------------------------------------------------------- |
| `.workbench` | No secrets; validated at load time                      |
| Git          | Never commit `.env`, keys, or `secrets.*`               |
| Runtime      | Tokens only via `SecretStorageService` or backend vault |
| Logs         | Redact authorization headers and tokens                 |

See [Account Auth](./account-auth.md) and [Workbench Config](./workbench-config.md).

## Extension Permission Model

Extensions declare `permissions` in the manifest. The host:

- Denies undisclosed privileged API calls
- Scopes secret storage keys by extension id
- Audits permission denials in development builds

Built-in extensions receive only permissions required for their feature.

## External Extension Execution Risks

Running arbitrary third-party extension code introduces:

- Supply-chain attacks via trojaned packages
- Unauthorized filesystem and network access
- Token exfiltration from secret storage if over-permissioned

### Mitigations (planned)

- **No runtime npm install initially** — extensions ship as pre-built bundles known at compile time
- **Build-time bundled artifacts** — CI produces signed or hashed extension packages
- **Integrity checks** — `extensions.lock.json` stores content hashes; host verifies before load
- **Permission allowlists** — default-deny for network and secrets
- **No eval / dynamic import from remote URLs**

External marketplace execution remains out of scope until these controls exist.

## Workspace Trust

Opening a workspace should not execute untrusted code without user consent (future UX). `.workbench/extensions.json` recommending an extension does not auto-download binaries.

## Reporting

Security issues in public packages should be reported through the repository's security policy (to be published on GitHub). Do not file public issues containing real secrets.

## Related Documents

- [Extension System](./extension-system.md)
- [Extension Dependencies](./extension-dependencies.md)
- [Account Auth](./account-auth.md)
