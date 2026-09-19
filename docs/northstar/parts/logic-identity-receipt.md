# WB-ST-024 — Canonical editor resource identity

Status: `LOCAL_VALIDATED / SOURCE_REVIEW_REQUIRED / INTEGRATION_PENDING`.
Part branch: `codex/luna-identity-20260919`.

## Implementation and ownership

`EditorService` accepts an optional pure `normalizeResourceUri` callback and
defaults to identity. Core applies it before ordinary open lookup, resolver
selection, tab storage, host creation, `resolveEditorId`, and
`findTabByResourceUri`. Core has no dependency on the workspace package.

The shell owns workspace URI normalization. Its helper parses recognized
workspace resources and formats them through the shared workspace codec; opaque
and malformed identifiers are returned unchanged. This canonicalizes raw and
encoded Unicode and encoded-unreserved workspace paths while preserving literal
percent data such as `%2541.txt`.

Initial editor groups normalize through the same callback. Within a group, all
tabs that share a canonical URI are bucketed before coalescing, including
interleaved canonical and alias forms. The active member is retained when
present; otherwise the first member is retained. Separate groups remain
separate split views. Exact same-raw-URI members retain existing behavior. If an
alias bucket contains any dirty member, initialization throws
`EditorStateInitializationError` before the service can subscribe to persistence
or write a replacement state.

## RED/GREEN evidence

On the integrated base, the focused RED run was:

`pnpm exec vitest run packages/workbench-core/src/editor/service.test.ts -t "RED:"`

It failed 2 tests: encoded aliases produced 2 tabs instead of 1, and dirty
initial aliases were accepted instead of throwing. After implementation the
same scenarios pass as the canonical open and dirty-conflict tests.

The GREEN integration case uses the actual `TextEditorHost`, `EditorService`,
`saveActiveEditor`, and `createWorkbenchWorkspaceHostPort`: opening `A.txt` and
`%41.txt` returns one tab and one host, editing through that host, and saving
writes the latest content to the single backing workspace file.

## Regression cases

Focused tests cover canonical and encoded-unreserved aliases, raw and encoded
Unicode, literal percent neighbors, opaque/malformed identifiers, active alias
selection at first/middle/last positions, interleaved three-member buckets,
dirty members anywhere in a bucket, non-alias tab order, separate split groups,
repeated saves through one host, actual host/save behavior, provider wiring,
clean persisted alias restoration, mounted provider persistence effects, and
dirty initialization rejection before a persistence write.

## Validation

| Command                                                                                                                                                                                                                                                                                                                                                                                                 | Result                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `pnpm exec vitest run packages/workbench-core/src/editor/service.test.ts packages/workbench-core/src/editor/save.test.ts packages/shell-react/src/editor/resource.test.ts packages/shell-react/src/editor/resource-identity.test.ts packages/shell-react/src/shell/provider.identity.test.tsx packages/workspace/src/resource/uri.test.ts packages/workspace/src/host/workbench-workspace-host.test.ts` | PASS; 7 files / 50 tests |
| `pnpm --filter @workbench-kit/workbench-core typecheck`                                                                                                                                                                                                                                                                                                                                                 | PASS                     |
| `pnpm --filter @workbench-kit/shell-react typecheck`                                                                                                                                                                                                                                                                                                                                                    | PASS                     |
| `pnpm --filter @workbench-kit/shell-react typecheck:exact-optional`                                                                                                                                                                                                                                                                                                                                     | PASS                     |
| targeted ESLint for core service/state and shell resource/provider files                                                                                                                                                                                                                                                                                                                                | PASS                     |
| targeted Prettier for core service/state, shell resource/provider, tests, and receipt                                                                                                                                                                                                                                                                                                                   | PASS                     |
| `pnpm check:workspace-isolation`                                                                                                                                                                                                                                                                                                                                                                        | PASS                     |
| `pnpm check:commit-safety`                                                                                                                                                                                                                                                                                                                                                                              | PASS                     |

The integrator owns combined repository gates, browser/source budgets, release,
and consumer adoption.
