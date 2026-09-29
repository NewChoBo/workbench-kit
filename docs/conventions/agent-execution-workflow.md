# Agent execution workflow

This is the execution contract for user-authorized coordinated work. The lead
continuously assigns bounded tasks and owns design and final acceptance;
independent reviewers challenge the design and result. The lead assigns design,
implementation and review roles using the models selected for that session.
Keep architecture and packet status tool-neutral. This workflow does not invent
scheduled-task permission or expand IssueOps authority.

## Roles and sequence

| Role                  | Responsibility                                                                                                                                      | Boundary                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Lead                  | Continuously assign bounded tasks; audit source and branches; design API, state, ownership and acceptance; resolve findings; integrate and validate | Does not delegate unresolved architecture to an implementation worker                  |
| Design reviewer       | Read the exact packet and relevant source; test assumptions, failure cases, compatibility and file boundaries                                       | Read-only by default; report findings with evidence, not an alternative implementation |
| Implementation worker | Implement the frozen packet and its required tests with the session-assigned model                                                                  | No scope expansion, self-approved contract changes or release/readiness promotion      |
| Source reviewer       | Compare the resulting diff against the packet and unchanged consumer contracts                                                                      | Review the exact candidate independently of its producer                               |

The user-authorized lead may keep assigning work as it becomes ready; no separate
permission is implied for scheduled runs. Session model choices remain explicit
and must not be silently changed. A documentation-only task may be written
directly by the lead. For
source work, new APIs, schemas, product policy, `SOURCE_CLOSED` work, or unresolved
ownership require formal reviewed admission. Documentation or test maintenance,
or a clear bug fix that restores an existing contract, may use a closed short
packet: reproduction or invariant, exact base, allowed files, non-goals, and
minimum checks. Do not alter an existing packet state without its own authority.

## Before dispatch

1. Record repository, branch, HEAD, intended base SHA and dirty/staged files.
   Verify remote refs when integration or publication claims depend on them.
   Reuse a free checkout; preserve other work and use a separate checkout when
   isolation is needed.
2. Reconcile existing candidates with ancestry, patch equivalence and actual
   changed files. A different commit ID need not represent missing work, and
   patch equivalence does not prove behavioral completion. Never replay an old
   whole plan over newer source receipts.
3. Classify generic Kit mechanics, host policy and composition. Identify the
   existing state owner, public exports and package dependencies before proposing
   new abstractions. Keep private context out of public artifacts.
4. The lead closes the design, including failure, cancellation, lifecycle,
   persistence, accessibility and performance where relevant. Reconcile packet
   identifiers; one ID must not represent two contracts.
5. An independent reviewer returns findings and their evidence. The lead records
   dispositions and fixes blocking ambiguity before dispatch. Formal admission
   is required for the source work listed above. A short packet is sufficient
   only for the bounded maintenance and contract-restoration cases; it does not
   reopen `SOURCE_CLOSED`, clear a dependency gate, or renew an old READY label.

## Handoff template

The lead supplies a concrete packet or references a frozen section with all of:

```text
Unit and design revision:
Claim owner and task identifier:
Source branch and exact base SHA:
Frozen reviewed-source/diff fingerprint:
Read contracts and source dependencies:
Outcome, current behavior, invariant and counterexample:
Generic owner and host/composition boundary:
Public API / state / event flow / compatibility:
Failure, cancellation, lifecycle and persistence behavior:
Exclusive write set and one writer per file:
Shared-file editor/integration owner:
Process, artifact, port and browser-session owner:
Expected output paths and check inputs:
Non-goals and external dependencies:
Positive and negative acceptance cases:
Focused/combined/release validation route and reusable-evidence inputs:
Stop-and-return conditions, handback owner and release/handback condition:
Expected evidence and unresolved exclusions:
```

A working-diff fingerprint is sufficient for tasks explicitly limited to no
commit or design-only work; do not commit merely to create a handoff identifier.
For commit and merge authority, follow
[`git-workflow.md`](./git-workflow.md). The claim owner records the
exact base, frozen contract and candidate fingerprint, write set, read contracts,
named shared-file editor, process/artifact owner, output paths, ports or browser
session, check inputs and handback condition. The writer stops and returns to the
lead if the base, read contract or any ownership claim changes. Assign a single
bounded unit to each implementation worker. Independent worktrees can proceed
concurrently only when files and contracts are disjoint and outputs and processes
are isolated. Build, pack, install or format operations that replace shared
artifacts, and validation using those artifacts, are serialized per affected
checkout. New exports, shared registries, manifests, lockfiles and validation
policy need a named owner rather than concurrent edits.

## Implementation and acceptance

- The worker reads the local guide, checks the handed-off base, implements only
  allowed changes and runs required focused checks. A stale base, unexplained
  dirty file, new API decision or conflicting ownership returns to the lead.
- The worker reports changed files, actual commands/results, reproduced failure
  and regression evidence, runtime limitations and remaining work. Do not label
  an unrun check PASS or count a mock as actual integration.
- The lead freezes the candidate fingerprint for independent read-only source
  review. Findings bind to that exact diff; material edits invalidate affected
  conclusions and require focused re-review. The lead alone integrates accepted
  units sequentially and records which evidence is invalidated when combined
  inputs change. Preserve acceptance fixtures when resolving merge conflicts.
  Gate changes require explicit design and review; never remove a failing gate
  merely to report green.
- Use the harness's focused lane during development, then run the affected
  combined lane on the integration candidate before updating `develop`. Run the
  existing full release lane on the exact release tip.
  Reuse product evidence only when source, tests, dependencies, configuration and
  artifact inputs are identical. Public boundary changes require packed consumers;
  visible shell changes require the actual Sample route. Release still requires
  `pnpm validate`. Documentation-only follow-ups use touched-file formatting,
  link review and applicable public-reference checks, not a product suite.

Record design readiness, source review, local validation, local integration,
remote `develop`, publication and host adoption separately. A source-closed
design can be consolidated as documentation without opening source production.
Do not close an Issue because a branch was merged; verify its own acceptance and
ownership rules. Commit, merge, standalone-push, main-update, and release
authority is governed by [git workflow](./git-workflow.md).
