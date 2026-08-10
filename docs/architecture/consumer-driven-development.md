# Consumer-driven Development

This document defines how reusable capabilities move between Workbench Kit and
integrating hosts. It is normative for cross-repository planning, implementation,
release, and cleanup work.

## Goal

Workbench Kit is the reusable foundation. Integrating hosts are product
implementations and proving grounds.

The target state is:

```text
Workbench Kit
  reusable behavior, contracts, primitives, and host boundaries
                         ↓ published package
Integrating host
  product policy, composition, data model, copy, and thin adapters
```

A host may discover or mature a capability first. That does not make the host the
permanent owner of reusable behavior. When the behavior is product-independent,
promote the mature implementation into Workbench Kit, release it, then replace
the host implementation with the published API.

## Ownership model

### Workbench Kit owns

- domain-neutral algorithms and state machines;
- reusable workbench, UI, editor, mapping, and platform primitives;
- generic Electron main, preload, and security boundaries;
- public contracts, focused exports, examples, and packed-consumer fixtures;
- cross-host compatibility and package validation.

### Integrating hosts own

- product data models and workflows;
- product navigation, catalogs, copy, branding, and defaults;
- product IPC channel names, URL catalogs, paths, and lifecycle policy;
- composition roots and adapters that bind product services to Kit contracts;
- end-to-end product behavior and product-specific acceptance tests.

Ownership follows behavior, not the repository where the first implementation
appeared.

## Core principles

### 1. Reusable behavior defaults to Workbench Kit

When a capability can be expressed without product nouns, product storage paths,
product IDs, or product-specific policy, prefer a Workbench Kit implementation.
The host should configure or adapt it rather than reimplement it.

### 2. Promote host-proven implementations upstream

A more mature host implementation is evidence, not a reason to keep duplicate
framework code. Preserve its behavior contract and tests, remove product policy,
introduce injected ports where needed, and implement the generalized result in
Workbench Kit.

Do not copy a host file verbatim into the public package. Extract the behavior,
rename the public concepts neutrally, and keep product data and policy in the
host.

### 3. Release before consumption

The committed consumer baseline uses published registry packages.

```text
Kit implementation → Kit validation → develop merge → release tag → npm publish
→ host exact-version bump → host adapter cleanup → host validation
```

Do not merge a host change that requires an unreleased Kit API. Temporary local
`link:` or `file:` checks are allowed only as uncommitted verification and must
be removed before a host commit or pull request.

### 4. No permanent dual implementation

During migration, a compatibility adapter may temporarily bridge old and new
contracts. It must have:

- a narrow scope;
- a documented removal condition;
- no new product behavior added to it;
- a follow-up item tied to the Kit release or API milestone.

After the published Kit API is consumed, delete the duplicate host behavior.
Keeping both implementations synchronized is not an acceptable steady state.

### 5. Product policy stays injected

Generic helpers must not absorb product policy merely to reduce host code.
Examples of host-owned policy include:

- URL and command allowlists;
- IPC channel names;
- storage roots and filenames;
- product identifiers and schemas;
- application lifecycle choices;
- product copy and defaults.

Workbench Kit may own the validation, transport, state machine, or execution
primitive that consumes those values.

### 6. Public APIs are proven by external consumption

A feature is not complete merely because it works inside the monorepo. Public
package work should validate the actual published shape through the relevant
lanes:

- focused subpath type resolution;
- ESM or bundler consumption where applicable;
- CommonJS consumption for Node or Electron main-process boundaries where
  applicable;
- packed-package smoke tests;
- public-reference and secret checks;
- dependency and bundle boundaries.

### 7. Prefer narrow public surfaces

Expose the smallest stable contract that lets a host configure the reusable
behavior. Avoid exporting product-like orchestration objects or broad barrels
when focused entries provide clearer ownership and smaller consumer graphs.

### 8. Avoid speculative abstraction

Promotion requires a proven behavior contract. Do not move unfinished product
experiments into Workbench Kit only because they might become reusable. Keep the
experiment in the host until its responsibilities, inputs, outputs, and failure
behavior are understood.

## Placement decision

Before implementation, classify the requested change.

- If the behavior can be named without a product concept, prefer Workbench Kit.
- If product choices can be passed as data, callbacks, or ports, prefer Workbench
  Kit.
- If another Electron, browser, or workbench host could plausibly use it, prefer
  Workbench Kit.
- If the capability is already partially duplicated across Kit and a host,
  consolidate it in Workbench Kit.
- If the behavior depends on a product schema, catalog, workflow, or identity,
  keep that layer in the host.
- If it only composes existing generic capabilities, keep the composition in the
  host.
- If it is still an unproven product experiment, keep it in the host until the
  behavior stabilizes.

When classification is mixed, split the task:

```text
Kit: generic contract + implementation + tests
Host: product policy + adapter + end-to-end composition
```

## Promotion workflow

### Phase A — establish the behavior contract

1. Identify the mature behavior and its current consumers.
2. Record inputs, outputs, errors, lifecycle, security assumptions, and edge
   cases.
3. Separate product policy from reusable mechanics.
4. Define non-goals so the Kit API does not become a product service locator.

### Phase B — implement in Workbench Kit

1. Select the owning package using the package map and dependency rules.
2. Reuse an existing public surface where possible; add a package or subpath only
   when ownership or runtime boundaries require it.
3. Port or rewrite the behavior using neutral names and injected policy.
4. Add unit tests and packed-consumer coverage appropriate to the runtime.
5. Update architecture, API, and release-facing documentation.
6. Run the selected validation lane and `pnpm check:commit-safety`.
7. Merge the Kit pull request into `develop` only when required checks pass.

### Phase C — release

1. Validate the release tip according to the npm release convention.
2. Promote and tag only with explicit release approval.
3. Confirm the intended package version is visible under the `prototype` dist
   tag.

A merge to `develop` is not equivalent to a published consumer dependency.

### Phase D — consume and delete duplication

1. Bump the integrating host's complete Workbench Kit cohort to one exact
   published version.
2. Import the public entry rather than an internal source path.
3. Keep only the host's product policy and adapter.
4. Remove compatibility shims and duplicate implementation once their removal
   condition is met.
5. Run host type, build, unit, smoke, and product acceptance checks that cover
   the changed boundary.
6. Merge the host pull request after the published package and host checks are
   both available.

## Pull request and merge order

For behavior changes spanning Kit and a host:

1. Kit implementation pull request;
2. Kit `develop` merge after green checks;
3. approved Kit release and npm verification;
4. host exact-version bump and cleanup pull request;
5. host `develop` merge after green checks.

Documentation-only coordination may land in both repositories without a package
release. Source changes must preserve the release-before-consume order.

Do not combine unrelated Kit and host refactors merely because the same agent can
access both repositories. Each pull request should explain its own ownership and
validation boundary.

## Codex execution contract

Codex should treat cross-repository tasks as an ordered migration, not as two
independent edits.

At the start of a task:

1. inspect the existing Kit surface and the relevant host behavior;
2. classify each responsibility as generic, product policy, or composition;
3. state the Kit-first sequence and release dependency;
4. identify temporary compatibility code and its deletion condition.

During implementation:

- use separate branches or worktrees for Kit and host changes;
- keep public Kit text neutral and free of private host references;
- implement and validate the Kit side before committing a host dependency on it;
- do not make a committed local link the integration mechanism;
- keep host adapters narrow and delete replaced mechanics.

At completion, report:

- ownership decisions;
- Kit and host commits or pull requests;
- package version or release dependency;
- validation results in both repositories;
- remaining compatibility code and the exact removal trigger.

## Future direction

Workbench Kit should continue toward:

1. broader reusable Electron host boundaries with injected policy;
2. focused public entries for workbench, editor, UI, mapping, platform, and
   security capabilities;
3. packed external-consumer fixtures for every runtime-sensitive package;
4. thin host adapters with no duplicated framework behavior;
5. a reviewable promotion trail from proven host behavior to public contracts;
6. package-map and dependency checks that keep ownership documentation aligned
   with the workspace.

The objective is not to move every product feature into Workbench Kit. The
objective is to keep reusable mechanics in one well-tested public foundation and
leave product identity, policy, and composition in the integrating host.

## Completion checklist

- [ ] Responsibility was classified before implementation.
- [ ] Product policy remains host-owned and injected.
- [ ] The Kit API is neutral and focused.
- [ ] Packed external consumption is verified when relevant.
- [ ] Kit checks and public-boundary checks pass.
- [ ] The API is published before the host depends on it.
- [ ] The host uses one exact Workbench Kit version cohort.
- [ ] Duplicate host mechanics are removed or have an exact removal trigger.
- [ ] Both repositories' plans and status notes reflect the final ownership.
