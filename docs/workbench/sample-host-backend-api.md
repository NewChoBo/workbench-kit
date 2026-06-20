# Sample Host Backend API

Reference contract for the Workbench Sample Host dummy backend. The sample host
uses this API today through an **in-browser adapter**; a real backend can
implement the same routes and JSON payloads later without changing the UI layer.

## Purpose

| Concern                                 | Owner                                                            |
| --------------------------------------- | ---------------------------------------------------------------- |
| HTTP route shapes, DTOs, error envelope | `@workbench-kit/contracts`                                       |
| OpenAPI document                        | `packages/contracts/openapi/sample-host-backend.v1.openapi.yaml` |
| In-browser reference implementation     | `examples/workbench-sample/src/dummy-backend/`                   |
| Sample UI wiring                        | `useSampleAuth.ts`, `SampleAuthShell.tsx`                        |

Platform auth services (`WorkbenchAuthProvider`, `SecretStorageService`) remain
the long-term architecture boundary — see
[Account and Authentication](../architecture/account-auth.md). This API is the
**sample host integration surface**, not a replacement for platform auth.

See also [API Reference](../guides/api-reference.md) for the OpenAPI index and contract entrypoints.

---

## How the dummy backend works today

```
SampleAuthShell
  └─ useSampleAuth()
       └─ createSampleHostBackendClient()
            ├─ transport=in-memory (default)
            │    └─ sessionStorage token + fixed profile/linked-account payloads
            └─ transport=http (optional)
                 └─ fetch() against /api/sample-host/v1/*
```

### Default mode: in-memory

- No separate server process
- Simulated latency (350–450 ms) to mimic network round-trips
- Session token stored in `sessionStorage` under `workbench-sample.auth.session`
- Demo credentials: `tester` / `tester`
- Fixed linked-account records (GitHub, npm)

### Optional mode: HTTP

Set in `examples/workbench-sample/.env`:

```env
VITE_SAMPLE_HOST_BACKEND_TRANSPORT=http
VITE_SAMPLE_HOST_BACKEND_BASE_URL=http://127.0.0.1:8787
```

The UI uses `createHttpSampleHostBackendClient()` with the same DTO parsing and
error handling as a real server.

---

## API summary

Base path: `/api/sample-host/v1`

| Method | Route            | Operation       | Success body                |
| ------ | ---------------- | --------------- | --------------------------- |
| `GET`  | `/auth/session`  | Restore session | `Session`                   |
| `POST` | `/auth/sign-in`  | Sign in         | `Session` (authenticated)   |
| `POST` | `/auth/sign-out` | Sign out        | `Session` (unauthenticated) |

Query parameter for session restore:

| Name             | Type   | Notes                                                   |
| ---------------- | ------ | ------------------------------------------------------- |
| `workspaceLabel` | string | Echoed into `profile.workspaceLabel` when authenticated |

### Sign-in request

```json
{
  "identifier": "tester",
  "password": "tester",
  "workspaceLabel": "Workbench Sample"
}
```

### Session response

Unauthenticated:

```json
{ "status": "unauthenticated" }
```

Authenticated:

```json
{
  "status": "authenticated",
  "profile": {
    "accountId": "tester",
    "displayName": "Tester",
    "email": "tester@workbench-sample.local",
    "providerLabel": "Sample Dummy Backend",
    "roleLabel": "Developer",
    "sessionLabel": "Dummy backend session active - fixed response without a running server",
    "statusLabel": "Active",
    "workspaceLabel": "Workbench Sample"
  },
  "linkedAccounts": [
    {
      "id": "github-project",
      "providerId": "github",
      "displayName": "GitHub Project Access",
      "providerLabel": "GitHub",
      "email": "project-bot@workbench-sample.local",
      "status": "signed-out"
    }
  ]
}
```

### Error envelope

```json
{
  "error": {
    "code": "invalid_credentials",
    "message": "Invalid username or password."
  }
}
```

| HTTP status | Code                  | When                        |
| ----------- | --------------------- | --------------------------- |
| 401         | `invalid_credentials` | Sign-in rejected            |
| 422         | `validation_error`    | Missing identifier/password |
| 500         | `unexpected_response` | Server failure              |

Client-side transport failures use code `network_error`.

---

## TypeScript contract

Import from `@workbench-kit/contracts`:

```typescript
import {
  SampleHostBackendRoutes,
  type SampleHostBackendClient,
  type SampleHostBackendSession,
  SampleHostBackendApiError,
  parseSampleHostBackendSession,
} from '@workbench-kit/contracts';
```

Sample host factory:

```typescript
import { createSampleHostBackendClient } from './dummy-backend/index.js';

const client = createSampleHostBackendClient();
await client.getSession({ workspaceLabel: 'Workbench Sample' });
```

---

## Implementing a real backend

1. Serve the three routes under `/api/sample-host/v1`
2. Return JSON matching the OpenAPI schema
3. Use the standard error envelope for failures
4. Issue an opaque session mechanism (cookie, bearer token, etc.) — **do not**
   store tokens in `.workbench/**` (see account-auth policy)
5. Point the sample host to HTTP mode via `VITE_SAMPLE_HOST_BACKEND_TRANSPORT=http`

Recommended mapping to platform services later:

| API field               | Platform concept                             |
| ----------------------- | -------------------------------------------- |
| `profile.accountId`     | `WorkbenchAccount.id`                        |
| `profile.providerLabel` | Auth provider label                          |
| `linkedAccounts[]`      | External provider sessions (metadata only)   |
| Session restore         | `AuthenticationService` + host session store |

---

## Files

| Path                                                              | Role                                    |
| ----------------------------------------------------------------- | --------------------------------------- |
| `packages/contracts/src/sample-host-backend-api.ts`               | DTOs, routes, client interface, parsers |
| `packages/contracts/openapi/sample-host-backend.v1.openapi.yaml`  | OpenAPI 3.1 spec                        |
| `examples/workbench-sample/src/dummy-backend/in-memory-client.ts` | Reference in-browser server             |
| `examples/workbench-sample/src/dummy-backend/http-client.ts`      | Fetch client for real backend           |
| `examples/workbench-sample/src/dummy-backend/index.ts`            | Transport factory                       |

---

## Verification

```powershell
pnpm --filter @workbench-kit/contracts build
pnpm --filter @workbench-kit/contracts typecheck

Set-Location packages/contracts
pnpm exec vitest run src/sample-host-backend-api.test.ts

pnpm --filter workbench-sample typecheck
```

Manual: run `pnpm workbench-sample`, sign in with `tester` / `tester`, confirm
profile + linked accounts in the shell.
