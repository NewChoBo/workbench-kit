import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import { formatWidgetDocumentJson } from '@workbench-kit/jdw';
import { StoryWorkbenchShellFrame } from '../workbench/story/StoryWorkbenchShellFrame';
import { WidgetTreeWorkbench } from './WidgetTreeWorkbench.js';
import { WIDGET_TREE_DEMO_REGISTRY } from './demo-registry.js';
import { WIDGET_TREE_DEMO_ASSET_CATALOG } from './demo-widget-assets.js';

const INITIAL = formatWidgetDocumentJson({
  type: 'column',
  width: 360,
  gap: 8,
  padding: 12,
  children: [
    { type: 'text', text: 'Alpha' },
    { type: 'text', text: 'Beta' },
    { type: 'text', text: 'Gamma — multilingual content / 다국어 / 日本語' },
  ],
});

function ContextEditingHarness() {
  const [value, setValue] = useState(INITIAL);
  const [baseline, setBaseline] = useState(INITIAL);
  const [readOnly, setReadOnly] = useState(false);
  const [changes, setChanges] = useState(0);
  return (
    <StoryWorkbenchShellFrame fill variant="editor">
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <label>
          <input
            type="checkbox"
            checked={readOnly}
            onChange={(event) => setReadOnly(event.target.checked)}
          />{' '}
          Read-only document
        </label>
        <output aria-label="Document changes">Changes: {changes}</output>
        <div style={{ flex: 1, minHeight: 0 }}>
          <WidgetTreeWorkbench
            path="context-actions.jdw.json"
            value={value}
            baselineValue={baseline}
            readOnly={readOnly}
            registry={WIDGET_TREE_DEMO_REGISTRY}
            assetCatalog={WIDGET_TREE_DEMO_ASSET_CATALOG}
            defaultViewMode="design"
            onChange={(next) => {
              setChanges((count) => count + 1);
              setValue(next);
            }}
            onSave={() => setBaseline(value)}
            onDiscard={() => setValue(baseline)}
          />
        </div>
        <pre data-testid="context-document" hidden>
          {value}
        </pre>
      </div>
    </StoryWorkbenchShellFrame>
  );
}

const meta = {
  title: 'JDW/WidgetTree/Context editing',
  parameters: {
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
    test: { timeout: 60_000 },
  },
  tags: ['storybook-play-required', 'storybook-play-context-editing'],
  render: () => <ContextEditingHarness />,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function rowButton(row: HTMLElement): HTMLButtonElement {
  return row.querySelector<HTMLButtonElement>('.widget-tree-outline__button')!;
}
function childTexts(canvas: ReturnType<typeof within>): string[] {
  const document = JSON.parse(canvas.getByTestId('context-document').textContent!);
  return document.args.children.map((node: { args: { text: string } }) => node.args.text);
}
function menuScope(canvasElement: HTMLElement) {
  return within(canvasElement.ownerDocument.body);
}

export const TargetedPropertyEditing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const menus = menuScope(canvasElement);
    await waitFor(
      () => expect(canvasElement.querySelector('.monaco-editor .view-lines')).toBeVisible(),
      {
        timeout: 60_000,
      },
    );
    const beta = await canvas.findByTestId('widget-tree-node-$.children[1]');
    const betaButton = rowButton(beta);
    const before = canvas.getByTestId('context-document').textContent;
    await userEvent.pointer({ target: betaButton, keys: '[MouseRight]' });
    const menu = await menus.findByRole('menu', { name: 'Widget actions' });
    await expect(beta).toHaveAttribute('aria-selected', 'true');
    const labels = within(menu)
      .getAllByRole('menuitem')
      .map((item) => item.textContent);
    expect(canvas.getByTestId('context-document').textContent).toBe(before);
    await expect(canvas.getByLabelText('Document changes')).toHaveTextContent('Changes: 0');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(menus.queryByRole('menu', { name: 'Widget actions' })).toBeNull());
    await expect(betaButton).toHaveFocus();
    await userEvent.click(canvas.getByTestId('widget-tree-actions-$.children[1]'));
    const more = await menus.findByRole('menu', { name: 'Widget actions' });
    expect(
      within(more)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(labels);
    await userEvent.keyboard('{Escape}');
    await userEvent.click(betaButton);
    await userEvent.keyboard('{Shift>}{F10}{/Shift}');
    const keyboard = await menus.findByRole('menu', { name: 'Widget actions' });
    expect(
      within(keyboard)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(labels);
    const bounds = keyboard.getBoundingClientRect();
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(window.innerWidth);
    await userEvent.click(within(keyboard).getByRole('menuitem', { name: 'Edit properties' }));
    const inspector = canvas.getByTestId('widget-tree-inspector-panel');
    await waitFor(() =>
      expect(inspector.contains(canvasElement.ownerDocument.activeElement)).toBe(true),
    );
    const content = within(inspector).getByLabelText('Content');
    await expect(content).toHaveValue('Beta');
    await userEvent.clear(content);
    await userEvent.type(content, 'Edited Beta');
    expect(childTexts(canvas)).toEqual([
      'Alpha',
      'Edited Beta',
      'Gamma — multilingual content / 다국어 / 日本語',
    ]);
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(canvas.queryByRole('button', { name: 'Save' })).toBeNull());
    await userEvent.clear(content);
    await userEvent.type(content, 'Temporary draft');
    await userEvent.click(canvas.getByRole('button', { name: 'Discard' }));
    await waitFor(() =>
      expect(within(inspector).getByLabelText('Content')).toHaveValue('Edited Beta'),
    );
    expect(childTexts(canvas)).toEqual([
      'Alpha',
      'Edited Beta',
      'Gamma — multilingual content / 다국어 / 日本語',
    ]);
    // Reopening another target after editing must focus its menu, not the previous Inspector.
    await userEvent.pointer({
      target: rowButton(canvas.getByTestId('widget-tree-node-$.children[0]')),
      keys: '[MouseRight]',
    });
    await expect(
      within(await menus.findByRole('menu', { name: 'Widget actions' })).getByRole('menuitem', {
        name: 'Edit properties',
      }),
    ).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(rowButton(canvas.getByTestId('widget-tree-node-$.children[0]'))).toHaveFocus();
  },
};

export const ArrangementAndReadOnly: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const menus = menuScope(canvasElement);
    await userEvent.click(await canvas.findByTestId('widget-tree-actions-$.children[1]'));
    await userEvent.click(
      within(await menus.findByRole('menu', { name: 'Widget actions' })).getByRole('menuitem', {
        name: /Move up/,
      }),
    );
    await waitFor(() =>
      expect(childTexts(canvas)).toEqual([
        'Beta',
        'Alpha',
        'Gamma — multilingual content / 다국어 / 日本語',
      ]),
    );
    await expect(canvas.getByLabelText('Document changes')).toHaveTextContent('Changes: 1');
    await expect(canvas.getByTestId('widget-tree-node-$.children[0]')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.click(canvas.getByTestId('widget-tree-actions-$.children[0]'));
    const moved = within(await menus.findByRole('menu', { name: 'Widget actions' }));
    await expect(moved.getByRole('menuitem', { name: /Move up/ })).toBeDisabled();
    await userEvent.click(moved.getByRole('menuitem', { name: /Remove node/ }));
    await waitFor(() =>
      expect(childTexts(canvas)).toEqual([
        'Alpha',
        'Gamma — multilingual content / 다국어 / 日本語',
      ]),
    );
    await expect(canvas.getByLabelText('Document changes')).toHaveTextContent('Changes: 2');
    await userEvent.click(canvas.getByTestId('widget-tree-actions-$'));
    const root = within(await menus.findByRole('menu', { name: 'Widget actions' }));
    await expect(root.getByRole('menuitem', { name: /Remove node/ })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(canvas.getByLabelText('Read-only document'));
    await userEvent.click(canvas.getByTestId('widget-tree-actions-$.children[0]'));
    const readOnly = within(await menus.findByRole('menu', { name: 'Widget actions' }));
    await expect(readOnly.getByRole('menuitem', { name: /Move down/ })).toBeDisabled();
    await expect(readOnly.getByRole('menuitem', { name: /Remove node/ })).toBeDisabled();
    await userEvent.click(readOnly.getByRole('menuitem', { name: 'Inspect properties' }));
    const inspectedContent = within(
      canvas.getByTestId('widget-tree-inspector-panel'),
    ).getByLabelText('Content');
    await expect(inspectedContent).toHaveAttribute('readonly');
    await userEvent.type(inspectedContent, 'Forbidden edit');
    await expect(inspectedContent).toHaveValue('Alpha');
    await expect(canvas.getByLabelText('Document changes')).toHaveTextContent('Changes: 2');
  },
};

export const CanvasTargetAndNativeInput: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const menus = menuScope(canvasElement);
    const preview = within(await canvas.findByTestId('widget-tree-lab-render-pane'));
    const beta = await preview.findByRole('button', { name: 'Beta' });
    await userEvent.pointer({ target: beta, keys: '[MouseRight]' });
    await userEvent.click(
      within(await menus.findByRole('menu', { name: 'Widget actions' })).getByRole('menuitem', {
        name: 'Edit properties',
      }),
    );
    const content = within(canvas.getByTestId('widget-tree-inspector-panel')).getByLabelText(
      'Content',
    );
    await expect(content).toHaveValue('Beta');
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    content.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(menus.queryByRole('menu', { name: 'Widget actions' })).toBeNull();
    await expect(canvas.getByLabelText('Document changes')).toHaveTextContent('Changes: 0');
    // The keyboard context-menu key targets the same authored preview node.
    fireEvent.keyDown(beta, { key: 'ContextMenu' });
    await expect(await menus.findByRole('menu', { name: 'Widget actions' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect(beta).toHaveFocus();
  },
};
