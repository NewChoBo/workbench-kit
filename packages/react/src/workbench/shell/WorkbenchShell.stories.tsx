import {
  RetainedOverlayBoundaryDemo,
  verifyRetainedOverlayBoundaries,
} from '../story/RetainedOverlayBoundaryProbe';
import { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import '../../styles.css';
import { WorkbenchShell } from './WorkbenchShell';
import { WorkbenchDesktopTitleBar } from './WorkbenchDesktopTitleBar';
import { IconButton } from '../../primitives/icon-button/IconButton';
import { Select } from '../../primitives/select/Select';
import { Modal } from '../../modal/Modal';
import { WorkbenchModalPortal } from '../chrome/WorkbenchModalPortal';
import type { WorkbenchFramePresentation } from '@workbench-kit/workbench-core';
import {
  expectCollapsedPrimarySidebarShowsFullWidthSecondary,
  expectCollapsedSecondarySplitShowsFullWidthPrimary,
  expectCollapsedSecondaryVerticalSplitShowsFullHeightPrimary,
  expectExpandedPrimarySidebar,
} from '../story/shellStory';
import { StoryWorkbenchShellFrame } from '../story/StoryWorkbenchShellFrame';
import {
  DirectSplitHiddenDemo,
  verifyDirectSplitHiddenGeometry,
} from '../story/SplitViewPresentationProbe';

const meta = {
  title: 'Workbench UI/Shell',
  parameters: {
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
    console.time('[workbench-shell:story] toggle');
    const startedAt = performance.now();
    setSidebarVisible((visible) => {
      const nextVisible = !visible;
      requestAnimationFrame(() => {
        const durationMs = performance.now() - startedAt;
        setLastToggleMs(durationMs);
        console.timeEnd('[workbench-shell:story] toggle');
        console.debug('[workbench-shell:story] toggle measured', { durationMs, nextVisible });
      });
      return nextVisible;
    });
    setToggleCount((count) => count + 1);
  };

  return (
    <StoryWorkbenchShellFrame fill variant="editor">
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
          primarySizePx: 260,
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

    console.time('[workbench-shell:story] story-hide');
    const hideStartedAt = performance.now();
    await userEvent.click(canvas.getByRole('button', { name: 'Toggle sidebar' }));
    await waitFor(() => {
      expectCollapsedPrimarySidebarShowsFullWidthSecondary(canvasElement);
    });
    const hideDurationMs = performance.now() - hideStartedAt;
    console.timeEnd('[workbench-shell:story] story-hide');
    console.debug('[workbench-shell:story] story hide measured', { hideDurationMs });

    expect(canvasElement.querySelectorAll('.ui-workbench-split-view').length).toBe(1);
    expect(canvas.getByLabelText('Primary sidebar probe')).not.toBeVisible();
    await expect(canvas.getByLabelText('Editor area')).toBeVisible();

    console.time('[workbench-shell:story] story-show');
    const showStartedAt = performance.now();
    await userEvent.click(canvas.getByTitle('Show primary sidebar'));
    await waitFor(() => {
      expect(canvas.getByLabelText('Primary sidebar probe')).toBeVisible();
    });
    const showDurationMs = performance.now() - showStartedAt;
    console.timeEnd('[workbench-shell:story] story-show');
    console.debug('[workbench-shell:story] story show measured', { showDurationMs });

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
    <StoryWorkbenchShellFrame fill variant="editor">
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
          primarySizePx: 260,
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

function PrimarySidebarPixelResizeDemo() {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [primarySizePx, setPrimarySizePx] = useState(260);

  return (
    <StoryWorkbenchShellFrame fill variant="editor">
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
          onItemActivate: () => setSidebarVisible((visible) => !visible),
        }}
        primarySidebar={{
          isVisible: sidebarVisible,
          maxPrimarySizePx: 480,
          minPrimarySizePx: 200,
          node: <aside aria-label="Primary sidebar probe">Sidebar {primarySizePx}px</aside>,
          onSizePxChange: setPrimarySizePx,
          primarySizePx,
        }}
        rootClassName="ide-root"
        rootStyle={{ height: '100%', minHeight: 0 }}
        secondaryArea={
          <main aria-label="Editor area" className="workbench-editor-area">
            <p>Primary sidebar width uses pixel SplitView units.</p>
            <output aria-live="polite">sidebar width: {primarySizePx}px</output>
          </main>
        }
        statusSections={[]}
      />
    </StoryWorkbenchShellFrame>
  );
}

export const PrimarySidebarPixelResize: Story = {
  name: 'Primary sidebar pixel resize',
  tags: ['storybook-play-required'],
  render: () => <PrimarySidebarPixelResizeDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const separator = canvasElement.querySelector(
      '.ui-workbench-split-view__separator',
    ) as HTMLElement | null;

    expect(separator).not.toBeNull();
    expect(separator).toHaveAttribute('aria-valuenow', '260');
    await expect(canvas.getByText('sidebar width: 260px')).toBeVisible();

    separator?.focus();
    await userEvent.keyboard('{ArrowRight}');

    await waitFor(() => {
      expect(separator).toHaveAttribute('aria-valuenow', '276');
    });
    await expect(canvas.getByText('sidebar width: 276px')).toBeVisible();
  },
};

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
  tags: ['storybook-play-baseline'],
};

function RetainedFrameDemo({
  width = 1188,
  theme = 'dark',
  korean = false,
  shellPreset = 'default',
  textScale = 1,
}: {
  width?: number;
  theme?: 'light' | 'dark';
  korean?: boolean;
  shellPreset?: string;
  textScale?: number;
}) {
  const [presentation, setPresentation] = useState<WorkbenchFramePresentation>('canvas');
  const [sidebar, setSidebar] = useState(true);
  const [modal, setModal] = useState(false);
  const canvasTarget = useRef<HTMLInputElement>(null);
  const dockedTarget = useRef<HTMLInputElement>(null);
  const switchPresentation = () =>
    setPresentation((current) => (current === 'canvas' ? 'docked' : 'canvas'));
  return (
    <div style={{ width, maxWidth: '100%', height: 640, fontSize: `${textScale}rem` }}>
      <WorkbenchShell
        rootClassName="ide-root"
        rootStyle={{ fontSize: `${textScale}rem` }}
        theme={theme}
        themePreset={theme === 'light' ? 'light-plus' : 'dark-plus'}
        shellPreset={shellPreset}
        presentation={presentation}
        presentationFocusTargets={{ canvas: canvasTarget, docked: dockedTarget }}
        canvasAriaLabel={korean ? '작성 영역' : 'Authored canvas'}
        dockedAriaLabel={korean ? '작업 공간' : 'Docked tools'}
        titleBar={
          <WorkbenchDesktopTitleBar
            leading={
              <IconButton
                icon="arrow-swap"
                label="Switch presentation"
                onClick={switchPresentation}
              />
            }
            centerSlot={
              <span>{korean ? '한 창에서 작성하고 관리하기' : 'One application frame'}</span>
            }
            trailing={
              <>
                <IconButton
                  icon="layout-sidebar-left"
                  label="Toggle pane"
                  onClick={() => setSidebar((value) => !value)}
                />
                <IconButton icon="lock" label="Open global dialog" onClick={() => setModal(true)} />
              </>
            }
            windowControls={{
              isMaximized: false,
              onClose: () => undefined,
              onMinimize: () => undefined,
              onToggleMaximized: () => undefined,
            }}
          />
        }
        activityBar={{ items: [{ id: 'files', label: 'Files', icon: 'F' }] }}
        primarySidebar={{
          isVisible: sidebar,
          primarySizePx: 260,
          node: (
            <section>
              <label>
                Pane property
                <Select aria-label="Pane property">
                  <option>One</option>
                  <option>Two</option>
                </Select>
              </label>
            </section>
          ),
        }}
        auxiliarySidebar={{ isVisible: true, node: <section>Auxiliary content</section> }}
        bottomPanel={{ isVisible: true, sizePercent: 30, node: <section>Panel content</section> }}
        secondaryArea={
          <main>
            <RetainedDraftProbe name="Editor" inputRef={dockedTarget} />
          </main>
        }
        canvasArea={
          <section style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <RetainedDraftProbe name="Canvas" inputRef={canvasTarget} />
            <label>
              Property
              <Select aria-label="Canvas property">
                <option>Alpha</option>
                <option>Beta</option>
              </Select>
            </label>
          </section>
        }
        statusSections={[{ id: 'status', items: [{ id: 'ready', label: 'Ready' }] }]}
        overlays={
          modal ? (
            <WorkbenchModalPortal>
              <Modal
                title="Global confirmation"
                onClose={() => setModal(false)}
                footer={<button onClick={() => setModal(false)}>Keep draft</button>}
              >
                <button onClick={switchPresentation}>Switch behind dialog</button>
              </Modal>
            </WorkbenchModalPortal>
          ) : null
        }
      />
    </div>
  );
}

function RetainedDraftProbe({
  name,
  inputRef,
}: {
  name: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const mounts = useRef(0);
  const root = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState('Uncommitted content');
  useEffect(() => {
    mounts.current++;
    root.current?.setAttribute('data-mount-count', String(mounts.current));
  }, []);
  return (
    <section ref={root} data-draft-probe={name}>
      <label>
        {name} draft
        <input
          ref={inputRef}
          aria-label={`${name} draft`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </label>
    </section>
  );
}

const retainedFramePlay: NonNullable<Story['play']> = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const frame = canvasElement.querySelector<HTMLElement>('.ui-workbench-frame')!;
  const canvasRegion = frame.querySelector<HTMLElement>('[data-workbench-presentation="canvas"]')!;
  const dockedRegion = frame.querySelector<HTMLElement>('[data-workbench-presentation="docked"]')!;
  const title = frame.querySelector<HTMLElement>('.ui-workbench-titlebar')!;
  const switchButton = canvas.getByRole('button', { name: 'Switch presentation' });
  const draft = canvas.getByRole('textbox', { name: 'Canvas draft' });
  await userEvent.clear(draft);
  await userEvent.type(draft, 'Retained edit');
  expect(dockedRegion.getBoundingClientRect().height).toBe(0);
  expect(dockedRegion).toHaveAttribute('inert');
  expect(title.getBoundingClientRect().top).toBe(frame.getBoundingClientRect().top);
  expect(frame.querySelectorAll('.ui-workbench-titlebar')).toHaveLength(1);
  const nativeTitle = frame.querySelector<HTMLElement>('.ui-workbench-desktop-titlebar')!;
  expect(getComputedStyle(nativeTitle).getPropertyValue('-webkit-app-region')).toBe('drag');
  const leading = nativeTitle.querySelector<HTMLElement>(
    '.ui-workbench-desktop-titlebar__leading',
  )!;
  expect(getComputedStyle(leading).getPropertyValue('-webkit-app-region')).toBe('no-drag');
  const buttons = Array.from(nativeTitle.querySelectorAll<HTMLElement>('button'));
  for (const button of buttons) {
    const rect = button.getBoundingClientRect();
    expect(rect.left).toBeGreaterThanOrEqual(title.getBoundingClientRect().left);
    expect(rect.right).toBeLessThanOrEqual(title.getBoundingClientRect().right);
  }
  await userEvent.click(canvas.getByRole('combobox', { name: 'Canvas property' }));
  const listbox = canvas.getByRole('listbox');
  // Programmatic mode changes retain the open chooser rather than outside-click dismissing it.
  switchButton.click();
  await waitFor(() => expect(canvasRegion.getBoundingClientRect().height).toBe(0));
  expect(listbox.getBoundingClientRect().height).toBe(0);
  expect(canvas.queryByRole('listbox')).toBeNull();
  expect(canvas.getAllByRole('main')).toHaveLength(1);
  switchButton.click();
  await waitFor(() => expect(canvasRegion.getBoundingClientRect().height).toBeGreaterThan(0));
  expect(canvas.getByRole('listbox')).toBe(listbox);
  expect(listbox.getBoundingClientRect().width).toBeGreaterThan(0);
  expect(draft).toHaveValue('Retained edit');
  expect(frame.querySelector('[data-draft-probe="Canvas"]')).toHaveAttribute(
    'data-mount-count',
    '1',
  );
  expect(frame.querySelector('[data-draft-probe="Editor"]')).toHaveAttribute(
    'data-mount-count',
    '1',
  );
  await userEvent.keyboard('{Escape}');
  draft.focus();
  canvas.getByRole('button', { name: 'Open global dialog' }).click();
  const modal = await canvas.findByRole('dialog', { name: 'Global confirmation' });
  await userEvent.click(within(modal).getByRole('button', { name: 'Switch behind dialog' }));
  expect(modal.contains(modal.ownerDocument.activeElement)).toBe(true);
  await userEvent.click(within(modal).getByRole('button', { name: 'Keep draft' }));
  await waitFor(() => expect(canvas.getByRole('textbox', { name: 'Editor draft' })).toHaveFocus());
  await userEvent.click(canvas.getByRole('combobox', { name: 'Pane property' }));
  const paneListbox = canvas.getByRole('listbox');
  canvas.getByRole('button', { name: 'Toggle pane' }).click();
  await waitFor(() => expect(paneListbox.getBoundingClientRect().height).toBe(0));
  expect(canvas.queryByRole('listbox')).toBeNull();
  canvas.getByRole('button', { name: 'Toggle pane' }).click();
  await waitFor(() => expect(canvas.getByRole('listbox')).toBe(paneListbox));
  const option = within(paneListbox).getByRole('option', { name: 'Two' });
  const box = option.getBoundingClientRect();
  expect(
    option.contains(
      option.ownerDocument.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2),
    ),
  ).toBe(true);
  await userEvent.click(option);
};

export const RetainedFrameDark: Story = {
  name: 'Retained frame / dark / 1188',
  tags: ['storybook-play-required'],
  render: () => <RetainedFrameDemo />,
  play: retainedFramePlay,
};
export const RetainedFrameNarrowLight: Story = {
  name: 'Retained frame / light / 720 / Korean / large text',
  tags: ['storybook-play-required'],
  render: () => (
    <RetainedFrameDemo width={720} theme="light" korean shellPreset="workbench" textScale={1.25} />
  ),
  play: retainedFramePlay,
};

export const DirectSplitPrimaryHiddenHorizontal: Story = {
  name: 'Direct SplitView / hidden primary / horizontal',
  tags: ['storybook-play-required'],
  render: () => <DirectSplitHiddenDemo hiddenSide="primary" orientation="horizontal" />,
  play: verifyDirectSplitHiddenGeometry,
};
export const DirectSplitSecondaryHiddenHorizontal: Story = {
  name: 'Direct SplitView / hidden secondary / horizontal',
  tags: ['storybook-play-required'],
  render: () => <DirectSplitHiddenDemo hiddenSide="secondary" orientation="horizontal" />,
  play: verifyDirectSplitHiddenGeometry,
};
export const DirectSplitPrimaryHiddenVertical: Story = {
  name: 'Direct SplitView / hidden primary / vertical',
  tags: ['storybook-play-required'],
  render: () => <DirectSplitHiddenDemo hiddenSide="primary" orientation="vertical" />,
  play: verifyDirectSplitHiddenGeometry,
};
export const DirectSplitSecondaryHiddenVertical: Story = {
  name: 'Direct SplitView / hidden secondary / vertical',
  tags: ['storybook-play-required'],
  render: () => <DirectSplitHiddenDemo hiddenSide="secondary" orientation="vertical" />,
  play: verifyDirectSplitHiddenGeometry,
};

export const RetainedFrameOverlayBoundaries: Story = {
  name: 'Retained frame / content bounds and global overlay priority',
  tags: ['storybook-play-required'],
  render: () => <RetainedOverlayBoundaryDemo />,
  play: verifyRetainedOverlayBoundaries,
};
