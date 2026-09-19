# WB-ST-020 — Sample Explorer context stories

Admission: `430a657ed18f8ab85475471533026e30edd101a2`,
[`explorer-context-ux.md`](../explorer-context-ux.md).

The story-only part adds
`examples/workbench-sample/src/ExplorerContext.stories.tsx`. It uses the actual
`SampleBackendLab` / sample App assembly, authenticated `one-account` backend
fixture, built-in Explorer, menu builder, controller and workspace commands.
Each story resets sample storage before rendering. No replacement Explorer,
workspace service, command callback or persistence owner is installed.

All three stories carry `storybook-play-required`, `storybook-play-sample` and
`storybook-play-explorer-context`:

| Story ID                                             | Browser assertions to run after integration                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workbench-sample-explorer-context--target-parity`   | Right-click, More and Shift+F10 use the same file target/actions; Escape restores the exact invoker; no file opens; folder context entries do not implicitly expand a collapsed folder; menus remain in the viewport.                                                                                                                                                              |
| `workbench-sample-explorer-context--rename-retry`    | Rename cancellation preserves the source path; an invalid simple name retains the same inline draft for retry; its native context menu does not submit/cancel; a valid long multilingual name renames the exact file; opening it produces the original exact Monaco model content; the other file retains its own content; the renamed More label and menu geometry remain usable. |
| `workbench-sample-explorer-context--multi-selection` | All three entry routes retain a selected pair and show multi-file commands without Rename; an unselected target resets to one file without opening; after Escape and ArrowDown, DOM focus and F2 agree on the next visible row.                                                                                                                                                    |

Content comparison reads the real editor model via the existing public
`@workbench-kit/monaco` export and public workspace URI formatter. It compares
against `initialWorkspace` fixture bytes, not partial rendered text. This checks
the in-memory sample workspace-to-editor path; it makes no disk durability claim.

Local preparation checks:

- `pnpm install --frozen-lockfile` — PASS.
- `pnpm --filter workbench-sample typecheck` — PASS.
- `pnpm exec eslint examples/workbench-sample/src/ExplorerContext.stories.tsx` — PASS.
- Focused `pnpm exec prettier --check` — PASS.
- `pnpm check:commit-safety` and `git diff --check` — PASS.

Browser plays were deliberately not executed by this part. The admission base
does not yet contain the normalized Explorer callback or shell adoption; the
integrator owns RED/GREEN browser execution, screenshots, registry and full gates.
These are authored regressions, not a browser PASS or release receipt.
