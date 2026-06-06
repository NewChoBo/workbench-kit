# Workbench Consumer Migration Plan

This document tracks reusable UI and interaction work that should move from
consumer applications into `@workbench-kit/react`. Consumer-specific workflow
logic must stay outside the package.

## Scope Boundary

Workbench-kit should provide generic primitives only.

Keep in workbench-kit:

- Command metadata, command palette/suggest shell, and command invocation hooks.
- Editor surfaces for source, preview, and split modes.
- Dirty-state, save-command, and navigation guard primitives.
- Schema-driven form/settings renderers.
- Scrollspy settings layout with fixed navigation and independently scrolling body.
- Structured field controls, including string arrays and command-backed actions.
- Read-only schema/data preview shells.
- Timeline/event rendering primitives for command and tool lifecycle display.

Keep in consumers:

- Domain workflow names, stages, and routing decisions.
- Domain file naming conventions and application-specific resource suffixes.
- Domain schema resolution rules.
- Query, test, deploy, agreement, or interface-specific business behavior.
- Backend, agent, or runtime execution implementations.
- Actual command handlers that read, write, deploy, search, or call services.

Additional migration guide for launch-related shared contracts:

- [library-launch-migration-runbook.md](./library-launch-migration-runbook.md)

## Reconciled Status Summary

| Candidate                    | Status    | Current Evidence                                                                                        | Remaining Boundary                                                                                    |
| ---------------------------- | --------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Command model and commands   | reflected | `CommandPalette.tsx`, `commands.ts`, `ShortcutCommandBridge.tsx`, command tests, and command stories    | Audit-specific metadata remains generic `metadata` or consumer-owned                                  |
| Active editor save primitive | partial   | Editor command presets, `WorkspaceEditorPanel` save/discard callbacks, shortcut bridge                  | Global active-editor registration and blocking-dialog exclusion remain tied to dirty guard policy     |
| Dirty guard primitive        | deferred  | `ConfirmationFlow` and editor dirty state exist                                                         | Save/discard/confirm routing policy must be explicit before extracting WB-15                          |
| Editor surface shell         | reflected | `WorkspaceEditorPanel`, `WorkbenchArtifactShell`, preview mode controls, custom render callbacks        | Consumers still own editor persistence and specialized editor implementations                         |
| Schema/settings UI           | reflected | `WorkbenchSchemaForm`, `WorkbenchStructuredDataForm`, `WorkbenchSectionedPanel`, settings stories/tests | Validation timing and severity expansion are separate policy choices                                  |
| Structured field controls    | partial   | text/select/checkbox/number/string-array fields and read-only structured tables                         | Editable key-value/table controls are not part of the current generic baseline                        |
| Validation model             | partial   | required fields, field-level messages, custom validators, external errors, submittable helpers          | warning severity and validate-on-change/save policy are deferred                                      |
| Command-backed field actions | deferred  | Command model exists                                                                                    | Field action schema and command context contract need a dedicated API decision                        |
| Schema/data preview shell    | partial   | `WorkbenchArtifactShell` supports code/preview/split and renderer selection                             | Dedicated schema/sample preview shell remains consumer-specific composition until requirements settle |
| Scrollspy layout primitive   | reflected | `WorkbenchNavigationPanel` and `WorkbenchSectionedPanel`                                                | Search/filter slots can be supplied by consumers through surrounding composition                      |
| Timeline/event renderer      | reflected | `WorkbenchTimeline`, tests, and stories                                                                 | Consumers own event semantics, persistence, and sensitive metadata filtering                          |
| Resource/preview registry    | reflected | `WorkbenchPreviewRenderer`, `selectWorkbenchPreviewRenderer`, `getWorkbenchPreviewRenderer`, tests      | Resource descriptors stay generic and should not hardcode application artifact schemas                |

## Current Migration Candidates

### 1. Command Model And Built-In Workbench Commands

Status: reflected

Add reusable command metadata that can represent both package-provided commands
and consumer commands.

Current API shape:

- `id`
- `label`
- `description`
- `category`
- `keywords`
- `shortcut`
- `execution`
- `status`
- `sideEffect`
- `output`
- `disabledReason`
- `danger`
- `metadata`

Workbench-kit may ship generic command definitions such as:

- open command palette
- save active editor
- switch to source mode
- switch to preview mode
- switch to split mode
- close active editor

Workbench-kit must not execute business behavior directly. It should call
consumer callbacks such as `onRunCommand(command, context)`.

Evidence: `WorkbenchCommandDescriptor`, command presets, command palette/suggest/group
shells, shortcut bridge, and command tests.

### 10. Library Launchpad Mapping And Widget Renderer Contracts

Status: active

Goal:

- Fix shared execution rules (launch-target normalization, `launchType` inference,
  `workingDirectory` derivation, binding payload) in `@workbench-kit/contracts` so per-app launcher
  logic does not diverge.
- Fix JSON widget renderer event/shape types through `WidgetRenderer*` contracts so renderer
  wrappers stay aligned across apps.

Required migrations for each downstream:

1. Remove local `launchTarget` utilities (trim, type inference, working-directory calculation) from
   launch execution paths and replace them with `normalizeLaunchTarget`,
   `inferLaunchTypeFromTarget`, and `resolveLaunchpadLibraryItemMapping`.
2. Replace app-specific tile/item action label, icon, and payload derivation with
   `createLaunchpadLibraryItemTileBinding` plus normalized reference payloads.
3. Align JSON widget-tree renderer handler types with `WidgetRendererComponent` and
   `WidgetRendererProps`.

Acceptance checks:

- For the same input set, each consumer must produce identical `launchType` (`url` / `app` / `file` /
  `folder`), `workingDirectory`, `canLaunch`, `subtitle`, and `arguments`.
- Blank or whitespace-only targets must converge to `canLaunch=false`, `execution.target=null`, and
  `launchType=null`.
- `WidgetRendererProps` must keep shared renderer event kinds `press` and `change`.

### 2. Active Editor Save Primitive

Status: partial

Consumer editors currently need consistent Ctrl/Cmd+S behavior across Monaco,
form preview, split mode, and non-input panel focus.

Add a generic active editor save layer:

- active editor registration
- `isDirty`
- `onSave`
- optional `canSave`
- optional `saveLabel`
- keyboard binding helper for Ctrl/Cmd+S
- browser save-dialog prevention when an editor save handler is active
- modal/dialog exclusion so shortcuts do not fire over blocking UI

This should remain generic. The package should not know how persistence works.

Current coverage: editor command presets, `WorkspaceEditorPanel` draft save/discard
callbacks, and `WorkbenchShortcutCommandBridge`.

Deferred: global active-editor registration, blocking-dialog exclusion, and
save/discard/confirm routing belong with WB-15 dirty guard policy.

### 3. Dirty Guard Primitive

Status: deferred

Extract navigation protection into a reusable primitive.

Required capabilities:

- track dirty state
- request navigation
- block navigation when dirty
- expose confirm/cancel/discard/save decisions
- allow consumers to render their own confirm dialog

Workbench-kit can provide state management and a default dialog shell, but the
consumer should provide labels and actual save/discard handlers.

Deferred until save/discard/confirm routing policy is explicit.

### 4. Editor Surface Shell

Status: reflected

Create a shared editor shell that supports:

- source-only mode
- preview-only mode
- split mode
- tab/body visual continuity
- optional path/header area in source mode
- no path/header area when preview-only content does not need it
- stable toolbar slots for preview/split/source controls

The shell should remove ad hoc wrapping and padding differences between
consumer editor screens.

Evidence: `WorkspaceEditorPanel` covers editor tabs and draft actions, while
`WorkbenchArtifactShell` covers code, preview, and split artifact modes.

### 5. Schema-Driven Form And Settings UI

Status: reflected

The current direction is to align with VS Code settings UI:

- fixed left navigation
- right body scroll only
- scrollspy active section
- compact form field spacing
- full-width body usage without unwanted right-side padding
- body-colored header with a bottom border when a header is present
- field labels, descriptions, controls, and validation messages in a predictable
  vertical rhythm

Workbench-kit exposes this as generic schema/settings renderers rather than a
consumer-specific form renderer.

Evidence: `WorkbenchSchemaForm`, `WorkbenchStructuredDataForm`,
`WorkbenchNavigationPanel`, `WorkbenchSectionedPanel`, and settings stories/tests.

### 6. Structured Field Controls

Status: partial

Move reusable field controls into workbench-kit:

- text input
- textarea
- select
- checkbox
- number input
- string array input
- key-value/table input
- read-only value row

String array controls should preserve user input while editing. Do not trim or
filter text on each keystroke. Normalization should happen only during explicit
validation, save, or export phases.

Current coverage: text, select, checkbox, number, string-array fields, and
read-only structured tables.

Deferred: editable key-value/table controls require a separate generic API
decision.

### 7. Validation Model

Status: partial

Add form/schema validation support.

Required capabilities:

- required fields
- type validation
- pattern/min/max/enum validation
- custom validator callback
- warning vs error severity
- validation summary
- field-level messages
- validate-on-change configuration
- validate-on-save configuration

Default behavior should avoid destructive normalization while typing.

Current coverage: required fields, field-level validation messages, custom
validators, external errors, and submittable helpers.

Deferred: warning severity and validate-on-change/save policy are explicit
behavior decisions.

### 8. Command-Backed Field Actions

Status: deferred

Some fields need actions such as search, pick, apply, reset, or open details.
Workbench-kit should provide the UI contract, while consumers provide command
handlers.

Example generic schema field metadata:

```ts
interface WorkbenchFieldAction {
  id: string;
  title: string;
  icon?: React.ReactNode;
  commandId: string;
  placement?: 'inline' | 'toolbar' | 'menu';
}
```

The package should not know what the command searches or how selected data is
applied. It only passes context and receives updates from the consumer.

Deferred until the field-action schema and command context boundary are defined.

### 9. Schema/Data Preview Shell

Status: partial

Add a read-only preview shell for schema or structured data.

Required capabilities:

- optional header identifying the preview target
- body-colored header styling with bottom border
- JSON/source preview slot
- optional sample UI slot
- readonly visual state

Consumers decide whether a schema preview includes a sample UI. If the sample
UI introduces nested scroll problems, the consumer can disable it.

Current coverage: `WorkbenchArtifactShell` provides read-only code/preview/split
display and pluggable preview renderers for generic artifacts.

Deferred: dedicated schema/sample preview composition remains consumer-owned
until generic requirements are clearer.

### 10. Scrollspy Layout Primitive

Status: reflected

Extract the settings-style layout:

- fixed navigation panel
- independently scrolling body panel
- active section tracking
- section registration
- programmatic scroll-to-section
- optional search/filter slot
- optional toolbar/header slot

This should be reusable by settings screens, schema forms, and workflow step
panels.

Evidence: `WorkbenchNavigationPanel`, `WorkbenchSectionedPanel`, and
`WorkbenchStructuredDataForm`.

### 11. Timeline/Event Renderer

Status: reflected

Command, tool, and message events need one ordered renderer.

The primitive should preserve event order:

```text
user message
tool_call
tool_result
agent message
```

Workbench-kit should provide item primitives and timeline layout. Consumers
provide event semantics, text, actions, and persistence.

Evidence: `WorkbenchTimeline`, `WorkbenchTimelineItem`, timeline tests, and
timeline stories.

### 12. Resource/Preview Registry

Status: reflected

Add a registry that maps generic resource descriptors to editor or preview
renderers.

Generic descriptor example:

```ts
interface WorkbenchResourceDescriptor {
  id: string;
  title: string;
  path?: string;
  kind?: string;
  mediaType?: string;
  rendererType?: string;
  metadata?: Record<string, unknown>;
}
```

This supports consumer cases where different files or resources need different
preview components without hardcoding consumer types in workbench-kit.

Evidence: `WorkbenchArtifactDescriptor`, `WorkbenchPreviewRenderer`,
`selectWorkbenchPreviewRenderer`, `getWorkbenchPreviewRenderer`, artifact shell
tests, and artifact stories.

## Consumer Integration Rule

The workbench repo should validate:

- public API types
- Storybook coverage
- unit tests
- generic interaction behavior
- package build/check

Actual consumer verification should happen in the consumer repository after the
workbench package changes are available. Workbench-kit should not embed a
consumer application for verification.

## Suggested Work Order

1. Command model and built-in workbench commands.
2. Active editor save primitive.
3. Dirty guard primitive.
4. Editor surface shell.
5. Scrollspy layout primitive.
6. Schema/settings form renderer.
7. Structured field controls.
8. Validation model.
9. Command-backed field actions.
10. Schema/data preview shell.
11. Resource/preview registry.
12. Timeline/event renderer.

## Deferred Decisions

- Whether validation should run on change by default or only on save.
- Whether the package should include default modal/dialog components or only
  expose headless state primitives.
- Which command tags/categories should be included as built-in defaults.
- Whether source/preview/split mode state is owned by the editor shell or by the
  consumer.
- How much of schema field metadata should follow JSON Schema directly versus a
  workbench-specific extension layer.
