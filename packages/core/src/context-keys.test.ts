import { describe, expect, it } from 'vitest';
import {
  createWorkbenchContextKeySnapshot,
  evaluateWorkbenchContextKeyWhenClause,
  isWorkbenchContextKeyValue,
} from './context-keys';
import { WorkbenchWhenClauseSyntaxError } from './when-clause';

describe('workbench context keys', () => {
  it('creates typed snapshots from plain objects', () => {
    expect(
      createWorkbenchContextKeySnapshot({
        focusedView: 'contentHub.library',
        'library.hasSelection': true,
      }),
    ).toEqual({
      focusedView: 'contentHub.library',
      'library.hasSelection': true,
    });
  });

  it('rejects values outside the shared when-clause context key model', () => {
    expect(() =>
      createWorkbenchContextKeySnapshot({
        focusedView: { nested: true },
      }),
    ).toThrow(TypeError);
  });

  it('evaluates when clauses through the context key service boundary', () => {
    expect(
      evaluateWorkbenchContextKeyWhenClause('focusedView == contentHub.library', {
        focusedView: 'contentHub.library',
      }),
    ).toBe(true);
    expect(evaluateWorkbenchContextKeyWhenClause(undefined, {})).toBe(true);
    expect(() =>
      evaluateWorkbenchContextKeyWhenClause('selection.count >= 1', {
        'selection.count': 2,
      }),
    ).toThrow(WorkbenchWhenClauseSyntaxError);
  });

  it('recognizes supported context key values', () => {
    expect(isWorkbenchContextKeyValue('contentHub.library')).toBe(true);
    expect(isWorkbenchContextKeyValue(false)).toBe(true);
    expect(isWorkbenchContextKeyValue({ focusedView: 'contentHub.library' })).toBe(false);
  });
});
