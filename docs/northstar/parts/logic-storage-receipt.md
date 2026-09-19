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
