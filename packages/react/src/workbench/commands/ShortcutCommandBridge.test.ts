import { createCommandRegistry, type CommandDefinition } from '@workbench-kit/platform';
import { describe, expect, it, vi } from 'vitest';
import {
  getWorkbenchCommandPaletteShortcutLabel,
  getWorkbenchQuickAccessShortcutLabel,
  getWorkbenchShortcutCommandBindings,
  getWorkbenchShortcutFromEvent,
  matchesWorkbenchCommandPaletteShortcut,
  matchesWorkbenchQuickAccessShortcut,
  matchesWorkbenchShortcut,
  runWorkbenchShortcutCommand,
  type WorkbenchShortcutEventLike,
} from './ShortcutCommandBridge';

interface TestContext {
  canSave: boolean;
  dirty: boolean;
  log: string[];
}

function createEvent(
  key: string,
  modifiers: Partial<WorkbenchShortcutEventLike> = {},
): WorkbenchShortcutEventLike {
  return {
    key,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...modifiers,
  };
}

function createCommands(): CommandDefinition<TestContext>[] {
  return [
    {
      id: 'editor.save',
      isEnabled: ({ canSave, dirty }) => canSave && dirty,
      label: 'Save',
      run: ({ log }) => log.push('save'),
      shortcut: 'Ctrl/Cmd+S',
    },
    {
      id: 'editor.discard',
      label: 'Discard',
      run: ({ log }) => log.push('discard'),
      shortcut: ({ dirty }) => (dirty ? 'Ctrl+Shift+D' : undefined),
    },
    {
      id: 'editor.missingHandler',
      label: 'Missing handler',
      shortcut: 'Alt+M',
    },
  ];
}

describe('ShortcutCommandBridge helpers', () => {
  it('matches shortcut strings with aliases and exact modifiers', () => {
    expect(
      matchesWorkbenchShortcut({
        event: createEvent('s', { ctrlKey: true }),
        platform: 'windows',
        shortcut: 'Ctrl/Cmd+S',
      }),
    ).toBe(true);
    expect(
      matchesWorkbenchShortcut({
        event: createEvent('s', { metaKey: true }),
        platform: 'mac',
        shortcut: 'Ctrl/Cmd+S',
      }),
    ).toBe(true);
    expect(
      matchesWorkbenchShortcut({
        event: createEvent('s', { metaKey: true }),
        shortcut: 'Ctrl/Cmd+S',
      }),
    ).toBe(true);
    expect(
      matchesWorkbenchShortcut({
        event: createEvent('S', { ctrlKey: true, shiftKey: true }),
        shortcut: 'Ctrl+S',
      }),
    ).toBe(false);
    expect(
      matchesWorkbenchShortcut({
        event: createEvent('Delete'),
        shortcut: 'Del',
      }),
    ).toBe(true);
    expect(
      matchesWorkbenchShortcut({
        event: createEvent('s', { metaKey: true }),
        platform: 'mac',
        shortcut: 'Mod+S',
      }),
    ).toBe(true);
  });

  it('shares the default palette and quick access shortcuts', () => {
    expect(
      matchesWorkbenchCommandPaletteShortcut(createEvent('P', { ctrlKey: true, shiftKey: true })),
    ).toBe(true);
    expect(matchesWorkbenchCommandPaletteShortcut(createEvent('P', { ctrlKey: true }))).toBe(false);
    expect(matchesWorkbenchQuickAccessShortcut(createEvent('P', { metaKey: true }))).toBe(true);
    expect(
      matchesWorkbenchQuickAccessShortcut(createEvent('P', { metaKey: true, shiftKey: true })),
    ).toBe(false);
    expect(getWorkbenchCommandPaletteShortcutLabel()).toBe('Ctrl+Shift+P');
    expect(getWorkbenchQuickAccessShortcutLabel()).toBe('Ctrl+P');
  });

  it('formats keyboard events for logging', () => {
    expect(getWorkbenchShortcutFromEvent(createEvent('Enter', { ctrlKey: true }), 'windows')).toBe(
      'Ctrl+enter',
    );
    expect(
      getWorkbenchShortcutFromEvent(createEvent(' ', { metaKey: true, shiftKey: true }), 'mac'),
    ).toBe('Cmd+Shift+space');
  });

  it('derives command bindings from command shortcut metadata', () => {
    const registry = createCommandRegistry(createCommands());
    const context: TestContext = { canSave: true, dirty: true, log: [] };

    expect(
      getWorkbenchShortcutCommandBindings({
        commandIds: ['editor.save', 'editor.discard'],
        context,
        platform: 'windows',
        registry,
      }),
    ).toEqual([
      { commandId: 'editor.save', shortcut: 'ctrl+s' },
      { commandId: 'editor.discard', shortcut: 'ctrl+shift+d' },
    ]);
  });

  it('executes enabled shortcut commands without owning side effects', () => {
    const registry = createCommandRegistry(createCommands());
    const context: TestContext = { canSave: true, dirty: true, log: [] };
    const event = createEvent('s', { ctrlKey: true });

    const result = runWorkbenchShortcutCommand({
      context,
      event,
      platform: 'windows',
      registry,
    });

    expect(result).toMatchObject({
      commandId: 'editor.save',
      handled: true,
      shortcut: 'ctrl+s',
    });
    expect(context.log).toEqual(['save']);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('reports disabled or missing handler matches without executing them', () => {
    const registry = createCommandRegistry(createCommands());
    const disabledContext: TestContext = { canSave: true, dirty: false, log: [] };
    const disabledEvent = createEvent('s', { ctrlKey: true });

    expect(
      runWorkbenchShortcutCommand({
        context: disabledContext,
        event: disabledEvent,
        platform: 'windows',
        preventDefaultForDisabledMatches: true,
        registry,
      }),
    ).toMatchObject({
      commandId: 'editor.save',
      handled: false,
      reason: 'disabled',
    });
    expect(disabledEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(disabledContext.log).toEqual([]);

    expect(
      runWorkbenchShortcutCommand({
        context: { canSave: true, dirty: true, log: [] },
        event: createEvent('m', { altKey: true }),
        platform: 'windows',
        registry,
      }),
    ).toMatchObject({
      commandId: 'editor.missingHandler',
      handled: false,
      reason: 'missing-handler',
    });
  });
});
