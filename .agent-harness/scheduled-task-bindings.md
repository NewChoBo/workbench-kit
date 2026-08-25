# Workbench Scheduled Task Bindings

Status: project overlay / runtime-bound

This file owns stable Workbench-specific bootstrap semantics for recurring work.
It does not create a scheduler, grant authority, select a runtime provider or
persist mutable control-plane state. The physical launcher supplies those
runtime-only values and points to an exact repository ref plus one binding key.

## `workbench_kit_recursive_target_design`

### Purpose and authority

Continuously reconcile Workbench target architecture, UX, implementation packets
and exact-source review evidence. The binding may update repository-owned target
planning documents when current repository authority permits a docs-only change.

It must not implement or modify package source, tests, manifests, lockfiles,
workflows or release code. Source implementation belongs to a separate,
tool-neutral `READY_FOR_IMPLEMENTATION` packet and implementation lane. This
binding must not merge a source-code PR or tag, publish or release a package.

### Required runtime inputs

The launcher must provide, without persisting them here:

- the exact readable and reviewed external Harness source identity required by
  [the consumer entrypoint](./harness.md);
- current runtime identity, delegated authority and work routing;
- the repository/ref to inspect and the capabilities available for this run;
- any temporary private compatibility evidence through an authorized runtime
  boundary.

If the external Harness source is required but unavailable, return
`SOURCE_UNAVAILABLE` / `HANDOFF_REQUIRED`. Do not reconstruct it from memory.

### Restore

1. Load `AGENTS.md`, `.agent-harness/harness.md` and this binding.
2. Load `docs/northstar/README.md`, `target-architecture.md`,
   `implementation-plan.md` and `roadmap.md`, plus only the task-relevant target,
   architecture, convention and validation documents they route to.
3. Restore current Issues, PRs, branches, exact review/candidate SHAs, validation
   evidence and dependencies for this role's owned scope.
4. Reconcile an existing owned claim, Issue, branch or review before creating a
   duplicate. Treat repository source and current remote state as authoritative.

### Select and run

Choose one bounded question or owned work item that materially advances a
Northstar outcome. Prefer current user-confirmed priorities and already-open work
over speculative branch or Issue creation.

For target design:

1. Compare exact CURRENT source and behavior with the intended TARGET.
2. Inspect relevant source, tests, contracts, UX flows, recent PRs and review
   findings before changing the plan.
3. Close ownership, public API, state/data flow, lifecycle, error, compatibility,
   migration, ordered tasks, validation and done criteria sufficiently for a
   tool-neutral implementation handoff.
4. Keep generic Workbench mechanics separate from consumer/product policy and do
   not promote private consumer evidence into this public repository.
5. Freeze the exact docs candidate and obtain producer-distinct review before
   integration. A design PASS is not source implementation authority; repository
   N2 must separately admit the source packet.

For source review:

1. Review one exact candidate SHA against its admitted packet and exact base.
2. Verify the changed source and the validation evidence that actually covers
   the acceptance criteria.
3. Return actionable `P0` / `P1` / `P2` findings or `PASS`; keep review distinct
   from implementation and adoption.
4. Do not use ChatGPT Work as the code-review execution surface and do not create
   Work artifacts solely for code review.

### Delta-oriented research

Evaluate external research only when one current question can materially change a
target decision or the next likely architecture, dependency, UX, testability,
performance, accessibility, privacy, trust, security or compatibility bottleneck.
Restore prior findings first and investigate only the evidence delta.

Prefer official specifications, documentation and release notes, primary papers
or technical reports, source implementations, credible production engineering
evidence and relevant benchmarks or evaluations. Inspect counterevidence,
limitations, migration cost and simpler alternatives. Classify a material result
as `ADOPT`, `EXPERIMENT`, `TRACK`, `REJECT` or `NO_MATERIAL_DELTA`, and map it to an
existing Northstar assumption, gap, roadmap outcome or implementation packet.
Research is evidence, not implementation, review, adoption or release authority.

### Verify, report and escalate

- Apply only task-relevant repository validation and public-safety rules by
  reference; do not duplicate their detailed commands or thresholds here.
- Report material target, source-review, validation, dependency, PR/integration,
  cleanup, API-impact and research deltas with exact identities, forecast the
  next likely bottleneck, and surface only genuine user-only decisions. Return
  `NO_ACTION` when no material, authorized delta exists.
- Resolve ordinary reversible problems locally. Reuse the escalation contract in
  `.agent-harness/harness.md` only for a genuine repeated blocker, missing
  authority/capability, policy contradiction, cross-project conflict or serious
  regression/security/data-loss/public-release risk.
- Never treat a physical task heartbeat, generated report, design PASS, open PR or
  green check alone as proof of implementation adoption or completion.

### Physical launcher boundary

After this binding is adopted, a physical scheduled task may retain only a thin
pointer to the repository/ref, this binding key, the external Harness source and
true runtime-only values. It must not copy this workflow into another long prompt
or create a duplicate physical task.

Do not store physical task IDs, cadence or topology, provider/account identity,
control-plane page IDs, private source locators, credentials, mutable role
assignments or current-work priority in this public file.
