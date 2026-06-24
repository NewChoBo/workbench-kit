import { expect, waitFor } from 'storybook/test';

export async function waitForWidgetTreeSourcePane(canvasElement: HTMLElement): Promise<void> {
  await waitFor(
    () => {
      const pane =
        canvasElement.querySelector('.widget-tree-source .ui-json-code-editor-pane') ??
        canvasElement.querySelector('[data-testid="widget-tree-source"]');
      expect(pane).toBeTruthy();
    },
    { timeout: 15000 },
  );
}
