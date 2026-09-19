# WB-ST-022 implementation receipt

Admission: `READY_FOR_IMPLEMENTATION` from the logic stabilization plan. This
part keeps editor storage eligibility local to one read of one adapter/key.

`readPersistedEditorStateResult` now adds `writeEligible`. Missing storage,
current v1 storage, and legacy storage are writable. Unsupported envelopes,
malformed values, invalid recognized workspace identities, and storage read
failures are read-only and retain the existing `decode_failed` / `read_failed`
diagnostic. The legacy `readPersistedEditorState` parser remains permissive for
compatibility, including legacy URI migration.

`WorkbenchProvider` carries eligibility from the resolved storage identity into
its editor event subscription. Rejected storage is therefore preserved across
open, split, and close events. Changing the adapter or key recomputes the result;
there is no module-level eligibility state. An explicit `initialEditorState`
continues to be host-authoritative and intentionally permits persistence.

Focused coverage includes missing, valid, future, malformed and invalid-URI
values plus an actual provider event sequence. The integrator owns combined
validation, required-case registration, and release decisions.

## Evidence

| Check                                                                                                                         | Result                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RED reproduction                                                                                                              | The supplied audit reproduced the pre-fix overwrite: `future-v2` returned no diagnostic/write guard and the first editor event replaced the original bytes. |
| `pnpm exec vitest run packages/shell-react/src/editor/state-storage.test.ts packages/shell-react/src/shell/provider.test.tsx` | GREEN; previous baseline 57 tests, follow-up adds strict layout, throwing-read, adapter/key switch, close, diagnostic, and initial-state cases.             |
| `pnpm --filter @workbench-kit/shell-react typecheck`                                                                          | GREEN                                                                                                                                                       |
| `pnpm typecheck:shell-react-exact-optional`                                                                                   | GREEN                                                                                                                                                       |
| `pnpm check:workspace-isolation`                                                                                              | GREEN                                                                                                                                                       |
| Targeted `pnpm exec eslint ...`                                                                                               | GREEN                                                                                                                                                       |
| `pnpm run format:check`                                                                                                       | GREEN                                                                                                                                                       |
| `pnpm check:commit-safety`                                                                                                    | GREEN; public-reference and secret scans passed                                                                                                             |

The focused provider tests observe `decode_failed`, verify actual close of an
opened tab, recompute eligibility after adapter/key changes, and cover the
documented explicit `initialEditorState` bypass. This receipt records local
implementation evidence only; integrated validation and release status remain
with the integrator.
