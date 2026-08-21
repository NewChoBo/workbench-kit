# GitHub Issues

**Status:** Required for new issues  
**Last updated:** 2026-08-19

Workbench Kit is a public npm repository. Issues are the primary backlog for independent kit work. Prefer GitHub issues over informal notes when the work must be completed inside this repo without private-host context.

Templates live under [`.github/ISSUE_TEMPLATE/`](../../.github/ISSUE_TEMPLATE/). Blank issues are disabled — pick a template.

This repo also uses an **IssueOps** automation lane. Labels and comments are the control plane for triage, Q&A, clarification, implementation, reconciliation, and closure. Executable repository-owned instructions: [issueops-autohandler-instructions.md](./issueops-autohandler-instructions.md).

## Which template?

| Template                   | Use when                                                            |
| -------------------------- | ------------------------------------------------------------------- |
| **Feature / API addition** | Net-new kit capability designed in-kit                              |
| **Bug report**             | Incorrect behavior in kit packages / Storybook / sample             |
| **Consumer extract**       | A host already proved a pattern; promote the generic slice into kit |

Security reports: do **not** file exploit detail in a public issue. Prefer a GitHub Security Advisory or maintainer private channel. Public threads may use `type: security` only to request private follow-up.

## Required quality bar

Every implementation Issue should answer:

1. **Summary** — what ships when done.
2. **Problem** — concrete consumer/kit pain today.
3. **Goals / Non-goals** — especially what stays host-owned.
4. **Package home** — which `@workbench-kit/*` surface owns it.
5. **API sketch** — types/props/functions when applicable.
6. **Behavior contract** — edge cases, defaults, a11y.
7. **Existing kit surfaces** — what to reuse / not duplicate.
8. **Acceptance criteria** — repository-verifiable checklist.
9. **Verification plan** — applicable tests / validate lane / Storybook frame.
10. **Effort** — S / M / L.

Consumer extracts additionally need a product-neutral capability statement, reference behavior without private identifiers, promote-vs-host-keeps split, and import-layer rules.

## Public reference rules

Issues, comments, PR bodies, branch names, and commit messages are public surfaces. Follow [public-reference-policy.md](./public-reference-policy.md). Do not persist sibling/private repository coordinates, private clone paths, product codenames, secrets, or private runtime evidence.

## Title format

Use English Conventional Commits style:

```text
feat(<scope>): short capability phrase
fix(<scope>): short failure phrase
docs(<scope>): short docs phrase
```

## Comment protocol (IssueOps)

For non-trivial comments, prefer:

```text
type: feat | fix | security | question | docs | extract
intent: implement | discuss | clarify
```

Optional coding request:

```text
run agent
```

Missing/ambiguous implementation intent must not be guessed. Ask one bounded reverse-question checklist and use `status:needs-human` only when real human information/judgment is required.

### Event dispatch and loop safety

The executable handler must classify its trigger before mutation:

- **Issue comment:** process only the target Issue through Q&A, Clarify, Implement, or Security. Ignore bot, automation, GitHub App, handler-marker, and unchanged duplicate comments. Never enter hourly, idle, or weekly work from a comment event.
- **Hourly:** run bounded active-owner reconciliation plus at most one source-changing logical item. Never enter the weekly structural lane.
- **Weekly:** restore or select one structural item. Do not also pick up the hourly queue or idle work.

Missing or contradictory event metadata does not authorize mutation.

### Modes

| Mode                    | When                                                    | Mutates code?         |
| ----------------------- | ------------------------------------------------------- | --------------------- |
| **Q&A**                 | question/discuss/clarify without implementation request | No                    |
| **Clarify**             | ambiguous / thin quality bar                            | No                    |
| **Implement**           | explicit run request or eligible scheduled pickup       | Yes, PR to `develop`  |
| **Idle refactor**       | no actionable active or queued work                     | One small internal PR |
| **Structural refactor** | weekly architecture lane                                | Yes, never auto-merge |
| **Security**            | security-sensitive request                              | No public PoC         |

### Status labels

| Label                | Meaning                                                     |
| -------------------- | ----------------------------------------------------------- |
| `status:queued`      | Eligible for scheduled source-work selection                |
| `status:in-progress` | Claimed owner; restore/reconcile on future runs             |
| `status:pr-open`     | PR exists; review/integration/acceptance remains unresolved |
| `status:needs-human` | Real human answer/judgment/policy authority is required     |
| `status:skipped`     | Intentionally not implemented                               |

Pending CI, pending review, or an external dependency normally remain `status:pr-open` / current owned state. They are not automatically `status:needs-human`.

Machine-readable marker:

```html
<!-- automation:cursor-issue-handler status=<started|skipped|needs-human|pr-open|done|failed|info> issue=<N> pr=<url-optional> source=<comment|cron|idle-refactor|structural-refactor> -->
```

## Hourly throughput and owned Issue reconciliation

The hourly lane separates **control/lifecycle work** from **source mutation**.

```text
bounded active-owner reconciliation
+ already-gated merge/close cleanup
+ at most ONE source-changing logical work item
```

A run may inspect several automation-owned `status:in-progress` / `status:pr-open` Issues. For each, reconcile the linked branch/PR/Checks/review/dependency/integration/acceptance state and classify it as:

```text
ACTION_REQUIRED
READY_TO_MERGE
WAITING_CI
WAITING_REVIEW
WAITING_DEPENDENCY
BLOCKED
DONE
```

Rules:

1. `WAITING_CI`, `WAITING_REVIEW`, and `WAITING_DEPENDENCY` do **not** consume the run's source-change slot. Keep state, emit no heartbeat, continue bounded reconciliation.
2. `READY_TO_MERGE` may be merged in the same run when exact-head gates and repository authority are satisfied; verify `develop`, acceptance, owned-Issue closure, and branch cleanup.
3. `DONE` requires actual integration + acceptance evidence before closure.
4. `ACTION_REQUIRED` active work is preferred for the one source-changing slot.
5. If no active owned work requires a source change, select one eligible `status:queued` Issue.
6. At most one logical work item receives source mutation per hourly run. Multiple read-only reconciliations and already-gated lifecycle actions are allowed.
7. For a new queued item, attempt an optimistic claim: remove `status:queued`, set `status:in-progress`, and post one `status=started` marker with a one-line plan. Immediately re-read labels, ownership markers, linked branches, and PRs. If another owner won, stop without source mutation or duplicate commentary. Restoring an existing owner does not emit another started marker.
8. Never close or take over another owner's Issue. Never create duplicate Issue/branch/PR work for the same concern.

### Actionable queue priority

Oldest-first is a tie-breaker, not the only policy. Within current authority and explicit product priorities, prefer:

1. correctness/regression or safety-relevant non-secret defects;
2. prerequisites that unblock multiple owned items;
3. nearly-complete active work that can reach a safe gate;
4. small independent quick wins with clear acceptance;
5. explicit repository/product priority;
6. oldest ordinary queued item.

A waiting PR must not monopolize every hourly execution while unrelated actionable work exists.

## Human / consumer how-to

1. File with the correct template and quality bar.
2. Use the request envelope on an existing Issue.
3. Questions use `type: question`.
4. For code, fill acceptance/verification and comment `run agent` or add `status:queued`.
5. Answer reverse questions with `intent: clarify`; re-request implementation when ready.
6. Link dependencies with `#N`.

## Idle / Weekly

- **Idle refactor:** only when there is no `ACTION_REQUIRED` owned work and no eligible queued Issue. One small internal tidy-up; no API break, product bet, broad refactor, security work, or major dependency/release change.
- **Weekly structural:** one architecture-oriented theme; human review required and never auto-merged.

## Verification lanes

| Change type                   | Minimum                                                          |
| ----------------------------- | ---------------------------------------------------------------- |
| Pure logic / platform helpers | package unit tests + `pnpm validate:fast` or targeted equivalent |
| Public export surface         | `pnpm check:public-exports`                                      |
| React UI                      | unit + matching Storybook story; UI gate when required           |
| Docs / templates only         | `pnpm validate:static` / public-reference checks                 |

Automation source changes must pass `pnpm check:commit-safety` and applicable validation. Merge only when current required gates are satisfied. After merge, verify acceptance before closing the owned Issue. Never push `main` from automation.

## Agent defaults

1. Prefer existing owner/PR/branch over duplicate work.
2. Expand thin Issues to the quality bar or Clarify; do not invent requirements.
3. Keep private consumer evidence out of this public repository.
4. Reconcile waiting states without spending the source slot.
5. Close verified-complete owned Issues promptly after integration; keep incomplete acceptance open.
6. Keep executable automation behavior synchronized with [issueops-autohandler-instructions.md](./issueops-autohandler-instructions.md).
