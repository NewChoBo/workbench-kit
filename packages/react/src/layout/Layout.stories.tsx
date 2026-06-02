import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '../primitives/Badge';
import { IconButton } from '../primitives/IconButton';
import { TextInput } from '../primitives/TextInput';
import { Toolbar } from '../primitives/Toolbar';
import { Panel, PanelBody, PanelHeader } from './Panel';
import {
  SideBarHeaderControl,
  SideBarList,
  SideBarListItem,
  SideBarViewFrame,
} from './SideBarViewFrame';

const meta = {
  title: 'React/Layout',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const PanelFrame: Story = {
  render: () => (
    <div style={{ width: 560, padding: 24, background: 'var(--color-bg)' }}>
      <Panel>
        <PanelHeader
          actions={
            <Toolbar>
              <Badge>ready</Badge>
              <IconButton icon="codicon-ellipsis" label="More actions" />
            </Toolbar>
          }
        >
          Preview
        </PanelHeader>
        <PanelBody style={{ padding: 16, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          Panels provide a quiet frame for repeated workbench surfaces.
        </PanelBody>
      </Panel>
    </div>
  ),
};

export const SideBarFrame: Story = {
  render: () => (
    <div style={{ width: 300, height: 520, background: 'var(--color-bg)' }}>
      <SideBarViewFrame
        title="Components"
        actions={<IconButton icon="codicon-refresh" label="Refresh" />}
        headerAddon={
          <SideBarHeaderControl>
            <TextInput aria-label="Filter components" controlWidth="full" placeholder="Filter" />
          </SideBarHeaderControl>
        }
      >
        <SideBarList fill>
          <SideBarListItem active>Primitives</SideBarListItem>
          <SideBarListItem>Buttons</SideBarListItem>
          <SideBarListItem>Fields</SideBarListItem>
          <SideBarListItem>Panels</SideBarListItem>
          <SideBarListItem depth={1}>Split views</SideBarListItem>
          <SideBarListItem depth={1}>Dialogs</SideBarListItem>
          <SideBarListItem variant="stacked">
            <strong>Compact row</strong>
            <span>Secondary text remains contained.</span>
          </SideBarListItem>
        </SideBarList>
      </SideBarViewFrame>
    </div>
  ),
};
