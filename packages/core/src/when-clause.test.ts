import { describe, expect, it } from 'vitest';
import { evaluateWorkbenchWhenClause, WorkbenchWhenClauseSyntaxError } from './when-clause';

describe('workbench when clause', () => {
  it('treats empty clauses as visible', () => {
    expect(evaluateWorkbenchWhenClause(undefined, {})).toBe(true);
    expect(evaluateWorkbenchWhenClause('   ', {})).toBe(true);
  });

  it('evaluates bare context keys and negation', () => {
    expect(
      evaluateWorkbenchWhenClause('launchpad.activeEditor.isDirty', {
        'launchpad.activeEditor.isDirty': true,
      }),
    ).toBe(true);
    expect(
      evaluateWorkbenchWhenClause('!launchpad.activeEditor.isDirty', {
        'launchpad.activeEditor.isDirty': false,
      }),
    ).toBe(true);
    expect(evaluateWorkbenchWhenClause('library.hasSelection', {})).toBe(false);
  });

  it('evaluates boolean logic', () => {
    const contextKeys = {
      'library.hasSelection': true,
      'library.focusedEntry.kind': 'tool',
      focusedView: 'contentHub.library',
    };

    expect(
      evaluateWorkbenchWhenClause(
        'library.hasSelection && focusedView == contentHub.library',
        contextKeys,
      ),
    ).toBe(true);
    expect(
      evaluateWorkbenchWhenClause(
        'library.hasSelection || focusedView == providers.steam',
        contextKeys,
      ),
    ).toBe(true);
  });

  it('evaluates equality comparisons', () => {
    const contextKeys = {
      focusedView: 'providers.steam',
      'library.focusedEntry.kind': 'tool',
      resourceFilename: 'My New File.md',
    };

    expect(evaluateWorkbenchWhenClause('focusedView == providers.steam', contextKeys)).toBe(true);
    expect(evaluateWorkbenchWhenClause('library.focusedEntry.kind != tool', contextKeys)).toBe(
      false,
    );
    expect(evaluateWorkbenchWhenClause("resourceFilename == 'My New File.md'", contextKeys)).toBe(
      true,
    );
  });

  it('evaluates typed comparisons', () => {
    const contextKeys = {
      'launchpad.activeEditor.isDirty': true,
      'asset.selectedCount': 2,
      'provider.activeAccount': null,
    };

    expect(evaluateWorkbenchWhenClause('launchpad.activeEditor.isDirty == true', contextKeys)).toBe(
      true,
    );
    expect(evaluateWorkbenchWhenClause('asset.selectedCount === 2', contextKeys)).toBe(true);
    expect(evaluateWorkbenchWhenClause('provider.activeAccount == null', contextKeys)).toBe(true);
    expect(
      evaluateWorkbenchWhenClause('asset.selectedCount == 2', { 'asset.selectedCount': '2' }),
    ).toBe(false);
  });

  it('throws on invalid syntax', () => {
    expect(() =>
      evaluateWorkbenchWhenClause('library.hasSelection &&', {
        'library.hasSelection': true,
      }),
    ).toThrow(WorkbenchWhenClauseSyntaxError);
    expect(() =>
      evaluateWorkbenchWhenClause('library.hasSelection >= 1', {
        'library.hasSelection': true,
      }),
    ).toThrow(WorkbenchWhenClauseSyntaxError);
  });
});
