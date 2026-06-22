import { useMemo, useState, type FormEvent } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';
import { Badge } from '../../primitives/Badge';
import { Button } from '../../primitives/Button';
import { Checkbox } from '../../primitives/Checkbox';
import { Field } from '../../primitives/Field';
import { Select } from '../../primitives/Select';
import { TextInput } from '../../primitives/TextInput';
import { WorkbenchSettingsModal } from './WorkbenchSettingsModal';
import { WorkbenchSettingsSection } from './WorkbenchSettingsSection';
import type { WorkbenchSettingsCategory } from './types';

interface SettingsDraft {
  allowWorkspaceWrites: boolean;
  compactRows: boolean;
  confirmDestructiveActions: boolean;
  searchSeed: string;
  theme: 'dark' | 'light';
}

const initialSettings: SettingsDraft = {
  allowWorkspaceWrites: true,
  compactRows: true,
  confirmDestructiveActions: true,
  searchSeed: 'button',
  theme: 'dark',
};

const categories: WorkbenchSettingsCategory[] = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'maintenance', label: 'Maintenance' },
];

const meta = {
  title: 'React/Workbench/Settings/WorkbenchSettingsModal',
  component: WorkbenchSettingsModal,
  parameters: { layout: 'fullscreen' },
  args: {
    categories,
    title: 'Settings',
    onClose: () => undefined,
  },
} satisfies Meta<typeof WorkbenchSettingsModal>;

export default meta;

type Story = StoryObj<typeof meta>;

function hasSettingsChanges(current: SettingsDraft, saved: SettingsDraft) {
  return (
    current.allowWorkspaceWrites !== saved.allowWorkspaceWrites ||
    current.compactRows !== saved.compactRows ||
    current.confirmDestructiveActions !== saved.confirmDestructiveActions ||
    current.searchSeed !== saved.searchSeed ||
    current.theme !== saved.theme
  );
}

function SettingsModalHarness() {
  const [activeCategoryId, setActiveCategoryId] = useState('appearance');
  const [activeScopeId, setActiveScopeId] = useState('user');
  const [draft, setDraft] = useState<SettingsDraft>(initialSettings);
  const [savedSettings, setSavedSettings] = useState<SettingsDraft>(initialSettings);
  const [searchValue, setSearchValue] = useState('');
  const [status, setStatus] = useState('Settings saved');
  const isDirty = hasSettingsChanges(draft, savedSettings);
  const titleSuffix = useMemo(
    () => <Badge variant={isDirty ? 'accent' : 'muted'}>{isDirty ? 'Unsaved' : 'Saved'}</Badge>,
    [isDirty],
  );

  const updateDraft = <TKey extends keyof SettingsDraft>(key: TKey, value: SettingsDraft[TKey]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setStatus('Unsaved settings');
  };

  const resetDraft = () => {
    setDraft(savedSettings);
    setStatus('Reset settings');
  };

  const saveDraft = () => {
    setSavedSettings(draft);
    setStatus('Saved settings');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isDirty) saveDraft();
  };

  return (
    <div
      data-theme={draft.theme}
      className="workbench-story-shell"
      style={{ minHeight: 640, background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <div style={{ padding: 20 }}>
        <div aria-label="Settings event log" role="status">
          {status}
        </div>
      </div>
      <WorkbenchSettingsModal
        activeCategoryId={activeCategoryId}
        activeScopeId={activeScopeId}
        categories={categories}
        footer={
          <>
            <Button disabled={!isDirty} onClick={resetDraft}>
              Reset
            </Button>
            <span className="workbench-settings-footer__spacer" />
            <Button onClick={() => setStatus('Settings closed')}>Cancel</Button>
            <Button disabled={!isDirty} variant="primary" onClick={saveDraft}>
              Save
            </Button>
          </>
        }
        scopes={[
          { id: 'user', label: 'User' },
          { id: 'workspace', label: 'Workspace' },
        ]}
        searchValue={searchValue}
        title="Settings"
        titleSuffix={titleSuffix}
        onActiveCategoryIdChange={setActiveCategoryId}
        onClose={() => setStatus('Settings closed')}
        onScopeChange={setActiveScopeId}
        onSearchValueChange={setSearchValue}
        onSubmit={handleSubmit}
        renderCategory={(category) =>
          renderCategory({
            categoryId: category.id,
            draft,
            updateDraft,
            onMaintenanceAction: () => setStatus('Maintenance task queued'),
          })
        }
      />
    </div>
  );
}

function renderCategory({
  categoryId,
  draft,
  updateDraft,
  onMaintenanceAction,
}: {
  categoryId: string;
  draft: SettingsDraft;
  updateDraft: <TKey extends keyof SettingsDraft>(key: TKey, value: SettingsDraft[TKey]) => void;
  onMaintenanceAction: () => void;
}) {
  if (categoryId === 'workspace') {
    return (
      <WorkbenchSettingsSection
        id="settings-story-workspace"
        title="Workspace"
        description="Preview workspace-scoped controls without runtime or storage coupling."
      >
        <Field label="Search seed" htmlFor="settings-story-search-seed">
          <TextInput
            id="settings-story-search-seed"
            controlWidth="full"
            value={draft.searchSeed}
            onChange={(event) => updateDraft('searchSeed', event.currentTarget.value)}
          />
        </Field>
        <Field label="Workspace summary">
          <div className="workbench-settings-badge-list">
            <Badge>4 files</Badge>
            <Badge variant="muted">public fixture</Badge>
          </div>
        </Field>
      </WorkbenchSettingsSection>
    );
  }

  if (categoryId === 'permissions') {
    return (
      <WorkbenchSettingsSection
        id="settings-story-permissions"
        title="Permissions"
        description="Keep permission decisions controlled by the host application."
      >
        <Field inline label="Workspace writes">
          <Checkbox
            checked={draft.allowWorkspaceWrites}
            label="Allow mock workspace write events"
            onChange={(event) => updateDraft('allowWorkspaceWrites', event.currentTarget.checked)}
          />
        </Field>
        <Field inline label="Destructive actions">
          <Checkbox
            checked={draft.confirmDestructiveActions}
            label="Require confirmation before delete actions"
            onChange={(event) =>
              updateDraft('confirmDestructiveActions', event.currentTarget.checked)
            }
          />
        </Field>
      </WorkbenchSettingsSection>
    );
  }

  if (categoryId === 'maintenance') {
    return (
      <WorkbenchSettingsSection
        id="settings-story-maintenance"
        title="Maintenance"
        description="Demonstrate injected maintenance commands without product-specific services."
      >
        <Field inline label="Mock cache">
          <Button variant="danger" onClick={onMaintenanceAction}>
            Clear cache
          </Button>
        </Field>
      </WorkbenchSettingsSection>
    );
  }

  return (
    <WorkbenchSettingsSection
      id="settings-story-appearance"
      title="Appearance"
      description="Choose visual preferences for a workbench shell."
    >
      <Field label="Color theme" htmlFor="settings-story-theme">
        <Select
          id="settings-story-theme"
          controlWidth="full"
          value={draft.theme}
          onChange={(event) =>
            updateDraft('theme', event.currentTarget.value as SettingsDraft['theme'])
          }
        >
          <option value="dark">Dark Modern</option>
          <option value="light">Light Modern</option>
        </Select>
      </Field>
      <Field inline label="Compact rows">
        <Checkbox
          checked={draft.compactRows}
          label="Use compact rows in workbench lists"
          onChange={(event) => updateDraft('compactRows', event.currentTarget.checked)}
        />
      </Field>
    </WorkbenchSettingsSection>
  );
}

export const ComponentSurface: Story = {
  render: () => <SettingsModalHarness />,
};

export const DirtyStateFlow: Story = {
  render: () => <SettingsModalHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const settingsCategories = within(canvas.getByLabelText('Settings categories'));

    await expect(canvas.getByRole('dialog', { name: /Settings/ })).toBeVisible();
    await expect(canvas.getByText('Saved')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Reset' })).toBeDisabled();

    await userEvent.click(canvas.getByRole('combobox', { name: 'Color theme' }));
    await userEvent.click(canvas.getByRole('option', { name: 'Light Modern' }));
    await expect(canvas.getByText('Unsaved')).toBeVisible();
    await expect(canvas.getByLabelText('Settings event log')).toHaveTextContent('Unsaved settings');
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeEnabled();

    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(canvas.getByText('Saved')).toBeVisible();
    await expect(canvas.getByLabelText('Settings event log')).toHaveTextContent('Saved settings');
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeDisabled();

    await userEvent.click(settingsCategories.getByRole('button', { name: 'Workspace' }));
    const searchSeed = canvas.getByLabelText('Search seed');
    await userEvent.clear(searchSeed);
    await userEvent.type(searchSeed, 'readme');
    await expect(canvas.getByText('Unsaved')).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Reset' }));
    await expect(searchSeed).toHaveValue('button');
    await expect(canvas.getByText('Saved')).toBeVisible();
    await expect(canvas.getByLabelText('Settings event log')).toHaveTextContent('Reset settings');

    await userEvent.click(settingsCategories.getByRole('button', { name: 'Permissions' }));
    await expect(canvas.getByText('Allow mock workspace write events')).toBeVisible();
    await userEvent.click(settingsCategories.getByRole('button', { name: 'Maintenance' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Clear cache' }));
    await expect(canvas.getByLabelText('Settings event log')).toHaveTextContent(
      'Maintenance task queued',
    );
  },
};

export const ColorThemeListboxFit: Story = {
  render: () => <SettingsModalHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('combobox', { name: 'Color theme' }));

    const listbox = await screen.findByRole('listbox');
    const options = within(listbox).getAllByRole('option');

    await expect(options).toHaveLength(2);
    await expect(within(listbox).getByRole('option', { name: 'Dark Modern' })).toBeVisible();
    await expect(within(listbox).getByRole('option', { name: 'Light Modern' })).toBeVisible();

    expect(listbox.scrollHeight).toBeLessThanOrEqual(listbox.clientHeight + 2);

    const maxHeight = Number.parseFloat(getComputedStyle(listbox).maxHeight);
    expect(maxHeight).toBeGreaterThanOrEqual(56);
  },
  tags: ['storybook-play-baseline', 'storybook-play-required', 'select-listbox-fit'],
};

const scrollNavigationCategories: WorkbenchSettingsCategory[] = Array.from(
  { length: 24 },
  (_, index) => ({
    id: `settings-scroll-${index + 1}`,
    label: `Section ${String(index + 1).padStart(2, '0')}`,
  }),
);

function SettingsNavigationScrollHarness() {
  const [activeCategoryId, setActiveCategoryId] = useState(scrollNavigationCategories[0]?.id ?? '');

  return (
    <>
      <style>{`
        .workbench-settings-modal--nav-scroll-test {
          --ui-modal-height: 320px;
        }
      `}</style>
      <div
        className="workbench-story-shell"
        style={{ background: 'var(--color-bg)', minHeight: 480, padding: 16 }}
      >
        <WorkbenchSettingsModal
          activeCategoryId={activeCategoryId}
          categories={scrollNavigationCategories}
          className="workbench-settings-modal workbench-settings-modal--nav-scroll-test"
          minHeight={280}
          showSearch={false}
          title="Settings"
          onActiveCategoryIdChange={setActiveCategoryId}
          onClose={() => undefined}
          renderCategory={(category) => (
            <WorkbenchSettingsSection
              id={`settings-scroll-content-${category.id}`}
              title={category.label}
              description="Scroll the category list to reach sections that overflow the navigation rail."
            >
            <Field label="Section marker" htmlFor="settings-scroll-marker">
              <TextInput
                id="settings-scroll-marker"
                controlWidth="full"
                readOnly
                value={`Active section: ${category.label}`}
              />
            </Field>
            </WorkbenchSettingsSection>
          )}
        />
      </div>
    </>
  );
}

export const SettingsNavigationScroll: Story = {
  name: 'Settings / Navigation Scroll',
  render: () => <SettingsNavigationScrollHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const settingsDialog = canvas.getByRole('dialog', { name: /Settings/ });
    const navScroll = settingsDialog.querySelector<HTMLElement>(
      '.ui-workbench-navigation-panel__nav-scroll',
    );

    expect(navScroll).toBeTruthy();
    expect(navScroll!.scrollHeight).toBeGreaterThan(navScroll!.clientHeight + 4);

    const lastCategoryLabel =
      scrollNavigationCategories[scrollNavigationCategories.length - 1]?.label ?? 'Section 24';
    await userEvent.click(within(settingsDialog).getByRole('button', { name: lastCategoryLabel }));
    await expect(within(settingsDialog).getByRole('heading', { name: lastCategoryLabel })).toBeVisible();
    await expect(within(settingsDialog).getByLabelText('Section marker')).toHaveValue(
      `Active section: ${lastCategoryLabel}`,
    );
  },
  tags: ['storybook-play-baseline', 'storybook-play-required'],
};
