# WB-ST-025 implementation receipt

Date: 2026-09-19  
Base: `a6ca87cf` (integrated WB024)  
Branch: `codex/luna-draft-protection-20260919`

WB-ST-025 protects dirty editor drafts while workspace resources change. The SDK
now exposes optional dirty-resource enumeration and save eligibility. Core reports
dirty resources from every editor group, retains dirty hosts and text across
missing/reappearing backing files, and refuses Save when the resource is absent.
The workspace host supplies the eligibility query. Builtin Explorer canonicalizes
workspace resource URIs before preflighting rename, delete, and move; folder
descendants and mixed batches are denied before a transaction. Shell command ports,
controller paths, and the Explorer panel surface synchronous and asynchronous
failures without changing selection; rename failures remain on the inline draft.

## Acceptance evidence

- Dirty file rename, folder rename/delete/move, and mixed clean/dirty delete/move
  preserve the workspace snapshot and journal.
- An actual `TextEditorHost` and `EditorService` fixture uses a dirty secondary-group tab while an unrelated main-group tab remains active for mutation denial, then explicitly activates the dirty tab to prove missing-resource Save returns its URI and `saved: false` before and after reconcile. It proves inactive dirty
  folder and file protection, save-first success, direct disappearance before and
  after reconcile, same-host draft retention, dirty-state retention, and
  reappearance without replacing the draft.
- URI parsing uses the shared workspace codec and exact folder boundaries, so
  `src/a` does not block `src/ab`.
- Right-click Delete rejection keeps the selected row and renders `role=alert`.

## Validation

- `pnpm exec vitest run packages/workbench-core/src/editor/service.test.ts packages/workbench-core/src/editor/save.test.ts packages/workspace/src/host/workbench-workspace-host.test.ts packages/shell-react/src/extensions/builtin/explorer/src/index.test.ts packages/shell-react/src/explorer/view.context.test.tsx packages/react/src/workbench/workspace/workspaceExplorerController.test.ts` — 6 files, 55 tests passed (core service/save,
  workspace host, builtin Explorer integration, Explorer view context, and
  controller helpers).
- `pnpm exec vitest run packages/shell-react/src/extensions/builtin/explorer/src/index.test.ts packages/shell-react/src/explorer/view.context.test.tsx` — 2 files, 12 tests passed after the evidence follow-up.\n- `pnpm typecheck:workbench` — passed.
- `pnpm typecheck:shell-react-exact-optional` — passed.
- `pnpm typecheck:react-exact-optional` — passed.
- `pnpm check:public-exports` — passed.
- `pnpm check:dependency-graph` — passed.
- `pnpm exec prettier --check` and targeted ESLint — passed.
- `pnpm check:workspace-isolation` and `pnpm check:commit-safety` — passed.

The combined sample-browser plays, verification registry, packed budget, and full
fast gate remain with the integrator. No generated assets, package versions,
dependencies, or unrelated packets were changed.
