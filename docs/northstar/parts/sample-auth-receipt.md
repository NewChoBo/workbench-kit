# Sample auth — injected backend and request ownership

Status: `LOCAL_VALIDATED / SOURCE_REVIEW_REQUIRED / INTEGRATION_PENDING`.
Admission branch point: `d4e23a3fbaea392426b1d165c5054efb03ba691b`.
Part branch: `codex/part-sample-auth-20260919`.
Scope: [sample backend verification](../sample-backend-verification.md).

## Implemented boundary

An optional `backendClient?: SampleHostBackendClient | undefined` travels through
`createSampleHost`, `App` and `SampleAuthShell` to `useSampleAuth`. Omitting it
retains the existing sample client factory and workspace query. An injected
client does not construct the default client or take ownership of its storage.

The hook tracks one mounted generation and a revision for that generation's
requests. Cleanup invalidates results; it never disposes the caller-owned client
or claims to cancel its transport. StrictMode bootstrap results from a cleaned-up
generation are ignored. Client replacement displays loading without retaining
the prior profile, linked accounts, busy state or error, including the first
render before effect cleanup.

A ref lock excludes repeated synchronous sign-in/sign-out requests across both
mutation kinds. Starting a mutation invalidates bootstrap results. Rejection
clears busy and publishes an error; an authenticated session is retained. If
bootstrap has not completed, failed sign-in becomes unauthenticated instead of
remaining in loading. Sign-out clears the local session only after success.
Every request rejection is handled, including results arriving after cleanup.

The sample's existing `profileExtraContent` composes an `Updating sample
session...` status and error alert with the permission-role controls. Login
progress/error presentation remains in the existing login view. No public
Profile property or sign-out button behavior changes.

Only these six part-owned files change:

- `examples/workbench-sample/src/useSampleAuth.ts`
- `examples/workbench-sample/src/useSampleAuth.test.tsx`
- `examples/workbench-sample/src/SampleAuthShell.tsx`
- `examples/workbench-sample/src/App.tsx`
- `examples/workbench-sample/src/createSampleHost.tsx`
- `docs/northstar/parts/sample-auth-receipt.md`

## Required cases

Suite: `sample auth request ownership`.

1. `retains the default factory and workspace query when no client is supplied`
2. `uses the injected client without constructing a default or retaining signed-out data`
3. `handles bootstrap failure and clears its error for a successful sign-in retry`
4. `deduplicates synchronous sign-in and sign-out calls across both mutation kinds`
5. `ignores stale bootstrap success while a sign-in is pending`
6. `ignores stale bootstrap failure after successful sign-in`
7. `failed sign-in supersedes bootstrap and exits loading with a retryable error`
8. `preserves an authenticated session when a later sign-in fails`
9. `retains profile and accounts on failed sign-out then clears them only after retry succeeds`
10. `StrictMode ignores cleaned-up bootstrap results without disposing the caller client`
11. `client replacement resets visible state and ignores old mutation failure and callbacks`
12. `old bootstrap and successful mutation cannot overwrite a replacement client session`
13. `ignores bootstrap rejection after unmount without disposing the client`
14. `ignores sign-in rejection after unmount without disposing the client`
15. `ignores sign-out rejection after unmount without disposing the client`

## Validation

The tests were written and run before the implementation: 11 failed, 4 passed,
with two unhandled sign-out rejections. The same suite then passed all 15 cases
without unhandled errors. Deferred clients control response ordering without
network access or elapsed-time waits; React's real renderer and StrictMode run
under JSDOM. The default factory is mocked so tests do not access auth storage.

| Command                                                                                                                                                                                                                                                                                                                 | Result                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                                                                                                                                                                                                                                                        | PASS; independent install and prerequisite builds |
| `pnpm exec vitest run examples/workbench-sample/src/useSampleAuth.test.tsx`                                                                                                                                                                                                                                             | PASS; 1 file / 15 tests                           |
| `pnpm --filter workbench-sample typecheck`                                                                                                                                                                                                                                                                              | PASS                                              |
| `pnpm exec eslint examples/workbench-sample/src/useSampleAuth.ts examples/workbench-sample/src/useSampleAuth.test.tsx examples/workbench-sample/src/SampleAuthShell.tsx examples/workbench-sample/src/App.tsx examples/workbench-sample/src/createSampleHost.tsx`                                                       | PASS                                              |
| `pnpm exec prettier examples/workbench-sample/src/useSampleAuth.ts examples/workbench-sample/src/useSampleAuth.test.tsx examples/workbench-sample/src/SampleAuthShell.tsx examples/workbench-sample/src/App.tsx examples/workbench-sample/src/createSampleHost.tsx docs/northstar/parts/sample-auth-receipt.md --check` | PASS                                              |
| `pnpm check:workspace-isolation`                                                                                                                                                                                                                                                                                        | PASS                                              |
| `pnpm check:commit-safety`                                                                                                                                                                                                                                                                                              | PASS                                              |
| `git diff --cached --check`                                                                                                                                                                                                                                                                                             | PASS                                              |

The containing commit is the part's review candidate. Its exact SHA, independent
review and integration gates are recorded by the integration owner.

## Limits

These tests establish hook state and request ownership, not real HTTP parsing,
server-side cancellation, complete schema validation, production authentication
or browser presentation. The integration owner separately provides the real HTTP
client's fake transport, scenario controls, Storybook/browser evidence and full
fast gate. Package APIs, dependencies, normal sample entry and persisted host
preferences remain outside this part. This receipt does not claim publication,
consumer adoption, cross-browser, Electron or performance qualification.
