# Kit Design Principles — Generic, Domain-Neutral, Extensible Packages

> Scope: every `@workbench-kit/*` package in `packages/*`.
> Companion docs (read-only references): [reference-implementation-strategy.md](./reference-implementation-strategy.md),
> [unified-work-plan.md](./unified-work-plan.md),
> [library-launch-mapping-commonization-plan.md](./library-launch-mapping-commonization-plan.md).

## 1. Core principle

`@workbench-kit/*` packages are **generic, domain-neutral, extensible libraries**.
Consumers (`custom_launcher`, `tile_paper`) MAY be domain-specific; the kit MUST NOT be.

- The kit ships **mechanisms** (registries, contracts, generic primitives, injection points).
- Consumers ship **policy** (which widget types exist, what a "tile" or "launchpad" means, Steam URLs, game metadata).
- A reader of kit source code should not be able to tell whether the consumer is a game launcher,
  a dashboard builder, or a note-taking app.

This is the inverse of "build for TilePaper, then try to extract." We build a neutral substrate and let
domain meaning live one layer up.

## 2. Domain-neutral core, domain-specific consumers

| Layer                                      | Examples                                                                                                             | Allowed vocabulary                                                                               |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Kit (`@workbench-kit/*`)                   | `contracts`, `core`, `json-widget`, `react`, `services`, `runtime`, `workspace`, `tokens`, `adapters`, `vscode-host` | widget, registry, command, when-clause, resource, item, provider, catalog, patch, save, manifest |
| Consumer (`tile_paper`, `custom_launcher`) | app code wiring the kit                                                                                              | launchpad, tile, library item, Steam, game, playtime, artwork                                    |

Domain terms (launchpad, tile, Steam, game, playtime) are **forbidden in kit type names, enums, and logic**.
They are **expected** in consumer code that configures the kit.

## 3. Extensibility mechanisms (first-class requirements)

The kit prefers open extension over closed enumeration. Use these patterns, in rough priority order:

1. **Registries** — runtime-populated maps keyed by `string`, not hard-coded `union` types.
   The reference pattern is `WidgetRegistryContract<TBuild>` in `contracts/widget-registry-contract.ts`:
   `has/get/definition/definitions/types` over an open `type: string`. Consumers register their own widget types.
2. **Dependency injection** — pass collaborators in, do not hard-code them.
   The reference pattern is `LibraryCatalogService` (`services/library.ts`): `providers` are injected and can be
   `registerProvider`/`unregisterProvider`'d at runtime. The kit knows nothing about _which_ providers exist.
3. **Generic type parameters** — thread the domain payload through as `<T>` instead of inlining a concrete shape.
   `WidgetTypeDefinition<W extends WidgetTypeShape, TBuild = unknown>` is the model: the build/output type is the
   consumer's, the kit only requires `{ type: string }`.
4. **Contribution points** — declarative entries (commands, menus, plugins) merged from many sources.
   See `core/commands.ts` (`mergeCommandContributions`, `createCommandRegistryFromContributions`) and
   `contracts/plugin.ts` (`PluginContributions`).
5. **Adapter interfaces** — narrow ports the consumer implements (e.g. `WorkspaceFileRepository`,
   `WorkspacePatchApplier`, `ChatTransport`, `LibraryProvider`). The kit depends on the interface, the host supplies
   the implementation.
6. **`when`-clause / context-key evaluation** — generic conditional visibility (`core/when-clause.ts`,
   `core/context-keys.ts`) rather than bespoke per-feature flags.

## 4. Naming rules

- **Kit:** generic nouns only — `Widget`, `Registry`, `Command`, `Resource`, `Item`, `Provider`, `Catalog`,
  `Patch`, `Save`, `Manifest`, `Workbench` (UI-shell concept, acceptable as it names the _editor frame_, not a domain).
- **Consumer:** domain nouns — `Launchpad`, `Tile`, `LibraryItem` (game-sense), `Steam`, `Game`, `Playtime`.
- A kit symbol containing `Launchpad`, `Steam`, `TilePaper`, `Game`, `Playtime`, or `Artwork` is a **leak** and must be
  flagged.
- `Workbench*` UI primitives are acceptable in the kit **only** when they describe a neutral editor/shell concern
  (panel, tree, canvas, command palette). `WorkbenchFullscreenLauncherRoot` is borderline — "Launcher" leaks intent.

## 5. API design rules

- **Prefer open registries over closed enums** where the set is consumer-extensible.
  - `WidgetRegistryContract` (open `string`) — good.
  - `LibraryItemKind = 'app' | 'command' | 'folder' | 'game' | 'other' | 'tile' | 'url'` — leaky: `'game'` and `'tile'`
    are domain values baked into a kit union. Prefer `kind: string` + a consumer-side validation registry, or a generic
    `LibraryItemKind = string` with documented well-known values.
- **Thread domain payloads through generics** (`metadata?: Record<string, unknown>` or `<T>`), do not inline
  domain-specific fields into kit contracts.
- **Keep transforms reversible and policy-free.** A kit function should map structure → structure; _which_ structure is
  meaningful is the consumer's call. `provider-library-mapping.ts`'s `steam://` synthesis is policy and belongs in a
  consumer.
- **Resource URIs use a neutral scheme contract** (`resource-uri.ts`: any RFC-3986-ish scheme). A fixed
  `tilepaper-authoring:` protocol baked into a kit module is a leak.

## 6. Guidance: when a feature is domain-flavored

When you need behavior that _feels_ domain-specific, split it:

1. **Mechanism in the kit** — a generic registry/contract/transform with `string` keys and `<T>`/`Record` payloads.
2. **Configuration in the consumer** — the concrete keys, enum members, icon/label maps, URL synthesis.

Worked example — "map a catalog item to a launch action":

- Kit: `interface ItemActionResolver<TItem, TAction> { resolve(item: TItem): TAction | null }` plus an open
  `ActionRegistry<TAction>` keyed by `action.type: string`.
- Consumer (`custom_launcher`): registers `'steam'`, `'exec'`, `'url'` resolvers; owns `steam://` URL synthesis,
  `ProviderSteamActionMode`, and icon/label tables.

This keeps `providerActionToLaunchAction` / `ProviderSteamAction` out of `@workbench-kit/contracts`.

## 7. Examples from the current code

**Good (keep as the model):**

- `contracts/widget-registry-contract.ts` — open `type: string`, generic `<TBuild>`, optional inspector/schema.
- `core/commands.ts`, `core/context-keys.ts`, `core/when-clause.ts` — VS Code-style neutral primitives.
- `contracts/resource-uri.ts`, `contracts/external-url.ts` — scheme-generic.
- `services/library.ts` `LibraryCatalogService` — provider injection + registry, no hard-coded sources.

**Borderline (generalize when touched):**

- `contracts/library.ts` — catalog/provider/manifest pattern is reasonably generic, but `LibraryItemKind` bakes in
  `'game'`/`'tile'`.
- `react` `WorkbenchFullscreenLauncherRoot` — "Launcher" naming leak; the component itself is a generic fullscreen shell.

**Leak (should move to consumer or be reshaped):**

- `contracts/library-launchpad-mapping.ts` — `Launchpad*`, `launch-tile`, game fields (`playtimeMinutes`,
  `releaseYear`, `isOwned`, `playCount`, `installState`).
- `contracts/provider-library-mapping.ts` — `ProviderSteamAction`, `steam://` synthesis, Steam modes.
- `contracts/authoring-workbench-state.ts` — `TilePaper*` names, `tilepaper-authoring:` protocol,
  `launchpad`/`tile`/`library-item` kinds.

## 8. Checklist for adding new kit code

Before merging any new symbol into `@workbench-kit/*`:

- [ ] No domain term in the name (`Launchpad`, `Tile`, `Steam`, `TilePaper`, `Game`, `Playtime`, `Artwork`, …).
- [ ] No domain-specific enum member; if a set must be open, use `string` + a registry/validator instead of a `union`.
- [ ] No hard-coded protocol/scheme/URL synthesis tied to one product (`steam://`, `tilepaper-authoring:`).
- [ ] Domain payload is threaded via a generic `<T>` or `Record<string, unknown>` `metadata`, not inlined fields.
- [ ] Collaborators are injected (constructor/options) or registered, not imported as concrete singletons.
- [ ] A second, unrelated consumer (imagine a dashboard builder) could reuse this symbol unchanged.
- [ ] Tests/fixtures may use domain words (e.g. a `'tile'` demo widget) **only** in `*.test.ts` / `demo/` files.
- [ ] Public surface is re-exported from the package `index.ts` with neutral names.

If any box is unchecked, either rename/reshape to a mechanism, or move the domain part to the consumer per §6.
