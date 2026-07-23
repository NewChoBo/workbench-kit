import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  WorkbenchCommandGroupShell,
  WorkbenchCommandList,
  commandMenuItemsToWorkbenchCommandDescriptors,
  filterWorkbenchCommands,
  getNextWorkbenchCommandIndex,
  getWorkbenchCommandExecutionLabel,
  groupWorkbenchCommands,
  isWorkbenchCommandRunnable,
  normalizeWorkbenchCommandQuery,
  type WorkbenchCommandDescriptor,
} from './CommandPalette';

const commands: WorkbenchCommandDescriptor[] = [
  {
    category: 'View',
    description: 'Open the selected artifact preview.',
    icon: 'codicon-open-preview',
    id: 'artifact.openPreview',
    label: 'Open preview',
    shortcut: 'Ctrl+Enter',
  },
  {
    category: 'Workspace',
    description: 'Write a generated artifact into the workspace.',
    disabled: true,
    disabledReason: 'Workspace is read-only',
    icon: 'codicon-file-code',
    id: 'workspace.writeArtifact',
    label: 'Write artifact',
    sideEffect: 'workspace-write',
  },
  {
    category: 'Command',
    execution: { kind: 'remote' },
    id: 'operation.validateSelection',
    keywords: ['sql', 'quality-gate'],
    label: 'Validate selection',
    status: 'waiting',
  },
];

describe('workbench command helpers', () => {
  it('filters commands by label, description, category, id, shortcut, and keywords', () => {
    expect(
      filterWorkbenchCommands({ commands, query: 'preview' }).map((command) => command.id),
    ).toEqual(['artifact.openPreview']);
    expect(
      filterWorkbenchCommands({ commands, query: 'workspace write' }).map((command) => command.id),
    ).toEqual(['workspace.writeArtifact']);
    expect(
      filterWorkbenchCommands({ commands, query: 'ctrl' }).map((command) => command.id),
    ).toEqual(['artifact.openPreview']);
    expect(
      filterWorkbenchCommands({ commands, query: 'quality-gate' }).map((command) => command.id),
    ).toEqual(['operation.validateSelection']);
    expect(filterWorkbenchCommands({ commands, query: 'missing' })).toEqual([]);
  });

  it('treats a leading command prefix as palette chrome', () => {
    expect(normalizeWorkbenchCommandQuery('> preview')).toBe('preview');
    expect(
      filterWorkbenchCommands({ commands, query: '> preview' }).map((command) => command.id),
    ).toEqual(['artifact.openPreview']);
  });

  it('limits filtered commands when requested', () => {
    expect(filterWorkbenchCommands({ commands, limit: 2 }).map((command) => command.id)).toEqual([
      'artifact.openPreview',
      'workspace.writeArtifact',
    ]);
  });

  it('navigates to the next runnable command and skips disabled commands', () => {
    expect(
      getNextWorkbenchCommandIndex({
        commands,
        currentIndex: 0,
        direction: 'next',
      }),
    ).toBe(2);
    expect(
      getNextWorkbenchCommandIndex({
        commands,
        currentIndex: 2,
        direction: 'next',
      }),
    ).toBe(0);
    expect(
      getNextWorkbenchCommandIndex({
        commands,
        currentIndex: 0,
        direction: 'previous',
      }),
    ).toBe(2);
  });

  it('reports disabled and unavailable commands as not runnable', () => {
    expect(isWorkbenchCommandRunnable(commands[0])).toBe(true);
    expect(isWorkbenchCommandRunnable(commands[1])).toBe(false);
    expect(isWorkbenchCommandRunnable({ ...commands[0], status: 'unavailable' })).toBe(false);
  });

  it('converts resolved menu command items into command descriptors', () => {
    const descriptors = commandMenuItemsToWorkbenchCommandDescriptors(
      [
        {
          commandId: 'workspace.open',
          danger: undefined,
          disabled: false,
          icon: 'codicon-go-to-file',
          id: 'workspace.open',
          label: 'Open file',
          shortcut: 'Enter',
          type: 'command',
        },
        { id: 'separator', type: 'separator' },
      ],
      {
        'workspace.open': {
          category: 'Workspace',
          execution: { kind: 'local' },
          feedback: 'status',
        },
      },
    );

    expect(descriptors).toEqual([
      {
        category: 'Workspace',
        danger: undefined,
        disabled: false,
        execution: { kind: 'local' },
        feedback: 'status',
        icon: 'codicon-go-to-file',
        id: 'workspace.open',
        label: 'Open file',
        metadata: { menuItemId: 'workspace.open' },
        shortcut: 'Enter',
      },
    ]);
  });

  it('groups commands by category, status, execution, and keywords', () => {
    expect(
      groupWorkbenchCommands({
        commands,
        groupBy: 'category',
      }).map((group) => ({
        commands: group.commands.map((command) => command.id),
        id: group.id,
        label: group.label,
      })),
    ).toEqual([
      { commands: ['artifact.openPreview'], id: 'category-view', label: 'View' },
      { commands: ['workspace.writeArtifact'], id: 'category-workspace', label: 'Workspace' },
      { commands: ['operation.validateSelection'], id: 'category-command', label: 'Command' },
    ]);

    expect(
      groupWorkbenchCommands({
        commands,
        groupBy: 'status',
      }).map((group) => ({
        commands: group.commands.map((command) => command.id),
        label: group.label,
      })),
    ).toEqual([
      { commands: ['artifact.openPreview'], label: 'Other' },
      { commands: ['workspace.writeArtifact'], label: 'Disabled' },
      { commands: ['operation.validateSelection'], label: 'Waiting' },
    ]);

    expect(
      groupWorkbenchCommands({
        commands,
        groupBy: 'execution',
      }).map((group) => ({
        commands: group.commands.map((command) => command.id),
        label: group.label,
      })),
    ).toEqual([
      { commands: ['artifact.openPreview', 'workspace.writeArtifact'], label: 'Other' },
      { commands: ['operation.validateSelection'], label: 'Remote' },
    ]);

    expect(
      groupWorkbenchCommands({
        commands,
        groupBy: 'keyword',
      }).map((group) => ({
        commands: group.commands.map((command) => command.id),
        label: group.label,
      })),
    ).toEqual([
      { commands: ['artifact.openPreview', 'workspace.writeArtifact'], label: 'Other' },
      { commands: ['operation.validateSelection'], label: 'sql' },
      { commands: ['operation.validateSelection'], label: 'quality-gate' },
    ]);
  });

  it('keeps non-latin command category groups distinct', () => {
    const localizedCommands: WorkbenchCommandDescriptor[] = [
      { category: '조회', id: 'reference.search', label: 'Search reference' },
      { category: '생성/수정', id: 'artifact.generate', label: 'Generate artifact' },
      { category: '검증/실행', id: 'validation.run', label: 'Run validation' },
    ];

    expect(
      groupWorkbenchCommands({
        commands: localizedCommands,
        groupBy: 'category',
      }).map((group) => ({
        commands: group.commands.map((command) => command.id),
        id: group.id,
        label: group.label,
      })),
    ).toEqual([
      { commands: ['reference.search'], id: 'category-조회', label: '조회' },
      { commands: ['artifact.generate'], id: 'category-생성-수정', label: '생성/수정' },
      { commands: ['validation.run'], id: 'category-검증-실행', label: '검증/실행' },
    ]);
  });

  it('prefers custom execution labels', () => {
    expect(getWorkbenchCommandExecutionLabel({ kind: 'remote' })).toBe('Remote');
    expect(getWorkbenchCommandExecutionLabel({ kind: 'delegated', label: 'Delegated' })).toBe(
      'Delegated',
    );
  });

  it('renders grouped command shell without owning execution', () => {
    const markup = renderToStaticMarkup(
      createElement(WorkbenchCommandGroupShell, { commands, groupBy: 'category' }),
    );

    expect(markup).toContain('ui-workbench-command-group-shell');
    expect(markup).toContain('Command groups');
    expect(markup).toContain('ui-workbench-command-group-shell__content ui-workbench-scrollbar');
    expect(markup).toContain('View');
    expect(markup).toContain('Workspace');
    expect(markup).toContain('Validate selection');
    expect(markup).toContain('data-status="waiting"');
  });

  it('marks command lists as shared scrollbar surfaces', () => {
    const markup = renderToStaticMarkup(createElement(WorkbenchCommandList, { commands }));

    expect(markup).toContain('ui-workbench-command-list');
    expect(markup).toContain('ui-workbench-scrollbar');
  });

  it('renders grouped command shell without group navigation', () => {
    const markup = renderToStaticMarkup(
      createElement(WorkbenchCommandGroupShell, {
        commands,
        groupBy: 'category',
        showGroupNav: false,
      }),
    );

    expect(markup).toContain('data-show-group-nav="false"');
    expect(markup).not.toContain('<nav');
    expect(markup).toContain('Open preview');
    expect(markup).toContain('Validate selection');
  });
});
