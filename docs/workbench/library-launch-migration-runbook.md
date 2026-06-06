# Library Launch Mapping Migration Runbook

## Purpose

- Migrate `custom_launcher` and `tile_paper` library execution rules to the single
  `@workbench-kit/contracts` surface.
- Remove per-app duplicate logic for `launchTarget` resolution, `workingDirectory`
  derivation, and widget event types.

## Scope

- `custom_launcher`: library launch eligibility, execution binding, and live binding refresh
- `tile_paper`: provider-library action labels/icons/payloads and JSON widget renderer contracts

## Principles

1. Keep UI rendering responsibility in each app.
2. Centralize data and policy rules in `@workbench-kit/contracts`.
3. Land changes only after they pass behavioral equivalence gates.

## Preflight

- Confirm `@workbench-kit/contracts` public APIs are importable:
  - `createLaunchpadLibraryItemTileBinding`
  - `normalizeLaunchTarget`
  - `inferLaunchTypeFromTarget`
  - `resolveLaunchpadLibraryItemMapping`
  - `WidgetRendererComponent`, `WidgetRendererProps`
- Confirm shared rule tests exist in `packages/contracts/src/library-launchpad-mapping.test.ts`:
  - `app` / `file` / `folder` / `url` branching
  - trim with case preservation
  - blank-target non-launchability
  - binding payload shape

## Checklist: custom_launcher

Example replacement snippets:

```ts
// before
import { detectLaunchType, deriveWorkingDir, isValidLaunchTarget } from 'shared/launch-target';

// after
import {
  canMapLibraryItemToLaunchpadTile,
  inferLaunchTypeFromTarget,
  resolveLaunchpadLibraryItemMapping,
  normalizeLaunchTarget,
} from '@workbench-kit/contracts';
```

```ts
// before
const executable = item.launchTarget ? item.launchTarget.trim() : null;
const launchType = isValidLaunchType(executable) ? computeType(executable) : null;

// after
const mapping = resolveLaunchpadLibraryItemMapping(item);
const execution = mapping.execution;
const canLaunch = mapping.canLaunch;
```

1. Align launch execution paths
   - Before: local `launch-target` utilities or consumer-specific parsing
   - After: compute through `inferLaunchTypeFromTarget`, `deriveLaunchWorkingDirectory`,
     `normalizeLaunchTarget`, and `resolveLaunchpadLibraryItemMapping`
2. Verify live and snapshot binding mapping consistency
   - `resolveLaunchpadLibraryItemMapping().execution` must produce the same target,
     `launchType`, and `workingDirectory` for execution requests
3. Open-location and working-directory forwarding
   - Pass `sourcePath`, `workingDirectory`, and `target` without duplicate normalization

## Checklist: tile_paper

Example replacement snippets:

```ts
// before
import { getProviderActionLabel, getProviderActionIcon } from 'consumer/provider-model';

// after
import { resolveLaunchpadLibraryItemMapping } from '@workbench-kit/contracts';
```

1. Library action labels and icons
   - Ensure `providerActionLabel` and `providerActionIcon` call the shared contract helpers
2. Renderer payload
   - Ensure JSON widget event/shape data is built from `WidgetRendererProps`
3. Launch action payload generation
   - Ensure tile payload (`launchType` / `target` / `workingDirectory` / `arguments`) follows
     the contract rules

## Acceptance Checks (Consumer Minimum)

For each test sample, compare:

- `launchType`: `app` / `url` / `file` / `folder`
- `execution.target`: trimmed value, or `null` when empty
- `workingDirectory`: computed for `app`, otherwise `null`
- `arguments`: contract default values
- `subtitle`: deduplicated fragment composition
- `canLaunch`: `false` for blank targets, `true` when a usable target exists
- Widget renderer event kinds remain `press` / `change`

## Post-Migration Guards

- Remove direct `shared` launch-resolution helpers from `custom_launcher` and `tile_paper`
- Change policy only in `@workbench-kit/contracts`; consumers update equivalence tests

## Patch Templates (Downstream)

These templates are conceptual. Replace paths and symbol names with the actual consumer
locations.

### A. custom_launcher

1. Replace launch-mapping imports

```diff
@@
-import { detectLaunchType, deriveWorkingDirectory, normalizeLaunchInput } from 'shared/launch-target';
+import {
+  canMapLibraryItemToLaunchpadTile,
+  normalizeLaunchTarget,
+  resolveLaunchpadLibraryItemMapping,
+} from '@workbench-kit/contracts';
```

2. Normalize execution-request calculation

```diff
@@
-const target = item.launchTarget?.trim() ?? null;
-const launchType = target ? detectLaunchType(target) : null;
-const workingDirectory = launchType === 'app' ? deriveWorkingDirectory(target) : null;
-const canLaunch = !!target;
-
-return {
-  target,
-  launchType,
-  workingDirectory,
-  canLaunch,
-};
+const mapping = resolveLaunchpadLibraryItemMapping(item);
+const { canLaunch, execution } = mapping;
+const { target, launchType, workingDirectory } = execution;
```

3. Add execution-request verification test

```ts
import { resolveLaunchpadLibraryItemMapping } from '@workbench-kit/contracts';

it('maps launch request through contracts', () => {
  const mapped = resolveLaunchpadLibraryItemMapping({
    itemId: 'm-1',
    launchTarget: ' C:/Games/Example/App.exe ',
  });
  expect(mapped.canLaunch).toBe(true);
  expect(mapped.execution.target).toBe('C:/Games/Example/App.exe');
  expect(mapped.execution.launchType).toBe('app');
  expect(mapped.execution.workingDirectory).toBe('C:/Games/Example');
});
```

### B. tile_paper

1. Align provider action derivation with shared mapping

```diff
@@
-import { providerActionIcon, providerActionTypeLabel } from './legacy-provider-library';
+import { resolveLaunchpadLibraryItemMapping } from '@workbench-kit/contracts';
```

2. Build provider action payloads from contract fields only

```diff
@@
-const launchType = parseLaunchType(item.launchTarget);
-const cwd = computeWorkingDirectory(launchType, item.launchTarget);
-return { launchType, cwd, arguments: [] };
+const execution = resolveLaunchpadLibraryItemMapping(item).execution;
+return {
+  launchType: execution.launchType,
+  cwd: execution.workingDirectory,
+  arguments: execution.arguments,
+  target: execution.target,
+};
```

3. Unify JSON widget renderer event types

```diff
@@
-type WidgetRendererEvent = { kind: 'on-change' | 'on-press'; payload?: string };
+import type { WidgetRendererEvent, WidgetRendererEventKind } from '@workbench-kit/contracts';
```

## Quick Acceptance Script

```powershell
pnpm --filter @workbench-kit/contracts typecheck
git -C <consumer-repo> diff --stat
pnpm --filter <consumer-package> test -- <target-launch-tests>
```

## Closeout Checklist

- [ ] Delegated contract helpers are not replaced by direct `shared/*` launch logic
- [ ] `launchTarget` trim/normalization happens only inside the contract layer
- [ ] At least one equivalence test covers `launchType`, `workingDirectory`, `arguments`,
      `subtitle`, and `canLaunch`
- [ ] Only `WidgetRendererEventKind` values `press` / `change` remain in renderer bindings
