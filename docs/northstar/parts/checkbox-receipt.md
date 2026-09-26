# WB-ST-006A — current Checkbox adapter conformance

Status: `LOCAL_VALIDATED / INTEGRATION_PENDING`.
Common v1 base: `7ceb9ceb7089086660004c6dc4fa4c7a10c940f9`.
Part branch: `codex/part-checkbox-20260919`.

This part characterizes the existing React Checkbox against the frozen control
profile. It changes only `packages/react/src/primitives/checkbox/Checkbox.contract.test.tsx`
and this receipt. Production code, public props, exports, dependencies and common
contracts remain unchanged. The integration owner registers these cases centrally.

## Required case names

All seven cases use suite name `Checkbox adapter contract`:

1. `rerenders controlled checked values without emitting change callbacks`
2. `delivers clicks in native callback then boolean callback order with the same event`
3. `activates the associated input once when its label is clicked`
4. `preserves the input node focus and ref across checked and appearance updates`
5. `retains native form values disabled readOnly and uncontrolled reset semantics`
6. `retains native required validity as the checked state changes`
7. `clears refs and prevents detached or duplicate callbacks across remounts`

The form case distinguishes boolean checked state from submitted string values.
Unchecked and disabled controls are excluded from FormData; readOnly remains a
native checkbox property and does not prevent toggling. Reset restores default
checked state without emitting another edit callback. The cleanup case performs
three mount/remove cycles and attempts clicks on detached inputs after removal.

## Part validation

| Command                                                                                  | Result                                                     |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                         | PASS; independent workspace install and postinstall builds |
| `pnpm check:workspace-isolation`                                                         | PASS; node_modules links stay inside this worktree         |
| `pnpm exec vitest run packages/react/src/primitives/checkbox/Checkbox.contract.test.tsx` | PASS; 1 file / 7 tests                                     |
| `pnpm --filter @workbench-kit/react typecheck`                                           | PASS                                                       |
| `pnpm exec eslint packages/react/src/primitives/checkbox/Checkbox.contract.test.tsx`     | PASS                                                       |
| `pnpm format:check`                                                                      | PASS                                                       |
| `pnpm check:commit-safety`                                                               | PASS                                                       |
| `git diff --cached --check`                                                              | PASS                                                       |

The commit containing this receipt is the validated part candidate. Its exact
SHA and merge result belong in the integration receipt; no source was changed
after the focused test/typecheck checks.

## Evidence limits

These are React adapter fixtures in JSDOM, using native element click/reset/
validity behavior. They do not establish real-browser keyboard navigation, label
focus behavior, operating-system IME support or portable four-host completion.
The tests preserve edit callbacks; commit/Apply/Undo and durable save remain
consumer/editor policies. No performance improvement is claimed.

The combined required-unit and full-fast gates run after the part is merged by
the integration owner. This receipt does not claim develop integration, npm
publication or consumer adoption.
