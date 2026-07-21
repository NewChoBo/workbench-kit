# Account and Authentication

Account and authentication are platform concerns exposed as service contracts in
`@workbench-kit/platform` and consumed by `shell-react` for UI entry points.
The current public boundary defines stable capability IDs and framework-neutral
interfaces; concrete providers are supplied by the host or later built-in
extension work.

## Services

### AccountService

Manages account records visible to the user: display name, avatar, provider id, session id (opaque reference). Emits change events when the active account switches.

Does **not** persist tokens in workspace config.

### AuthenticationService

Orchestrates sign-in, sign-out, and session refresh flows via registered `AuthProvider` implementations. Returns `AuthSession` handles without exposing raw tokens to extensions unless permitted.

### SecretStorageService

Encrypted or OS-backed secret storage for tokens and API keys. Keys are namespaced by extension id and purpose. Extensions access secrets only with declared `permissions`.

## Capability IDs

`@workbench-kit/platform` exports capability IDs so extensions and hosts do not
share raw string literals:

| Constant                          | Value               | Provider contract               |
| --------------------------------- | ------------------- | ------------------------------- |
| `WORKBENCH_AUTH_CAPABILITY_ID`    | `workbench.auth`    | `WorkbenchAuthProvider`         |
| `WORKBENCH_SECRETS_CAPABILITY_ID` | `workbench.secrets` | `WorkbenchSecretStorageService` |

`extensions/builtin.accounts` declares `capabilities.requires:
["workbench.auth"]` and contributes the account command/menu/config entry point.
It does not own token storage.

## AuthProvider

Pluggable provider contract:

- `id` — stable provider identifier (e.g. `github`, `custom-oauth`)
- `signIn(scopes?)` — interactive or silent sign-in
- `signOut(session)` — revoke local session
- `getSessions()` — list active sessions (metadata only)
- `getAccessToken(session, scopes?)` — internal; not written to `.workbench`

Built-in `extensions/builtin.accounts` contributes the account UI/command entry
point. Provider registration remains host-owned until the capability registry is
promoted from a host option to a first-class workbench-core registry.

## AuthSession

Opaque session object:

- `id`, `accountId`, `providerId`, `scopes`, `expiresAt` (optional)
- No serializable token fields in workspace files

## Permission Model

Extensions declare `permissions` in the manifest:

| Permission                       | Capability                       |
| -------------------------------- | -------------------------------- |
| `account.read`                   | Read active account metadata     |
| `secrets.read` / `secrets.write` | Access secret storage namespaces |
| `network`                        | Outbound HTTP (future)           |

Host enforces permissions at SDK boundaries.

## Account UI Entry Points

`shell-react` provides:

- Status bar account indicator
- Command palette sign-in/sign-out commands (from contributions)
- Account menu with session list and provider actions

UI shows account **metadata** only; tokens stay in `SecretStorageService`.

## Token Storage Policy

| Storage location          | Allowed content                                                   |
| ------------------------- | ----------------------------------------------------------------- |
| `.workbench/**`           | **Never** tokens, credentials, refresh tokens, API keys, cookies  |
| `SecretStorageService`    | Access/refresh tokens, API keys (encrypted)                       |
| Backend encrypted storage | Enterprise deployments, optional                                  |
| `sessions/` (gitignored)  | Opaque session cache only if host requires; prefer secret storage |

**Explicit rule: account tokens are not saved in `.workbench`.**

## Related Documents

- [Workbench Config](./workbench-config.md)
- [Security Boundary](./security-boundary.md)
- [Extension System](./extension-system.md)
