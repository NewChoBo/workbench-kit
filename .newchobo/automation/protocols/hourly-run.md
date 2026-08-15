# Hourly run protocol

## 1. Bootstrap

1. Confirm the run is inside an isolated Git worktree and the original checkout
   is untouched.
2. Freeze the current branch HEAD as `controlSha` and `baseSha`.
3. Load every path declared by `.newchobo/automation/registry.json` from that
   exact commit. Missing files or mismatched versions return `BLOCKED`.
4. Check for an unfinished run or existing candidate for the same work-item key.
   If one exists, return `NO_ACTION`.

## 2. Discover and classify

Inspect recent repository delta, open local branches, relevant tests, and at most
two goal documents. Use external research only when a current primary source is
needed for the selected concern.

Classify the concern as generic mechanics, integrating-host policy, composition,
or not applicable. Only generic mechanics belong in this repository. A host
policy or composition finding returns a neutral handoff without implementation.

## 3. Select one item

Follow `selectionOrder` from the registry. The item must have a reproducible
problem, a bounded owner path, objective acceptance, and a non-interactive
verification lane. If any part is missing, return `HANDOFF_REQUIRED`.

## 4. Write with compare-and-swap discipline

Immediately before writing, recheck branch HEAD, relevant file hashes, and the
selected evidence. Stop on drift. Change only one concern and do not add a broad
public abstraction without a proven consumer contract.

## 5. Validate and review

Run the narrowest focused checks first, then the registry's required lane. Do not
launch Electron, Chromium, Storybook UI, or another desktop app. If interactive
coverage is required, preserve the candidate without claiming completion and
return `INTERACTIVE_VALIDATION_REQUIRED`.

Ask a separate read-only reviewer to inspect the exact candidate diff. Any P0/P1
finding blocks commit. A changed candidate SHA invalidates the review.

## 6. Commit or report

Create one English Conventional Commit only when required non-interactive checks
pass and independent review has no blocker. Never push it. With no eligible work,
leave the worktree unchanged and return `NO_ACTION`.
