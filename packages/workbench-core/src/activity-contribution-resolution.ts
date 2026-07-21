import { evaluateWorkbenchContextKeyWhenClause } from '@workbench-kit/platform';

import type { WorkbenchActivityContribution } from './registries.js';

export function filterActivitiesByWhenClause(
  activities: readonly WorkbenchActivityContribution[],
  contextKeys: object,
): WorkbenchActivityContribution[] {
  return activities.filter((activity) =>
    evaluateWorkbenchContextKeyWhenClause(activity.when, contextKeys),
  );
}
