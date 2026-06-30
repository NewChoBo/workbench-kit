import { describe, expect, it } from 'vitest';

import { CommandRegistry } from './command-registry.js';
import {
  canExecuteCommand,
  resolveCommandDefinitionLabel,
  resolveCommandMenuCommandItem,
  resolveCommandMenuItems,
  resolveCommandValue,
} from './command-contributions.js';

describe('resolveCommandMenuItems', () => {
  it('marks menu commands disabled when command enablement is false', () => {
    const registry = new CommandRegistry([
      {
        enablement: 'feature.enabled',
        id: 'workbench.action.needsFeature',
        label: 'Needs Feature',
      },
    ]);

    expect(
      resolveCommandMenuItems({
        context: undefined,
        contextKeys: { 'feature.enabled': false },
        entries: [{ commandId: 'workbench.action.needsFeature' }],
        registry,
      }),
    ).toEqual([
      {
        commandId: 'workbench.action.needsFeature',
        disabled: true,
        id: 'workbench.action.needsFeature',
        label: 'Needs Feature',
        type: 'command',
      },
    ]);
  });

  it('blocks command execution checks when command enablement is false', () => {
    const registry = new CommandRegistry([
      {
        enablement: 'feature.enabled',
        id: 'workbench.action.needsFeature',
        label: 'Needs Feature',
        run: () => undefined,
      },
    ]);

    expect(
      canExecuteCommand(registry, 'workbench.action.needsFeature', undefined, {
        'feature.enabled': false,
      }),
    ).toBe(false);
  });

  it('resolves one command menu item without consumer-side list filtering', () => {
    const registry = new CommandRegistry([
      {
        enablement: 'feature.enabled',
        id: 'workbench.action.open',
        label: (context: { target: string }) => `Open ${context.target}`,
      },
    ]);

    expect(
      resolveCommandMenuCommandItem({
        commandId: 'workbench.action.open',
        context: { target: 'Settings' },
        contextKeys: { 'feature.enabled': true },
        entry: { icon: 'gear', shortcut: 'Ctrl+,' },
        registry,
      }),
    ).toEqual({
      commandId: 'workbench.action.open',
      disabled: false,
      icon: 'gear',
      id: 'workbench.action.open',
      label: 'Open Settings',
      shortcut: 'Ctrl+,',
      type: 'command',
    });
  });

  it('returns undefined for a hidden single command menu item', () => {
    const registry = new CommandRegistry([
      {
        id: 'workbench.action.hidden',
        label: 'Hidden',
        when: 'feature.visible',
      },
    ]);

    expect(
      resolveCommandMenuCommandItem({
        commandId: 'workbench.action.hidden',
        context: undefined,
        contextKeys: { 'feature.visible': false },
        registry,
      }),
    ).toBeUndefined();
  });
});

describe('command value helpers', () => {
  it('resolves literal and context-backed command values', () => {
    expect(resolveCommandValue('Literal', { count: 1 })).toBe('Literal');
    expect(
      resolveCommandValue((context: { count: number }) => `Count ${context.count}`, { count: 2 }),
    ).toBe('Count 2');
  });

  it('resolves command definition labels with title and id fallback', () => {
    expect(
      resolveCommandDefinitionLabel(
        {
          id: 'workbench.action.dynamic',
          label: (context: { label: string }) => context.label,
        },
        { label: 'Dynamic' },
      ),
    ).toBe('Dynamic');
    expect(
      resolveCommandDefinitionLabel({ id: 'workbench.action.title', title: 'Title' }, undefined),
    ).toBe('Title');
    expect(resolveCommandDefinitionLabel({ id: 'workbench.action.id' }, undefined)).toBe(
      'workbench.action.id',
    );
  });
});
