import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Field,
  IconButton,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  SideBarHeaderControl,
  SideBarList,
  SideBarListItem,
  SideBarViewFrame,
  TextInput,
  Toolbar,
} from '@newchobo-ui/react';
import { ActivityBar, SplitView, type ActivityBarItem } from '@newchobo-ui/react/workbench';

type ActivityId = 'components' | 'layout' | 'forms';
type ThemeName = 'dark' | 'light';

interface SidebarNavigationItem {
  description?: string;
  depth?: number;
  id: string;
  label: string;
  variant?: 'default' | 'stacked';
}

interface WorkbenchActivity {
  icon: ActivityBarItem['icon'];
  id: ActivityId;
  items: SidebarNavigationItem[];
  label: string;
}

const activityOrder: ActivityId[] = ['components', 'layout', 'forms'];

const workbenchActivities: Record<ActivityId, WorkbenchActivity> = {
  components: {
    id: 'components',
    label: 'Components',
    icon: <i className="codicon codicon-symbol-misc" />,
    items: [
      { id: 'primitives', label: 'Primitives' },
      { id: 'buttons', label: 'Buttons' },
      { id: 'fields', label: 'Fields' },
      { id: 'panels', label: 'Panels' },
      { id: 'split-views', label: 'Split views', depth: 1 },
      { id: 'dialogs', label: 'Dialogs', depth: 1 },
      {
        id: 'compact-row',
        label: 'Compact row',
        description: 'Secondary text remains contained.',
        variant: 'stacked',
      },
    ],
  },
  layout: {
    id: 'layout',
    label: 'Layout',
    icon: <i className="codicon codicon-layout" />,
    items: [
      { id: 'activity-bar', label: 'Activity bar' },
      { id: 'side-bar', label: 'Side bar' },
      { id: 'editor-area', label: 'Editor area' },
      { id: 'inspector', label: 'Inspector', depth: 1 },
    ],
  },
  forms: {
    id: 'forms',
    label: 'Forms',
    icon: <i className="codicon codicon-settings-gear" />,
    items: [
      { id: 'density', label: 'Density controls' },
      { id: 'text-inputs', label: 'Text inputs' },
      { id: 'checkboxes', label: 'Checkboxes' },
      { id: 'selects', label: 'Select menus' },
    ],
  },
};

const secondaryActivityItems = [
  {
    id: 'theme',
    label: 'Theme',
    icon: <i className="codicon codicon-color-mode" />,
  },
];

function isActivityId(id: string): id is ActivityId {
  return id === 'components' || id === 'layout' || id === 'forms';
}

export function App() {
  const [theme, setTheme] = useState<ThemeName>('dark');
  const [activeActivityId, setActiveActivityId] = useState<ActivityId>('components');
  const [activeSidebarItemId, setActiveSidebarItemId] = useState('primitives');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [denseRows, setDenseRows] = useState(true);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const activeActivity = workbenchActivities[activeActivityId];
  const activeSidebarItem =
    activeActivity.items.find((item) => item.id === activeSidebarItemId) ?? activeActivity.items[0];

  const activateActivityItem = (item: ActivityBarItem) => {
    if (item.id === 'theme') {
      setTheme(theme === 'dark' ? 'light' : 'dark');
      return;
    }

    if (!isActivityId(item.id)) return;

    setActiveActivityId(item.id);
    setActiveSidebarItemId(workbenchActivities[item.id].items[0].id);
  };

  return (
    <main className="ide-root sample-shell">
      <div className="ide-body">
        <ActivityBar
          items={activityOrder.map((id) => ({
            ...workbenchActivities[id],
            active: id === activeActivityId,
          }))}
          secondaryItems={secondaryActivityItems.map((item) => ({
            ...item,
            active: item.id === 'theme' && theme === 'light',
            title: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
          }))}
          onItemActivate={activateActivityItem}
        />
        <aside className="workbench-primary-side-bar sample-sidebar">
          <SideBarViewFrame
            title={activeActivity.label}
            actions={<IconButton icon="codicon-refresh" label="Refresh" />}
            headerAddon={
              <SideBarHeaderControl>
                <TextInput
                  aria-label="Filter components"
                  controlWidth="full"
                  placeholder="Filter"
                />
              </SideBarHeaderControl>
            }
          >
            <SideBarList fill aria-label={`${activeActivity.label} navigation`}>
              {activeActivity.items.map((item) => (
                <SideBarListItem
                  key={item.id}
                  active={activeSidebarItem.id === item.id}
                  depth={item.depth}
                  variant={item.variant}
                  onClick={() => setActiveSidebarItemId(item.id)}
                >
                  {item.variant === 'stacked' ? (
                    <>
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
                    </>
                  ) : (
                    item.label
                  )}
                </SideBarListItem>
              ))}
            </SideBarList>
          </SideBarViewFrame>
        </aside>
        <section className="workbench-editor-area">
          <Panel>
            <PanelHeader
              actions={
                <Toolbar>
                  <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                    {theme === 'dark' ? 'Light' : 'Dark'}
                  </Button>
                  <Button variant="primary" onClick={() => setDialogOpen(true)}>
                    Open dialog
                  </Button>
                </Toolbar>
              }
            >
              {activeActivity.label} / {activeSidebarItem.label}
            </PanelHeader>
            <PanelBody className="sample-editor-body">
              <SplitView
                defaultPrimarySizePercent={58}
                primary={
                  <PreviewPane
                    activityLabel={activeActivity.label}
                    denseRows={denseRows}
                    itemLabel={activeSidebarItem.label}
                  />
                }
                secondary={<ControlsPane denseRows={denseRows} onDenseRowsChange={setDenseRows} />}
              />
            </PanelBody>
          </Panel>
        </section>
      </div>
      {dialogOpen ? (
        <ConfirmDialog
          title="Confirm Action"
          message="This dialog is rendered by the shared React package."
          detail={<code>@newchobo-ui/react</code>}
          confirmLabel="Looks good"
          onCancel={() => setDialogOpen(false)}
          onConfirm={() => setDialogOpen(false)}
        />
      ) : null}
    </main>
  );
}

function PreviewPane({
  activityLabel,
  denseRows,
  itemLabel,
}: {
  activityLabel: string;
  denseRows: boolean;
  itemLabel: string;
}) {
  return (
    <Panel className="sample-pane">
      <PanelHeader
        actions={
          <Toolbar>
            <Badge>ready</Badge>
            <Badge variant="muted">react</Badge>
          </Toolbar>
        }
      >
        Preview
      </PanelHeader>
      <PanelBody className="sample-preview">
        <section className="sample-hero">
          <div>
            <h1>{itemLabel}</h1>
            <p>{activityLabel} surface with stable density and panel-first composition.</p>
          </div>
          <IconButton icon="codicon-ellipsis" label="More actions" />
        </section>
        <div className="sample-card-grid">
          <div className="sample-card">
            <span className="sample-card__label">Button</span>
            <Button variant="primary">Primary</Button>
          </div>
          <div className="sample-card">
            <span className="sample-card__label">Badge</span>
            <Badge variant="danger">danger</Badge>
          </div>
          <div className="sample-card">
            <span className="sample-card__label">Input</span>
            <TextInput controlWidth="full" placeholder="Compact input" />
          </div>
        </div>
        <div className="sample-list" data-density={denseRows ? 'dense' : 'comfortable'}>
          {['Navigation row', 'Selection row', 'Scrollable content row', 'Action row'].map(
            (item) => (
              <div key={item} className="sample-list__row">
                <i className="codicon codicon-file" />
                <span>{item}</span>
                <Badge variant="muted">item</Badge>
              </div>
            ),
          )}
        </div>
      </PanelBody>
    </Panel>
  );
}

function ControlsPane({
  denseRows,
  onDenseRowsChange,
}: {
  denseRows: boolean;
  onDenseRowsChange: (value: boolean) => void;
}) {
  return (
    <Panel className="sample-pane">
      <PanelHeader>Controls</PanelHeader>
      <PanelBody className="sample-controls">
        <Field label="Display density" description="A compact desktop rhythm for repeated rows.">
          <Select
            controlWidth="full"
            value={denseRows ? 'dense' : 'comfortable'}
            onChange={(event) => onDenseRowsChange(event.target.value === 'dense')}
          >
            <option value="dense">Dense</option>
            <option value="comfortable">Comfortable</option>
          </Select>
        </Field>
        <Field label="Field width" description="Inputs can fill their parent without local CSS.">
          <TextInput controlWidth="full" placeholder="Full width text field" />
        </Field>
        <Field inline label="Boolean setting">
          <Checkbox
            checked={denseRows}
            label="Use dense rows"
            onChange={(event) => onDenseRowsChange(event.currentTarget.checked)}
          />
        </Field>
        <div className="sample-empty-slot">
          <Panel>
            <PanelBody>
              <EmptyState icon="codicon-beaker">
                Reusable empty surfaces stay quiet and centered.
              </EmptyState>
            </PanelBody>
          </Panel>
        </div>
      </PanelBody>
    </Panel>
  );
}
