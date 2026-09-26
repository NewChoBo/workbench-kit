# Dependency Rules

The current package graph and the target architecture are different. The graph
checker permits existing workbench, authoring and domain UI inside broad packages;
a passing check does not establish independently installable primitives or a
minimal shell. This document records the enforced baseline first, then the
remaining separation work.

## Current enforced package edges

[`scripts/check-workbench-dependency-graph.mjs`](../../scripts/check-workbench-dependency-graph.mjs)
is the source of truth for the allowlist. Names below omit `@workbench-kit/`.
An allowed edge is permission, not evidence that the manifest declares it.

| Package                   | Allowed Kit dependencies and source imports                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `base`                    | None                                                                                                                       |
| `platform`                | `base`                                                                                                                     |
| `tokens`                  | None                                                                                                                       |
| `workbench-extension-sdk` | `base`, `platform`                                                                                                         |
| `workbench-config`        | `base`, `platform`                                                                                                         |
| `workbench-core`          | `base`, `contracts`, `platform`, `workbench-config`, `workbench-extension-sdk`                                             |
| `shell-react`             | `platform`, `react`, `field-remap`, `tokens`, `workbench-config`, `workbench-core`, `workbench-extension-sdk`, `workspace` |
| `monaco`                  | `base`, `platform`                                                                                                         |
| `electron-shell`          | None                                                                                                                       |
| `contracts`               | None                                                                                                                       |
| `runtime`                 | `contracts`                                                                                                                |
| `workspace`               | None                                                                                                                       |
| `services`                | `contracts`                                                                                                                |
| `adapters`                | `contracts`, `runtime`, `workspace`                                                                                        |
| `jdw` (`json-widget`)     | `contracts`                                                                                                                |
| `jdw-editor`              | `jdw`, `react`                                                                                                             |
| `field-remap`             | `contracts`                                                                                                                |
| `react`                   | `adapters`, `contracts`, `jdw`, `monaco`, `platform`, `runtime`, `services`, `tokens`, `workbench-core`, `workspace`       |
| `logging`                 | None; currently uses the checker's empty fallback rather than an explicit `packageRules` entry                             |

Manifest comparison:

- `workbench-config` and `monaco` currently declare no Kit runtime/peer/optional
  dependencies despite their allowed `base`/`platform` edges. Other rows declare
  their listed Kit edges as `dependencies`; rows with no allowed edges declare none.
- `react` currently declares `workbench-core` as a dependency. Authoring projection
  types in `packages/react/src/authoring` import its design-system contracts. This
  edge is permitted today, not a currently enforced prohibition.
- `shell-react` declares `field-remap` as a dependency and publicly exports
  `./field-remap`. Its editor host also imports `FieldRemapEditorSurface`; this is
  shipped composition, not solely an unpublished demo.
- `jdw-editor` declares **Kit** `react` as a dependency and third-party `react` as
  a peer. `monaco` declares third-party `@monaco-editor/react` and `monaco-editor`
  dependencies plus `react`/`react-dom` peers. The graph checker does not classify
  those third-party edges.
- `adapters` may not import or declare Kit `jdw` under the current allowlist.

Repository sample extensions share this Kit allowlist: `base`, `platform`,
`react`, `workbench-core`, `workbench-extension-sdk`, `workspace`. The checker does
not distinguish extension core from extension UI. For example, the hello-world
sample currently declares both `workbench-core` and `workbench-extension-sdk`.
Built-ins inside `shell-react` use the enclosing package's rules rather than a
separate built-in allowlist. Neither extension packages nor the SDK may depend on
`shell-react` through the checked Kit edges.

## What the gate checks

Run `pnpm check:dependency-graph`. It is part of `validate:static`, and therefore
also `validate:fast` and `validate`.

- For immediate package directories under `packages/*` and `extensions/*`, check
  Kit names in `dependencies`, `peerDependencies` and `optionalDependencies`
  against the allowlist. `devDependencies` are not checked as manifest edges.
- Scan JavaScript/TypeScript files under each package's `src`, including tests and
  stories, for literal import/export declarations and literal dynamic imports.
  Type-only import declarations follow the same package rule.
- Reject public packages with runtime, peer or optional dependencies on private
  packages found under `packages/*`; the private-dependency exception map is empty.
- Reject cycles among packages under `packages/*`, using the union of their Kit
  runtime, peer and optional manifest edges. This is not a source-import cycle or
  extension-manifest cycle analysis.
- Reject the removed `@workbench-kit/core` alias explicitly. Other removed bridge
  packages are absent from all allowlists.

Scope limits matter: the scanner reduces Kit subpaths to their package name. It
does not validate each subpath against public exports, check relative cross-package
imports, resolve computed imports or CommonJS `require`, or police third-party
React/Node imports. A manifest allowlist check also does not prove that every
source import has a correctly declared runtime or peer dependency. Keep public
export, packed-consumer and framework-independence checks alongside this gate.

## Target: independent primitives and optional feature UI

Foundation, platform services and workbench core should remain usable without
React. Primitives should need neither workbench-core registries nor a shell
provider. Extension core should use SDK contracts and minimal platform utilities;
extension UI should enter through public contributions, not shell internals.
These are architectural responsibilities. The package-level gate enforces their
Kit directions where the current allowlist permits it; it does not fully enforce
third-party framework independence or boundaries inside the broad `react` package.

The following current edges are separation debt, not proof that the target has
been achieved:

| Current coupling                                                                                          | Intended separation                                                                                                                            | Condition for removing the broad allowance                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `react` groups primitives, workbench UI, authoring, JDW and editor integration, with ten Kit dependencies | Give primitives a minimal installable boundary; place workbench/authoring/domain/editor composition behind separately owned feature boundaries | Move the corresponding public exports, imports and consumers to their owners; verify standalone primitive installation and packed imports without core/shell/domain dependencies. Remove each obsolete manifest edge and allowlist permission together after its last use is gone. A subpath alone does not remove package installation dependencies. |
| `shell-react` ships Field Remap UI and its editor route                                                   | Keep Mapping UI independently consumable; let shell composition opt into a feature through a public contribution boundary                      | Move the Mapping UI exports and editor integration out of the mandatory shell closure, migrate consumers, and verify Mapping without the shell and the shell without Mapping. Then remove the shell's `field-remap` dependency and allowlist edge.                                                                                                    |

The existing focused native text-input browser artifact is evidence for that one
control across hosts. It does not complete React package separation, portable
styling or all primitive controls. Focused bundle checks and tree shaking likewise
do not establish a minimal installation dependency set.

Do not expand a broad allowance simply because it already exists. New work needs
a named owner, a bounded public contract and standalone verification. Separation
must preserve existing contracts until their consumers have migrated; this
document does not remove a public export or authorize an unplanned package split.

## Workspace, publishing and consumer verification

Use `workspace:*` for internal development references. Current Kit relationships
are primarily dependencies, not an all-peer model. Packing rewrites workspace
references; the packed cohort gate requires every Kit dependency, optional
dependency and peer reference to match the exact cohort version and rejects
remaining `workspace:` references or unpublished Kit names. External peers retain
their separately declared ranges.

The default packed-consumer gate freshly builds and packs the publish set, then
extracts tarballs into an external fixture. Its third-party dependencies are
linked from the existing repository installation. This verifies real package
contents, public consumption and selected bundle boundaries, but does not itself
perform a fresh consumer dependency resolution/install.

The separate `pnpm check:packed-shell-react-context` command creates a consumer
lockfile offline, guards it against the repository lock, and performs an offline
frozen install of the tarball cohort before its browser cases. It is not currently
called by `validate:static` or the CI validation command. This narrower optional
lane does not make clean consumer installation a mandatory gate for every package
or prove a cold-cache registry install.

## Other boundaries

Use only public package exports and SDK types across package boundaries. New code
must not depend on `@workbench-kit/core`, `@workbench-kit/vscode-host`,
`@workbench-kit/vscode-extension` or `@workbench-kit/workbench-vscode-adapter`.
The command/context APIs live in `@workbench-kit/platform`; Storybook demo service
wiring uses local helpers over `@workbench-kit/services`. Do not reintroduce removed
bridge packages as dev dependencies; that policy requires review because the graph
checker's manifest scan excludes dev dependencies.

`pnpm check:extension-manifests` separately checks extension IDs, identity/engine
fields, hard dependencies and cycles, local extension metadata and extension-pack
references. The extension bundler runs that check before generating its output.

## Related Documents

- [Package Map](./package-map.md)
- [Migration Strategy](./migration-strategy.md)
- [Project Structure](./project-structure.md)
- [Extension System](./extension-system.md)
- [Security Boundary](./security-boundary.md)
