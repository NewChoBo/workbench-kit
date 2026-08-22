/** @vitest-environment jsdom */

import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkbenchStorageAdapter } from '@workbench-kit/workbench-core';

import { WorkbenchProvider } from '../shell/provider.js';
import { BUILTIN_WORKBENCH_EXTENSIONS } from './builtin-extensions.js';
import { BuiltinExtensionsView } from './view.js';
import { SAMPLE_WORKBENCH_EXTENSIONS } from '../../../../examples/workbench-sample/src/sample-extensions.js';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('BuiltinExtensionsView', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('retains the committed uninstall row as disabled Reloading feedback', async () => {
    const extension = SAMPLE_WORKBENCH_EXTENSIONS.find(
      (candidate) => candidate.manifest.id === 'workbench-kit.samples.json-preview',
    )!;
    const storageKey = 'workbench-kit/.workbench/installed-extensions/view-pending';
    const record = {
      category: 'editor',
      enabled: true,
      id: extension.manifest.id,
      installedAt: '2026-08-22T00:00:00.000Z',
      manifestUrl: extension.manifest.id,
    };
    const values = new Map([[storageKey, JSON.stringify([record])]]);
    const storage: WorkbenchStorageAdapter = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <StrictMode>
          <WorkbenchProvider
            availableExtensions={[...BUILTIN_WORKBENCH_EXTENSIONS, extension]}
            extensionsConfig={{ enabled: [], recommendations: [] }}
            installedExtensionsStorage={storage}
            installedExtensionsStorageKey={storageKey}
          >
            <BuiltinExtensionsView catalogUrl="" />
          </WorkbenchProvider>
        </StrictMode>,
      );
    });

    const installedTab = await waitForButton(container, 'Installed');
    await act(async () => {
      installedTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const uninstallButton = await waitForButton(container, 'Uninstall');
    await act(async () => {
      uninstallButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const reloadingButton = await waitForButton(container, 'Reloading…');
    const retainedRow = reloadingButton.closest('li');
    const disableButton = Array.from(retainedRow?.querySelectorAll('button') ?? []).find(
      (button) => button.textContent === 'Disable',
    );

    expect(JSON.parse(values.get(storageKey) ?? 'null')).toEqual([]);
    expect(retainedRow?.textContent).toContain('JSON Preview');
    expect(reloadingButton.disabled).toBe(true);
    expect(disableButton?.disabled).toBe(true);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
  });
});

async function waitForButton(container: HTMLElement, label: string): Promise<HTMLButtonElement> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const button = Array.from(container.querySelectorAll('button')).find(
      (candidate) => candidate.textContent === label,
    );
    if (button) {
      return button;
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
  throw new Error(`Timed out waiting for button: ${label}; rendered: ${container.textContent}`);
}
