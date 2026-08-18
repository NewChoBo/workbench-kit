# Host Capability Boundary

Status: `TARGET_CONFIRMED` for dependency and transport boundaries. A new public generic capability registry is `DEFER` pending independent reuse evidence.

This document refines the host/platform portion of the Workbench Kit target architecture. It defines the generic boundary only; integrating-host product capabilities, IPC channel names, paths, defaults, and policy remain host-owned.

## Decision

Workbench Kit targets **focused typed capability ports and focused host-adapter leaves**, not one public application-wide host object or unrestricted service locator.

A host may privately aggregate capabilities at its composition root, but feature code should depend on the smallest capability contract it actually requires. Aggregation is a composition implementation detail, not a public runtime dependency pattern.

The `CapabilityRegistry<TCapability>` role in `target-architecture.md` is therefore a scoped/internal composition concept unless future independent consumers prove a stable public registry contract. It is not authorization to expose arbitrary services by string/key lookup from renderer features or extensions.

## Target rules

1. Generic behavior is expressed as focused framework-neutral ports or focused Electron adapter helpers.
2. Renderer-facing Electron bridges expose explicit operations over allowlisted transport. They never expose raw `ipcRenderer`, arbitrary invoke/subscribe, or a generic channel bag.
3. Product policy, product capability names, IPC channel names, filesystem paths, provider models, credentials, and product defaults are injected or owned by the integrating host.
4. Browser hosts omit unsupported native capabilities at composition time instead of requiring fake native behavior.
5. Capability absence/degradation is explicit at the consuming boundary. A universal public availability algebra is not introduced until repeated cross-domain semantics justify it.
6. A generic capability is promoted only when it can be specified without consumer nouns and validated as a focused public package/subpath contract.
7. Public APIs prefer capability-specific imports and adapters over one broad preload/application facade.

## CURRENT SOURCE FACT

The current public package structure already provides substantial evidence for this boundary:

- `@workbench-kit/platform` publishes focused framework-neutral leaves for window geometry/residency, persistence helpers, network and Node-specific helpers.
- `@workbench-kit/electron-shell` publishes focused leaves for window controls, external links, sender security, secret vault, preload helpers, asset protocol and application quit lifecycle.
- the current preload scaffold creates explicit typed wrappers over allowlisted invoke/subscribe functions and does not expose Electron's renderer transport object.
- current package architecture already assigns product IPC names, policy and product values to the integrating host.

These are migration and validation facts. They support the target boundary but do not require every future host capability to be added pre-emptively.

## GAP

The unresolved gap is **not** “build one generic host capability registry containing every possible desktop service.”

Future gaps are capability-specific and evidence-driven:

```text
concrete reusable host need
  -> neutral behavior contract
  -> focused port/adapter design
  -> package/subpath ownership review
  -> packed external-consumer validation
  -> publish/release
```

Until a concrete reusable need exists, FileSystem/Process/Clipboard/Notification and similar examples in the target architecture remain candidate capability families rather than an implementation checklist.

## Discovery decision

Electron's official context-isolation, contextBridge, IPC and security guidance reinforces the narrow-bridge direction: renderer APIs should expose limited methods rather than raw IPC primitives, and bridge values/functions must fit the contextBridge boundary.

Classification:

- **ADOPT** — focused renderer bridge methods, allowlisted transport, explicit host-owned policy, and capability-sliced dependencies.
- **DEFER** — a new public general-purpose capability registry/provider API. Falsifier: at least two independent public consumers require the same registration, lookup, availability and lifecycle semantics and cannot be served cleanly by focused ports/composition.
- **REJECT** — renderer-accessible arbitrary service lookup or raw IPC/channel access as a generic Workbench API.

## Package ownership

### `@workbench-kit/platform`

Own framework-neutral algorithms, contracts and ports only when they have generic behavior independent of Electron and product policy.

### `@workbench-kit/electron-shell`

Own focused Electron main/preload/security/lifecycle adapter mechanics and safe transport wrappers. It does not own a consumer's complete preload object.

### Integrating host

Own product capability composition, product IPC channels, persistence locations, credentials/provider policy, browser fallbacks and the decision about which capabilities are present.

## Source-review conclusion for the current foundation

The existing focused package leaves and allowlisted preload scaffold are consistent with this target. The target is therefore **NARROWED** from a speculative inventory of generic ports to a demand-driven boundary rule.

No new broad Workbench runtime API is required merely to satisfy this architecture decision. New implementation packets should be created only for a concrete missing generic capability with independent reuse evidence.

## Validation / falsifiers

Revisit this decision if any of the following becomes true:

- multiple independent consumers duplicate the same typed capability registration/lookup/lifecycle code;
- focused subpaths create unmanageable composition or compatibility coupling;
- capability availability needs one demonstrably shared dynamic state model across unrelated features;
- browser/Electron/native hosts cannot be composed without leaking transport details into feature code.

Otherwise, keep the generic boundary small and capability-specific.
