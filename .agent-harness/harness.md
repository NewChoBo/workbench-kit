# Shared Harness Consumer Entrypoint

Status: canary / review-required

Workbench Kit may consume an externally supplied, exact reviewed Harness snapshot as a shared governance/coordination base while keeping public package, release, IssueOps, validation, and repository policy local.

This public repository must not persist private upstream repository names, clone paths, private issue identifiers, credentials, or private operational evidence. The authorized execution context is responsible for supplying the exact reviewed Harness source identity when Harness-governed work is requested.

## Upstream base contract

For material Harness-governed work, the execution context must provide an exact reviewed upstream source/ref/snapshot that the session can actually read.

Load only the required upstream resources, beginning with the Harness North Star, catalog, current role, and only the protocols/checklists required for the current stage. When executable Harness tooling is unavailable, use the upstream zero-runtime operation contract.

If the exact upstream source cannot actually be accessed or verified, do not reconstruct it from model memory. Return `SOURCE_UNAVAILABLE` / `HANDOFF_REQUIRED` for material Harness-governed work.

## Project overlay

Workbench Kit-owned public policy remains local, including as applicable:

- `AGENTS.md`
- `docs/architecture/**`
- `docs/conventions/**`
- `.github/**`
- package/public-export/API contracts
- IssueOps ownership and labels
- pnpm validation and commit-safety rules
- release/tag/npm/publication policy
- public-reference and secret-safety boundaries

Shared Harness methodology must not absorb Workbench-specific package/release/IssueOps policy.

## Effective precedence

```text
exact externally supplied Harness base
< optional shared profile
< Workbench Kit project overlay
< task/lane-specific overlay within delegated task-owned scope
```

The final task/lane layer may **narrow** behavior inside its delegated scope, but it cannot widen authority or override repository-reserved constraints such as release/main/publish authority, IssueOps ownership, public-reference/secret-safety policy, required validation, or other explicit project-level guardrails. A task overlay that attempts to cross those boundaries is a `POLICY_CONTRADICTION` / authority escalation, not a valid precedence win.

Explicit repository policy may extend or replace an upstream default only inside Workbench Kit's owned scope. An implicit contradiction is not an override; route it as `POLICY_CONTRADICTION`.

Runtime prompt text is not a canonical policy layer.

## Shared behavior from Harness

When the upstream source is available, use it for shared semantics such as Decision Safety, Self-Check, Independent Review, adoption distinction, bounded recursive-improvement triage, handoff, `NO_ACTION`, and capability/evidence truthfulness instead of copying those rules into every physical automation prompt.

Workbench Kit-specific validation, release/publication, public-reference, package ownership, and IssueOps constraints remain local.

## Role-owned GitHub Issue lifecycle

Every recurring Workbench automation must inspect current open Issues and PRs relevant to its own role/scope before selecting new work. This is role-scoped ticket ownership, not a full-repository backlog sweep for every agent.

- restore explicitly routed/assigned owned Issues before creating duplicate work;
- reconcile an owned Issue with its linked branch, PR, review, CI, dependency, and integration state;
- continue valid unfinished owned work before starting a competing duplicate;
- for source-change Issues, keep the Issue open while required linked PR review/integration remains unresolved;
- after required integration and the owned Issue's actual acceptance/done criteria are verified, close that Issue in the same run when current capability and authority permit;
- do not leave a verified-complete owned Issue open merely because implementation/merge was reported elsewhere;
- do not close an Issue owned by another role; route/handoff it through current Workbench IssueOps ownership instead;
- a merged PR or completion report alone is not sufficient to close an Issue whose acceptance criteria are still unmet;
- comments are material-delta/evidence surfaces, not per-run heartbeat logs.

Issue closure does not replace required independent review, release/publication gates, post-adoption effect validation, or upward failure reporting.

## Canary / migration rule

This entrypoint does **not** authorize deleting existing public guidance, changing automation cadence/population, or changing release/main authority.

First compare one reversible workflow using:

```text
exact externally supplied Harness base + this entrypoint + existing Workbench guidance
```

against current behavior. Retire duplicated shared guidance only after exact-candidate review, repository-required validation, observed canary equivalence or improvement, and preserved rollback.
