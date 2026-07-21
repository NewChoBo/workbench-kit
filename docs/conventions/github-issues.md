# GitHub Issues

**Status:** Required for new issues  
**Last updated:** 2026-07-21

Workbench Kit is a public npm repository. Issues are the primary backlog for
independent kit work. Prefer GitHub issues over informal notes when the work
must be completed inside this repo without private-host context.

Templates live under [`.github/ISSUE_TEMPLATE/`](../../.github/ISSUE_TEMPLATE/).
Blank issues are disabled — pick a template.

## Which template?

| Template                   | Use when                                                            |
| -------------------------- | ------------------------------------------------------------------- |
| **Feature / API addition** | Net-new kit capability designed in-kit                              |
| **Bug report**             | Incorrect behavior in kit packages / Storybook / sample             |
| **Consumer extract**       | A host already proved a pattern; promote the generic slice into kit |

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

## Triage checklist (maintainers)

- [ ] Template fields filled; no private host names
- [ ] Package home and import rules make sense
- [ ] Non-goals prevent domain leakage
- [ ] Acceptance criteria are testable in this repo alone
- [ ] Labels: `enhancement` / `bug` (+ optional milestone)
- [ ] Related backlog section linked when applicable
      (`docs/workbench/consumer-integration-backlog.md`)

## Agent defaults

When an agent files or updates issues:

1. Prefer the **Consumer extract** template for promotion work.
2. Expand every section; do not leave placeholders.
3. Link kit source paths that already exist.
4. Never write private sibling repo names into issue bodies.
5. After creating thin issues, immediately edit them to the quality bar above.
