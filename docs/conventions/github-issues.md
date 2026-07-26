# GitHub Issues

**Status:** Required for new issues  
**Last updated:** 2026-07-26

Workbench Kit is a public npm repository. Issues are the primary backlog for
independent kit work. Prefer GitHub issues over informal notes when the work
must be completed inside this repo without private-host context.

Templates live under [`.github/ISSUE_TEMPLATE/`](../../.github/ISSUE_TEMPLATE/).
Blank issues are disabled — pick a template.

This repo also uses an **IssueOps** automation lane (Cursor Automations): labels
and comments are the control plane for triage, Q&A, clarification, and
optional implementation. Humans and consumer libraries should follow the
[Comment protocol](#comment-protocol-issueops) below so agents can route safely.
Executable automation instructions (paste into Cursor):
[issueops-autohandler-instructions.md](./issueops-autohandler-instructions.md).

## Which template?

| Template                   | Use when                                                            |
| -------------------------- | ------------------------------------------------------------------- |
| **Feature / API addition** | Net-new kit capability designed in-kit                              |
| **Bug report**             | Incorrect behavior in kit packages / Storybook / sample             |
| **Consumer extract**       | A host already proved a pattern; promote the generic slice into kit |

Security reports: do **not** file exploit detail in a public issue. Prefer a
[GitHub Security Advisory](https://docs.github.com/en/code-security/security-advisories)
(or maintainer private channel). Public threads may use `type: security` only
to request private follow-up — never paste PoCs or secrets.

## Required quality bar

Every issue must answer **all** of the following. Thin “wishlist” titles are
rejected in triage (ask for more detail or convert to a discussion).

1. **Summary** — what ships when done (1–2 sentences).
2. **Problem** — concrete consumer/kit pain today.
3. **Goals / Non-goals** — especially what stays host-owned.
4. **Package home** — which `@workbench-kit/*` surface owns it.
5. **API sketch** — types/props/functions (pseudocode OK).
6. **Behavior contract** — algorithms, edge cases, defaults, a11y.
7. **Existing kit surfaces** — what to reuse / not duplicate (`packages/` paths).
8. **Acceptance criteria** — checkbox list verifiable without private hosts.
9. **Verification plan** — `validate:*`, unit tests, Storybook story frame.
10. **Effort** — S / M / L.

### Extra for consumer extracts

11. **Capability statement** — product-neutral; a stranger can understand it.
12. **Reference behavior** — algorithmic description of the proven host logic
    (constants, placement rules, debounce, reject rules) **without** private
    paths or product names.
13. **Promote vs host keeps** — split list.
14. **Import rules** — e.g. no Electron in `@workbench-kit/react`; no React in
    `@workbench-kit/platform`.

## Public reference rules (issues count)

Issues, comments, and PR bodies are public. Follow
[public-reference-policy.md](./public-reference-policy.md):

| Allowed                                                                    | Forbidden                                            |
| -------------------------------------------------------------------------- | ---------------------------------------------------- |
| “desktop consumer”, “integrating host”, “reference implementation”         | Sibling repo names, private clone paths              |
| Capability language (catalog filter flyout, remembered window layout)      | Product / host codenames                             |
| Kit file paths under `packages/`, `examples/`, `docs/`                     | Host absolute paths (`E:\…`, `../private-app/…`)     |
| Generic MIME / preference **shapes** (`application/x-<host>-…` as pattern) | Real private product MIME strings or preference keys |

If you need private-host file pointers for implementers, keep them in the
**private host’s** tracker and link only by GitHub issue number from here.

## Title format

Use Conventional Commits style, English only
([language-policy.md](./language-policy.md)):

```text
feat(<scope>): short capability phrase
fix(<scope>): short failure phrase
docs(<scope>): short docs phrase
```

Scopes (examples): `react`, `overlay`, `platform`, `workbench`, `tokens`,
`contracts`, `i18n`, `storybook`.

## Comment protocol (IssueOps)

Comments are the shared coordination surface between maintainers, Cursor
automations, parent/child issues, and **external consumer libraries** that file
or discuss work here. Automations may answer simple questions, ask reverse
questions when the request is ambiguous, or implement when explicitly asked.

### Request envelope

For non-trivial comments (and whenever you want automation to act), start with:

```text
type: feat | fix | security | question | docs | extract
intent: implement | discuss | clarify
```

Optional — request a coding run:

```text
run agent
```

| `type`     | Meaning                          | Maps to template / lane      |
| ---------- | -------------------------------- | ---------------------------- |
| `feat`     | Feature / API addition           | Feature                      |
| `fix`      | Bug                              | Bug report                   |
| `security` | Vulnerability / sensitive report | Private advisory (see above) |
| `question` | Usage / API / “where is X”       | Q&A only (no PR by default)  |
| `docs`     | Documentation                    | Docs change or guidance      |
| `extract`  | Promote host-proven pattern      | Consumer extract             |

| `intent`    | Meaning                                      |
| ----------- | -------------------------------------------- |
| `implement` | Want a code/docs change in this repo         |
| `discuss`   | Design talk; no implementation yet           |
| `clarify`   | Answering agent questions or asking for info |

If `type` / `intent` are missing on an implement-like request, automation
**must not guess** — it posts a structured reverse-question comment and waits.

### Modes (what automation does)

| Mode              | When                                                                                    | Mutates code?                                    |
| ----------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Q&A**           | `question`, or `intent: clarify` / `discuss` without `run agent`                        | No — comment only                                |
| **Clarify**       | Ambiguous / thin quality bar                                                            | No — reverse questions + `status:needs-human`    |
| **Implement**     | `run agent`, or `status:queued` + cron, or clear `intent: implement` with enough detail | Yes — branch/PR into `develop`                   |
| **Idle refactor** | Hourly cron when no `status:queued` work; small internal tidy-ups only                  | Yes — one small PR; see autohandler instructions |
| **Security**      | `type: security`                                                                        | No public PoC / no drive-by fix                  |

### Status labels

| Label                | Meaning                                         |
| -------------------- | ----------------------------------------------- |
| `status:queued`      | Eligible for hourly automation pickup           |
| `status:in-progress` | Claimed; do not double-start                    |
| `status:pr-open`     | PR opened (issue stays open until humans close) |
| `status:needs-human` | Blocked on answers / judgment                   |
| `status:skipped`     | Intentionally not implemented                   |

Machine-readable marker (HTML comment) on automation posts:

```html
<!-- automation:cursor-issue-handler status=<started|skipped|needs-human|pr-open|done|failed|info> issue=<N> pr=<url-optional> source=<comment|cron> -->
```

### Human / consumer how-to

1. File with the correct **issue template** when opening a new issue.
2. On an existing issue, use the **request envelope** (`type` / `intent`).
3. Simple questions → `type: question` (automation may answer from public kit sources).
4. Want code → fill the quality bar, then comment `run agent` **or** add
   `status:queued` for scheduled pickup.
5. When automation asks reverse questions, reply on the same issue
   (`intent: clarify`). Re-comment `run agent` when ready to implement.
6. Link parent/child/related issues with `#N` so automation can read dependencies.

### Reverse questions (automation)

When the request is ambiguous, automation should:

1. Not implement or invent APIs.
2. Set `status:needs-human`.
3. Post **one** structured English checklist (type, intent, package home,
   acceptance, repro for fixes, etc.).
4. Stop until a human replies.

### Loop and cost notes

- Prefer bot/App identity for automation comments so platform filters avoid
  self-triggers; still ignore marker comments in prompts.
- Ordinary discussion without `run agent` should stay in Q&A / Clarify — not
  full implement runs.
- Hourly backlog drain prefers `status:queued` first. If the queue is empty,
  automation may run a single **idle refactor** (small internal tidy-up only;
  no public API breaks). Details:
  [issueops-autohandler-instructions.md](./issueops-autohandler-instructions.md).
  Decline unwanted idle PRs by closing them.

## Acceptance criteria tips

Good:

```markdown
- [ ] `resolveWindowOpenLayout` returns defaults when `remember` is false and
      does not require clearing saved state
- [ ] Off-screen saved bounds clamp into the union of display work areas
- [ ] Unit tests cover remember on/off + empty display list
- [ ] No `electron` import from `@workbench-kit/react`
```

Bad:

```markdown
- [ ] Works in our app
- [ ] Looks good
- [ ] Port the TilePaper helper
```

## Storybook / sample expectations

When the change is UI-visible, name the **story frame** that matches production
placement ([storybook.md](./storybook.md)):

- sidebar panel
- editor / main area
- settings / form surface
- overlay trigger surface

Update [storybook-e2e-coverage.md](../workbench/storybook-e2e-coverage.md) when
the flow becomes a required UI gate.

## Verification lanes

| Change type                   | Minimum                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------ |
| Pure logic / platform helpers | package unit tests + `pnpm validate:fast` (or targeted typecheck/test)         |
| Public export surface         | `pnpm check:public-exports`                                                    |
| React UI                      | unit + Storybook story; `pnpm validate:ui` only when required coverage changes |
| Docs / templates only         | `pnpm check:public-references` (via `validate:static`)                         |

Automation implement runs must pass `pnpm check:commit-safety` and the lane
above before merge into `develop`. Merge only when GitHub Checks are green.
Never push `main` from automation.

## Triage checklist (maintainers)

- [ ] Template fields filled; no private host names
- [ ] Package home and import rules make sense
- [ ] Non-goals prevent domain leakage
- [ ] Acceptance criteria are testable in this repo alone
- [ ] Labels: `enhancement` / `bug` (+ optional milestone)
- [ ] IssueOps status labels when using automation (`status:*`)
- [ ] Related backlog section linked when applicable
      (`docs/workbench/consumer-integration-backlog.md`)

## Agent defaults

When an agent files or updates issues:

1. Prefer the **Consumer extract** template for promotion work.
2. Expand every section; do not leave placeholders.
3. Link kit source paths that already exist.
4. Never write private sibling repo names into issue bodies.
5. After creating thin issues, immediately edit them to the quality bar above.
6. Follow the [Comment protocol](#comment-protocol-issueops) for automation
   coordination; use reverse questions instead of guessing.
