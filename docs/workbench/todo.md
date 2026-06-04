# Workbench Todo

## Purpose

Track workbench primitives that can be implemented independently from any
single consumer application. The items here should stay generic: no product
workflow names, customer data, private server details, or application-specific
state contracts.

## Scope Rules

| Rule               | Description                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------- |
| Primitive first    | Build reusable layout, state, and rendering primitives before consumer-specific adapters. |
| No domain terms    | Use generic command, artifact, preview, status, and explorer language.                    |
| Storybook required | New visual primitives should include Storybook coverage before consumer integration.      |
| Narrow exports     | Public APIs should expose stable component props and small data contracts.                |
| Consumer verified  | Each primitive should list the consumer integration point that proves it is useful.       |

## Handoff Summary

This document is the work queue for the next Workbench Kit implementation pass.
The target is to improve generic workbench surfaces that command-heavy
consumer applications can use without rewriting sidebar rows, command status
cards, event cards, preview shells, or explorer provider composition.

The work can proceed independently from consumer application implementation as
long as it stays generic and Storybook-driven. Consumer-specific workflows,
artifact schemas, tool names, service endpoints, and private configuration
should remain outside this repository.

## Repository Context

| Area        | Current Baseline                                                                              |
| ----------- | --------------------------------------------------------------------------------------------- |
| Package     | `workbench-kit`                                                                               |
| React entry | `@workbench-kit/react`                                                                        |
| Existing UI | `SideBarViewFrame`, `SideBarList`, `SideBarListItem`, `Badge`, `Button`, `ConfirmDialog`      |
| Workbench   | `WorkbenchShell`, workbench chat, settings, workspace explorer, editor, search, command model |
| Validation  | `pnpm validate` covers typecheck, lint, tests, format check, and Storybook build              |

## Non-Goals

| Non-Goal                  | Reason                                                                  |
| ------------------------- | ----------------------------------------------------------------------- |
| Consumer-specific screens | Keep this package reusable across multiple workbench consumers.         |
| Product workflow names    | Public docs and APIs must avoid private product or customer knowledge.  |
| Direct backend calls      | Workbench Kit should render state and dispatch callbacks, not own APIs. |
| Hard-coded artifact types | Preview and explorer APIs should accept generic metadata.               |
| Local filesystem paths    | No private machine paths, linked package paths, or local env details.   |

## Independent Work Queue

| ID    | Priority | Area      | Item                          | Depends On                       | Package Target         | Notes                                                                                                                 |
| ----- | -------- | --------- | ----------------------------- | -------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| WB-01 | P1       | Sidebar   | Section primitive             | Existing sidebar frame           | `@workbench-kit/react` | Collapsible section with label, count/badge slot, and secondary action slot.                                          |
| WB-02 | P1       | Sidebar   | Action list primitive         | WB-01                            | `@workbench-kit/react` | Render command/action rows with icon, status, shortcut, danger marker, and disabled reason.                           |
| WB-03 | P1       | Command   | Command palette/suggest shell | WB-02                            | `@workbench-kit/react` | Searchable command surface and composer-anchored slash suggest with keyboard navigation and empty/unavailable states. |
| WB-04 | P2       | Chat      | Tool event renderer           | Consumer event shape draft       | `@workbench-kit/react` | Generic cards for tool call, tool result, file write, error, and progress events.                                     |
| WB-05 | P2       | Status    | Command status model          | Consumer command lifecycle draft | `@workbench-kit/react` | Shared status labels and visual variants for idle, running, completed, failed, and waiting states.                    |
| WB-06 | P2       | Workspace | Multi-provider explorer       | Existing tree/list patterns      | `@workbench-kit/react` | Display real files, virtual files, state, config, and session artifacts from separate providers.                      |
| WB-07 | P2       | Editor    | Code/preview/split shell      | Existing editor host             | `@workbench-kit/react` | Toggle between code, preview, and split modes without requiring a consumer-specific editor.                           |
| WB-08 | P2       | Editor    | Preview renderer registry     | WB-07                            | `@workbench-kit/react` | Select preview renderers by file extension, MIME type, or artifact kind.                                              |
| WB-09 | P3       | Modal     | Confirmation flow             | Existing dialog primitives       | `@workbench-kit/react` | Reusable confirmation flow for destructive or external side-effect actions.                                           |
| WB-10 | P3       | Settings  | Schema form renderer          | Existing field primitives        | `@workbench-kit/react` | Render simple settings forms from metadata without binding to a consumer settings store.                              |

## Suggested Implementation Order

| Order | Items               | Reason                                                                                                               |
| ----- | ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1     | WB-01, WB-02        | Sidebar action surfaces are needed before command-heavy consumer panels can be polished.                             |
| 2     | WB-04, WB-05        | Command execution needs visible event and status feedback.                                                           |
| 3     | WB-07, WB-08        | Artifact preview should be reusable before adding specialized preview renderers.                                     |
| 4     | WB-06               | Multi-provider explorer benefits from early consumer feedback after artifact conventions settle.                     |
| 5     | WB-03, WB-09, WB-10 | Palette, slash suggest, confirmation, and schema form work can follow once command and settings contracts stabilize. |

## Recommended First Slice

Start with WB-01 and WB-02. They are useful before any consumer command runtime
is complete because they only need generic action metadata and render states.

| Step | Task                         | Expected Change                                                                  |
| ---- | ---------------------------- | -------------------------------------------------------------------------------- |
| 1    | Inspect existing sidebar API | Review `SideBarViewFrame`, `SideBarList`, `SideBarListItem`, and related styles. |
| 2    | Define section primitive     | Add a collapsible sidebar section with heading, count/badge, and action slots.   |
| 3    | Define action row primitive  | Add a command/action row with icon slot, label, status, shortcut, and metadata.  |
| 4    | Add Storybook coverage       | Show idle, active, running, disabled, danger, and empty states.                  |
| 5    | Export public API            | Export components and types from the existing React package entrypoint.          |
| 6    | Validate                     | Run focused typecheck and format checks; run full validation before merge.       |

## Suggested API Shape

The exact names can change during implementation, but the public API should stay
small and generic.

```ts
type WorkbenchActionStatus = 'idle' | 'running' | 'completed' | 'failed' | 'waiting' | 'disabled';

interface WorkbenchActionItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  status?: WorkbenchActionStatus;
  shortcut?: string;
  disabledReason?: string;
  danger?: boolean;
  metadata?: Record<string, unknown>;
}
```

```ts
interface WorkbenchSidebarSection {
  id: string;
  title: string;
  count?: number;
  defaultCollapsed?: boolean;
}
```

Prefer render props or slots for consumer-specific visuals. Avoid accepting
business-specific command names, artifact paths, or runtime objects in primitive
props.

## Acceptance Criteria

| Item  | Acceptance Criteria                                                                                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WB-01 | Section can collapse/expand, exposes accessible heading semantics, preserves sidebar spacing, and supports optional badge/count and secondary action content.                                                 |
| WB-02 | Action row supports active, disabled, running, danger, selected, and unavailable states without layout shift; disabled rows expose a reason to assistive/user surfaces.                                       |
| WB-03 | Palette and composer slash suggest can filter commands, support keyboard navigation, render empty states, preserve focus handoff, and call an `onRunCommand`-style callback without owning command execution. |
| WB-04 | Event renderer can display generic tool call, result, file write, progress, and error events with compact and expanded variants.                                                                              |
| WB-05 | Status model maps command lifecycle states to stable labels and visual variants without assuming a consumer runtime.                                                                                          |
| WB-06 | Explorer can combine multiple provider roots while preserving root identity, selection, disabled states, and per-provider actions.                                                                            |
| WB-07 | Code/preview/split shell can switch modes, preserve selected file identity, and leave actual code editor/preview renderer implementation pluggable.                                                           |
| WB-08 | Registry can select renderers by extension, MIME type, artifact kind, or fallback priority, and can render a clear unsupported state.                                                                         |
| WB-09 | Confirmation flow supports default and danger variants, async confirm state, cancel/close behavior, and accessible dialog naming.                                                                             |
| WB-10 | Schema form renderer supports simple text/select/checkbox/number fields, validation messages, disabled/read-only states, and submit/cancel callbacks without store lock.                                      |

## Storybook Requirements

| Surface                  | Required Stories                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Sidebar section/list     | Dense sidebar, multiple sections, collapsed groups, disabled action, danger item          |
| Command palette/suggest  | Global palette, composer slash suggest, filtered results, empty state, keyboard selection |
| Command event/status     | Running command, successful result, failure, waiting for confirmation                     |
| Code/preview/split shell | Code only, preview only, split, unsupported preview                                       |
| Multi-provider explorer  | Files, generated artifacts, state/config roots, empty provider                            |
| Confirmation/schema form | Default confirm, danger confirm, async pending, read-only form                            |

## Implementation Notes

| Topic         | Guidance                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------- |
| Styling       | Reuse existing tokens and workbench surface styles before adding new variables.                   |
| Accessibility | Prefer native buttons for actions, preserve focus rings, and add labels for icon-only controls.   |
| Layout        | Fixed-height rows should not resize when status, icon, badge, or shortcut content appears.        |
| State         | Keep controlled/uncontrolled state boundaries explicit for collapsed sections and active actions. |
| Exports       | Add named exports and type exports from the smallest relevant public entrypoint.                  |
| Tests         | Add unit tests for non-trivial state helpers; use Storybook for visual permutations.              |

## Consumer Integration Checks

| Check              | Expected Result                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Sidebar actions    | A consumer can render workflow and command actions without custom row layout code.                 |
| Command feedback   | A consumer can show command execution state and tool events with shared visual primitives.         |
| Artifact preview   | A consumer can switch between code and preview for JSON, Markdown, SQL, and custom artifact kinds. |
| Explorer providers | A consumer can show files, virtual workspace entries, and generated artifacts in one explorer.     |
| Confirmation       | A consumer can gate external side-effect actions behind a reusable confirmation UI.                |

## Request Prompt For Codex

Use this prompt when asking another Codex instance to start implementation in
this repository:

```text
Please work in the current Workbench Kit repository on the active feature
branch. Implement the first slice from docs/workbench/todo.md: WB-01 Sidebar
Section and WB-02 Action List.

Keep the work generic and public-boundary safe:
- Do not add consumer application names, product workflow names, private paths,
  server addresses, credentials, or domain-specific artifact schemas.
- Use existing @workbench-kit/react primitives, tokens, and sidebar styles.
- Add Storybook coverage for idle, active, running, disabled, danger,
  collapsed, and empty states.
- Export the new primitives and types from the appropriate React entrypoint.
- Keep command execution callback-based; do not introduce backend/API calls.

Before finishing, run:
- pnpm --filter @workbench-kit/react typecheck
- pnpm format:check

If public exports or shared types change broadly, run pnpm validate.
Commit with an English Conventional Commit message and include validation in
the commit body.
```

## Validation

| Change Type        | Validation                                                                        |
| ------------------ | --------------------------------------------------------------------------------- |
| Documentation only | `pnpm format:check`                                                               |
| React primitive    | `pnpm --filter @workbench-kit/react typecheck` and relevant Storybook smoke check |
| Public API export  | `pnpm validate` before merge                                                      |
