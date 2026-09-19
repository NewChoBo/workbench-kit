import { StrictMode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import { formatWorkspaceResourceUri } from '@workbench-kit/workspace';
import { DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY } from '@workbench-kit/shell-react';
import {
  initialWorkspace,
  SAMPLE_APP_PATH,
  SAMPLE_BUTTON_PATH,
  SAMPLE_README_PATH,
} from './bootstrap.js';
import { SampleBackendLab } from './testing/SampleBackendLab.js';
import { resetSampleHostStorage } from './storybook/fixtures/sampleHostStorage.js';
import { waitForWorkbenchReady } from './storybook/play/sampleHostAssertions.js';
import './host.css';

const meta = {
  title: 'Workbench Sample/Explorer Context',
  component: SampleBackendLab,
  parameters: {
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
    test: { timeout: 60_000 },
  },
  tags: ['storybook-play-required', 'storybook-play-sample', 'storybook-play-explorer-context'],
  args: { initialScenario: 'one-account' },
  beforeEach: () => {
    resetSampleHostStorage('none');
    window.localStorage.removeItem(DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY);
  },
  render: (args, { id }) => (
    <StrictMode key={id}>
      <SampleBackendLab {...args} />
    </StrictMode>
  ),
} satisfies Meta<typeof SampleBackendLab>;
export default meta;

type Story = StoryObj<typeof meta>;
type Canvas = ReturnType<typeof within>;

function explorer(canvas: Canvas): HTMLElement {
  return canvas.getByLabelText('Workspace Explorer') as HTMLElement;
}

function queryRow(canvas: Canvas, path: string) {
  return Array.from(
    explorer(canvas).querySelectorAll<HTMLButtonElement>('button[data-workspace-path]'),
  ).find((button) => button.dataset.workspacePath === path);
}

function row(canvas: Canvas, path: string) {
  const button = queryRow(canvas, path);
  expect(button, `Explorer row ${path}`).toBeDefined();
  return button!;
}

function selected(canvas: Canvas, path: string) {
  return row(canvas, path).closest('[role="treeitem"]')?.getAttribute('aria-selected');
}

function more(canvas: Canvas, path: string): HTMLElement {
  return within(explorer(canvas)).getByRole('button', {
    name: `More actions for ${path}`,
  }) as HTMLElement;
}

function openTabNames(canvas: Canvas) {
  return canvas
    .queryAllByRole('tab')
    .map((tab: HTMLElement) => tab.getAttribute('aria-label') ?? tab.textContent);
}

async function menuFor(canvas: Canvas, path: string): Promise<HTMLElement> {
  return canvas.findByRole('menu', { name: `${path.split('/').pop()} menu` });
}

async function rightClick(button: HTMLElement) {
  button.scrollIntoView({ block: 'nearest' });
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const rect = button.getBoundingClientRect();
  await userEvent.pointer({
    target: button,
    keys: '[MouseRight]',
    coords: {
      clientX: rect.left + Math.min(20, rect.width / 2),
      clientY: rect.top + rect.height / 2,
    },
  });
}

async function escapeMenu(canvas: Canvas, invoker: HTMLElement) {
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
  await waitFor(() =>
    expect(
      invoker,
      `Escape focus: ${invoker.getAttribute('aria-label') ?? invoker.textContent}`,
    ).toHaveFocus(),
  );
}

async function clickMore(button: HTMLElement) {
  // Actions are revealed by focus-within; synthetic pointer events do not set CSS :hover.
  button.focus();
  await userEvent.click(button);
}

function menuLabels(menu: HTMLElement) {
  return within(menu)
    .getAllByRole('menuitem')
    .map((item) => item.textContent);
}

async function expectMenuContained(menu: HTMLElement) {
  await waitFor(() => {
    const rect = menu.getBoundingClientRect();
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(window.innerWidth + 1);
    expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight + 1);
  });
}

async function ready(canvas: Canvas) {
  await waitForWorkbenchReady(canvas);
  await canvas.findByText('No editors open');
}

export const TargetParity: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await ready(canvas);
    const initialTabs = openTabNames(canvas);
    const app = row(canvas, SAMPLE_APP_PATH);
    const button = row(canvas, SAMPLE_BUTTON_PATH);

    await rightClick(button);
    await menuFor(canvas, SAMPLE_BUTTON_PATH);
    await escapeMenu(canvas, button);
    await rightClick(app);
    const pointerMenu = await menuFor(canvas, SAMPLE_APP_PATH);
    const labels = menuLabels(pointerMenu);
    await expectMenuContained(pointerMenu);
    expect(selected(canvas, SAMPLE_APP_PATH)).toBe('true');
    expect(selected(canvas, SAMPLE_BUTTON_PATH)).toBe('false');
    expect(openTabNames(canvas)).toEqual(initialTabs);
    await escapeMenu(canvas, app);

    const appMore = more(canvas, SAMPLE_APP_PATH);
    expect(appMore.closest('button[data-workspace-path]')).toBeNull();
    await clickMore(appMore);
    const moreMenu = await menuFor(canvas, SAMPLE_APP_PATH);
    expect(menuLabels(moreMenu)).toEqual(labels);
    await expectMenuContained(moreMenu);
    await escapeMenu(canvas, appMore);

    app.focus();
    await userEvent.keyboard('{Shift>}{F10}{/Shift}');
    const keyboardMenu = await menuFor(canvas, SAMPLE_APP_PATH);
    expect(menuLabels(keyboardMenu)).toEqual(labels);
    await expectMenuContained(keyboardMenu);
    await escapeMenu(canvas, app);
    expect(openTabNames(canvas)).toEqual(initialTabs);

    const folder = row(canvas, 'src');
    if (folder.closest('[role="treeitem"]')?.getAttribute('aria-expanded') === 'true') {
      await userEvent.click(folder);
    }
    await expect(folder.closest('[role="treeitem"]')).toHaveAttribute('aria-expanded', 'false');
    for (const entry of ['pointer', 'more', 'keyboard']) {
      const invoker = entry === 'more' ? more(canvas, 'src') : folder;
      if (entry === 'pointer') await rightClick(folder);
      else if (entry === 'more') await clickMore(invoker);
      else {
        folder.focus();
        await userEvent.keyboard('{Shift>}{F10}{/Shift}');
      }
      await menuFor(canvas, 'src');
      await expect(folder.closest('[role="treeitem"]')).toHaveAttribute('aria-expanded', 'false');
      expect(queryRow(canvas, SAMPLE_APP_PATH)).toBeUndefined();
      expect(openTabNames(canvas)).toEqual(initialTabs);
      await escapeMenu(canvas, invoker);
    }

    // Keyboard traversal must expose its target in the overflowing sidebar, not just change focus.
    folder.focus();
    await userEvent.keyboard('{Home}');
    await expect(explorer(canvas).querySelector('button[data-workspace-path]')).toHaveFocus();
    await userEvent.keyboard('{End}');
    const lastRow = row(canvas, SAMPLE_README_PATH);
    await expect(lastRow).toHaveFocus();
    await waitFor(() => {
      const bounds = explorer(canvas).getBoundingClientRect();
      const target = lastRow.getBoundingClientRect();
      expect(target.top).toBeGreaterThanOrEqual(bounds.top);
      expect(target.bottom).toBeLessThanOrEqual(bounds.bottom);
    });
    expect(openTabNames(canvas)).toEqual(initialTabs);
  },
};

export const RenameRetry: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await ready(canvas);
    const initialTabs = openTabNames(canvas);
    const originalContent = initialWorkspace.files?.find(
      (file) => file.path === SAMPLE_APP_PATH,
    )?.content;
    const otherContent = initialWorkspace.files?.find(
      (file) => file.path === SAMPLE_BUTTON_PATH,
    )?.content;
    expect(originalContent).toBeDefined();
    expect(otherContent).toBeDefined();

    await rightClick(row(canvas, SAMPLE_APP_PATH));
    await userEvent.click(
      within(await menuFor(canvas, SAMPLE_APP_PATH)).getByRole('menuitem', { name: /^Rename/ }),
    );
    let input = await canvas.findByRole('textbox', { name: 'Workspace item name' });
    await expect(input).toHaveFocus();
    await expect(input).toHaveValue('App.tsx');
    await userEvent.clear(input);
    await userEvent.type(input, 'Canceled.tsx');
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(canvas.queryByRole('textbox', { name: 'Workspace item name' })).toBeNull(),
    );
    expect(queryRow(canvas, 'src/Canceled.tsx')).toBeUndefined();
    await expect(row(canvas, SAMPLE_APP_PATH)).toBeVisible();
    expect(openTabNames(canvas)).toEqual(initialTabs);

    await clickMore(more(canvas, SAMPLE_APP_PATH));
    await userEvent.click(
      within(await menuFor(canvas, SAMPLE_APP_PATH)).getByRole('menuitem', { name: /^Rename/ }),
    );
    input = await canvas.findByRole('textbox', { name: 'Workspace item name' });
    await userEvent.clear(input);
    await userEvent.type(input, 'invalid/name.tsx');
    await userEvent.keyboard('{Enter}');
    await expect(
      await within(explorer(canvas)).findByText('Use a simple file or folder name.'),
    ).toBeVisible();
    await expect(input).toHaveValue('invalid/name.tsx');
    expect(canvas.getByRole('textbox', { name: 'Workspace item name' })).toBe(input);
    expect(fireEvent.contextMenu(input, { button: 2, clientX: 100, clientY: 100 })).toBe(true);
    expect(canvas.queryByRole('menu')).toBeNull();
    expect(canvas.getByRole('textbox', { name: 'Workspace item name' })).toBe(input);
    await expect(input).toHaveValue('invalid/name.tsx');
    await expect(row(canvas, SAMPLE_BUTTON_PATH)).toBeVisible();

    // The same message on a later completed attempt must not leave submission locked.
    for (let retry = 0; retry < 2; retry += 1) {
      await userEvent.keyboard('{Enter}');
      await expect(input).toHaveValue('invalid/name.tsx');
      await expect(
        within(explorer(canvas)).getByText('Use a simple file or folder name.'),
      ).toBeVisible();
    }

    const nextName = 'App-with-a-long-context-menu-regression-name-다국어-日本語.tsx';
    const nextPath = `src/${nextName}`;
    await userEvent.clear(input);
    await userEvent.type(input, nextName);
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(queryRow(canvas, nextPath)).toBeDefined());
    expect(queryRow(canvas, SAMPLE_APP_PATH)).toBeUndefined();
    expect(canvas.queryByRole('textbox', { name: 'Workspace item name' })).toBeNull();
    expect(within(explorer(canvas)).queryByText('Use a simple file or folder name.')).toBeNull();
    await expect(row(canvas, SAMPLE_BUTTON_PATH)).toBeVisible();
    await userEvent.click(row(canvas, nextPath));
    await expect(
      await canvas.findByRole('tab', { name: new RegExp(nextName.replace(/\./g, '\\.')) }),
    ).toBeVisible();

    // Read the actual sample editor model; no replacement workspace/controller is installed.
    const { monaco } = await import('@workbench-kit/monaco');
    const modelFor = (path: string) =>
      monaco.editor.getModel(monaco.Uri.parse(formatWorkspaceResourceUri({ kind: 'file', path })));
    await waitFor(() => expect(modelFor(nextPath)?.getValue()).toBe(originalContent), {
      timeout: 30_000,
    });
    await userEvent.click(row(canvas, SAMPLE_BUTTON_PATH));
    await waitFor(() => expect(modelFor(SAMPLE_BUTTON_PATH)?.getValue()).toBe(otherContent), {
      timeout: 30_000,
    });

    const renamedMore = more(canvas, nextPath);
    await expect(renamedMore).toHaveAccessibleName(`More actions for ${nextPath}`);
    await clickMore(renamedMore);
    const longNameMenu = await menuFor(canvas, nextPath);
    await expectMenuContained(longNameMenu);
    await escapeMenu(canvas, renamedMore);
  },
};

export const DirtyRenameProtection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await ready(canvas);
    await userEvent.click(row(canvas, SAMPLE_APP_PATH));
    const { monaco } = await import('@workbench-kit/monaco');
    const modelFor = (path: string) =>
      monaco.editor.getModel(monaco.Uri.parse(formatWorkspaceResourceUri({ kind: 'file', path })));
    await waitFor(() => expect(modelFor(SAMPLE_APP_PATH)).not.toBeNull(), { timeout: 30_000 });
    await canvas.findByRole('textbox', { name: 'Editor content' });
    // Model creation precedes the React wrapper's change subscription. Let its
    // mounted editor commit before editing; synthetic textarea typing bypasses Monaco.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const draft = `${modelFor(SAMPLE_APP_PATH)!.getValue()}\n// Keep this unsaved draft.\n`;
    modelFor(SAMPLE_APP_PATH)!.setValue(draft);
    await canvas.findByLabelText('Unsaved changes');

    const renameTo = async (name: string) => {
      await rightClick(row(canvas, SAMPLE_APP_PATH));
      await userEvent.click(
        within(await menuFor(canvas, SAMPLE_APP_PATH)).getByRole('menuitem', { name: /^Rename/ }),
      );
      const input = await canvas.findByRole('textbox', { name: 'Workspace item name' });
      await userEvent.clear(input);
      await userEvent.type(input, name);
      await userEvent.keyboard('{Enter}');
      return input;
    };

    const nextName = 'Draft-preserved.tsx';
    const nextPath = `src/${nextName}`;
    const input = await renameTo(nextName);
    await within(explorer(canvas)).findByText(/save.*before/i);
    expect(queryRow(canvas, nextPath)).toBeUndefined();
    expect(modelFor(SAMPLE_APP_PATH)?.getValue()).toBe(draft);
    await expect(input).toHaveValue(nextName);
    await expect(canvas.getByLabelText('Unsaved changes')).toBeVisible();
    await userEvent.keyboard('{Escape}');

    await userEvent.click(row(canvas, SAMPLE_APP_PATH));
    await userEvent.keyboard('{Control>}s{/Control}');
    await waitFor(() => expect(canvas.queryByLabelText('Unsaved changes')).toBeNull());
    await renameTo(nextName);
    await waitFor(() => expect(queryRow(canvas, nextPath)).toBeDefined());
    await userEvent.click(row(canvas, nextPath));
    await waitFor(() => expect(modelFor(nextPath)?.getValue()).toBe(draft), { timeout: 30_000 });
  },
};

export const DirtyDeleteProtection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await ready(canvas);
    await userEvent.click(row(canvas, SAMPLE_APP_PATH));
    const { monaco } = await import('@workbench-kit/monaco');
    const uri = monaco.Uri.parse(
      formatWorkspaceResourceUri({ kind: 'file', path: SAMPLE_APP_PATH }),
    );
    await waitFor(() => expect(monaco.editor.getModel(uri)).not.toBeNull(), { timeout: 30_000 });
    const model = monaco.editor.getModel(uri)!;
    await canvas.findByRole('textbox', { name: 'Editor content' });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const draft = `${model.getValue()}\n// Keep this draft after a denied delete.\n`;
    model.setValue(draft);
    await canvas.findByLabelText('Unsaved changes');

    await rightClick(row(canvas, SAMPLE_APP_PATH));
    await userEvent.click(
      within(await menuFor(canvas, SAMPLE_APP_PATH)).getByRole('menuitem', { name: /^Delete/ }),
    );
    await expect(await within(explorer(canvas)).findByRole('alert')).toHaveTextContent(
      /save.*before/i,
    );
    await expect(row(canvas, SAMPLE_APP_PATH)).toBeVisible();
    expect(selected(canvas, SAMPLE_APP_PATH)).toBe('true');
    expect(monaco.editor.getModel(uri)).toBe(model);
    expect(model.getValue()).toBe(draft);
    await expect(canvas.getByLabelText('Unsaved changes')).toBeVisible();
  },
};

export const MultiSelection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await ready(canvas);
    const initialTabs = openTabNames(canvas);
    const app = row(canvas, SAMPLE_APP_PATH);
    const button = row(canvas, SAMPLE_BUTTON_PATH);
    await rightClick(app);
    await menuFor(canvas, SAMPLE_APP_PATH);
    await escapeMenu(canvas, app);
    const user = userEvent.setup();
    await user.keyboard('{Control>}');
    await user.click(button);
    await user.keyboard('{/Control}');
    expect(selected(canvas, SAMPLE_APP_PATH)).toBe('true');
    expect(selected(canvas, SAMPLE_BUTTON_PATH)).toBe('true');

    for (const entry of ['pointer', 'more', 'keyboard']) {
      const invoker = entry === 'more' ? more(canvas, SAMPLE_APP_PATH) : app;
      if (entry === 'pointer') await rightClick(app);
      else if (entry === 'more') await clickMore(invoker);
      else {
        app.focus();
        await userEvent.keyboard('{Shift>}{F10}{/Shift}');
      }
      const menu = within(await menuFor(canvas, SAMPLE_APP_PATH));
      await expect(menu.getByRole('menuitem', { name: /^Open selected files/ })).toBeEnabled();
      await expect(menu.getByRole('menuitem', { name: /^Delete 2 files/ })).toBeEnabled();
      expect(menu.queryByRole('menuitem', { name: /^Rename/ })).toBeNull();
      expect(selected(canvas, SAMPLE_APP_PATH)).toBe('true');
      expect(selected(canvas, SAMPLE_BUTTON_PATH)).toBe('true');
      expect(openTabNames(canvas)).toEqual(initialTabs);
      await escapeMenu(canvas, invoker);
    }

    const readme = row(canvas, SAMPLE_README_PATH);
    await rightClick(readme);
    const singleMenu = within(await menuFor(canvas, SAMPLE_README_PATH));
    await expect(singleMenu.getByRole('menuitem', { name: /^Rename/ })).toBeEnabled();
    expect(singleMenu.queryByRole('menuitem', { name: /^Delete 2 files/ })).toBeNull();
    expect(selected(canvas, SAMPLE_APP_PATH)).toBe('false');
    expect(selected(canvas, SAMPLE_BUTTON_PATH)).toBe('false');
    expect(openTabNames(canvas)).toEqual(initialTabs);
    await escapeMenu(canvas, readme);

    await rightClick(button);
    await menuFor(canvas, SAMPLE_BUTTON_PATH);
    await escapeMenu(canvas, button);
    // These adjacent rows are the last child of src/components and its following src/App.tsx file.
    await userEvent.keyboard('{ArrowDown}');
    await expect(app).toHaveFocus();
    await userEvent.keyboard('{F2}');
    const input = await canvas.findByRole('textbox', { name: 'Workspace item name' });
    await expect(input).toHaveValue('App.tsx');
    await expect(input).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(row(canvas, SAMPLE_BUTTON_PATH)).toBeVisible();
    await expect(row(canvas, SAMPLE_APP_PATH)).toBeVisible();
  },
};
