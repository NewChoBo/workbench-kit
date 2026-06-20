import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { Checkbox } from '../primitives/Checkbox';
import { EmptyState } from '../primitives/EmptyState';
import { Field } from '../primitives/Field';
import { Select } from '../primitives/Select';
import { TextInput } from '../primitives/TextInput';
import { ActivityBar } from './ActivityBar';
import {
  integratedShellActivityDescriptors,
  settingsSecondaryItem,
  toActivityBarItems,
  type ActivityBarStoryCaseId,
} from './activityBarStoryCases';
import { IntegratedShellDemo, type IntegratedShellActivityId } from './demo';
import { WorkbenchSettingsModal, WorkbenchSettingsSection } from './settings';
import { SplitView } from './SplitView';
import { StatusBar, type StatusBarSectionModel } from './StatusBar';
import type { WorkspaceEditorTheme } from './workspace';

const meta = {
  title: 'React/Workbench/Shell',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;
type StoryTheme = WorkspaceEditorTheme;

function getStatusFooterSections(): StatusBarSectionModel[] {
  return [
    {
      id: 'main',
      items: [{ id: 'status', icon: <span className="workbench-status-dot" />, label: 'Idle' }],
    },
    {
      align: 'end',
      id: 'actions',
      items: [
        { id: 'theme', icon: <i className="codicon codicon-color-mode" />, label: 'Dark' },
        {
          id: 'sidebar',
          icon: <i className="codicon codicon-layout-sidebar-left" />,
          label: 'Hide sidebar',
        },
      ],
    },
  ];
}

function getActivityItems(activeActivityId: ActivityBarStoryCaseId = 'explorer') {
  return toActivityBarItems(integratedShellActivityDescriptors, { activeId: activeActivityId });
}

export const ActivityRail: Story = {
  render: () => (
    <div style={{ height: 'min(calc(100% - 120px), 500px)', background: 'var(--color-bg)' }}>
      <ActivityBar items={getActivityItems()} secondaryItems={[settingsSecondaryItem()]} />
    </div>
  ),
};

export const StatusFooter: Story = {
  render: () => (
    <div style={{ width: '100%', background: 'var(--color-bg)', paddingTop: 80 }}>
      <StatusBar compact sections={getStatusFooterSections()} />
    </div>
  ),
};

export const SettingsDialog: Story = {
  render: () => <SettingsDialogPreview />,
};

interface IntegratedShellStoryArgs {
  compactRows: boolean;
  initialActivityId: IntegratedShellActivityId;
  initialSearchQuery: string;
  initialTheme: StoryTheme;
}

export const IntegratedShell: StoryObj<IntegratedShellStoryArgs> = {
  name: 'Integrated Shell (full flow)',
  tags: ['storybook-play-baseline', 'storybook-play-required'],
  parameters: {
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
    docs: {
      description: {
        component:
          'Reference host for explorer, search, chat, editor, settings, and mock runtime flows. Orchestration lives in `workbench/demo/IntegratedShellDemo` and fixtures in `@workbench-kit/adapters/workbench-demo`.',
        story:
          'End-to-end integrated shell composed through `WorkbenchStandaloneShell` (same pattern as dev-agent). Use **Verify ·** viewport presets for responsive checks. Compare chrome states in **React / Workbench / Verification**.',
      },
    },
  },
  args: {
    compactRows: true,
    initialActivityId: 'explorer',
    initialSearchQuery: 'button',
    initialTheme: 'dark',
  },
  argTypes: {
    initialActivityId: {
      control: 'select',
      options: ['explorer', 'search', 'chatting', 'aiChat'],
      description: 'Activity shown when the shell mounts.',
    },
    initialTheme: {
      control: 'select',
      options: ['dark', 'light'],
      description: 'Initial editor and shell theme.',
    },
    initialSearchQuery: {
      control: 'text',
      description: 'Seed query for the virtual workspace search panel.',
    },
    compactRows: {
      control: 'boolean',
      description: 'Workbench density preference surfaced in settings.',
    },
  },
  render: (args) => <IntegratedShellDemo {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const statusBar = canvas.getByLabelText('Status bar');

    await fireEvent.contextMenu(canvas.getByRole('button', { name: 'Explorer' }));
    await expect(await canvas.findByRole('menu', { name: 'Activity bar menu' })).toBeVisible();
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'Search' }));
    await expect(await canvas.findByRole('textbox', { name: 'Search workspace' })).toBeVisible();
    await expect(statusBar).toHaveTextContent('Search opened');

    const workspaceSearchPanel = canvas.getByLabelText('Workspace Search');
    const searchResults = within(workspaceSearchPanel).getByRole('list', {
      name: 'Search results',
    });
    const buttonSearchResult = within(searchResults).getByRole('button', {
      name: /Button\s*\.tsx/,
    });
    await fireEvent.contextMenu(buttonSearchResult);
    await expect(await canvas.findByRole('menu', { name: 'Search result menu' })).toBeVisible();
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'Copy path' }));
    await expect(statusBar).toHaveTextContent('Copied src/components/Button.tsx');

    const activityBar = canvas.getByRole('navigation', { name: 'Activity bar' });
    const explorerActivity = within(activityBar).getByRole('button', { name: 'Explorer' });

    let workspaceFiles = await canvas
      .findByRole('list', { name: 'Workspace files' }, { timeout: 500 })
      .catch(() => null);
    for (let attempt = 0; !workspaceFiles && attempt < 2; attempt += 1) {
      await userEvent.click(explorerActivity);
      workspaceFiles = await canvas
        .findByRole('list', { name: 'Workspace files' }, { timeout: 500 })
        .catch(() => null);
    }
    if (!workspaceFiles) throw new Error('Explorer workspace files did not become visible.');
    await expect(workspaceFiles).toBeVisible();
    await fireEvent.contextMenu(canvas.getByRole('tab', { name: /App\.tsx/ }));
    await expect(await canvas.findByRole('menu', { name: 'Editor tab menu' })).toBeVisible();
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'Copy path' }));
    await expect(statusBar).toHaveTextContent('Copied src/App.tsx');

    await fireEvent.contextMenu(canvas.getByLabelText('Primary sidebar'));
    await expect(await canvas.findByRole('menu', { name: 'Primary sidebar menu' })).toBeVisible();
    await expect(await canvas.findByRole('menuitem', { name: 'New file' })).toBeVisible();
    await userEvent.keyboard('{Escape}');

    await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));
    const settingsDialog = await canvas.findByRole('dialog');
    await expect(settingsDialog).toBeVisible();
    await expect(within(settingsDialog).getByRole('button', { name: 'Appearance' })).toBeVisible();
    await userEvent.click(within(settingsDialog).getByRole('button', { name: 'Cancel' }));

    await userEvent.click(canvas.getByRole('button', { name: 'AI Chat' }));
    const chatComposer = await canvas.findByPlaceholderText('Ask about this workspace');
    await expect(chatComposer).toBeVisible();
    await userEvent.type(chatComposer, 'Create runtime notes');
    await userEvent.click(canvas.getByRole('button', { name: 'Send message' }));
    await waitFor(() => {
      expect(statusBar).toHaveTextContent('Runtime wrote docs/runtime-notes.md');
    });
    await waitFor(() => expect(statusBar).toHaveTextContent('Runtime idle'));
  },
};

function SettingsDialogPreview() {
  const [activeCategoryId, setActiveCategoryId] = useState('appearance');
  const [activeScopeId, setActiveScopeId] = useState('user');
  const [compactRows, setCompactRows] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [theme, setTheme] = useState<StoryTheme>('dark');

  return (
    <div data-theme={theme} style={{ minHeight: 640, background: 'var(--color-bg)' }}>
      <div style={{ padding: 20 }}>
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Open settings
        </Button>
      </div>
      {isOpen ? (
        <WorkbenchSettingsModal
          activeCategoryId={activeCategoryId}
          activeScopeId={activeScopeId}
          categories={[
            { id: 'appearance', label: 'Appearance' },
            { id: 'workbench', label: 'Workbench' },
            { id: 'workspace', label: 'Workspace' },
          ]}
          footer={
            <>
              <Button onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setIsOpen(false)}>
                Apply
              </Button>
            </>
          }
          scopes={[
            { id: 'user', label: 'User' },
            { id: 'workspace', label: 'Workspace' },
          ]}
          searchValue={searchValue}
          title="Settings"
          titleSuffix={<Badge>Preview</Badge>}
          onActiveCategoryIdChange={setActiveCategoryId}
          onClose={() => setIsOpen(false)}
          onScopeChange={setActiveScopeId}
          onSearchValueChange={setSearchValue}
          renderCategory={(category) => {
            if (category.id === 'workbench') {
              return (
                <WorkbenchSettingsSection
                  id="settings-preview-workbench"
                  title="Workbench"
                  description="Configure shell density and visible workbench surfaces."
                >
                  <Field label="Workbench density" description="Controls compact shell surfaces.">
                    <Select
                      controlWidth="full"
                      value={compactRows ? 'compact' : 'comfortable'}
                      onChange={(event) => setCompactRows(event.currentTarget.value === 'compact')}
                    >
                      <option value="compact">Compact</option>
                      <option value="comfortable">Comfortable</option>
                    </Select>
                  </Field>
                  <Field inline label="Compact rows">
                    <Checkbox
                      checked={compactRows}
                      label="Use compact explorer, search, chatting, and AI chat rows"
                      onChange={(event) => setCompactRows(event.currentTarget.checked)}
                    />
                  </Field>
                </WorkbenchSettingsSection>
              );
            }

            if (category.id === 'workspace') {
              return (
                <WorkbenchSettingsSection
                  id="settings-preview-workspace"
                  title="Workspace"
                  description="Preview settings that can be scoped to a user or workspace."
                >
                  <Field label="Default search query">
                    <TextInput
                      controlWidth="full"
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.currentTarget.value)}
                    />
                  </Field>
                  <Field label="Active scope">
                    <div className="workbench-settings-badge-list">
                      <Badge>{activeScopeId}</Badge>
                      <Badge variant="muted">public mock data</Badge>
                    </div>
                  </Field>
                </WorkbenchSettingsSection>
              );
            }

            return (
              <WorkbenchSettingsSection
                id="settings-preview-appearance"
                title="Appearance"
                description="Choose visual preferences for the workbench shell."
              >
                <Field label="Color theme" htmlFor="settings-preview-theme">
                  <Select
                    id="settings-preview-theme"
                    controlWidth="full"
                    value={theme}
                    onChange={(event) => setTheme(event.currentTarget.value as StoryTheme)}
                  >
                    <option value="dark">Dark Modern</option>
                    <option value="light">Light Modern</option>
                  </Select>
                </Field>
              </WorkbenchSettingsSection>
            );
          }}
        />
      ) : null}
    </div>
  );
}

export const SplitWorkspace: Story = {
  render: () => (
    <div
      style={{
        width: '100%',
        height: 'min(calc(100% - 96px), 500px)',
        background: 'var(--color-bg)',
      }}
    >
      <SplitView
        defaultPrimarySizePercent={62}
        primary={
          <section style={{ padding: 20, color: 'var(--color-text)' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Primary pane</h2>
            <p style={{ margin: '0 0 16px', color: 'var(--color-text-muted)' }}>
              SplitView keeps resizable workbench panes stable.
            </p>
            <Badge>active</Badge>
          </section>
        }
        secondary={
          <section style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            <EmptyState compact icon="codicon-layout-sidebar-right">
              Secondary pane
            </EmptyState>
          </section>
        }
      />
    </div>
  ),
};
