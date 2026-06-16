# Workbench Todo

## Purpose

Track workbench primitives that can be implemented independently from any
single downstream application. The items here should stay generic: no product
workflow names, customer data, private server details, or application-specific
state contracts.

## Scope Rules

| Rule                 | Description                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| Primitive first      | Build reusable layout, state, and rendering primitives before application-specific adapters.            |
| No domain terms      | Use generic command, artifact, preview, status, timeline, and explorer language.                        |
| Storybook required   | New visual primitives should include Storybook coverage before application integration.                 |
| Narrow exports       | Public APIs should expose stable component props and small data contracts.                              |
| Integration boundary | Each primitive should document the generic integration point it supports without naming an application. |

## Handoff Summary

This document is the work queue for the next Workbench Kit implementation pass.
The target is to improve generic workbench surfaces that command-heavy
applications can use without rewriting sidebar rows, command status cards,
timeline event cards, preview shells, or explorer provider composition.

The work can proceed independently from application implementation as long as it
stays generic and Storybook-driven. Application-specific workflows, artifact
schemas, tool names, service endpoints, and private configuration should remain
outside this repository.

For downstream extraction policy, see
[`downstream-extraction-strategy.md`](./downstream-extraction-strategy.md).

## Repository Context

| Area        | Current Baseline                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| Package     | `workbench-kit`                                                                                                 |
| React entry | `@workbench-kit/react`                                                                                          |
| Existing UI | `SideBarViewFrame`, `SideBarList`, `SideBarListItem`, `Badge`, `Button`, `ConfirmDialog`                        |
| Workbench   | `WorkbenchShell`, workbench chat, settings, sectioned panels, workspace explorer, editor, search, command model |
| Validation  | `pnpm validate` covers typecheck, lint, tests, format check, and Storybook build                                |

## Non-Goals

| Non-Goal                     | Reason                                                                  |
| ---------------------------- | ----------------------------------------------------------------------- |
| Application-specific screens | Keep this package reusable across multiple workbench applications.      |
| Product workflow names       | Public docs and APIs must avoid private product or customer knowledge.  |
| Direct runtime/API calls     | Workbench Kit should render state and dispatch callbacks, not own APIs. |
| Hard-coded artifact types    | Preview and explorer APIs should accept generic metadata.               |
| Local filesystem paths       | No private machine paths, linked package paths, or local env details.   |

## Generic API Boundary Notes

These notes clarify how downstream application needs should be translated into
Workbench Kit work. If a downstream application needs a product-specific
workflow, artifact, or command, the package should expose an extensible
primitive rather than hard-code the downstream concept.

| Topic              | Boundary                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Command execution  | Use generic execution metadata and callbacks. Do not require app-specific execution kinds, runtime objects, tool names, or runtime/API endpoints. |
| Command suggest    | Provide palette and composer-anchored suggest surfaces with configurable labels, empty states, active item control, and callback-based select.    |
| Navigation layout  | Provide a reusable fixed-nav + independently scrolling content layout that settings and sectioned panels can share.                               |
| Section navigation | Provide a settings-like section navigation layout with independent nav/body scrolling and scrollspy state. Downstreams provide section content.   |
| Command lifecycle  | Keep a shared status model generic. Downstream applications should map operation state into the public status type.                               |
| Timeline events    | Render generic operation events. Downstream applications own event creation, ordering, payload shape, and sensitive metadata filtering.           |
| Artifact preview   | Select preview renderers through extension, MIME type, artifact kind, or metadata. Do not include product artifact schemas in the package.        |
| Explorer providers | Preserve provider/root identity and generic actions. Downstream applications decide what each root represents.                                    |
| Accessibility      | Palette, suggest, dialogs, and lists should preserve focus behavior, keyboard navigation, and screen-reader state without downstream rewrites.    |

## Independent Work Queue

| ID    | Status      | Priority | Area       | Item                                          | Depends On                          | Package Target                                                                                              | Notes                                                                                                                                                                                        |
| ----- | ----------- | -------- | ---------- | --------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WB-01 | done        | P1       | Sidebar    | Section primitive                             | Existing sidebar frame              | `@workbench-kit/react`                                                                                      | Collapsible section with label, count/badge slot, and secondary action slot.                                                                                                                 |
| WB-02 | done        | P1       | Sidebar    | Action list primitive                         | WB-01                               | `@workbench-kit/react`                                                                                      | Render command/action rows with icon, status, shortcut, danger marker, and disabled reason.                                                                                                  |
| WB-03 | done        | P1       | Command    | Command model + palette/suggest shell         | WB-02                               | `@workbench-kit/react`                                                                                      | Searchable command surface and composer-anchored slash suggest with keyboard navigation and empty/unavailable states.                                                                        |
| WB-04 | done        | P2       | Timeline   | Operation event renderer                      | Generic event shape                 | `@workbench-kit/react`                                                                                      | Generic cards for operation call, operation result, file write, error, and progress events in an ordered message timeline.                                                                   |
| WB-05 | done        | P2       | Status     | Command status model                          | Generic lifecycle states            | `@workbench-kit/react`                                                                                      | Shared status labels and visual variants for idle, running, completed, failed, waiting, cancelled, and unavailable states.                                                                   |
| WB-06 | done        | P2       | Workspace  | Multi-provider explorer                       | Existing tree/list patterns         | `@workbench-kit/react`                                                                                      | Display files, virtual entries, state, config, and session artifacts from separate providers while preserving provider roots.                                                                |
| WB-07 | done        | P2       | Editor     | Code/preview/split shell                      | Existing editor host                | `@workbench-kit/react`                                                                                      | Toggle between code, preview, and split modes without requiring an application-specific editor.                                                                                              |
| WB-08 | done        | P2       | Editor     | Preview renderer registry                     | WB-07                               | `@workbench-kit/react`                                                                                      | Select preview renderers by file extension, MIME type, artifact kind, or fallback priority.                                                                                                  |
| WB-09 | done        | P3       | Modal      | Confirmation flow                             | Existing dialog primitives          | `@workbench-kit/react`                                                                                      | Reusable confirmation flow for destructive or external side-effect actions.                                                                                                                  |
| WB-10 | done        | P3       | Settings   | Schema form renderer                          | Existing field primitives           | `@workbench-kit/react`                                                                                      | Render simple settings forms from metadata without binding to an application settings store.                                                                                                 |
| WB-11 | done        | P2       | Settings   | Sectioned panel layout                        | Existing settings patterns          | `@workbench-kit/react`                                                                                      | Generic VS Code-style section nav + independently scrolling content panel with scrollspy state.                                                                                              |
| WB-12 | done        | P2       | Settings   | Structured data form renderer                 | WB-10, WB-11                        | `@workbench-kit/react`                                                                                      | Render nested data/forms/tables from generic schema metadata while keeping data paths, persistence, and runtime effects external.                                                            |
| WB-13 | done        | P2       | Command    | Command grouping/tag shell                    | WB-03, WB-05                        | `@workbench-kit/react`                                                                                      | Optional grouped command list/sidebar shell using descriptor category, keywords, status, danger, and execution metadata.                                                                     |
| WB-14 | done        | P2       | Command    | Shortcut command bridge                       | WB-03, WB-07                        | `@workbench-kit/react`                                                                                      | Provides generic shortcut matching, command dispatch helpers, a hook, and a bridge component without owning persistence.                                                                     |
| WB-15 | deferred    | P2       | State      | Dirty guard primitive                         | WB-09, WB-11                        | `@workbench-kit/react`                                                                                      | Deferred until save/discard/confirm routing policy is explicit.                                                                                                                              |
| WB-16 | done        | P2       | Settings   | Text array field primitive                    | WB-12                               | `@workbench-kit/react`                                                                                      | Renders editable string-array fields as item rows with add/remove controls while preserving whitespace during editing.                                                                       |
| WB-17 | done        | P1       | Settings   | Structured schema adapter                     | WB-12, WB-16                        | `@workbench-kit/react`                                                                                      | Convert JSON-schema-like field/section/table metadata into structured form sections without embedding consumer artifact schemas.                                                             |
| WB-18 | done        | P1       | Settings   | Editable structured table field               | WB-12                               | `@workbench-kit/react`                                                                                      | Add generic row add/delete/edit table support with column metadata, default row values, read-only mode, and update callbacks.                                                                |
| WB-19 | done        | P2       | Settings   | Section header action slot                    | WB-11                               | `@workbench-kit/react`                                                                                      | Allow sectioned panels or structured data sections to expose toolbar/header actions without custom consumer wrappers.                                                                        |
| WB-20 | pending     | P1       | Editor     | Resource draft controller                     | WB-07, WB-12, WB-15                 | `@workbench-kit/workspace`, `@workbench-kit/react`                                                          | Provide generic draft/save/discard state for nested resources edited inside a preview, not only the active editor file.                                                                      |
| WB-21 | done        | P2       | Workspace  | Structured data path helpers                  | WB-12                               | `@workbench-kit/workspace`                                                                                  | Extend generic nested path read/write helpers to support array indices and immutable updates for structured editors.                                                                         |
| WB-22 | pending     | P2       | Editor     | Structured artifact editor shell              | WB-07, WB-12, WB-20                 | `@workbench-kit/react`                                                                                      | Compose source/preview/split artifact editing with structured form preview actions, save/discard controls, and header policy.                                                                |
| WB-23 | done        | P0       | Harness    | Workbench sample host + launch boundary scope | Current staging baseline            | `examples/workbench-sample`, `scripts`                                                                      | Minimal Vite host at `pnpm workbench-sample`; reads `.workbench` extensions/layout.                                                                                                          |
| WB-24 | done        | P1       | Lifecycle  | ViewHost lifecycle contract                   | Existing ViewHost                   | `@workbench-kit/workbench-extension-sdk`, `@workbench-kit/workbench-react`                                  | Adds optional title/icon/closable metadata, show/hide/focus/blur/resize hooks, and codicon-backed activity icons without breaking existing providers.                                        |
| WB-25 | done        | P1       | Registry   | View/editor host factory registry             | WB-24                               | `@workbench-kit/workbench-core`, `@workbench-kit/workbench-extension-sdk`                                   | `ViewHostFactoryRegistry` + default provider factory; `workbench-react` resolves hosts through factories.                                                                                    |
| WB-26 | done        | P1       | Capability | Disposable capability registry                | Current static capability map       | `@workbench-kit/workbench-core`                                                                             | `CapabilityRegistry` with host seeding and extension `registerProvider`; disposed on deactivate.                                                                                             |
| WB-27 | done        | P1       | Workspace  | Resource mutation and transaction model       | Existing virtual workspace reducer  | `@workbench-kit/workspace`                                                                                  | Add resource URI, snapshot, mutation, and transaction contracts while preserving current file/path helpers.                                                                                  |
| WB-28 | in-progress | P1       | Editor     | Editor contribution and service model         | WB-24, WB-25, WB-27                 | `@workbench-kit/workbench-core`, `@workbench-kit/workbench-react`, `@workbench-kit/workbench-extension-sdk` | S1–S3 and S8.5–S8.6 done: tab chrome, `EditorArea`, builtin text editor, source/form/preview/split sample editing, save via `WorkspaceResourceTransaction`; explorer open remains for WB-29. |
| WB-29 | pending     | P2       | Workspace  | Command-backed built-in explorer              | WB-24, WB-26, WB-27                 | `extensions/builtin.explorer`, `@workbench-kit/workspace`, `@workbench-kit/workbench-react`                 | Back explorer create/rename/delete/move/search/reveal behavior with virtual workspace commands.                                                                                              |
| WB-30 | pending     | P2       | Config     | Preference scope and merge order              | Existing configuration contribution | `@workbench-kit/workbench-config`, `@workbench-kit/platform`                                                | Start with default/workspace/local preference scopes and leave user/resource/secret scopes explicit for later hardening.                                                                     |
| WB-31 | pending     | P3       | Devtools   | Registry and lifecycle inspectors             | WB-24, WB-26, WB-27                 | `@workbench-kit/workbench-react`                                                                            | Add command, context key, view, capability, layout, and workspace transaction inspectors after event streams stabilize.                                                                      |

## Suggested Implementation Order

| Order | Items        | Reason                                                                                          |
| ----- | ------------ | ----------------------------------------------------------------------------------------------- |
| 1     | WB-03        | Command-heavy workbenches need a shared command contract before palette and suggest surfaces.   |
| 2     | WB-05        | Command execution needs stable lifecycle labels and visual variants.                            |
| 3     | WB-04        | Message and operation events should render in one ordered timeline.                             |
| 4     | WB-07, WB-08 | Artifact preview should be reusable before adding specialized preview renderers.                |
| 5     | WB-06        | Multi-provider explorer benefits from preview and artifact conventions settling first.          |
| 6     | WB-09        | Confirmation flow can reuse command metadata and status feedback.                               |
| 7     | WB-10        | Schema forms can follow once settings and confirmation surfaces are stable.                     |
| 8     | WB-12        | Sectioned/nested forms should build on the simple form field primitives and sectioned layout.   |
| 9     | WB-13        | Grouped command shells can follow after command descriptor metadata is stable.                  |
| 10    | WB-14, WB-15 | Keyboard shortcuts and dirty guards should become generic once editor/form contexts converge.   |
| 11    | WB-16        | Structured forms should support string-array rows without treating them as newline textareas.   |
| 12    | WB-17, WB-21 | Schema adapters need generic nested path helpers before consumers can delete local form logic.  |
| 13    | WB-18, WB-19 | Editable tables and section actions remove the remaining custom structured-form wrappers.       |
| 14    | WB-20, WB-22 | Preview-based resource editing should use generic draft/save/discard instead of local caches.   |
| 15    | WB-23        | Theia-inspired work needs a runnable frontend-only host and fast boundary checks first.         |
| 16    | WB-24, WB-26 | Lifecycle hooks and capability lookup are the smallest Theia-pattern foundation slice.          |
| 17    | WB-25, WB-27 | Host factories and resource transactions establish the shared view/editor/workspace contract.   |
| 18    | WB-28, WB-29 | Editor and explorer behavior should build on lifecycle, factories, capabilities, and resources. |
| 19    | WB-30, WB-31 | Preference scopes and devtools inspectors follow once the core runtime contracts are stable.    |

## Recommended Next Slice

**Master completion roadmap:** [completion-plan.md](./completion-plan.md) (Lane A phases, sessions, DoD).

**Session work plan:** [session-work-plan.md](./session-work-plan.md) (S7–S12 immediate sessions, tracks, Korean 요약).

**Active slice detail:** [next-slice-plan.md](./next-slice-plan.md) (2026-06-14).

| Order | Slice       | Item                                                          | Mode                                                         |
| ----- | ----------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| 0     | Pre-plan    | `validate:full` + doc alignment + Lane A decision             | **Done** (2026-06-14)                                        |
| 1     | Doc hygiene | Align JSON widget / preview zoom doc truth with `widget-tree` | Done (prior pass)                                            |
| 2     | WB-23       | `examples/workbench-sample` frontend-only host                | **Done** (2026-06-14)                                        |
| 3     | WB-26       | Disposable `CapabilityRegistry` in `workbench-core`           | **Done** (2026-06-14)                                        |
| 4     | WB-25       | View/editor host factory registry                             | **Done** (2026-06-14)                                        |
| 5     | WB-27       | Resource URI / mutation / transaction model                   | **Done** (2026-06-14)                                        |
| 6     | WB-28       | Editor contribution and service model                         | **In progress (S8.6 done; explorer open deferred to WB-29)** |

The first downstream extraction pass is complete for command metadata,
sectioned settings layout, structured data forms, and command grouping
primitives. Shortcut dispatch is covered by WB-14, and structured text-array
rows are covered by WB-16. WB-15 is deferred until save/discard/confirm routing
policy is explicit.

The next downstream extraction pass should focus on removing consumer-owned
structured form infrastructure that is already generic in behavior. Keep
consumer-specific schema aliases, workflow stages, artifact resolution rules,
and business labels outside Workbench Kit.

For Theia-inspired workbench evolution, see
[`theia-strengths-workplan.md`](./theia-strengths-workplan.md). That plan keeps
the useful Theia patterns in scope while excluding Theia's DI container,
frontend/backend process model, plugin host, and marketplace execution.

| Step | Task                    | Expected Change                                                                                                        |
| ---- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1    | Structured form design  | Define a generic section/table/nested-field schema contract that does not include downstream artifact names.           |
| 2    | Structured form extract | Move reusable nested data helpers and table/form rendering into `@workbench-kit/react`, with callbacks for updates.    |
| 3    | Command grouping shell  | Add a grouped command list/sidebar primitive that consumes `WorkbenchCommandDescriptor` without owning execution.      |
| 4    | Shortcut bridge         | Define active command context registration for shortcuts such as save, with persistence handled by the consumer.       |
| 5    | Dirty guard primitive   | Extract reusable unsaved-change guard behavior with save/discard/confirm callbacks and Storybook coverage.             |
| 6    | Text array field        | Completed by WB-16 with generic string-array rows, item-level editing, and no edit-time trimming/filtering.            |
| 7    | Schema adapter          | Add a generic adapter from JSON-schema-like section/field/table metadata into `WorkbenchStructuredDataForm` sections.  |
| 8    | Editable tables         | Add generic editable structured tables so consumers do not own row add/delete/update grid logic.                       |
| 9    | Section action slots    | Add header/action slots to sectioned or structured form sections for save, discard, search, or command-backed actions. |
| 10   | Resource draft editing  | Add draft helpers for nested resources edited inside preview panels, with persistence delegated to consumers.          |
| 11   | Consumer follow-up      | Apply new primitives in downstream applications through application adapters and keep runtime effects outside the kit. |

## Current Extraction Todo (2026-06-05)

The latest downstream review identified the following generic work that should
move into Workbench Kit before further consumer simplification:

| Area                   | Workbench Kit Todo                                                                                                                                   | Keep In Consumer                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Structured schema      | Provide a schema-to-structured-form adapter for fields, sections, tables, defaults, enum/select, descriptions, readonly state, and validation hooks. | Domain-specific section aliases, default pattern names, workflow stage names, and artifact paths. |
| Editable table fields  | Provide editable structured table rows with add/delete/update, column metadata, default row creation, and immutable data updates.                    | Business-specific column ordering and row semantics.                                              |
| Section actions        | Add generic action slots to section headers so restore/save/search buttons do not require wrapper components.                                        | Button labels and command handlers tied to a specific application workflow.                       |
| Resource draft state   | Provide generic draft/save/discard control for nested resources edited from an artifact preview.                                                     | Actual persistence, file lookup, resource resolution, and side-effect policy.                     |
| Structured path helper | Move array-aware nested read/write helpers into `@workbench-kit/workspace`.                                                                          | Domain-specific fallback aliases from one data shape to another.                                  |
| Artifact editor shell  | Compose source/preview/split with structured preview actions and dirty-state affordances.                                                            | Specialized preview renderers for query, test, deploy, or other business stages.                  |

## Suggested API Shape

The exact names can change during implementation, but the public API should stay
small and generic.

```ts
type WorkbenchCommandExecution =
  | { kind: 'local' }
  | { kind: 'remote' }
  | { kind: 'agent' }
  | { kind: 'composite' }
  | { kind: string; label?: string };

type WorkbenchCommandFeedback = 'none' | 'status' | 'timeline';
type WorkbenchCommandOutput = 'none' | 'message' | 'event' | 'artifact';
type WorkbenchCommandSideEffect = 'none' | 'workspace-write' | 'external-write';

interface WorkbenchCommandDescriptor {
  id: string;
  label: string;
  description?: string;
  category?: string;
  icon?: string;
  keywords?: readonly string[];
  shortcut?: string;

  execution?: WorkbenchCommandExecution;
  feedback?: WorkbenchCommandFeedback;
  output?: WorkbenchCommandOutput;
  sideEffect?: WorkbenchCommandSideEffect;
  status?: WorkbenchCommandStatus;

  disabledReason?: string;
  danger?: boolean;
  metadata?: Record<string, unknown>;
}
```

The public command model should avoid making a downstream concept part of the
required runtime contract. For example, a downstream application can represent
a delegated command as `{ kind: 'agent' }` or `{ kind: 'delegated', label:
'Delegated' }`, but Workbench Kit should treat it as generic metadata and never
call a runtime directly.

```ts
interface WorkbenchNavigationPanelProps {
  nav?: React.ReactNode;
  navClassName?: string;
  navProps?: Omit<React.ComponentPropsWithRef<'nav'>, 'children' | 'className'>;
  content: React.ReactNode;
  contentClassName?: string;
  contentProps?: Omit<React.ComponentPropsWithRef<'div'>, 'children' | 'className'>;
}

interface WorkbenchSectionedPanelItem {
  anchorId: string;
  title: React.ReactNode;
  count?: number;
  render: () => React.ReactNode;
}

interface WorkbenchSectionedPanelProps {
  ariaLabel: string;
  items: readonly WorkbenchSectionedPanelItem[];
  activeAnchorId?: string;
  defaultActiveAnchorId?: string;
  readOnly?: boolean;
  onActiveAnchorChange?: (anchorId: string | undefined) => void;
}
```

```ts
interface WorkbenchTimelineEvent {
  id: string;
  kind: 'message' | 'operation-call' | 'operation-result' | 'file-write' | 'progress' | 'error';
  source?: 'assistant' | 'system' | 'user' | (string & {});
  title?: React.ReactNode;
  description?: React.ReactNode;
  content?: React.ReactNode;
  status?: WorkbenchStatus;
  timestamp?: React.ReactNode;
  metadata?: Record<string, unknown>;
  payload?: unknown;
}

interface WorkbenchArtifactDescriptor {
  id: string;
  path?: string;
  name?: string;
  title?: React.ReactNode;
  content?: unknown;
  extension?: string;
  mimeType?: string;
  artifactKind?: string;
  metadata?: Record<string, unknown>;
}

interface WorkbenchPreviewRenderer {
  id: string;
  label?: string;
  extensions?: readonly string[];
  mimeTypes?: readonly string[];
  artifactKinds?: readonly string[];
  fallback?: boolean;
  priority?: number;
  canRender?: (artifact: WorkbenchArtifactDescriptor) => boolean;
  render: (artifact: WorkbenchArtifactDescriptor) => React.ReactNode;
}

interface WorkbenchExplorerEntryRef {
  providerId: string;
  entryId: string;
}

interface WorkbenchExplorerEntryDescriptor {
  id: string;
  label: React.ReactNode;
  kind?: string;
  path?: string;
  icon?: string;
  description?: React.ReactNode;
  status?: WorkbenchStatus;
  disabled?: boolean;
  disabledReason?: React.ReactNode;
  selectable?: boolean;
  children?: readonly WorkbenchExplorerEntryDescriptor[];
  metadata?: Record<string, unknown>;
}

interface WorkbenchExplorerProviderDescriptor {
  id: string;
  label: React.ReactNode;
  kind?: string;
  icon?: string;
  description?: React.ReactNode;
  status?: WorkbenchStatus;
  disabled?: boolean;
  disabledReason?: React.ReactNode;
  entries?: readonly WorkbenchExplorerEntryDescriptor[];
  actions?: readonly WorkbenchExplorerActionDescriptor[];
  metadata?: Record<string, unknown>;
}

type WorkbenchConfirmationSideEffect =
  | 'none'
  | 'workspace-write'
  | 'external-write'
  | (string & {});

interface WorkbenchConfirmationAction {
  id: string;
  title: React.ReactNode;
  message: React.ReactNode;
  detail?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  pendingLabel?: React.ReactNode;
  variant?: 'default' | 'danger';
  danger?: boolean;
  sideEffect?: WorkbenchConfirmationSideEffect;
  status?: WorkbenchStatus;
  disabled?: boolean;
  disabledReason?: React.ReactNode;
  metadata?: Record<string, unknown>;
}

type WorkbenchSchemaFormFieldType = 'text' | 'select' | 'checkbox' | 'number';
type WorkbenchSchemaFormFieldValue = string | number | boolean;
type WorkbenchSchemaFormValues = Record<string, WorkbenchSchemaFormFieldValue>;

interface WorkbenchSchemaFormOption {
  label: React.ReactNode;
  value: string;
  disabled?: boolean;
}

interface WorkbenchSchemaFormFieldBase {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  defaultValue?: WorkbenchSchemaFormFieldValue;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  validationMessage?: React.ReactNode;
  metadata?: Record<string, unknown>;
}

type WorkbenchSchemaFormField =
  | (WorkbenchSchemaFormFieldBase & { type: 'text'; placeholder?: string })
  | (WorkbenchSchemaFormFieldBase & {
      type: 'select';
      options: readonly WorkbenchSchemaFormOption[];
    })
  | (WorkbenchSchemaFormFieldBase & { type: 'checkbox' })
  | (WorkbenchSchemaFormFieldBase & {
      type: 'number';
      min?: number;
      max?: number;
      step?: number;
    });
```

Structured data form work extends the form family with a separate API rather
than overloading the simple settings form. Current capabilities include nested
data paths, section summaries, table rows, read-only mode, sample data, and
update callbacks that return the next data object.

Prefer render props or slots for application-specific visuals. Avoid accepting
business-specific command names, artifact paths, runtime objects, or application
architecture terms in primitive props.

## Acceptance Criteria

| Item  | Acceptance Criteria                                                                                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WB-01 | Section can collapse/expand, exposes accessible heading semantics, preserves sidebar spacing, and supports optional badge/count and secondary action content.                                                 |
| WB-02 | Action row supports active, disabled, running, danger, selected, and unavailable states without layout shift; disabled rows expose a reason to assistive/user surfaces.                                       |
| WB-03 | Palette and composer slash suggest can filter commands, support keyboard navigation, render empty states, preserve focus handoff, and call an `onRunCommand`-style callback without owning command execution. |
| WB-04 | Event renderer can display generic messages, operation calls, operation results, file writes, progress, and errors in one ordered timeline with compact and expanded variants. Payloads stay pluggable.       |
| WB-05 | Status model maps command lifecycle states to stable labels and visual variants without assuming an application runtime. It should align sidebar action, command, timeline, and status-bar usage.             |
| WB-06 | Explorer can combine multiple provider roots while preserving root identity, selection, disabled states, and per-provider actions.                                                                            |
| WB-07 | Code/preview/split shell can switch modes, preserve selected file identity, and leave actual code editor/preview renderer implementation pluggable.                                                           |
| WB-08 | Registry can select renderers by extension, MIME type, artifact kind, or fallback priority, and can render a clear unsupported state.                                                                         |
| WB-09 | Confirmation flow supports default and danger variants, async confirm state, cancel/close behavior, and accessible dialog naming.                                                                             |
| WB-10 | Schema form renderer supports simple text/select/checkbox/number fields, validation messages, disabled/read-only states, and submit/cancel callbacks without store lock.                                      |
| WB-11 | Sectioned panel renders a navigation column only when needed, keeps nav/body scrolling independent, tracks the active section while scrolling, and exposes controlled active state.                           |
| WB-12 | Structured data form can render nested form/table sections from generic schema metadata and emit data changes without owning persistence or runtime effects.                                                  |
| WB-13 | Grouped command shell can render categories/tags/status/execution metadata and dispatch selected descriptors without executing commands internally.                                                           |
| WB-14 | Shortcut bridge can match common keyboard shortcut metadata, dispatch enabled command registry entries against the active context, and leave all side effects in command handlers.                            |
| WB-16 | Structured data form can render string-array fields as editable rows, emit item add/remove/update changes, and preserve whitespace while the user edits values.                                               |

## Storybook Requirements

| Surface                  | Required Stories                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------- |
| Sidebar section/list     | Dense sidebar, multiple sections, collapsed groups, disabled action, danger item        |
| Command palette/suggest  | Global palette, composer slash suggest, grouped shell, shortcut bridge, empty state     |
| Command event/status     | Running command, successful result, failure, waiting for confirmation, ordered timeline |
| Code/preview/split shell | Code only, preview only, split, unsupported preview                                     |
| Multi-provider explorer  | Files, generated artifacts, state/config roots, empty provider                          |
| Confirmation/schema form | Default confirm, danger confirm, async pending, read-only form, sectioned panel         |

## Implementation Notes

| Topic         | Guidance                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------- |
| Styling       | Reuse existing tokens and workbench surface styles before adding new variables.                   |
| Accessibility | Prefer native buttons for actions, preserve focus rings, and add labels for icon-only controls.   |
| Layout        | Fixed-height rows should not resize when status, icon, badge, or shortcut content appears.        |
| State         | Keep controlled/uncontrolled state boundaries explicit for collapsed sections and active actions. |
| Exports       | Add named exports and type exports from the smallest relevant public entrypoint.                  |
| Tests         | Add unit tests for non-trivial state helpers; use Storybook for visual permutations.              |

## Integration Checks

These checks document the generic integration point that each primitive should
support. The repository should validate primitives through Storybook, type
checks, tests, formatting, and builds. Applying the primitives to a specific
application remains outside this repository.

| Check              | Expected Result                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Sidebar actions    | An application can render workflow and command actions without custom row layout code.                        |
| Command feedback   | An application can show command execution state, tags, keywords, and operation events with shared primitives. |
| Artifact preview   | An application can switch between code and preview for JSON, Markdown, SQL, and custom artifacts.             |
| Explorer providers | An application can show files, virtual workspace entries, and generated artifacts in one explorer.            |
| Confirmation       | An application can gate external side-effect actions behind a reusable confirmation UI.                       |
| Settings forms     | An application can render metadata-driven settings and sectioned forms without binding to a settings store.   |

## Request Prompt For Codex

Use this prompt when asking another Codex instance to start implementation in
this repository:

```text
Please work in the current Workbench Kit repository on the active feature
branch. WB-01 through WB-14 in docs/workbench/todo.md are complete. WB-15 is
deferred, WB-16 is complete, and dirty-guard implementation should stay blocked
on explicit save/discard/confirm routing policy unless a more specific request is
provided.

Keep the work generic and public-boundary safe:
- Do not add application names, product workflow names, private paths, server
  addresses, credentials, or domain-specific artifact schemas.
- Use existing @workbench-kit/react primitive patterns.
- Keep application behavior, runtime calls, persistence, and product-specific
  state outside this package.

Before finishing, run:
- pnpm --filter @workbench-kit/react typecheck
- pnpm exec vitest run packages/react/src/workbench/ShortcutCommandBridge.test.ts packages/react/src/workbench/CommandPalette.test.ts packages/react/src/workbench/settings/SectionedPanel.test.tsx
- pnpm format:check

If public exports or shared types change broadly, run pnpm validate and
pnpm test:storybook-play:required.
Commit with an English Conventional Commit message and include validation in
the commit body.
```

## Validation

| Change Type        | Validation                                                                        |
| ------------------ | --------------------------------------------------------------------------------- |
| Documentation only | `pnpm format:check`                                                               |
| React primitive    | `pnpm --filter @workbench-kit/react typecheck` and relevant Storybook smoke check |
| Public API export  | `pnpm validate` before merge                                                      |
