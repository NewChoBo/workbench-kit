# Hourly Project Stewardship Constitution

This directory is the versioned control plane for recurring Chat research and
bounded implementation. The scheduled heartbeat returns to its registered
conversation, reads `AGENTS.md` first, then loads every file declared by
`registry.json` from one frozen Git commit.

The scheduler is runtime truth for task status and cadence. The files here are
desired state and protocol; they must not claim that a task is active merely
because it is declared here.

## Invariants

- Freeze one base commit before analysis and do not change snapshots mid-run.
- Select at most one material work item per run.
- Recheck the branch head and selected evidence immediately before writing.
- Treat an active maintainer registration as standing authority only for the
  bounded Chat actions declared in `scheduled-task.json`. Create an isolated
  worktree before any file write.
- Use a separate read-only reviewer for any material candidate. A producer must
  not issue its own PASS.
- A source or candidate SHA change invalidates earlier review evidence.
- No eligible work is a successful `NO_ACTION`; do not create noise files,
  empty commits, duplicate issues, or repeated comments.
- After three consecutive failures for the same work-item key, stop retrying and
  return `COOLDOWN_REQUIRED` for human review.
- Never push, open or merge a pull request, write an issue or comment, tag,
  release, publish, or modify `main`/`develop` from this scheduled task.
- Never launch Electron, Chromium, a browser, or another desktop application.
  Hand off required interactive verification as `INTERACTIVE_VALIDATION_REQUIRED`.

## Run shape

```text
freeze -> discover -> classify -> select one -> implement -> validate
       -> independent review -> local commit or handoff -> report
```

Research and implementation are both material work. A run may update one small
research record or one code/docs concern, but it may not combine unrelated work.
Generic behavior, public compatibility, and package ownership take priority over
speculative features. Public text must stay consumer-neutral and free of private
repository or host identifiers.

Only a validation-passing candidate may be committed locally. Remote integration
and release remain explicit human actions.
