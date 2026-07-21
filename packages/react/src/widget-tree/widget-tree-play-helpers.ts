import { expect, waitFor } from 'storybook/test';

/** Wait until Widget Tree Lab / Workbench chrome is mounted (Form or Code surface). */
export async function waitForWidgetTreeSourcePane(canvasElement: HTMLElement): Promise<void> {
  await waitFor(
    () => {
      const surface =
        canvasElement.querySelector('[data-testid="widget-tree-lab"]') ??
        canvasElement.querySelector('[data-testid="widget-tree-workbench"]') ??
        canvasElement.querySelector('.widget-tree-source .ui-json-code-editor-pane') ??
        canvasElement.querySelector('[data-testid="widget-tree-source"]');
      expect(surface).toBeTruthy();
    },
    { timeout: 15000 },
  );
}
