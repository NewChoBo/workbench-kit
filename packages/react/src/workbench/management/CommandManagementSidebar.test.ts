import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CommandManagementSidebar } from './CommandManagementSidebar';
import type { CommandManagementGroup } from './types';

const groups: CommandManagementGroup[] = [
  {
    entries: [
      {
        id: 'workbench.commands.refresh',
        label: 'Refresh Command Registry',
        source: 'workbench',
        sourceLabel: 'Workbench',
        status: 'available',
      },
    ],
    id: 'workbench',
    label: 'Workbench',
  },
];

const overflowGroups: CommandManagementGroup[] = [
  'Accounts',
  'Commands',
  'Explorer',
  'Runtime',
  'Settings',
].map((label) => ({
  entries: [
    {
      id: `workbench.${label.toLowerCase()}.run`,
      label: `${label} command`,
      source: 'workbench',
      sourceLabel: 'Workbench',
      status: 'available',
    },
  ],
  id: label.toLowerCase(),
  label,
}));

describe('CommandManagementSidebar', () => {
  it('marks command lists as shared scrollbar surfaces', () => {
    const markup = renderToStaticMarkup(
      createElement(CommandManagementSidebar, {
        groups,
        onRunCommand: () => undefined,
      }),
    );

    expect(markup).toContain('workbench-commands-sidebar__list');
    expect(markup).toContain('ui-workbench-scrollbar');
  });

  it('keeps overflow command groups open for keyboard entry', () => {
    const markup = renderToStaticMarkup(
      createElement(CommandManagementSidebar, {
        groups: overflowGroups,
        onRunCommand: () => undefined,
      }),
    );

    expect(markup).toContain('Accounts command');
    expect(markup).toContain('data-command-entry-id="workbench.accounts.run"');
    expect(markup).toContain('Settings command');
    expect(markup).toContain('data-command-entry-id="workbench.settings.run"');
  });
});
