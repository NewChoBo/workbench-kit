# Sample backend scenarios and screen verification

Admission: `READY_FOR_IMPLEMENTATION`, 2026-09-19, source `7fbc6cfc`.
Owner: sample-host integration and PG00 verification. This is a bounded sample
auth/account packet, not a new universal backend or a public authentication service.

## Contract and ownership

Use the existing SampleHostBackendClient/routes/DTOs and the real
createHttpSampleHostBackendClient with an explicitly injected fetch implementation.
Never patch global fetch or bypass the HTTP client's parsing/error translation.
Existing in-memory defaults and published package APIs remain compatible.

The scenario fixture owns isolated session data, named response policies and
manually released pending requests. No random data, wall-clock waits, credentials
in diagnostics, browser storage, real network fallback or external service is
needed. Fresh factories/reset restore deterministic data. Returned payloads must
not alias seed data. Unknown routes/methods fail visibly; disposal rejects pending
requests before any state mutation. Faults cannot silently return success.

Provide signed-out, slow session, slow sign-in, sign-in retry, sign-out retry,
expired session, invalid response, zero/one/many linked-account scenarios. Long
Unicode labels and unbroken identifiers exercise layout. Failures occur at the
transport/response boundary. A retry succeeds through the same client and UI.
The existing parser checks only part of the DTO; malformed-response evidence
covers its declared checks, not complete schema validation or real-server parity.

The sample hook accepts an optional backendClient, threaded through
createSampleHost/App/SampleAuthShell. Default callers retain the existing client.
Each mounted client generation owns its results; replacement/unmount invalidates
late results. Only one sign-in/sign-out mutation may run at a time, including two
synchronous calls before React rerenders. A user mutation supersedes pending
session bootstrap. Sign-out clears the session only on success; failure retains
the profile/accounts, clears busy and displays an error. All promise rejections
are handled. This does not cancel an HTTP operation or prove a server side effect
was canceled. Existing login error display and profileExtraContent status/alert
slots show progress/failure without a new public Profile API.
StrictMode may repeat bootstrap without disposing the caller-owned client; results
from the cleaned-up generation are ignored. Client replacement starts loading and
clears previous profile/accounts/error/busy. Failed sign-in after superseding a
pending bootstrap returns to unauthenticated/error with busy false, never stuck
loading. A failed sign-in from an already authenticated state preserves that
session; no UI path needs to request it, but the controller must stay coherent.

## Screen and verification

A sample-only scenario screen and Storybook reuse createSampleHost and real Kit
controls. Scenario controls select/reset a fixture and release held responses;
they are outside the app under test and do not replace its renderer or state.
A dev-only URL entry must not change the ordinary sample route. Scenario switches
remount the host and dispose the previous backend. Default persisted host settings
are not cleared. Fake session data never overwrites existing sample auth storage.

Tests verify real HTTP request paths/methods/body, state isolation, response
snapshots, failure/retry, malformed/expired responses and disposal. Hook tests use
deferred clients for overlapping bootstrap/mutations, duplicate submissions,
replacement/unmount and failed sign-out. Browser checks operate the actual login,
profile and linked-account UI through loading, empty, populated, failure/retry and
reset; inspect screenshots at ordinary and narrow widths. Storybook play cases
carry required/sample tags. Run sample typecheck, lint/format, focused tests,
full fast and commit-safety. Record fake/browser evidence separately from actual
backend, cross-browser, Electron, performance and release qualification.

Implementation parts have disjoint ownership after this admission is committed:
the hook part owns useSampleAuth.ts, its test, SampleAuthShell.tsx, App.tsx,
createSampleHost.tsx and its part receipt. The integrator owns scenario backend,
fixtures/stories, dev entry, registry and this receipt. Future capability packets
reuse the scenario principles and their own real ports instead of importing an
auth-specific fake into unrelated domains.
