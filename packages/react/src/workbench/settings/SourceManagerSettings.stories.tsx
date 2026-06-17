import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Badge } from '../../primitives/Badge';
import { Button } from '../../primitives/Button';
import { Checkbox } from '../../primitives/Checkbox';
import { Field } from '../../primitives/Field';
import { HelpText } from '../../layout/Panel';
import { TextInput } from '../../primitives/TextInput';
import { WorkbenchNavigationPanel } from './NavigationPanel';
import { WorkbenchSectionedPanel } from './SectionedPanel';
import { WorkbenchSettingsSection } from './WorkbenchSettingsSection';

const meta = {
  title: 'React/Workbench/Settings/SourceManagerSettings',
  parameters: {
    fullHeightShell: '640px',
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type ProviderId = 'local' | 'steam' | 'epic';

const providers: Array<{ active?: boolean; id: ProviderId; label: string; status?: string }> = [
  { active: true, id: 'local', label: 'Local Library' },
  { id: 'steam', label: 'Steam', status: 'Auth failure' },
  { id: 'epic', label: 'Epic Games' },
];

function SourceManagerHarness() {
  const [activeProviderId, setActiveProviderId] = useState<ProviderId>('steam');
  const [installPath, setInstallPath] = useState('C:\\Program Files (x86)\\Steam');
  const [accountId, setAccountId] = useState('76561198000000000');
  const [apiKey, setApiKey] = useState('********');
  const [showApiKey, setShowApiKey] = useState(false);
  const [eventLog, setEventLog] = useState('Ready');

  const activeProvider = providers.find((provider) => provider.id === activeProviderId);

  return (
    <div
      className="workbench-story-shell"
      style={{ background: 'var(--color-bg)', height: '100%' }}
    >
      <div aria-label="Source manager event log" role="status" style={{ marginBottom: 12 }}>
        {eventLog}
      </div>
      <WorkbenchNavigationPanel
        aria-label="Source manager"
        style={{ height: 520 }}
        nav={
          <ul
            aria-label="Providers"
            style={{ display: 'grid', gap: 4, listStyle: 'none', margin: 0, padding: 8 }}
          >
            {providers.map((provider) => (
              <li key={provider.id}>
                <button
                  aria-current={activeProviderId === provider.id ? 'true' : undefined}
                  className="ui-source-manager-nav-item"
                  data-active={activeProviderId === provider.id ? 'true' : undefined}
                  type="button"
                  onClick={() => {
                    setActiveProviderId(provider.id);
                    setEventLog(`Selected provider: ${provider.label}`);
                  }}
                >
                  <span>{provider.label}</span>
                  {provider.status ? <Badge variant="danger">{provider.status}</Badge> : null}
                  {provider.active ? <Badge variant="accent">Active</Badge> : null}
                </button>
              </li>
            ))}
          </ul>
        }
        content={
          activeProviderId === 'local' ? (
            <WorkbenchSettingsSection
              description="Local library paths are edited as compact rows without dashboard cards."
              id="local-settings"
              title="Local Library"
            >
              <Field label="Library folder" htmlFor="local-path">
                <TextInput id="local-path" controlWidth="full" defaultValue="D:\\Games\\Library" />
              </Field>
              <Field inline label="Rebuild">
                <Button onClick={() => setEventLog('Rebuild queued for Local Library')}>
                  Rebuild
                </Button>
              </Field>
            </WorkbenchSettingsSection>
          ) : (
            <WorkbenchSectionedPanel
              ariaLabel="Provider settings sections"
              items={[
                {
                  anchorId: 'installation',
                  title: 'Installation',
                  render: () => (
                    <WorkbenchSettingsSection id="installation" title="Installation">
                      <Field label="Install folder" htmlFor="install-path">
                        <TextInput
                          id="install-path"
                          controlWidth="full"
                          value={installPath}
                          onChange={(event) => setInstallPath(event.currentTarget.value)}
                        />
                      </Field>
                      <Field inline label="Detect">
                        <Button
                          onClick={() =>
                            setEventLog(`Detect requested for ${activeProvider?.label}`)
                          }
                        >
                          Detect
                        </Button>
                      </Field>
                    </WorkbenchSettingsSection>
                  ),
                },
                {
                  anchorId: 'account',
                  title: 'Account',
                  render: () => (
                    <WorkbenchSettingsSection id="account" title="Account">
                      <Field label="Account ID" htmlFor="account-id">
                        <TextInput
                          id="account-id"
                          controlWidth="full"
                          value={accountId}
                          onChange={(event) => setAccountId(event.currentTarget.value)}
                        />
                      </Field>
                      <Field label="Web API Key" htmlFor="api-key">
                        <TextInput
                          id="api-key"
                          controlWidth="full"
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(event) => setApiKey(event.currentTarget.value)}
                        />
                      </Field>
                      <Field inline label="Visibility">
                        <Checkbox
                          checked={showApiKey}
                          label="Show API key"
                          onChange={(event) => setShowApiKey(event.currentTarget.checked)}
                        />
                      </Field>
                      {activeProvider?.status ? (
                        <HelpText tone="error">
                          Authentication failed. Update credentials and run Detect.
                        </HelpText>
                      ) : null}
                    </WorkbenchSettingsSection>
                  ),
                },
                {
                  anchorId: 'library',
                  count: 2,
                  title: 'Library',
                  render: () => (
                    <WorkbenchSettingsSection id="library" title="Library">
                      <Field inline label="Catalog rebuild">
                        <Button
                          onClick={() => setEventLog(`Rebuild queued for ${activeProvider?.label}`)}
                        >
                          Rebuild
                        </Button>
                        <Button
                          onClick={() => setEventLog(`Reset queued for ${activeProvider?.label}`)}
                        >
                          Reset
                        </Button>
                      </Field>
                      <Field label="Last rebuild">
                        <Badge variant="muted">2026-05-14 22:30</Badge>
                      </Field>
                    </WorkbenchSettingsSection>
                  ),
                },
              ]}
            />
          )
        }
      />
    </div>
  );
}

export const ProviderMasterDetail: Story = {
  render: () => <SourceManagerHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Authentication failed.')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Local Library' }));
    await expect(canvas.getByLabelText('Library folder')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Rebuild' }));
    await expect(canvas.getByLabelText('Source manager event log')).toHaveTextContent(
      'Rebuild queued for Local Library',
    );
  },
};
