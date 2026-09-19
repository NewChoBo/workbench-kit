# Editor and Explorer logic stabilization

Date: 2026-09-19. Audited source: `a01df0d9`.
Admission: WB-ST-021 through WB-ST-025 are `READY_FOR_IMPLEMENTATION`, subject
to the sequencing below. This is a bounded repair plan, not release approval.

## Shared contracts and ownership

1. Workspace owns path validity and workspace URI encoding. Workbench core must
   not gain a dependency on workspace or shell-react. Shell composition supplies
   workspace-specific identity normalization to the generic editor service.
2. A workspace file has one canonical URI for ordinary open/lookup/save. Explicit
   split views remain supported; this packet does not redesign split documents.
   Non-workspace resource identifiers remain opaque and unchanged by default.
3. An editor host owns its live draft. A missing backing file must never silently
   discard a dirty host, clear its dirty flag, or turn Save into implicit recreate.
4. For this stabilization stage, Kit-owned rename/move/delete of a dirty resource
   is rejected before any mutation. The user saves first. Automatic dirty-buffer
   relocation, Save As and recovery dialogs are separate future work; do not fake
   relocation by saving the draft without the user's Save action.
5. Rejected persistence formats are read-only for that storage adapter/key.
   Reading never writes; an ordinary editor event cannot overwrite rejected data.
6. Edit attempt state must be explicit and independent of displayed error text.
   Repeated identical errors are real completed attempts, not an in-flight request.
7. Invalid names fail before workspace mutation. Do not replace invalid Unicode
   with replacement characters or change a caller's intended file identity.

## Delivery and concurrency

| Packet    | Ownership                               | Dependency                 | Dispatch          |
| --------- | --------------------------------------- | -------------------------- | ----------------- |
| WB-ST-021 | Inline rename attempt lifecycle         | This contract              | Wave 1 / worker A |
| WB-ST-022 | Editor storage read/write eligibility   | This contract              | Wave 1 / worker B |
| WB-ST-023 | Unicode path/name validity              | This contract              | Wave 1 / worker C |
| WB-ST-024 | Canonical editor resource identity      | Reviewed 022 and 023       | Wave 2            |
| WB-ST-025 | Dirty-resource mutation/save protection | Reviewed 024; 021 retained | Wave 3            |

Workers use separate branches/worktrees and independent pnpm installs. Do not
symlink node_modules to another worktree. Each worker owns only its packet's
allowlist and receipt. The integrator owns this plan, implementation-plan.md,
verification/units.json, sample stories and packed budgets. No worker changes
versions, lockfiles, dependency graphs, budgets, release configuration or other
packets. A newly required owner must be reported and admitted before editing it.

Before every commit, run `pnpm check:commit-safety` yourself. Use English
Conventional Commits and neutral public text. Return the exact commit, diff
allowlist, RED/GREEN evidence, commands, remaining limitations and clean status.
Do not push, merge into develop, publish, create PRs or modify consumer apps.
These actions are not necessary to complete the local repair.

## WB-ST-021: retry after repeated validation failure

### Reproduction and target

Rename a file to `bad/name`, press Enter twice, correct it to `valid.txt`, and
press Enter. Current code clears the visible error but never calls renameEntry.
The component commit latch resets only when the error string changes, while the
controller correctly finishes both identical rejected attempts.

Required state transition: editing -> submitting -> editing-with-error OR
completed. Error text is presentation, not an attempt identifier. Keep the draft
and typed value on failure. Enter followed by blur must still invoke one mutation.

### Allowed files and implementation instructions

- `packages/react/src/workbench/workspace/WorkspaceExplorer.tsx`
- `packages/react/src/workbench/workspace/useWorkspaceExplorerController.ts`
- Adjacent focused component/controller tests; new `WorkspaceExplorer.retry.test.tsx`
  is preferred for the integrated fixture.
- `docs/northstar/parts/logic-retry-receipt.md`

Read the existing inline-edit state interface, both commit guards and controller
reportInlineEditError before editing. Use a real component+controller fixture,
not only a mock onInlineEditCommit. Reproduce the failing sequence first. Make the
smallest explicit attempt/reset change that preserves standalone controlled
WorkspaceExplorer consumers. If an additive state field is needed, make it
optional and document its meaning; do not use a timer to guess completion or
reset the guard on every render. Do not replace the whole controller.

### Acceptance and validation

- One, two and three identical validation errors followed by valid input commit.
- Collision error can be retried without losing the draft.
- A deferred rename promise plus Enter/blur/repeated Enter calls the port once.
- Promise rejection permits retry; pending state cannot duplicate mutation.
- Cancelling/replacing a pending draft invalidates that attempt's completion:
  old success/error cannot clear or overwrite a newer draft or unlock its request.
- Escape cancels an idle draft without committing; native input context remains.
- Run focused tests with `pnpm exec vitest run` for the new fixture and the existing
  WorkspaceExplorer and workspaceExplorerController tests.
- Run `pnpm --filter @workbench-kit/react typecheck`,
  `pnpm typecheck:react-exact-optional`, targeted eslint/Prettier,
  `pnpm check:workspace-isolation`, then commit-safety.

## WB-ST-022: reject incompatible storage without overwriting it

### Reproduction and target

Seed valid editor state with `workspaceResourceUriEncoding: "future-v2"`.
WorkbenchProvider starts empty; opening another tab overwrites the original state
with v1. The parser returns undefined without a diagnostic or write guard.

Distinguish missing storage (writable), valid current/legacy storage (writable),
and failed/unsupported storage (not writable). Preserve the public legacy reader
return value. Extend the result reader with additive write eligibility metadata
and use it in the provider. No global flags or module-level storage caches.

### Allowed files and implementation instructions

- `packages/shell-react/src/editor/state-storage.ts` and adjacent tests.
- `packages/shell-react/src/shell/provider.tsx` and adjacent persistence tests.
- Shell exports only if required to expose an additive result type.
- `docs/northstar/parts/logic-storage-receipt.md`

Use keybinding persistence's write-eligibility handling as a local precedent.
Reuse existing persistence diagnostics (`decode_failed` / `read_failed`) without
including raw payloads. Unknown markers, invalid known workspace identities and
decode/read failures must not silently erase persisted tabs on the next event.
Do not mark partially rejected data writable merely because other tabs parsed.
An explicitly supplied initialEditorState keeps existing host-authoritative
semantics; test and document that deliberate bypass. Do not change the marker,
legacy URI migration or non-workspace resource semantics in this packet.

### Acceptance and validation

- Actual Provider + memory adapter: unknown version -> open/split/close events ->
  original stored bytes unchanged; diagnostic identifies decode failure.
- Malformed JSON, invalid recognized URI and throwing getItem remain unwritable.
- Missing key and valid v1 state still persist editor changes.
- Legacy percent-name migration survives save/read and writes the v1 marker.
- Eligibility does not leak when adapter/key changes or Provider remounts.
- Explicit initialEditorState behavior remains documented and covered.
- Run state-storage and provider focused tests, shell-react typecheck and
  `pnpm typecheck:shell-react-exact-optional`, targeted eslint/Prettier,
  workspace-isolation and commit-safety.

## WB-ST-023: reject ill-formed Unicode before mutation

### Reproduction and target

`bad\uD800.ts` passes name validation and rename commits, then workspace.open
throws URIError in encodeURIComponent. The same risk applies to a low surrogate,
initial/imported paths and folder names.

Workspace path/name validation is the shared owner. Reject unpaired UTF-16
surrogates before normalization/mutation; paired surrogate emoji remain valid.
normalizeWorkspacePath throws WorkspacePathError, tryNormalize returns undefined,
isSimpleWorkspaceName returns false. Do not add a new framework or dependency.

### Allowed files and implementation instructions

- `packages/workspace/src/path/path.ts` and adjacent tests.
- `packages/workspace/src/resource/uri.test.ts` and host/transaction tests.
- Builtin Explorer command tests only if needed for actual create/rename proof;
  production command code is not owned by this packet.
- `docs/northstar/parts/logic-unicode-receipt.md`

Audit create/rename/move/initialize paths to verify shared validation is reached.
Reject before mutation/journal/version change. If one path bypasses validation,
report its exact owner rather than patching shell consumers independently.

### Acceptance and validation

- Lone high/low surrogates at start/middle/end reject consistently.
- Emoji surrogate pairs, Korean/Japanese, spaces, literal percent and reserved
  characters retain their existing supported round trips.
- Rejected rename/create leaves original paths/content/snapshot version/journal.
- Initial/imported invalid entries are filtered by the existing initialization
  policy; valid entries remain available. No malformed path may enter the state.
  Do not change this compatibility policy into all-or-nothing initialization.
- Run workspace path, URI, transaction and host tests, workspace typecheck,
  targeted eslint/Prettier, workspace-isolation and commit-safety.

## WB-ST-024: one resource identity across open and lookup

### Reproduction and target

Open `workspace://file/src/A.txt` and `workspace://file/src/%41.txt` via the editor
service. Both resolve the same backing file but produce distinct draft hosts.
Saving the second stale buffer overwrites the first tab's saved changes.

Use an optional pure `normalizeResourceUri(uri: string): string` editor-service
option (default identity). Shell supplies workspace parse->format normalization;
opaque/non-workspace identifiers remain unchanged. No workbench-core->workspace
dependency. Normalize before ordinary open lookup, resolver/host creation and
stored new tab identity; findTabByResourceUri must use the same rule.

### Allowed files and implementation instructions

- `packages/workbench-core/src/editor/service.ts`, adjacent tests, helper under
  editor/ if needed; preserve existing exports and use an additive options field.
- Shell-owned workspace URI identity helper and focused tests, provider wiring.
- Initial editor-state normalization where necessary, plus state-storage tests.
- A public initialization error export for ambiguous dirty aliases, and actual
  provider restoration/rejection tests with unchanged persisted-byte assertions.
- `docs/northstar/parts/logic-identity-receipt.md`

Do not simply decode an entire URI string or lowercase case-sensitive paths.
Normalize only recognized workspace identities via the shared codec. Literal
`%41.txt` is encoded `%2541.txt` and must remain distinct from A.txt. Do not undo
the legacy migration. Existing explicit split views are intentional and must
remain; they are not ordinary duplicate opens.

Initial stored aliases require a deliberate rule: normalize restored URIs;
within one group coalesce alias forms of the same resource, keeping the active
tab when present, otherwise first occurrence, and repair activeTabId. Preserve
explicit equal-URI split groups. If conflicting dirty initial tabs would be
discarded, reject that state without persistence overwrite instead of choosing
one silently. No document text is stored by this format.

Evaluate the complete canonical-resource bucket, including interleaved repeated
raw forms. Coalesce aliases without reordering unrelated or unchanged duplicate
tabs; inspect every dirty member before dropping anything. Determine alias
buckets once so restored-tab normalization stays linear in the number of tabs.

### Acceptance and validation

- Canonical vs encoded-unreserved and raw-Unicode vs encoded-Unicode ordinary
  opens resolve one tab and one live host; repeated saves preserve latest edits.
- Literal-percent neighbor stays independent.
- Restored aliases do not recreate the duplicate-host hole; tab selection valid.
- Custom opaque URI behavior and intentional split groups unchanged.
- Use actual TextEditorHost + EditorService + saveActiveEditor + workspace host,
  not only string equality tests. Run core service/save, shell provider/storage,
  URI/host regressions, affected typechecks/exact-optional/lint/format/safety.

## WB-ST-025: dirty buffers survive backing-resource changes

### Bounded behavior decision

This packet protects drafts without inventing document retarget transactions.
Kit-owned rename/move/delete touching any dirty file is denied before mutation,
including folder descendants and any member of a multi-target request. A denial
explains that the affected editor must be saved first. Clean actions still work.

Expose an additive optional `getDirtyResourceUris(): readonly string[]` capability
on the SDK editor-service port, implemented by core from all groups. The builtin
Explorer performs the canonical path preflight immediately before its synchronous
transaction. Shell controller errors must surface through existing error flow;
do not swallow rejected delete/open promises or signal success for denied work.

For external/direct workspace mutation, reconciliation preserves a dirty cached
host and dirty flag while marking the backing resource missing. A reappearance
does not replace that draft. Clean missing hosts retain existing placeholder
behavior. Do not auto-save, auto-discard or erase buffer content.

Add optional `canSaveResource?(uri: string): boolean` to the save port; ordinary
Save checks it plus tab.resourceMissing before applying changes. The workspace
host reports false for absent files. This closes rename->Save before the React
effect runs, while preserving the existing direct applySave API's explicit
create behavior and compatibility with custom ports that omit the query.

### Allowed files

- Core editor service/save and tests; SDK capability declarations.
- Workspace host save-eligibility query and tests.
- Builtin Explorer commands + focused dirty-mutation tests.
- Shell editor reconcile tests, command Explorer port/error wiring as necessary.
- `useWorkspaceExplorerController.ts` after WB-ST-021 integration, and shell
  Explorer view/port tests for asynchronous failure reporting. Use the existing
  panel `toolbarStatus` slot for a concise English action error with `role="alert"`;
  no new notification framework or stylesheet is needed. Rename errors stay on
  the draft; delete/move errors must also be visible and must not change selection.
- `docs/northstar/parts/logic-draft-protection-receipt.md`

### Acceptance and validation

- Dirty rename/move/delete deny without file, journal, version or host change.
- Folder and mixed clean/dirty multi-selection deny the whole command.
- Save first -> same action succeeds; clean actions remain compatible.
- Direct external disappearance preserves exact host, text and dirty flag;
  Save returns false and does not recreate the old path, before/after reconcile.
- Reappearance preserves draft; unrelated files never block an action.
- No automatic Save/Discard; no unhandled rejection for denied UI commands.
- Actual service/host/command integration tests, affected package typechecks,
  SDK exports/dependency boundaries, exact-optional, lint/format and safety.

## Integrator completion gate

Review each exact part commit before selective integration. Reject implementations
that turn defect-witness assertions into acceptance tests: tests must fail on
the audited baseline and pass because the intended safe behavior now occurs.
Register exact required case names in verification/units.json after integration.

Extend real sample browser plays for repeated invalid rename and dirty mutation
denial/retry. Run all Explorer/context plays on the combined source; inspect the
actual screen for retained draft/error/focus and original file content. Keep fake
backend reset and editor storage isolation deterministic. Unit fixtures do not
prove disk persistence or Electron lifecycle behavior.

Run `pnpm validate:fast` and required focused browser plays at the combined tip.
Any bundle increase needs measured source review; workers never raise budgets.
Write a final receipt with source SHA, part SHAs, counts, screen evidence and
remaining constraints. A local green candidate is not develop integration,
publication, or consumer adoption.
