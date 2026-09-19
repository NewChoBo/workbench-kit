# Native controls receipt — wave 5

Status: `LOCALLY_INTEGRATED / SOURCE_REVIEW_PASS / COMBINED_VALIDATION_PASS`.
Date: 2026-09-19. Branch: `codex/stabilization-units-20260919`.

Admission commit: `7ba2c38ad08ac71089626a7817d00a049ff385fa`, from
`9a59da7b1184c90dc197126dfe145c963b3ce000`.
Part commit: `19ca64f29efbe1404aab9cedd1e9c73b94546dd5`.
The integrator reviewed the complete three-file part, reran its 15 tests and
fast-forwarded it after commit-safety. The part used a separate worktree/install.
The packet is ST-006B; ST-006A remains the earlier React Checkbox conformance
unit. The admission initially reused that identifier; only its label is corrected.

## Delivery and ownership

The [comparison](./standard-ui-delivery.md) separates one behavior implementation
from its delivery options. Native HTML remains sufficient for ordinary controls.
The optional `@workbench-kit/platform/native-checkbox` binder standardizes edit
snapshots and explicit cleanup. It does not create markup, styling, a custom tag,
framework binding, document state or a save policy. Thin wrappers are optional
consumer conveniences with no duplicated behavior owner.

The [part receipt](./parts/native-checkbox-receipt.md) records the small source
boundary. Integration adds one browser export/build entry, strict packed type and
runtime consumption, and 15 exact required cases. No dependency, version, root
export, existing React implementation or package cohort changed.

The existing Input host harness is shared with Checkbox. It still builds actual
React/Vue/Svelte consumers while externalizing the same browser leaf; no-build
HTML copies it directly. Artifact hashes, no-import checks, module-graph checks,
child failures/timeouts and safe retained-output paths remain enforced. Existing
Input scenarios and source fixtures are unchanged.

## Independent review

Producer-distinct design review clarified unsupported-type handling and independent
property requests before implementation. Integration source/packaging/harness
review corrected a TypeScript array-length narrowing issue and ensured the packed
DOM fixture uses its document realm's FormData. Independent host-matrix review
added a native edit before rerender and immediate state assertions before setters
could mask stale replay. Final read-only reviews found no blocking issue.

## Browser and artifact evidence

Checkbox browser leaf: **1,784 bytes**, with no imports.
SHA-256: `09a71d4238aea382b2e7ce371ec3c5ae4235b7a2453646b697a2e078db2eedd7`.
Input leaf remains **1,962 bytes** and retains
`f06803397f6169e0edf9b8c97dd55eb94b8607f94de9628bd6a87fb0665f811f`.
Artifact equality is reuse evidence, not a performance comparison or total
consumer bundle size.

Checkbox passes 12 named scenarios in each HTML/React/Vue/Svelte host: native
defaults/labels and StrictMode ownership; original change/order; silent writes;
independent property/control requests; rerender identity/focus/state; form values;
reset/canceled reset; required/disabled/readOnly; label/canceled activation;
duplicate ownership; actual unmount; and three actual remount cycles.

The Codex in-app browser ran all **48 scenario executions**, then independently
operated pointer click, Space, label click, mixed-state update, reset, focus through
rerender, unmount and remount in every host. Each activation produced one edit;
programmatic mixed/reset operations produced none. Reset restored defaultChecked
while retaining indeterminate. Unmount left zero bindings and remount restored two.
React StrictMode exercised additional setup/cleanup without duplicate edits.
This is one browser engine; other engines, visual styling and screen readers were
not qualified. The no-build/framework fixtures remain available under the ignored
`tmp/native-checkbox-hosts/dist` directory after the packed gate.

## Combined verification

`pnpm validate:fast` passed: **492 files / 2,983 tests**, with a fresh required
gate enforcing **15 units / 154 cases**. Typechecks, exact-optional consumers,
lint/format, exports, dependency/workspace/launch boundaries, schemas, story tags
and public-reference/secret checks passed. An initial attempt stopped on missing
Node global imports in the ignored local preview server; explicit imports fixed
that helper before the complete rerun passed.

The packed gate freshly built/extracted all 19 packages at unchanged local cohort
`0.0.2-prototype.0.2.6`. Checkbox strict types, import without DOM, native runtime
and focused graph/CSS exclusion passed. Checkbox's 48 host scenarios and the
existing Input's 40 scenarios passed using the hashes above. Initial gzip remains
**253,011 / 253,064 bytes**. Third-party dependencies are reused through links;
this is fresh tarball consumption, not a new independent clean-install gate.
Only receipt/status documentation changed after the complete run, followed by
focused formatting and commit-safety. Full Storybook play/release validation
and the optional independent-install context lane were not run.

## Remaining work

PropertyRow's label/control/diagnostic contract, shared appearance, real OS IME
for Input, compound-control delivery, SSR and framework ecosystem conveniences
remain separate packets. Broad React/core and shell/Mapping coupling, preview
controller ownership and independent-install gating remain structural work.
This local capability does not complete portable UI, whole-library stability,
develop integration, release validation, publication or consumer adoption.
