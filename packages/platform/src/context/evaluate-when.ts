import { createWorkbenchContextKeySnapshot } from './context-keys.js';
import { evaluateWorkbenchWhenClause } from './when-clause.js';
import type { ContextKeyValue } from './context-key-value.js';

export function evaluateWhenClause(
  when: string | undefined,
  context: Readonly<Record<string, ContextKeyValue>>,
): boolean {
  return evaluateWorkbenchWhenClause(when, createWorkbenchContextKeySnapshot(context));
}
