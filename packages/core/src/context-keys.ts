import {
  evaluateWorkbenchWhenClause,
  type WorkbenchContextKeySnapshot,
  type WorkbenchContextKeyValue,
} from './when-clause';

export type { WorkbenchContextKeySnapshot, WorkbenchContextKeyValue } from './when-clause';

export function createWorkbenchContextKeySnapshot<TContextKeys extends object>(
  contextKeys: TContextKeys,
): TContextKeys & WorkbenchContextKeySnapshot {
  const snapshot: Record<string, WorkbenchContextKeyValue> = {};

  for (const [key, value] of Object.entries(contextKeys)) {
    if (!isWorkbenchContextKeyValue(value)) {
      throw new TypeError(`Unsupported workbench context key value for "${key}".`);
    }
    snapshot[key] = value;
  }

  return snapshot as TContextKeys & WorkbenchContextKeySnapshot;
}

export function evaluateWorkbenchContextKeyWhenClause(
  whenClause: string | undefined,
  contextKeys: object,
): boolean {
  return evaluateWorkbenchWhenClause(whenClause, createWorkbenchContextKeySnapshot(contextKeys));
}

export function isWorkbenchContextKeyValue(value: unknown): value is WorkbenchContextKeyValue {
  return (
    value === undefined ||
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  );
}
