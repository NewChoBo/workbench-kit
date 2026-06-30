import { describe, expect, it } from 'vitest';

import { CommandRegistry } from './command-registry.js';
import {
  canExecuteCommand,
  resolveCommandDefinitionLabel,
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
