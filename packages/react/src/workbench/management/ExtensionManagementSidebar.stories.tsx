import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { ExtensionManagementSidebar } from './ExtensionManagementSidebar';
import type { ExtensionCatalogBrowseEntry, ExtensionManagementEntry } from './types';

const meta = {
  title: 'React/Workbench/Management/Extension Sidebar',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Extension management sidebar with installed/marketplace lists, missing-extension alerts, and per-extension diagnostics.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const installedFixture: ExtensionManagementEntry[] = [
  {
    category: 'builtin',
    description: 'Workspace file tree and open editors.',
    diagnostics: [
      {
        message: 'Capability "workbench.workspace" is missing.',
        severity: 'warning',
      },
    ],
    displayName: 'Explorer',
    enabled: true,
    id: 'workbench-kit.builtin.explorer',
    source: 'bundled',
  },
  {
    category: 'theme',
    description: 'Adds an alternate dark palette.',
    displayName: 'Theme Pack',
    enabled: false,
    id: 'workbench-kit.samples.theme',
    source: 'installed',
  },
];

const marketplaceFixture: ExtensionCatalogBrowseEntry[] = [
  {
    category: 'utility',
    description: 'Installs a command contribution pack.',
    displayName: 'Command Pack',
    id: 'workbench-kit.samples.command-pack',
    installed: false,
    manifestUrl: '/extensions/command-pack/workbench.extension.json',
  },
];

function ExtensionSidebarHarness() {
  const [eventLog, setEventLog] = useState('Ready');
  const [installedEntries, setInstalledEntries] = useState(installedFixture);

  return (
    <div
      className="workbench-story-shell"
      style={{
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        display: 'grid',
        gridTemplateRows: 'minmax(0, 1fr) auto',
        height: 'min(calc(100% - 96px), 640px)',
        width: 'min(100%, 420px)',
      }}
    >
      <ExtensionManagementSidebar
        browseEntries={marketplaceFixture}
        defaultTab="installed"
        installedEntries={installedEntries}
        missingExtensionIds={['workbench-kit.missing.sample']}
        onInstall={(entry) => setEventLog(`Install requested: ${entry.id}`)}
        onToggleEnabled={(entry, enabled) => {
          setInstalledEntries((current) =>
            current.map((item) => (item.id === entry.id ? { ...item, enabled } : item)),
          );
          setEventLog(`${enabled ? 'Enable' : 'Disable'} requested: ${entry.id}`);
        }}
      />
      <div
        aria-label="Extension sidebar event log"
        role="status"
        style={{ borderTop: '1px solid var(--color-border)', fontSize: 12, padding: 8 }}
      >
        {eventLog}
      </div>
    </div>
  );
}

export const DiagnosticsAndMissingExtensions: Story = {
  name: 'Extension / Diagnostics & missing',
  render: () => <ExtensionSidebarHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const eventLog = canvas.getByLabelText('Extension sidebar event log');

    await expect(canvas.getByRole('alert')).toHaveTextContent('Missing extensions');
    await expect(canvas.getByRole('alert')).toHaveTextContent('workbench-kit.missing.sample');
    await expect(canvas.getByText('1 warning')).toBeVisible();
    await expect(
      canvas.getByText('Capability "workbench.workspace" is missing.'),
    ).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Enable' }));
    await expect(eventLog).toHaveTextContent('Enable requested: workbench-kit.samples.theme');
    await expect(canvas.getByText('Enabled')).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Marketplace', pressed: false }));
    await expect(canvas.getByRole('list', { name: 'Marketplace extensions' })).toBeVisible();
    await expect(canvas.getByText('Command Pack')).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Install' }));
    await expect(eventLog).toHaveTextContent(
      'Install requested: workbench-kit.samples.command-pack',
    );
  },
  tags: ['storybook-play-baseline', 'storybook-play-required'],
};
