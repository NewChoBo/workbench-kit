/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';

import { WorkbenchThemeProvider } from './WorkbenchThemeProvider';

describe('WorkbenchThemeProvider', () => {
  beforeEach(() => {
    delete document.documentElement.dataset.theme;
  });

  it('applies the active theme to the provider root', () => {
    expect(
      renderToStaticMarkup(
        <WorkbenchThemeProvider className="ui-workbench-host-root" theme="light">
          <main>Workbench</main>
        </WorkbenchThemeProvider>,
      ),
    ).toContain('class="ui-workbench-host-root" data-theme="light"');
  });

  it('optionally syncs the document element theme and restores the previous value', async () => {
    document.documentElement.dataset.theme = 'dark';
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchThemeProvider syncDocumentElement theme="light">
          <main>Workbench</main>
        </WorkbenchThemeProvider>,
      );
    });

    expect(document.documentElement.dataset.theme).toBe('light');

    await act(async () => {
      root.render(
        <WorkbenchThemeProvider syncDocumentElement theme="dark">
          <main>Workbench</main>
        </WorkbenchThemeProvider>,
      );
    });

    expect(document.documentElement.dataset.theme).toBe('dark');

    await act(async () => {
      root.unmount();
    });
    container.remove();

    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
