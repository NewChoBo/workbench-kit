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
| Runtime      | Tokens only via `WorkbenchSecretStorageService` (`createMemorySecretStorage` reference) or host/Electron vault |
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

### Mitigations

- **No runtime npm install initially** — extensions ship as pre-built bundles known at compile time
- **Catalog URL allowlist** — `assertExtensionCatalogUrlAllowed` / `ExtensionCatalogTrustPolicy`
  (default: relative catalogs only; absolute origins require host allowlist).
- **Install approval gate** — `applyExtensionInstallPlanToRecords` refuses
  `requiresApproval && !approved`
- **Extensions lock integrity** — `verifyWorkbenchExtensionsAgainstLock` checks
  `.workbench/extensions.lock.json` version + manifest digest before registration
  (`extensionIntegrityMode`: `off` | `warn` | `fail-closed`)
- **Build-time bundled artifacts** — `bundle-workbench-extensions.mjs` regenerates the lockfile
- **Recommend ≠ enable** — recommendations must not auto-activate extensions
- **Permission allowlists** — default-deny for network and secrets (planned)
- **No eval / dynamic import from remote URLs**

External marketplace execution remains out of scope until these controls exist.

## Expression transforms (Field Remap)

Host-registered `expr:jsonata` evaluations are **bounded** by default in
`@workbench-kit/shell-react` (`timeoutMs`, `maxExpressionLength`, fail-closed
`onError: 'throw'`). `convertToShape` accepts an optional `AbortSignal` so stale
async previews cancel between edges/steps. Residual risk: JSONata is not a full
VM sandbox — hosts should keep timeout budgets tight for untrusted expressions.

## Workspace Trust

Opening a workspace should not execute untrusted code without user consent (future UX). `.workbench/extensions.json` recommending an extension does not auto-download binaries.

## Sample host CSP

`examples/workbench-sample` applies a documented Content-Security-Policy baseline
(`csp-policy.ts`) via Vite response headers and an injected HTML meta tag. See
the sample README for allowed exceptions (Monaco workers, Vite HMR, loopback
dummy backend).

## Electron host checklist

When composing `@workbench-kit/electron-shell` (or a host-owned Electron shell):

- Prefer `contextIsolation: true`, `nodeIntegration: false`, and a typed preload
  bridge (see maturity tracker #138)
- Do not enable privileged protocol CORS unless the host opts in explicitly
- Serve renderer assets under a CSP at least as tight as the sample baseline;
  drop `'unsafe-eval'` when Monaco workers are fully isolated
- Keep secrets in the encrypted vault / `SecretStorage` path — never in
  `localStorage` / `sessionStorage`
- Open external URLs only through an allowlisted opener helper

## Reporting

Security issues in public packages should be reported through the repository's security policy (to be published on GitHub). Do not file public issues containing real secrets.

## Related Documents

- [Extension System](./extension-system.md)
- [Extension Dependencies](./extension-dependencies.md)
- [Account Auth](./account-auth.md)
