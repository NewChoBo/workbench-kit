# Hourly run protocol

## 1. Bootstrap

1. Confirm the heartbeat returned to the registered Chat conversation and that
   all writes target the dedicated `codex/automation-control-plane` worktree.
2. Freeze the dedicated branch HEAD as `controlSha` and record each repository
   integration HEAD as evidence without modifying it.
3. Load every path declared by `.newchobo/automation/registry.json` from that
   exact commit. Missing files or mismatched versions return `BLOCKED`.
4. Check for an unfinished run or existing candidate for the same research key.
   If one exists, return `NO_ACTION`.

## 2. Restore goals and choose a research lane

Inspect recent repository delta, active sessions, relevant tests, prior research,
and at most two goal documents. Follow `deep-research-cycle.md` and select one
queued question whose evidence or conclusion is most at risk.

Classify ownership as generic mechanics, integrating-host policy, composition,
or not applicable. Only document reusable-library conclusions here; keep host
policy or composition findings neutral and external.

## 3. Build evidence and compare

Prefer repository evidence, official documentation, standards, original papers,
vendor release notes, and official product material. Record freshness and the
claim each source supports. Compare the current architecture with at least one
credible alternative and separate fact from inference, hypothesis, and advice.

## 4. Write with compare-and-swap discipline

Immediately before writing, recheck the dedicated branch HEAD, relevant file
hashes, research index, and selected evidence. Stop on drift. Write only under
`docs/**` or `.newchobo/automation/research/**` and update one research lineage.

## 5. Validate and review

Validate changed-document formatting, source completeness, research-index
consistency, public references, secrets, and the control plane. Do not run CI/CD
or launch Electron, Chromium, Storybook UI, or another desktop app.

Ask a separate read-only reviewer to inspect the exact candidate diff. Any P0/P1
finding blocks commit. A changed candidate SHA invalidates the review.

## 6. Commit or report

Create one English Conventional Commit only when document checks pass and the
independent review has no blocker. Never push it. Update the research index with
the verdict and next non-duplicate questions. With no eligible work, leave the
worktree unchanged and return `NO_ACTION`.
