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

| ID    | Status  | Priority | Area      | Item                                  | Depends On                  | Package Target         | Notes                                                                                                                             |
| ----- | ------- | -------- | --------- | ------------------------------------- | --------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| WB-01 | done    | P1       | Sidebar   | Section primitive                     | Existing sidebar frame      | `@workbench-kit/react` | Collapsible section with label, count/badge slot, and secondary action slot.                                                      |
| WB-02 | done    | P1       | Sidebar   | Action list primitive                 | WB-01                       | `@workbench-kit/react` | Render command/action rows with icon, status, shortcut, danger marker, and disabled reason.                                       |
| WB-03 | done    | P1       | Command   | Command model + palette/suggest shell | WB-02                       | `@workbench-kit/react` | Searchable command surface and composer-anchored slash suggest with keyboard navigation and empty/unavailable states.             |
| WB-04 | done    | P2       | Timeline  | Operation event renderer              | Generic event shape         | `@workbench-kit/react` | Generic cards for operation call, operation result, file write, error, and progress events in an ordered message timeline.        |
| WB-05 | done    | P2       | Status    | Command status model                  | Generic lifecycle states    | `@workbench-kit/react` | Shared status labels and visual variants for idle, running, completed, failed, waiting, cancelled, and unavailable states.        |
| WB-06 | done    | P2       | Workspace | Multi-provider explorer               | Existing tree/list patterns | `@workbench-kit/react` | Display files, virtual entries, state, config, and session artifacts from separate providers while preserving provider roots.     |
| WB-07 | done    | P2       | Editor    | Code/preview/split shell              | Existing editor host        | `@workbench-kit/react` | Toggle between code, preview, and split modes without requiring an application-specific editor.                                   |
| WB-08 | done    | P2       | Editor    | Preview renderer registry             | WB-07                       | `@workbench-kit/react` | Select preview renderers by file extension, MIME type, artifact kind, or fallback priority.                                       |
| WB-09 | done    | P3       | Modal     | Confirmation flow                     | Existing dialog primitives  | `@workbench-kit/react` | Reusable confirmation flow for destructive or external side-effect actions.                                                       |
| WB-10 | done    | P3       | Settings  | Schema form renderer                  | Existing field primitives   | `@workbench-kit/react` | Render simple settings forms from metadata without binding to an application settings store.                                      |
| WB-11 | done    | P2       | Settings  | Sectioned panel layout                | Existing settings patterns  | `@workbench-kit/react` | Generic VS Code-style section nav + independently scrolling content panel with scrollspy state.                                   |
| WB-12 | pending | P2       | Settings  | Structured data form renderer         | WB-10, WB-11                | `@workbench-kit/react` | Render nested data/forms/tables from generic schema metadata while keeping data paths, persistence, and runtime effects external. |
| WB-13 | pending | P2       | Command   | Command grouping/tag shell            | WB-03, WB-05                | `@workbench-kit/react` | Optional grouped command list/sidebar shell using descriptor category, keywords, status, danger, and execution metadata.          |

## Suggested Implementation Order

| Order | Items        | Reason                                                                                        |
| ----- | ------------ | --------------------------------------------------------------------------------------------- |
| 1     | WB-03        | Command-heavy workbenches need a shared command contract before palette and suggest surfaces. |
| 2     | WB-05        | Command execution needs stable lifecycle labels and visual variants.                          |
| 3     | WB-04        | Message and operation events should render in one ordered timeline.                           |
| 4     | WB-07, WB-08 | Artifact preview should be reusable before adding specialized preview renderers.              |
| 5     | WB-06        | Multi-provider explorer benefits from preview and artifact conventions settling first.        |
| 6     | WB-09        | Confirmation flow can reuse command metadata and status feedback.                             |
| 7     | WB-10        | Schema forms can follow once settings and confirmation surfaces are stable.                   |
| 8     | WB-12        | Sectioned/nested forms should build on the simple form field primitives and sectioned layout. |
| 9     | WB-13        | Grouped command shells can follow after command descriptor metadata is stable.                |

## Recommended Next Slice

The first downstream extraction pass is complete for command metadata and
sectioned settings layout. Future work should continue with structured form and
command grouping primitives, while preserving the generic public API boundary
documented here.

| Step | Task                    | Expected Change                                                                                                        |
| ---- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1    | Structured form design  | Define a generic section/table/nested-field schema contract that does not include downstream artifact names.           |
| 2    | Structured form extract | Move reusable nested data helpers and table/form rendering into `@workbench-kit/react`, with callbacks for updates.    |
| 3    | Command grouping shell  | Add a grouped command list/sidebar primitive that consumes `WorkbenchCommandDescriptor` without owning execution.      |
| 4    | Consumer follow-up      | Apply new primitives in downstream applications through application adapters and keep runtime effects outside the kit. |

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

Future structured data form work should extend the form family with a separate
API rather than overloading the simple settings form. Expected capabilities:
nested data paths, section summaries, table rows, read-only mode, sample data,
and update callbacks that return the next data object.

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

## Storybook Requirements

| Surface                  | Required Stories                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Sidebar section/list     | Dense sidebar, multiple sections, collapsed groups, disabled action, danger item          |
| Command palette/suggest  | Global palette, composer slash suggest, filtered results, empty state, keyboard selection |
| Command event/status     | Running command, successful result, failure, waiting for confirmation, ordered timeline   |
| Code/preview/split shell | Code only, preview only, split, unsupported preview                                       |
| Multi-provider explorer  | Files, generated artifacts, state/config roots, empty provider                            |
| Confirmation/schema form | Default confirm, danger confirm, async pending, read-only form, sectioned panel           |

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
branch. WB-01 through WB-11 in docs/workbench/todo.md are complete. Continue
with WB-12 or WB-13 unless a more specific generic follow-up is requested.

Keep the work generic and public-boundary safe:
- Do not add application names, product workflow names, private paths, server
  addresses, credentials, or domain-specific artifact schemas.
- Use existing @workbench-kit/react primitive patterns.
- Keep application behavior, runtime calls, persistence, and product-specific
  state outside this package.

Before finishing, run:
- pnpm --filter @workbench-kit/react typecheck
- pnpm exec vitest run packages/react/src/workbench/CommandPalette.test.ts packages/react/src/workbench/settings/SectionedPanel.test.tsx
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
