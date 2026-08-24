import { describe, expect, it, vi } from 'vitest';

import { CommandRegistry } from '../commands/command-registry.js';
import { projectCommandRegistryKeybindings } from './command-registry-keybindings.js';
import { createKeybindingManagementModel } from './keybinding-management-model.js';
import {
  resetManagedKeybindingOverride,
  setManagedKeybindingOverride,
} from './managed-keybinding-overrides.js';

interface TestContext {
  readonly alternate: boolean;
}

function createProjection() {
  return projectCommandRegistryKeybindings({
    context: { alternate: false },
    platform: 'windows',
    registry: new CommandRegistry<TestContext>([
      { category: 'File', id: 'editor.save', label: 'Save', shortcut: 'Ctrl+S' },
      { id: 'workbench.open', title: 'Open', shortcut: 'Ctrl+O' },
    ]),
  });
}

describe('projectCommandRegistryKeybindings', () => {
  it('resolves dynamic shortcuts once and preserves command and candidate order', () => {
    const resolveShortcut = vi.fn(({ alternate }: TestContext) =>
      alternate ? 'Ctrl+Shift+S' : 'Ctrl/Cmd+S, Alt+S',
    );
    const registry = new CommandRegistry<TestContext>([
      {
        category: 'File',
        id: 'editor.save',
        label: ({ alternate }) => (alternate ? 'Save as' : 'Save'),
        shortcut: resolveShortcut,
      },
      { id: 'editor.close', title: 'Close', shortcut: 'Primary+W' },
    ]);

    const projection = projectCommandRegistryKeybindings({
      commandIds: ['editor.save', 'editor.close'],
      context: { alternate: false },
      platform: 'mac',
      registry,
    });

    expect(resolveShortcut).toHaveBeenCalledOnce();
    expect(projection.commands).toEqual([
      { category: 'File', id: 'editor.save', label: 'Save' },
      { id: 'editor.close', label: 'Close' },
    ]);
    expect(projection.defaults).toEqual([
      { command: 'editor.save', key: 'meta+s' },
      { command: 'editor.save', key: 'alt+s' },
      { command: 'editor.close', key: 'meta+w' },
    ]);
    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.isFrozen(projection.commands)).toBe(true);
    expect(Object.isFrozen(projection.defaults)).toBe(true);
  });
});

describe('managed keybinding operations', () => {
  it('replaces and resets one supported record without moving unrelated records', () => {
    const before = [
      { command: 'before', key: 'ctrl+b' },
      { command: 'editor.save', key: 'ctrl+s' },
      { command: 'after', key: 'ctrl+a' },
    ] as const;

    const setResult = setManagedKeybindingOverride({
      commandId: 'editor.save',
      key: ' CTRL + SHIFT + S ',
      overrides: before,
      platform: 'windows',
    });
    expect(setResult).toEqual({
      changed: true,
      overrides: [before[0], { command: 'editor.save', key: 'ctrl+shift+s' }, before[2]],
    });

    const resetResult = resetManagedKeybindingOverride({
      commandId: 'editor.save',
      overrides: setResult.overrides,
      platform: 'windows',
    });
    expect(resetResult).toEqual({ changed: true, overrides: [before[0], before[2]] });
  });

  it('keeps unsupported, mixed, and duplicate records lossless and mutation-free', () => {
    const unsupported = { command: 'editor.save', key: 'ctrl+k', when: 'editorFocus' } as const;
    const supported = { command: 'editor.save', key: 'ctrl+s' } as const;
    const unrelated = { args: ['draft'], command: 'other', key: 'alt+o' } as const;
    const mixed = [unsupported, supported, unrelated] as const;

    expect(
      setManagedKeybindingOverride({
        commandId: 'editor.save',
        key: 'ctrl+shift+s',
        overrides: mixed,
        platform: 'windows',
      }),
    ).toEqual({ changed: false, overrides: mixed, reason: 'unsupported-record' });

    const duplicates = [supported, { command: 'editor.save', key: 'alt+s' }] as const;
    expect(
      resetManagedKeybindingOverride({
        commandId: 'editor.save',
        overrides: duplicates,
        platform: 'windows',
      }),
    ).toEqual({ changed: false, overrides: duplicates, reason: 'ambiguous-records' });
  });
});

describe('createKeybindingManagementModel', () => {
  it('builds editable rows and reports canonical set/reset changes to the caller', () => {
    const onOverridesChange = vi.fn();
    const overrides = [{ command: 'editor.save', key: 'ctrl+shift+s' }] as const;
    const model = createKeybindingManagementModel({
      onOverridesChange,
      overrides,
      platform: 'windows',
      projection: createProjection(),
    });

    expect(model.entries.find((entry) => entry.commandId === 'editor.save')).toMatchObject({
      defaultKey: 'ctrl+s',
      editable: true,
      effectiveKey: 'ctrl+shift+s',
      storedKeys: ['ctrl+shift+s'],
      userKey: 'ctrl+shift+s',
    });

    const setResult = model.set('editor.save', 'alt+s');
    expect(setResult).toEqual({
      changed: true,
      overrides: [{ command: 'editor.save', key: 'alt+s' }],
    });
    expect(onOverridesChange).toHaveBeenLastCalledWith(setResult.overrides);

    const resetResult = model.reset('editor.save');
    expect(resetResult).toEqual({ changed: true, overrides: [] });
    expect(onOverridesChange).toHaveBeenLastCalledWith([]);
  });

  it('shows unsupported and duplicate records in stable disabled rows', () => {
    const onOverridesChange = vi.fn();
    const projection = createProjection();
    const unsupported = [
      { command: 'editor.save', key: 'ctrl+k', when: 'editorFocus' },
      { args: ['draft'], command: 'editor.save', key: 'alt+k' },
      { command: 'editor.save', key: 'ctrl+shift+s' },
    ] as const;
    const unsupportedModel = createKeybindingManagementModel({
      onOverridesChange,
      overrides: unsupported,
      platform: 'windows',
      projection,
    });
    const unsupportedEntry = unsupportedModel.entries.find(
      (entry) => entry.commandId === 'editor.save',
    );

    expect(unsupportedEntry).toMatchObject({
      disabledReason:
        'Conditional, argument, or unsupported stored keybindings cannot be edited here.',
      editable: false,
      effectiveKey: 'ctrl+s',
      storedKeys: ['ctrl+k', 'alt+k', 'ctrl+shift+s'],
    });
    expect(unsupportedModel.set('editor.save', 'ctrl+shift+s')).toMatchObject({
      changed: false,
      reason: 'unsupported-record',
    });

    const duplicateModel = createKeybindingManagementModel({
      onOverridesChange,
      overrides: [
        { command: 'workbench.open', key: 'ctrl+k' },
        { command: 'workbench.open', key: 'alt+k' },
      ],
      platform: 'windows',
      projection,
    });
    expect(
      duplicateModel.entries.find((entry) => entry.commandId === 'workbench.open'),
    ).toMatchObject({
      disabledReason: 'Multiple stored keybindings for this command cannot be edited here.',
      editable: false,
      storedKeys: ['ctrl+k', 'alt+k'],
    });
    expect(duplicateModel.reset('workbench.open')).toMatchObject({
      changed: false,
      reason: 'ambiguous-records',
    });
    expect(onOverridesChange).not.toHaveBeenCalled();
  });

  it('turns a persistence lock into visible rows and deterministic write-locked no-ops', () => {
    const onOverridesChange = vi.fn();
    const model = createKeybindingManagementModel({
      editingDisabledReason: 'Keyboard shortcuts could not be read and are locked.',
      onOverridesChange,
      overrides: [],
      platform: 'windows',
      projection: createProjection(),
    });

    expect(model.entries.every((entry) => entry.editable === false)).toBe(true);
    expect(model.entries[0]?.disabledReason).toBe(
      'Keyboard shortcuts could not be read and are locked.',
    );
    expect(model.set('editor.save', 'alt+s')).toEqual({
      changed: false,
      overrides: [],
      reason: 'write-locked',
    });
    expect(onOverridesChange).not.toHaveBeenCalled();
  });
});
