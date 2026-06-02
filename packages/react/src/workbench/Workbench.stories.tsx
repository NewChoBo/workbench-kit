import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Panel, PanelBody, PanelHeader } from '../layout/Panel';
import {
  SideBarHeaderControl,
  SideBarList,
  SideBarListItem,
  SideBarViewFrame,
} from '../layout/SideBarViewFrame';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { EmptyState } from '../primitives/EmptyState';
import { IconButton } from '../primitives/IconButton';
import { TextInput } from '../primitives/TextInput';
import { Toolbar } from '../primitives/Toolbar';
import { ActivityBar } from './ActivityBar';
import { SplitView } from './SplitView';

const meta = {
  title: 'React/Workbench',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type StoryActivityId = 'components' | 'layout' | 'forms';

interface StoryNavigationItem {
  description?: string;
  depth?: number;
  id: string;
  label: string;
  variant?: 'default' | 'stacked';
}

interface StoryActivity {
  icon: ReactNode;
  id: StoryActivityId;
  items: StoryNavigationItem[];
  label: string;
}

const storyActivityOrder: StoryActivityId[] = ['components', 'layout', 'forms'];

const storyActivities: Record<StoryActivityId, StoryActivity> = {
  components: {
    id: 'components',
    label: 'Components',
    icon: <i className="codicon codicon-symbol-misc" />,
    items: [
      { id: 'primitives', label: 'Primitives' },
      { id: 'buttons', label: 'Buttons' },
      { id: 'fields', label: 'Fields' },
      { id: 'panels', label: 'Panels' },
      { id: 'split-view', label: 'Split view', depth: 1 },
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
      { id: 'primary-sidebar', label: 'Primary sidebar' },
      { id: 'editor-area', label: 'Editor area' },
      { id: 'inspector', label: 'Inspector', depth: 1 },
    ],
  },
  forms: {
    id: 'forms',
    label: 'Forms',
    icon: <i className="codicon codicon-settings-gear" />,
    items: [
      { id: 'density', label: 'Density' },
      { id: 'text-inputs', label: 'Text inputs' },
      { id: 'checkboxes', label: 'Checkboxes' },
      { id: 'selects', label: 'Select menus' },
    ],
  },
};

function isStoryActivityId(id: string): id is StoryActivityId {
  return id === 'components' || id === 'layout' || id === 'forms';
}

export const ActivityRail: Story = {
  render: () => (
    <div style={{ height: 360, background: 'var(--color-bg)' }}>
      <ActivityBar
        items={storyActivityOrder.map((id) => ({
          id,
          label: storyActivities[id].label,
          icon: storyActivities[id].icon,
          active: id === 'components',
        }))}
        secondaryItems={[
          {
            id: 'theme',
            label: 'Theme',
            icon: <i className="codicon codicon-color-mode" />,
          },
        ]}
      />
    </div>
  ),
};

export const IntegratedShell: Story = {
  render: () => <IntegratedWorkbenchShell />,
};

function IntegratedWorkbenchShell() {
  const [activeActivityId, setActiveActivityId] = useState<StoryActivityId>('components');
  const [activeItemId, setActiveItemId] = useState('primitives');
  const activeActivity = storyActivities[activeActivityId];
  const activeItem =
    activeActivity.items.find((item) => item.id === activeItemId) ?? activeActivity.items[0];

  const activateActivity = (activityId: StoryActivityId) => {
    setActiveActivityId(activityId);
    setActiveItemId(storyActivities[activityId].items[0].id);
  };

  return (
    <main className="ide-root" style={{ height: 560, minHeight: 0 }}>
      <div className="ide-body">
        <ActivityBar
          items={storyActivityOrder.map((id) => ({
            id,
            label: storyActivities[id].label,
            icon: storyActivities[id].icon,
            active: id === activeActivityId,
          }))}
          secondaryItems={[
            {
              id: 'settings',
              label: 'Settings',
              icon: <i className="codicon codicon-settings-gear" />,
            },
          ]}
          onItemActivate={(item) => {
            if (isStoryActivityId(item.id)) {
              activateActivity(item.id);
            }
          }}
        />
        <aside
          aria-label="Primary sidebar"
          className="workbench-primary-side-bar"
          style={{
            width: 280,
            flex: '0 0 280px',
            borderRight: '1px solid var(--color-border)',
          }}
        >
          <SideBarViewFrame
            title={activeActivity.label}
            actions={<IconButton icon="codicon-refresh" label="Refresh" />}
            headerAddon={
              <SideBarHeaderControl>
                <TextInput
                  aria-label={`Filter ${activeActivity.label}`}
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
                  active={activeItem.id === item.id}
                  depth={item.depth}
                  variant={item.variant}
                  onClick={() => setActiveItemId(item.id)}
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
                  <Badge>ready</Badge>
                  <Button variant="primary">Run</Button>
                </Toolbar>
              }
            >
              {activeActivity.label} / {activeItem.label}
            </PanelHeader>
            <PanelBody style={{ display: 'flex', overflow: 'hidden' }}>
              <SplitView
                defaultPrimarySizePercent={60}
                primary={
                  <Panel style={{ minWidth: 0 }}>
                    <PanelHeader
                      actions={
                        <Toolbar>
                          <Badge variant="muted">{activeActivity.id}</Badge>
                          <IconButton icon="codicon-ellipsis" label="More actions" />
                        </Toolbar>
                      }
                    >
                      {activeItem.label}
                    </PanelHeader>
                    <PanelBody style={{ padding: 16 }}>
                      <section
                        style={{
                          display: 'grid',
                          gap: 12,
                          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        }}
                      >
                        {['Preview', 'State', 'Actions'].map((label) => (
                          <div
                            key={label}
                            style={{
                              minHeight: 92,
                              padding: 12,
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--color-surface)',
                              color: 'var(--color-text-muted)',
                            }}
                          >
                            <strong style={{ display: 'block', color: 'var(--color-text)' }}>
                              {label}
                            </strong>
                            <span>{activeItem.label}</span>
                          </div>
                        ))}
                      </section>
                    </PanelBody>
                  </Panel>
                }
                secondary={
                  <Panel style={{ minWidth: 0 }}>
                    <PanelHeader>Inspector</PanelHeader>
                    <PanelBody style={{ padding: 16 }}>
                      <EmptyState compact icon="codicon-layout-sidebar-right">
                        {activeActivity.label}
                      </EmptyState>
                    </PanelBody>
                  </Panel>
                }
              />
            </PanelBody>
          </Panel>
        </section>
      </div>
    </main>
  );
}

export const SplitWorkspace: Story = {
  render: () => (
    <div style={{ width: '100%', height: 420, background: 'var(--color-bg)' }}>
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
