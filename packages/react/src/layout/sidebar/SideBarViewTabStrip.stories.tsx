import { useCallback, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, within } from 'storybook/test';

import '../../styles.css';
import { ActivityBar } from '../../workbench/shell/ActivityBar';
import { writeWorkbenchSidebarViewPlacementDrag } from '../../workbench/shell/sidebarViewPlacementDnd';
import { StoryEventLog, StorySidebarFrame } from '../../workbench/story/StorySidebarFrame';
import { SideBarViewFrame } from './SideBarViewFrame';
import { SideBarViewTabStrip, type SideBarViewTabDescriptor } from './SideBarViewTabStrip';

const TAB_PRESENTATIONS = {
  library: { icon: 'library', label: 'Library' },
  launchpad: { icon: 'rocket', label: 'Launchpad' },
  social: { icon: 'comment-discussion', label: 'Social' },
} as const;

type DemoTabId = keyof typeof TAB_PRESENTATIONS;

function SideBarViewTabStripHarness({
  initialActiveId = 'library',
  initialTabOrder = ['library', 'launchpad', 'social'] as DemoTabId[],
  reorderable = true,
}: {
  initialActiveId?: DemoTabId;
  initialTabOrder?: readonly DemoTabId[];
  reorderable?: boolean;
}) {
  const [activeId, setActiveId] = useState<DemoTabId>(initialActiveId);
  const [tabOrder, setTabOrder] = useState<readonly DemoTabId[]>(initialTabOrder);

  const buildTabs = useCallback((): SideBarViewTabDescriptor[] => {
    return tabOrder.map((tabId) => {
      const presentation = TAB_PRESENTATIONS[tabId];

      return {
        active: activeId === tabId,
        dataAttributes: {
          'data-demo-sidebar-view-tab': tabId,
        },
        icon: presentation.icon,
        id: tabId,
        label: presentation.label,
        onSelect: () => {
          setActiveId(tabId);
        },
      };
    });
  }, [activeId, tabOrder]);

  return (
    <StorySidebarFrame variant="workspace">
      <SideBarViewTabStrip
        data-demo-sidebar-view-tab-strip="secondary"
        onTabsReorder={(orderedTabIds) => {
          setTabOrder(orderedTabIds as DemoTabId[]);
        }}
        placementDraggable
        reorderable={reorderable && tabOrder.length > 1}
        tabs={buildTabs()}
      />
      <StoryEventLog aria-label="Sidebar tab strip state">
        active: {activeId} · order: {tabOrder.join(', ')}
      </StoryEventLog>
    </StorySidebarFrame>
  );
}

const meta = {
  title: 'Workbench UI/Sidebar/View Tabs',
  parameters: {
    layout: 'fullscreen',
    storybookGrid: { enabled: false },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type SidebarSlotId = 'primary' | 'secondary';

const DEFAULT_SLOT_PLACEMENTS: Record<DemoTabId, SidebarSlotId> = {
  library: 'primary',
  launchpad: 'primary',
  social: 'secondary',
};

function DualSidebarSlotPlacementHarness() {
  const [placements, setPlacements] =
    useState<Record<DemoTabId, SidebarSlotId>>(DEFAULT_SLOT_PLACEMENTS);
  const [activePrimaryId, setActivePrimaryId] = useState<DemoTabId>('library');
  const [activeSecondaryId, setActiveSecondaryId] = useState<DemoTabId>('social');

  const primaryViewIds = (['library', 'launchpad', 'social'] as const).filter(
    (viewId) => placements[viewId] === 'primary',
  );
  const secondaryViewIds = (['library', 'launchpad', 'social'] as const).filter(
    (viewId) => placements[viewId] === 'secondary',
  );

  const assignViewToSlot = useCallback((viewId: DemoTabId, slot: SidebarSlotId) => {
    setPlacements((current) => ({
      ...current,
      [viewId]: slot,
    }));

    if (slot === 'primary') {
      setActivePrimaryId(viewId);
      return;
    }

    setActiveSecondaryId(viewId);
  }, []);

  const buildSecondaryTabs = useCallback((): SideBarViewTabDescriptor[] => {
    return secondaryViewIds.map((viewId) => {
      const presentation = TAB_PRESENTATIONS[viewId];

      return {
        active: activeSecondaryId === viewId,
        dataAttributes: {
          'data-demo-sidebar-view-tab': viewId,
        },
        icon: presentation.icon,
        id: viewId,
        label: presentation.label,
        onSelect: () => {
          setActiveSecondaryId(viewId);
        },
      };
    });
  }, [activeSecondaryId, secondaryViewIds]);

  return (
    <StorySidebarFrame variant="workspace">
      <div data-demo-dual-sidebar-layout="true" style={{ display: 'flex', minHeight: 240 }}>
        <ActivityBar
          data-demo-primary-activity-bar="true"
          items={primaryViewIds.map((viewId) => {
            const presentation = TAB_PRESENTATIONS[viewId];

            return {
              active: activePrimaryId === viewId,
              icon: presentation.icon,
              id: viewId,
              label: presentation.label,
            };
          })}
          onItemActivate={(item) => {
            setActivePrimaryId(item.id as DemoTabId);
          }}
          onSidebarViewPlacementDrop={(viewId) => {
            assignViewToSlot(viewId as DemoTabId, 'primary');
          }}
          placementDraggable
          sidebarViewPlacementDropZoneId="primary"
        />
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
          <SideBarViewTabStrip
            data-demo-secondary-tab-strip="true"
            onSidebarViewPlacementDrop={(viewId) => {
              assignViewToSlot(viewId as DemoTabId, 'secondary');
            }}
            placementDraggable
            sidebarViewPlacementDropZoneId="secondary"
            tabs={buildSecondaryTabs()}
          />
          <StoryEventLog aria-label="Dual sidebar slot state">
            primary: {primaryViewIds.join(', ') || '(empty)'} · secondary:{' '}
            {secondaryViewIds.join(', ') || '(empty)'}
          </StoryEventLog>
        </div>
      </div>
    </StorySidebarFrame>
  );
}

export const DualSlotPlacementDrag: Story = {
  name: 'Dual slot placement drag',
  tags: ['storybook-play-required'],
  render: () => <DualSidebarSlotPlacementHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByLabelText('Dual sidebar slot state')).toHaveTextContent(
      'primary: library, launchpad',
    );
    await expect(canvas.getByLabelText('Dual sidebar slot state')).toHaveTextContent(
      'secondary: social',
    );

    await dragViewToPlacementZone(canvasElement, canvas, 'Social', 'primary');

    await expect(canvas.getByLabelText('Dual sidebar slot state')).toHaveTextContent(
      'primary: library, launchpad, social',
    );
    await expect(canvas.getByLabelText('Dual sidebar slot state')).toHaveTextContent(
      'secondary: (empty)',
    );
  },
};

export const TabSelectionAndReorder: Story = {
  name: 'Tab selection and reorder',
  tags: ['storybook-play-required'],
  render: () => <SideBarViewTabStripHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Launchpad' }));

    await expect(canvas.getByRole('button', { name: 'Launchpad' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByRole('button', { name: 'Library' })).not.toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByLabelText('Sidebar tab strip state')).toHaveTextContent(
      'active: launchpad',
    );

    await dragTabBefore(canvas, 'Social', 'Library');

    await expect(canvas.getByLabelText('Sidebar tab strip state')).toHaveTextContent(
      'order: social, library, launchpad',
    );
  },
};

const INSPECTOR_TAB_PRESENTATIONS = {
  window: { icon: 'layout', label: 'Window' },
  content: { icon: 'symbol-misc', label: 'Content' },
} as const;

type InspectorTabId = keyof typeof INSPECTOR_TAB_PRESENTATIONS;

function InspectorIconTabsHarness() {
  const [activeId, setActiveId] = useState<InspectorTabId>('window');

  const tabs: SideBarViewTabDescriptor[] = (
    Object.keys(INSPECTOR_TAB_PRESENTATIONS) as InspectorTabId[]
  ).map((tabId) => {
    const presentation = INSPECTOR_TAB_PRESENTATIONS[tabId];
    return {
      active: activeId === tabId,
      icon: presentation.icon,
      id: tabId,
      label: presentation.label,
      onSelect: () => setActiveId(tabId),
    };
  });

  return (
    <StorySidebarFrame variant="workspace">
      <SideBarViewFrame
        aria-label="Inspector sidebar"
        className="ui-story-sidebar-inspector"
        headerAddon={<SideBarViewTabStrip tabs={tabs} />}
        title="Inspector"
      >
        <StoryEventLog aria-label="Inspector tab state">
          active inspector tab: {activeId}
        </StoryEventLog>
        <p>
          {activeId === 'window'
            ? 'Window shell settings belong in this inspector pane.'
            : 'Content assignment and presentation overrides belong here.'}
        </p>
      </SideBarViewFrame>
    </StorySidebarFrame>
  );
}

export const InspectorIconTabs: Story = {
  name: 'Inspector icon tabs',
  tags: ['storybook-play-required'],
  render: () => <InspectorIconTabsHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByLabelText('Inspector tab state')).toHaveTextContent(
      'active inspector tab: window',
    );

    await userEvent.click(canvas.getByRole('button', { name: 'Content' }));

    await expect(canvas.getByRole('button', { name: 'Content' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByLabelText('Inspector tab state')).toHaveTextContent(
      'active inspector tab: content',
    );
    await expect(
      canvas.getByText('Content assignment and presentation overrides belong here.'),
    ).toBeVisible();
  },
};

async function dragViewToPlacementZone(
  canvasElement: HTMLElement,
  canvas: ReturnType<typeof within>,
  sourceLabel: string,
  targetZoneId: SidebarSlotId,
): Promise<void> {
  const sourceButton = canvas.getByRole('button', { name: sourceLabel });
  const sourceHost = sourceButton.closest('.ui-sidebar-action-icon-bar__item-host');

  if (!(sourceHost instanceof HTMLElement)) {
    throw new Error('Expected draggable view host for placement drag play flow.');
  }

  const dropZone = queryPlacementDropZone(canvasElement, targetZoneId);
  const dataTransfer = createDataTransfer();
  writeWorkbenchSidebarViewPlacementDrag(dataTransfer, resolveViewIdFromLabel(sourceLabel));

  fireEvent.dragStart(sourceHost, { dataTransfer });
  fireEvent.dragEnter(dropZone, { dataTransfer });
  fireEvent.dragOver(dropZone, { dataTransfer });
  fireEvent.drop(dropZone, { dataTransfer });
}

function queryPlacementDropZone(canvasElement: HTMLElement, zoneId: SidebarSlotId): HTMLElement {
  const dropZone = canvasElement.querySelector(`[data-wb-sidebar-placement-drop-zone="${zoneId}"]`);

  if (!(dropZone instanceof HTMLElement)) {
    throw new Error(`Expected placement drop zone "${zoneId}".`);
  }

  return dropZone;
}

function resolveViewIdFromLabel(label: string): DemoTabId {
  const normalized = label.toLowerCase();

  if (normalized === 'library' || normalized === 'launchpad' || normalized === 'social') {
    return normalized;
  }

  throw new Error(`Unknown demo view label: ${label}`);
}

async function dragTabBefore(
  canvas: ReturnType<typeof within>,
  sourceLabel: string,
  targetLabel: string,
): Promise<void> {
  const sourceButton = canvas.getByRole('button', { name: sourceLabel });
  const targetButton = canvas.getByRole('button', { name: targetLabel });
  const sourceHost = sourceButton.closest('.ui-sidebar-action-icon-bar__item-host');
  const targetHost = targetButton.closest('.ui-sidebar-action-icon-bar__item-host');

  if (!(sourceHost instanceof HTMLElement) || !(targetHost instanceof HTMLElement)) {
    throw new Error('Expected draggable tab hosts for reorder play flow.');
  }

  const dataTransfer = createDataTransfer();
  const { clientX } = mockHorizontalDropRect(targetHost, 'before');

  fireEvent.dragStart(sourceHost, { dataTransfer });
  fireEvent.dragOver(targetHost, { clientX, dataTransfer });
  fireEvent.drop(targetHost, { clientX, dataTransfer });
}

function mockHorizontalDropRect(
  target: HTMLElement,
  placement: 'before' | 'after',
): { readonly clientX: number } {
  const left = 120;
  const width = 40;
  const rect = {
    bottom: 40,
    height: 32,
    left,
    right: left + width,
    top: 8,
    width,
    x: left,
    y: 8,
    toJSON: () => ({}),
  } as DOMRect;

  Object.defineProperty(target, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect,
  });

  if (placement === 'before') {
    return { clientX: left + 2 };
  }

  return { clientX: left + width - 2 };
}

function createDataTransfer(): DataTransfer {
  if (typeof DataTransfer !== 'undefined') {
    return new DataTransfer();
  }

  const store = new Map<string, string>();

  return {
    clearData: (format?: string) => {
      if (format) {
        store.delete(format);
      } else {
        store.clear();
      }
    },
    dropEffect: 'move',
    effectAllowed: 'move',
    files: [] as unknown as FileList,
    getData: (format: string) => store.get(format) ?? '',
    items: [] as unknown as DataTransferItemList,
    setDragImage: () => undefined,
    setData: (format: string, data: string) => {
      store.set(format, data);
    },
    types: [],
  } as unknown as DataTransfer;
}
