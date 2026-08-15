# Recursive Architecture Research Constitution

This directory is the versioned control plane for recurring Chat research,
architecture planning, and evidence-backed documentation. The scheduled
heartbeat returns to its registered conversation, reads `AGENTS.md` first, then
loads every file declared by `registry.json` from one frozen Git commit.

The scheduler is runtime truth for task status and cadence. The files here are
desired state and protocol; they must not claim that a task is active merely
because it is declared here.

## Invariants

- Freeze one base commit before analysis and do not change snapshots mid-run.
- Select at most one material research question per run.
- Recheck the branch head and selected evidence immediately before writing.
- Treat an active maintainer registration as standing authority only for the
  docs, planning, and analysis actions declared in `scheduled-task.json`. Use
  the dedicated branch and its isolated worktree for every file write.
- Use a separate read-only reviewer for any material candidate. A producer must
  not issue its own PASS.
- A source or candidate SHA change invalidates earlier review evidence.
- No eligible work is a successful `NO_ACTION`; do not create noise files,
  empty commits, duplicate issues, or repeated comments.
- After three consecutive failures for the same work-item key, stop retrying and
  return `COOLDOWN_REQUIRED` for human review.
- Never push, open or merge a pull request, write an issue or comment, tag,
  release, publish, or modify `main`/`develop` from this scheduled task.
- Never edit production source, packages, dependencies, lockfiles, workflows,
  CI/CD, or build and release configuration.
- Never launch Electron, Chromium, a browser, or another desktop application.
  Hand off required interactive verification as `INTERACTIVE_VALIDATION_REQUIRED`.

## Run shape

```text
freeze -> restore research graph -> select one lane -> gather evidence
       -> compare -> verdict -> update docs/index -> validate -> local commit
       -> generate the next research frontier -> report in Chat
```

Each run compares the current design with credible alternatives and may update
one research record plus directly related factual docs. It separates facts,
inferences, hypotheses, and recommendations; records current primary sources;
and classifies findings as maintain, learn, evolve, improve, retire, or not
applicable. Public text must stay consumer-neutral and free of private repository
or host identifiers.

Only a validation-passing documentation candidate may be committed locally on
the dedicated branch. Remote integration and release remain explicit human
actions.
