# Permission-scoped Activity Bar

Product hosts often need the Activity Bar to show different primary sidebar
destinations depending on who signed in. Workbench Kit can support this without
embedding product-specific roles in the framework.

## Feasibility

**Yes, with caveats.**

| Layer | Status |
| ----- | ------ |
| `ActivityContribution.when` in manifest / SDK | Supported in schema and types |
| `@workbench-kit/platform` when-clause evaluator | Implemented (`ContextKeyService`, `evaluateWorkbenchContextKeyWhenClause`) |
| Shell activity rendering | Filters contributed activities by `when` against host context keys |
| Secondary shell items (Profile, Settings) | Gated by `workbench.permissions.canOpenSettings` when the host sets it |
| View visibility inside a container | `ViewContribution.when` exists; sidebar view host filtering is a follow-up |
| Extension install-time enablement | Separate concern — `extensions.json` `enabled` list; hosts can combine with context keys |

The kit does **not** ship a `PermissionService` interface yet. Hosts own
authorization and map grants to context keys. That keeps the framework
product-neutral while matching the VS Code pattern (`when` + context keys).

## Recommended model

1. **Host authenticates** and resolves grants (roles, scopes, feature flags).
2. **Host seeds context keys** on `WorkbenchProvider` via `contextKeyValues` or
   `useWorkbench().contextKeyService.set(...)`.
3. **Contributions declare visibility** with `when` on activities (and optionally
   commands, menus, keybindings).
4. **Optional coarse control**: disable extensions in `extensions.json` when a
   whole bundle should be unavailable to a role.

### Standard permission context keys

Exported from `@workbench-kit/platform`:

| Key | Type | Meaning |
| --- | ---- | ------- |
| `workbench.permissions.role` | `'admin' \| 'basic'` | Diagnostic / compound when clauses |
| `workbench.permissions.canManageCommands` | `boolean` | Commands activity + command registry sidebar |
| `workbench.permissions.canOpenSettings` | `boolean` | Shell Settings secondary activity item |
| `workbench.permissions.canUseChat` | `boolean` | Reserved for chat activities |

Use `createWorkbenchPermissionContextKeys({ role })` as a starting point; hosts
should extend or replace keys for their own products.

### Example activity contribution

```json
{
  "id": "workbench-kit.builtin.commands.activity",
  "viewContainerId": "commands",
  "icon": "terminal",
  "title": "Commands",
  "order": 25,
  "when": "workbench.permissions.canManageCommands"
}
```

When the key is missing, `when` evaluates to **false** for that activity.
`WorkbenchProvider` seeds permissive admin defaults so existing hosts keep full
Activity Bar visibility until they pass `contextKeyValues`.

### Example host wiring

```tsx
import { createWorkbenchPermissionContextKeys } from '@workbench-kit/platform';
import { WorkbenchProvider } from '@workbench-kit/shell-react';

const contextKeyValues = createWorkbenchPermissionContextKeys({ role: 'basic' });

<WorkbenchProvider contextKeyValues={contextKeyValues}>
  <WorkbenchShell />
</WorkbenchProvider>;
```

Update keys after sign-in:

```tsx
const { contextKeyService } = useWorkbench();

contextKeyService.set('workbench.permissions.canManageCommands', hasCommandAdmin);
```

Activity items re-render when context keys change.

## Sample host demo (`examples/workbench-sample`)

| Account | Password | Activity Bar (primary) | Settings |
| ------- | -------- | ---------------------- | -------- |
| `tester` | `tester` | Explorer, Search, Chat, Commands, Extensions, … | Shown |
| `basic` | `basic` | Explorer, Chat | Hidden |

Implementation in the sample (not in kit core):

- `sample-permission-context.ts` maps `profile.accountId` → context keys and
  filters `extensions.json` enabled list for the basic role.
- `builtin.commands` activity uses `when: workbench.permissions.canManageCommands`.
- `WorkbenchProvider` receives `contextKeyValues` and a role-scoped
  `extensionsConfig`.

Sign out and sign in with the other account to compare layouts.

## Extension install path

Installed extensions register activities through the same manifest
`contributes.activities` entries. When the host enables an extension and the
activity passes its `when` clause, it appears in the Activity Bar. Disabling an
extension in config remains the coarse switch; `when` is the fine-grained switch
within enabled extensions.

Extension manifest `permissions` (for example `workspace.write`) govern runtime
capability approval — not Activity Bar visibility. Do not confuse the two.

## What not to do

- Do **not** hardcode product roles (`dev-agent`, `mesim-admin`, …) inside
  `@workbench-kit/*` packages.
- Do **not** fork builtin extensions per product; use context keys and host
  config instead.
- Do **not** hide activities only in CSS or by mutating `layout.activityBar.hiddenItemIds`
  for authorization — users could restore hidden items; `when` keeps contributions
  out of the resolved set.
- Do **not** assume `PermissionService` exists in the kit today; add a host
  adapter that writes context keys until a shared interface is proposed.

## Related docs

- [Contribution contracts](../architecture/contribution-contracts.md) — `ActivityContribution`
- [Plugin manifest guide](./plugin-manifest-guide.md)
- [Sample host backend API](./sample-host-backend-api.md)
