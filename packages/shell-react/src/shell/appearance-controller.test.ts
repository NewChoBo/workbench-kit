/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import {
  createWorkbenchAppearanceOverrideSnapshot,
  createWorkbenchDocumentAppearanceDiagnosticController,
  createWorkbenchDocumentAppearanceOverrideController,
} from './appearance-controller.js';

describe('Workbench appearance override controller', () => {
  it('copies, sanitizes, and freezes own data without evaluating accessors', () => {
    let accessorReads = 0;
    const source: Record<string, string> = {
      '--color-bg': '  #123456  ',
      '--unsafe': 'url(javascript:alert(1))',
      hasOwnProperty: '#abcdef',
    };
    Object.defineProperty(source, '--accessor', {
      enumerable: true,
      get() {
        accessorReads += 1;
        return '#abcdef';
      },
    });

    const snapshot = createWorkbenchAppearanceOverrideSnapshot(source);
    source['--color-bg'] = '#ffffff';

    expect(accessorReads).toBe(0);
    expect(snapshot).toEqual({ '--color-bg': '#123456' });
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it('replaces the current record, restores prior declarations, and leaves DOM identity alone', () => {
    const target = document.createElement('div');
    const child = document.createElement('span');
    target.append(child);
    target.setAttribute('data-theme', 'host-theme');
    target.style.setProperty('--color-bg', '#111111', 'important');
    target.style.setProperty('--unowned', '#222222');

    const controller = createWorkbenchDocumentAppearanceOverrideController(target, {
      '--color-bg': '#333333',
      '--first-only': '4px',
    });

    expect(target.style.getPropertyValue('--color-bg')).toBe('#333333');
    expect(target.style.getPropertyPriority('--color-bg')).toBe('');
    expect(target.style.getPropertyValue('--first-only')).toBe('4px');

    const nextSnapshot = controller.update({
      '--next-only': '8px',
    });

    expect(nextSnapshot).toEqual({ '--next-only': '8px' });
    expect(Object.isFrozen(nextSnapshot)).toBe(true);
    expect(target.style.getPropertyValue('--color-bg')).toBe('#111111');
    expect(target.style.getPropertyPriority('--color-bg')).toBe('important');
    expect(target.style.getPropertyValue('--first-only')).toBe('');
    expect(target.style.getPropertyValue('--next-only')).toBe('8px');
    expect(target.style.getPropertyValue('--unowned')).toBe('#222222');
    expect(target.getAttribute('data-theme')).toBe('host-theme');
    expect(target.firstElementChild).toBe(child);

    controller.update(undefined);
    expect(target.style.getPropertyValue('--next-only')).toBe('');
    expect(target.style.getPropertyValue('--color-bg')).toBe('#111111');

    controller.dispose();
    expect(target.style.getPropertyValue('--color-bg')).toBe('#111111');
    expect(target.style.getPropertyPriority('--color-bg')).toBe('important');
  });

  it('keeps the newest live generation current and reapplies a surviving owner', () => {
    const target = document.createElement('div');
    target.style.setProperty('--color-bg', '#010101');

    const first = createWorkbenchDocumentAppearanceOverrideController(target, {
      '--color-bg': '#111111',
      '--first-only': '1px',
    });
    const second = createWorkbenchDocumentAppearanceOverrideController(target, {
      '--color-bg': '#222222',
      '--second-only': '2px',
    });

    expect(target.style.getPropertyValue('--color-bg')).toBe('#222222');
    expect(target.style.getPropertyValue('--first-only')).toBe('');
    expect(target.style.getPropertyValue('--second-only')).toBe('2px');

    first.update({
      '--color-bg': '#121212',
      '--first-latest': '3px',
    });
    expect(target.style.getPropertyValue('--color-bg')).toBe('#222222');

    second.dispose();
    expect(target.style.getPropertyValue('--color-bg')).toBe('#121212');
    expect(target.style.getPropertyValue('--second-only')).toBe('');
    expect(target.style.getPropertyValue('--first-latest')).toBe('3px');

    const strictModeReplacement = createWorkbenchDocumentAppearanceOverrideController(target, {
      '--color-bg': '#333333',
    });
    first.dispose();
    expect(target.style.getPropertyValue('--color-bg')).toBe('#333333');
    expect(target.style.getPropertyValue('--first-latest')).toBe('');

    first.dispose();
    expect(target.style.getPropertyValue('--color-bg')).toBe('#333333');

    strictModeReplacement.dispose();
    expect(target.style.getPropertyValue('--color-bg')).toBe('#010101');
  });

  it('coordinates private unresolved diagnostics without touching styling attributes', () => {
    const target = document.createElement('div');
    target.setAttribute('data-theme', 'host-owned');
    target.setAttribute('data-workbench-unresolved-theme', 'baseline');
    const first = createWorkbenchDocumentAppearanceDiagnosticController(target, {
      unresolvedTheme: 'first',
    });
    const second = createWorkbenchDocumentAppearanceDiagnosticController(target, {
      unresolvedThemePreset: 'second-preset',
    });

    expect(target.getAttribute('data-workbench-unresolved-theme')).toBeNull();
    expect(target.getAttribute('data-workbench-unresolved-theme-preset')).toBe('second-preset');
    first.update({ unresolvedTheme: 'first-latest' });
    expect(target.getAttribute('data-workbench-unresolved-theme-preset')).toBe('second-preset');

    second.dispose();
    expect(target.getAttribute('data-workbench-unresolved-theme')).toBe('first-latest');
    expect(target.getAttribute('data-workbench-unresolved-theme-preset')).toBeNull();
    expect(target.getAttribute('data-theme')).toBe('host-owned');

    first.dispose();
    expect(target.getAttribute('data-workbench-unresolved-theme')).toBe('baseline');
    expect(target.getAttribute('data-theme')).toBe('host-owned');
  });
});
