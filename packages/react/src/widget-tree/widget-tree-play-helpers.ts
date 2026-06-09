import { expect, userEvent, waitFor } from 'storybook/test';

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

export async function waitForWidgetTreeMonaco(canvasElement: HTMLElement): Promise<void> {
  await waitForWidgetTreeSourcePane(canvasElement);

  await waitFor(
    () => {
      const editorRoot = canvasElement.querySelector('.widget-tree-source .monaco-editor');
      expect(editorRoot).toBeTruthy();
      expect(editorRoot?.textContent ?? '').not.toContain('Loading editor');
    },
    { timeout: 15000 },
  );
}

export async function setWidgetTreeSourceJson(
  canvasElement: HTMLElement,
  value: string,
): Promise<void> {
  await waitForWidgetTreeMonaco(canvasElement);

  const editorRoot = canvasElement.querySelector('.widget-tree-source .monaco-editor');
  if (!editorRoot) {
    throw new Error('Monaco editor root was not found.');
  }

  const textarea = editorRoot.querySelector('textarea');
  if (textarea) {
    await userEvent.click(textarea);
    await userEvent.clear(textarea);
    await userEvent.paste(value);
  } else {
    await userEvent.click(editorRoot);
    await userEvent.keyboard('{Control>}a{/Control}');
    await userEvent.keyboard('{Delete}');
    await userEvent.paste(value);
  }

  await waitFor(
    () => {
      const monacoGlobal = (window as Window & { monaco?: import('monaco-editor') }).monaco;
      const editor = monacoGlobal?.editor.getEditors().find((candidate) => {
        const domNode = candidate.getDomNode();
        return domNode ? editorRoot.contains(domNode) : false;
      });

      expect(editor?.getValue()).toBe(value);
    },
    { timeout: 5000 },
  );
}
