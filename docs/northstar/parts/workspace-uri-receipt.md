# WB-ST-020B — Workspace resource URI identity

Status: `LOCAL_VALIDATED / SOURCE_REVIEW_REQUIRED / INTEGRATION_PENDING`.
Admission branch point: `80b952a51f2241f2caaeea02cffaf1c5db935007`.
Part branch: `codex/part-explorer-uri-20260919`.
Scope: [Explorer resource identity repair](../explorer-resource-uri-repair.md).

## Implementation and ownership

`packages/workspace/src/resource/uri.ts` remains the single workspace URI codec.
The formatter normalizes the workspace path, then encodes each segment while
retaining structural `/` separators. The parser rejects encoded forward/backward
separators, decodes the pathname exactly once, then applies existing workspace
path normalization. Malformed escapes and invalid UTF-8 return `null` through the
existing parser failure path. Literal `%2F` is encoded as `%252F` and remains
filename data after one decode. Ordinary ASCII paths, raw Unicode/space URI
inputs, and the existing file/folder helpers keep their public APIs.

The builtin editor's `src/resource-uri.ts` delegates to this parser. Shell editor
resource lookup, active workspace paths, file availability, and React JSON
diagnostics also use the workspace owner. The extension SDK declares resource
strings and host ports without another parser. Generic contracts retain their
string identity semantics. No adapter, dependency, export or package changes are
needed for the canonical codec repair.

## Regression cases

Suite `workspace resource URI identity`:

1. `preserves ordinary ASCII file and folder URIs and the root folder`
2. `encodes multilingual segments and resolves canonical and raw Unicode paths`
3. `preserves spaces in canonical and raw paths without treating plus as space`
4. `keeps literal percent sequences distinct from decoded names and structural separators`
5. `round-trips query fragment and reserved filename characters as path data`
6. `rejects malformed escapes and invalid UTF-8 instead of returning an aliased path`
7. `rejects encoded forward and backward separators without rewriting path structure`
8. `retains normalization and rejection of unsupported schemes kinds and empty files`

New cases in suite `workbench workspace host port`:

1. `resolves and saves the renamed multilingual file without changing another file`
2. `keeps reserved and literal percent filenames separate during lookup and save`
3. `does not resolve create or save resources with invalid encoded paths`

Before production changes, 9 cases failed and 5 passed across the new URI suite
and extended host suite. The real host returned no resource after multilingual
rename, resolved a reserved-character name to another file, and accepted invalid
encoded save paths. After repair, the focused lane passes 4 files / 21 tests,
including existing resource transaction and builtin editor delegation tests.
Host assertions check original content, the exact saved path and save mutation,
unchanged neighboring files, absence of duplicate files, and no transaction for
invalid inputs. Existing write metadata and rename ordering are preserved.

## Validation

The independent worktree reuses its own frozen pnpm installation. Dependency
manifests and the lockfile match the installed baseline; no external installation
links or source-copy dependencies were introduced.

| Command                                                                                                                                                                                                                                                         | Result                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `pnpm exec vitest run packages/workspace/src/resource/uri.test.ts packages/workspace/src/host/workbench-workspace-host.test.ts packages/workspace/src/resource/transaction.test.ts packages/shell-react/src/extensions/builtin/editor/src/resource-uri.test.ts` | PASS; 4 files / 21 tests |
| `pnpm --filter @workbench-kit/workspace typecheck`                                                                                                                                                                                                              | PASS                     |
| `pnpm exec eslint packages/workspace/src/resource/uri.ts packages/workspace/src/resource/uri.test.ts packages/workspace/src/host/workbench-workspace-host.test.ts`                                                                                              | PASS                     |
| `pnpm exec prettier packages/workspace/src/resource/uri.ts packages/workspace/src/resource/uri.test.ts packages/workspace/src/host/workbench-workspace-host.test.ts docs/northstar/parts/workspace-uri-receipt.md --check`                                      | PASS                     |
| `pnpm check:workspace-isolation`                                                                                                                                                                                                                                | PASS                     |
| `pnpm check:commit-safety`                                                                                                                                                                                                                                      | PASS                     |
| `git diff --cached --check`                                                                                                                                                                                                                                     | PASS                     |

The containing commit is the exact part candidate. Independent review, combined
checks and real Monaco RenameRetry content verification belong to integration.

## Compatibility dependency and limits

Previously persisted editor state has no URI encoding marker. An old literal
`%41.txt` resource string would now mean `A.txt` if decoded as a new-format URI.
Canonical round-trip tests cannot establish safe restoration of that state.
Integration must migrate legacy editor resources using their former parser
semantics and record the new encoding before this repair is considered complete.
That storage migration is separately owned; this part does not change persistence.

The native URL parser's existing dot-segment normalization and query/fragment
handling are unchanged. Historical raw `?`/`#` strings do not become a lossless
filename serialization; new callers should use the shared formatter. The tests
exercise actual virtual workspace transactions and host ports, not disk storage,
Electron or a browser editor. Packed consumption, browser behavior, full fast
validation, publication and consumer adoption are not claimed by this receipt.
