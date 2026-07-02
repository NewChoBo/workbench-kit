import { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import '../styles.css';
import { WorkbenchShell } from './WorkbenchShell';
import { sidebarDevLogger } from './sidebarDevLogger';
import {
  expectCollapsedPrimarySidebarShowsFullWidthSecondary,
  expectCollapsedSecondarySplitShowsFullWidthPrimary,
  expectCollapsedSecondaryVerticalSplitShowsFullHeightPrimary,
  expectExpandedPrimarySidebar,
} from './story/shellStory';
import { StoryWorkbenchShellFrame } from './story/StoryWorkbenchShellFrame';

const meta = {
  title: 'React/Workbench/Shell',
  parameters: {
    layout: 'fullscreen',
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function SidebarMountProbe() {
  const mountCountRef = useRef(0);

  useEffect(() => {
    mountCountRef.current += 1;
  }, []);

  return (
    <aside aria-label="Primary sidebar probe" data-sidebar-mount-count={mountCountRef.current}>
      Sidebar probe
    </aside>
  );
}

function SidebarToggleShellDemo() {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [toggleCount, setToggleCount] = useState(0);
  const [lastToggleMs, setLastToggleMs] = useState<number | null>(null);

  const handleToggle = () => {
    sidebarDevLogger.time('toggle');
    const startedAt = performance.now();
    setSidebarVisible((visible) => {
      const nextVisible = !visible;
      requestAnimationFrame(() => {
        const durationMs = performance.now() - startedAt;
        setLastToggleMs(durationMs);
        sidebarDevLogger.timeEnd('toggle');
        sidebarDevLogger.info('toggle measured', { durationMs, nextVisible });
      });
      return nextVisible;
    });
    setToggleCount((count) => count + 1);
  };

  return (
    <StoryWorkbenchShellFrame variant="editor">
      <WorkbenchShell
        activityBar={{
          items: [
            {
              active: sidebarVisible,
              icon: 'E',
              id: 'explorer',
              label: 'Explorer',
            },
          ],
          onItemActivate: handleToggle,
        }}
        primarySidebar={{
          isVisible: sidebarVisible,
          node: <SidebarMountProbe />,
          primarySizePercent: 24,
        }}
        rootClassName="ide-root"
        rootStyle={{ height: '100%', minHeight: 0 }}
        secondaryArea={
          <main aria-label="Editor area" className="workbench-editor-area">
            <p>Editor surface</p>
            <button type="button" onClick={handleToggle}>
              Toggle sidebar
            </button>
            <output aria-live="polite">
              toggles: {toggleCount}
              {lastToggleMs !== null ? ` · last: ${lastToggleMs.toFixed(1)}ms` : ''}
            </output>
          </main>
        }
        statusSections={[
          {
            id: 'shell',
            items: [
              {
                active: sidebarVisible,
                id: 'sidebar',
                label: sidebarVisible ? 'sidebar: shown' : 'sidebar: hidden',
                title: sidebarVisible ? 'Hide primary sidebar' : 'Show primary sidebar',
              },
            ],
          },
        ]}
        onStatusItemActivate={(item) => {
          if (item.id === 'sidebar') {
            handleToggle();
          }
        }}
      />
    </StoryWorkbenchShellFrame>
  );
}

export const SidebarToggle: Story = {
  name: 'Sidebar toggle',
  render: () => <SidebarToggleShellDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByLabelText('Primary sidebar probe')).toBeVisible();
    await expect(canvas.getByLabelText('Editor area')).toBeVisible();

    const splitViewsBefore = canvasElement.querySelectorAll('.ui-workbench-split-view');
    expect(splitViewsBefore.length).toBe(1);

    sidebarDevLogger.time('story-hide');
    const hideStartedAt = performance.now();
    await userEvent.click(canvas.getByRole('button', { name: 'Toggle sidebar' }));
    await waitFor(() => {
      expectCollapsedPrimarySidebarShowsFullWidthSecondary(canvasElement);
    });
    const hideDurationMs = performance.now() - hideStartedAt;
    sidebarDevLogger.timeEnd('story-hide');
    sidebarDevLogger.info('story hide measured', { hideDurationMs });

    expect(canvasElement.querySelectorAll('.ui-workbench-split-view').length).toBe(1);
    expect(canvas.getByLabelText('Primary sidebar probe')).not.toBeVisible();
    await expect(canvas.getByLabelText('Editor area')).toBeVisible();

    sidebarDevLogger.time('story-show');
    const showStartedAt = performance.now();
    await userEvent.click(canvas.getByTitle('Show primary sidebar'));
    await waitFor(() => {
      expect(canvas.getByLabelText('Primary sidebar probe')).toBeVisible();
    });
    const showDurationMs = performance.now() - showStartedAt;
    sidebarDevLogger.timeEnd('story-show');
    sidebarDevLogger.info('story show measured', { showDurationMs });

    expectExpandedPrimarySidebar(canvasElement);
    await expect(canvas.getByText(/toggles: 2/)).toBeVisible();
  },
  tags: ['storybook-play-required'],
};

function RegionMountProbe({
  label,
  region,
}: {
  label: string;
  region: 'auxiliary' | 'panel' | 'primary';
}) {
  const mountCountRef = useRef(0);

  useEffect(() => {
    mountCountRef.current += 1;
  }, []);

  const Tag = region === 'panel' ? 'section' : 'aside';

  return (
    <Tag
      aria-label={label}
      className={
        region === 'auxiliary'
          ? 'workbench-auxiliary-side-bar'
          : region === 'panel'
            ? 'workbench-bottom-panel'
            : undefined
      }
      data-region-mount-count={mountCountRef.current}
    >
      {label}
    </Tag>
  );
}

function RegionPlaygroundShellDemo() {
  const [primaryVisible, setPrimaryVisible] = useState(true);
  const [auxiliaryVisible, setAuxiliaryVisible] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [activityBarVisible, setActivityBarVisible] = useState(true);

  return (
    <StoryWorkbenchShellFrame variant="editor">
      <WorkbenchShell
        activityBar={{
          items: [{ active: primaryVisible, icon: 'E', id: 'explorer', label: 'Explorer' }],
          visible: activityBarVisible,
        }}
        auxiliarySidebar={{
          isVisible: auxiliaryVisible,
          node: <RegionMountProbe label="Auxiliary sidebar probe" region="auxiliary" />,
        }}
        bottomPanel={{
          isVisible: panelVisible,
          node: <RegionMountProbe label="Panel probe" region="panel" />,
        }}
        primarySidebar={{
          isVisible: primaryVisible,
          node: <RegionMountProbe label="Primary sidebar probe" region="primary" />,
          primarySizePercent: 22,
        }}
        rootClassName="ide-root"
        rootStyle={{ height: '100%', minHeight: 0 }}
        secondaryArea={
          <main aria-label="Editor area" className="workbench-editor-area">
            <p>Editor surface</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" onClick={() => setPrimaryVisible((visible) => !visible)}>
                Toggle primary
              </button>
              <button type="button" onClick={() => setAuxiliaryVisible((visible) => !visible)}>
                Toggle auxiliary
              </button>
              <button type="button" onClick={() => setPanelVisible((visible) => !visible)}>
                Toggle panel
              </button>
              <button type="button" onClick={() => setActivityBarVisible((visible) => !visible)}>
                Toggle activity bar
              </button>
            </div>
          </main>
        }
        statusSections={[]}
      />
    </StoryWorkbenchShellFrame>
  );
}

export const RegionPlayground: Story = {
  name: 'Region playground',
  render: () => <RegionPlaygroundShellDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByLabelText('Primary sidebar probe')).toBeVisible();
    await expect(canvas.getByLabelText('Editor area')).toBeVisible();
    expect(canvasElement.querySelectorAll('.ui-workbench-split-view').length).toBe(3);

    await userEvent.click(canvas.getByRole('button', { name: 'Toggle auxiliary' }));
    await waitFor(() => {
      expect(canvas.getByLabelText('Auxiliary sidebar probe')).toBeVisible();
    });

    await userEvent.click(canvas.getByRole('button', { name: 'Toggle auxiliary' }));
    await waitFor(() => {
      expectCollapsedSecondarySplitShowsFullWidthPrimary(canvasElement);
      expect(canvas.getByLabelText('Auxiliary sidebar probe')).not.toBeVisible();
    });

    await userEvent.click(canvas.getByRole('button', { name: 'Toggle panel' }));
    await waitFor(() => {
      expect(canvas.getByLabelText('Panel probe')).toBeVisible();
    });

    await userEvent.click(canvas.getByRole('button', { name: 'Toggle panel' }));
    await waitFor(() => {
      expectCollapsedSecondaryVerticalSplitShowsFullHeightPrimary(canvasElement);
      expect(canvas.getByLabelText('Panel probe')).not.toBeVisible();
    });

    await userEvent.click(canvas.getByRole('button', { name: 'Toggle primary' }));
    await waitFor(() => {
      expectCollapsedPrimarySidebarShowsFullWidthSecondary(canvasElement);
      expect(canvas.getByLabelText('Primary sidebar probe')).not.toBeVisible();
    });

    await userEvent.click(canvas.getByRole('button', { name: 'Toggle activity bar' }));
    await waitFor(() => {
      expect(canvasElement.querySelector('.ui-workbench-activity-bar--hidden')).not.toBeNull();
    });
  },
};
