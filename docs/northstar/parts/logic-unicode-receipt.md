# WB-ST-023 — Workspace Unicode validity

Status: `LOCAL_VALIDATED / SOURCE_REVIEW_REQUIRED / INTEGRATION_PENDING`.
Part branch: `codex/luna-unicode-20260919`.

## Implementation and ownership

`packages/workspace/src/path/path.ts` remains the shared owner for workspace path
and simple-name validity. It now rejects unpaired UTF-16 high or low surrogates
before path normalization can mutate separators or before URI formatting can call
`encodeURIComponent`. `normalizeWorkspacePath` throws `WorkspacePathError`,
`tryNormalizeWorkspacePath` returns `undefined`, and `isSimpleWorkspaceName`
returns `false` for ill-formed Unicode. A valid surrogate pair, including emoji,
continues through the existing normalization and URI round trip unchanged.

No consumer command or new dependency was added. Existing reducer and host paths
already pass create, rename, save, move, and initialization values through the
shared helpers. Invalid reducer mutations remain unchanged; initialization
filters invalid entries before they can enter state.

## Regression cases

The focused tests cover:

1. Lone high and low surrogates at the start, middle, and end of a path.
2. Valid emoji surrogate pairs plus Korean, Japanese, spaces, literal percent,
   and reserved filename characters through the existing path and URI behavior.
3. URI formatting throwing `WorkspacePathError` and URI parsing rejecting invalid
   UTF-8 surrogate encodings.
4. Invalid rename preserving files, snapshot version, and transaction journal.
5. Invalid initial files/folders being excluded without partially accepting an
   ill-formed path, while valid Unicode state remains available.

Before implementation, the shared path helper accepted `bad` followed by a lone
high surrogate and a subsequent URI encoding operation raised `URIError`. After
the change, the path gate rejects the value consistently before mutation or URI
encoding.

## Validation

| Command                                                                                                                                                                                                                                                          | Result                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `pnpm exec vitest run packages/workspace/src/path/path.test.ts packages/workspace/src/resource/uri.test.ts packages/workspace/src/resource/transaction.test.ts packages/workspace/src/host/workbench-workspace-host.test.ts`                                     | PASS; 4 files / 28 tests |
| `pnpm --filter @workbench-kit/workspace typecheck`                                                                                                                                                                                                               | PASS                     |
| `pnpm exec eslint packages/workspace/src/path/path.ts packages/workspace/src/path/path.test.ts packages/workspace/src/resource/uri.test.ts packages/workspace/src/host/workbench-workspace-host.test.ts`                                                         | PASS                     |
| `pnpm exec prettier packages/workspace/src/path/path.ts packages/workspace/src/path/path.test.ts packages/workspace/src/resource/uri.test.ts packages/workspace/src/host/workbench-workspace-host.test.ts docs/northstar/parts/logic-unicode-receipt.md --check` | PASS                     |
| `pnpm check:workspace-isolation`                                                                                                                                                                                                                                 | PASS                     |
| `pnpm check:commit-safety`                                                                                                                                                                                                                                       | PASS                     |

This receipt records part-local evidence only. Independent source review, the
integrator's combined gates, release, and consumer adoption remain separate.
