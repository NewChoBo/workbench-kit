# Storybook E2E Coverage

Storybook is currently a narrow regression surface for the same UI that runs through
`pnpm dev` (`examples/workbench-sample`). The previous package-wide component story
matrix was removed because it had drifted from the sample host and produced a large,
weakly maintained validation surface.

## Current Story Source

Storybook discovers only:

```text
examples/workbench-sample/src/**/*.stories.@(ts|tsx)
```

The canonical story file is:

```text
examples/workbench-sample/src/WorkbenchSample.stories.tsx
```

That story renders `examples/workbench-sample/src/App.tsx` directly and imports the
sample host CSS, so the Storybook surface follows the dev sample bootstrap instead
of a separate story-only workbench harness.

## Required Play Gate

`pnpm test:storybook-play:required` runs the `storybook-play-required` stories:

| Story                                               | Flow covered                                                                                                                                                     |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Workbench Sample/Dev App` - Login gate             | Unauthenticated sample login screen and dummy credentials copy                                                                                                   |
| `Workbench Sample/Dev App` - Login submit flow      | Dummy backend sign-in failure, error display, successful tester sign-in, and shell handoff                                                                       |
| `Workbench Sample/Dev App` - Tester workbench       | Authenticated administrator workbench shell, explorer, status bar, and activity bar                                                                              |
| `Workbench Sample/Dev App` - Tester dev app journey | Dev-app integration path: startup editor state, search result open, command palette, chat, AI chat composer, settings, profile permission override, and sign-out |
| `Workbench Sample/Dev App` - Basic permission scope | Basic account permission projection; only Explorer and Profile remain visible                                                                                    |

The required gate is intentionally sample-host focused rather than a package
gallery. Add a required story only when it proves a stable, user-visible flow from
the app behind `pnpm dev` and can fail with an actionable product-level case name.

## Scripts

| Script                              | Scope                                              |
| ----------------------------------- | -------------------------------------------------- |
| `pnpm storybook`                    | Local Storybook dev server on `127.0.0.1:6010`     |
| `pnpm build:storybook`              | Static Storybook build                             |
| `pnpm test:storybook-play:required` | Required play stories only                         |
| `pnpm validate:ui`                  | `build:storybook` + `test:storybook-play:required` |
| `pnpm validate:full`                | Static/unit gates plus Storybook UI validation     |

`scripts/test-storybook-play.mjs` starts Storybook on port `6010` when needed, then
invokes `test-storybook` with `--includeTags=storybook-play-required`.

## Scope Rules

- Treat `workbench-sample` as the source of truth when a Storybook scenario is
  ambiguous.
- Do not reintroduce broad package-level story matrices without a matching
  maintenance plan and required verification path.
- Prefer real sample storage/session setup over duplicate story-only fixtures.
- Keep story definitions in `*.stories.tsx`; keep reusable runtime behavior in
  package modules or the sample host.
- Use ARIA-first play assertions that prove visible behavior, not implementation
  details.

## True E2E-only Flows

Keep browser E2E or manual sample-host checks for paths Storybook does not faithfully
cover:

- Local directory workspace open, file watcher, and on-disk persistence
- Extension bundle load plus workbench reload after install or enablement changes
- Monaco editor typing, diagnostics, and large-file performance
- Cross-view drag and drop, editor tab drag, and split resize persistence
- Auth/session against a real backend
- Multi-window or deep-link host routing

## GitHub Pages Deployment

GitHub Pages can still serve Storybook under the sample artifact:

| Path              | App                             |
| ----------------- | ------------------------------- |
| `/` or `/{repo}/` | `workbench-sample` static build |
| `/storybook/`     | Storybook static build          |

`pages.yml` should build `workbench-sample`, build Storybook with
`STORYBOOK_BASE_PATH=${base_path}/storybook/`, copy `storybook-static/` into
`examples/workbench-sample/dist/storybook/`, and upload one combined Pages artifact.
