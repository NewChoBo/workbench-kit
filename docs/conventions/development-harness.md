# Development Harness

Choose the narrowest validation lane that covers the changed surface. Do not
report a validation as passed if it was not run. Include the executed commands
in the final report and in non-trivial commit bodies.

The repository is pnpm-first. Use `pnpm install` for dependency installation.
Root package scripts shell through `pnpm`, so `npm run <script>` delegates the
actual tool execution to pnpm. Do not use npm for dependency installation or
lockfile updates.

## Validation Lanes

| Changed surface                      | Minimum validation                             | Extended validation            |
| ------------------------------------ | ---------------------------------------------- | ------------------------------ |
| Workspace, package exports, lockfile | `pnpm validate`                                | Public-boundary search         |
| `packages/tokens` CSS variables      | `pnpm validate`                                | Storybook visual check         |
| `packages/react` primitives          | `pnpm --filter @workbench-kit/react typecheck` | `pnpm validate`, browser smoke |
| Storybook config or stories          | `pnpm build:storybook`                         | Browser smoke                  |
| Lint/format config                   | `pnpm lint && pnpm format:check`               | `pnpm validate`                |
| README and conventions               | Manual docs review                             | Public-boundary search         |

## UI Smoke

For UI changes, verify the result in a real browser whenever practical.

- Do the main components render?
- Do text, inputs, and buttons stay inside their parent containers?
- Do dialogs, menus, and form controls have accessible names?
- Do basic interactions such as click, check, select, and close work?
- Do Storybook fixtures avoid private product knowledge and internal sample data?

## Reporting

Use English for validation notes in commit bodies and release-facing reports.

```text
Validation: pnpm validate passed.
Validation: Browser smoke confirmed ActivityBar, SplitView, and ConfirmDialog rendering.
Validation: Public-boundary search passed.
```

If validation fails, classify it first as a product issue, test issue, or
environment issue.

## Parallel Work Validation

When multiple worktrees are active, split validation before and after merge.

- Run the minimum validation lane in each worktree.
- After merging into `main`, run `pnpm validate` again.
- If two branches touched the same component or CSS token, run browser smoke or
  Storybook build again after merge.
- Use different dev server ports per worktree to avoid mixing results.
